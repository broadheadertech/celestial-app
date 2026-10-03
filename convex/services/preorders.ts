import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { getViewer, requireStaff } from "../lib/authz";
import { isListedPublicly } from "../lib/purchaseMode";
import { publicName } from "../lib/productName";
import { allocationOrder, depositPerUnit, formatPeso, preorderState, toPeso } from "../lib/preorder";
import { recordAudit } from "./audit";
import { loadStoreContact, normalizeCustomerEmail, notifyPreorderPlaced } from "./notifications";
import { releaseReservedStockHelper, reserveStockHelper } from "./stock";

/**
 * Pre-orders — committing to a fish that hasn't arrived yet.
 *
 * A pre-order is stored as a `reservations` row with `isPreorder: true`, so deposits run through
 * the existing reservationPayments ledger and Finance, Cash on Hand, the payment timeline and
 * RES- tracking all work with no special case. The one thing that differs is stock: a pre-order
 * holds **none** until it's allocated, which is why every stock-restore path checks
 * `reservationHoldsStock()` before giving stock back.
 *
 * When a shipment is received (services/stock.ts restockProduct), `allocatePreordersForProduct`
 * fills the queue in `allocationOrder` — paid deposits first — turning each one into an ordinary
 * confirmed reservation and emailing the customer.
 */

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_NOTES = 1000;
const MAX_QTY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const PICKUP_WINDOW_MS = 7 * DAY_MS;
// How long a pre-order stays open when we gave no arrival date.
const DEFAULT_PREORDER_LIFE_MS = 180 * DAY_MS;

const LIVE_STATUSES = ["pending", "confirmed", "ready_for_pickup", "completed"] as const;

function generateReservationCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RES-${timestamp}${random}`;
}

/** Live pre-orders for a product — everything not cancelled or expired. */
async function livePreorders(ctx: QueryCtx | MutationCtx, productId: Id<"products">): Promise<Doc<"reservations">[]> {
  const rows = await ctx.db
    .query("reservations")
    .withIndex("by_preorder_product", (q) => q.eq("preorderProductId", productId))
    .collect();
  return rows.filter((r) => (LIVE_STATUSES as readonly string[]).includes(r.status));
}

function unitsIn(reservation: Doc<"reservations">): number {
  return (reservation.items ?? []).reduce((sum, item) => sum + item.quantity, 0) || 1;
}

/** How many of the incoming units are already committed. */
export async function committedUnits(ctx: QueryCtx | MutationCtx, productId: Id<"products">): Promise<number> {
  const rows = await livePreorders(ctx, productId);
  return rows.reduce((sum, r) => sum + unitsIn(r), 0);
}

// ---------------------------------------------------------------- public

/** What the storefront shows on a specimen page: the window, the deposit and slots left. */
export const getPreorderOffer = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product || !isListedPublicly(product)) return null;
    const state = preorderState(product, await committedUnits(ctx, productId));
    // Customers see the offer, never the raw queue.
    return {
      productName: publicName(product),
      price: product.price,
      open: state.open,
      remaining: state.remaining,
      incomingQty: state.incomingQty,
      depositPerUnit: state.depositPerUnit,
      expectedLabel: state.expectedLabel,
      note: state.note,
      closedReason: state.closedReason,
    };
  },
});

export const createPreorder = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.optional(v.number()),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, MAX_NAME);
    const email = args.email.trim().slice(0, MAX_EMAIL);
    const phone = args.phone.trim().slice(0, MAX_PHONE);
    if (!name) throw new Error("Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
    if (phone.length < 7) throw new Error("Valid phone number is required");

    const quantity = Math.floor(args.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw new Error(`You can pre-order between 1 and ${MAX_QTY} at a time`);
    }

    const product = await ctx.db.get(args.productId);
    if (!product || !isListedPublicly(product)) throw new Error("That fish isn't available");

    // Re-checked here, so a stale page can't take a slot that's already gone.
    const state = preorderState(product, await committedUnits(ctx, args.productId));
    if (!state.open) throw new Error(state.closedReason ?? "Pre-orders are closed for this fish.");
    if (quantity > state.remaining) {
      throw new Error(
        state.remaining === 1
          ? "Only one slot is left on this shipment."
          : `Only ${state.remaining} slots are left on this shipment.`,
      );
    }

    const viewer = await getViewer(ctx);
    const now = Date.now();
    const unitPrice = toPeso(product.price);
    const totalAmount = unitPrice * quantity;
    const depositDue = depositPerUnit(product) * quantity;
    // A pre-order can't expire before the fish is due; the 7-day pickup clock starts on arrival.
    const expectedTo = product.preorder?.expectedTo;
    const expiryDate = expectedTo ? Date.parse(`${expectedTo}T23:59:59`) + 30 * DAY_MS : now + DEFAULT_PREORDER_LIFE_MS;

    const reservationCode = generateReservationCode();
    const reservationId = await ctx.db.insert("reservations", {
      reservationCode,
      userId: viewer?._id,
      guestInfo: { name, email, phone, notes: args.notes?.trim().slice(0, MAX_NOTES) || undefined },
      items: [{ productId: product._id, quantity, reservedPrice: unitPrice, originalPrice: unitPrice, discount: 0 }],
      subtotal: totalAmount,
      orderDiscount: 0,
      totalAmount,
      totalQuantity: quantity,
      reservationDate: now,
      expiryDate: Number.isFinite(expiryDate) ? expiryDate : now + DEFAULT_PREORDER_LIFE_MS,
      status: "pending",
      paymentStatus: "unpaid",
      amountPaid: 0,
      notes: `Pre-order · ${publicName(product)}${state.expectedLabel ? ` · expected ${state.expectedLabel}` : ""}`,
      // Pre-order markers. No stock is taken here — see reservationHoldsStock().
      isPreorder: true,
      preorderProductId: product._id,
      preorderExpectedFrom: product.preorder?.expectedFrom,
      preorderExpectedTo: product.preorder?.expectedTo,
      depositDue,
      createdAt: now,
      updatedAt: now,
    });

    // Best-effort side effects: a failure here must never lose the pre-order.
    try {
      await notifyPreorderPlaced(ctx, {
        reservationId,
        reservationCode,
        name,
        productName: publicName(product),
        quantity,
        depositDue,
        expectedLabel: state.expectedLabel,
      });
    } catch (error) {
      console.error("Failed to create pre-order notification:", error);
    }

    try {
      const to = normalizeCustomerEmail(email);
      if (to) {
        const business = await ctx.db.query("businessProfile").first();
        await ctx.scheduler.runAfter(0, internal.services.email.sendPreorderConfirmationEmail, {
          to,
          reservationId,
          reservationCode,
          name,
          productName: publicName(product),
          quantity,
          unitPrice,
          totalAmount,
          depositDue,
          expectedLabel: state.expectedLabel,
          gcash: [business?.gcashNumber, business?.gcashName].filter(Boolean).join(" · ") || undefined,
          bankDetails: business?.bankDetails || undefined,
          store: await loadStoreContact(ctx),
        });
      }
    } catch (error) {
      console.error("Failed to schedule pre-order confirmation email:", error);
    }

    return { success: true, reservationId, reservationCode, depositDue, totalAmount, quantity };
  },
});

// ---------------------------------------------------------------- staff

/** The queue, grouped by the fish people are waiting for. */
export const getPreorderQueue = query({
  args: { productId: v.optional(v.id("products")) },
  handler: async (ctx, { productId }) => {
    await requireStaff(ctx);

    const rows = productId
      ? await ctx.db
          .query("reservations")
          .withIndex("by_preorder_product", (q) => q.eq("preorderProductId", productId))
          .collect()
      : (await ctx.db.query("reservations").withIndex("by_created").order("desc").take(1500)).filter((r) => r.isPreorder);

    const byProduct = new Map<string, Doc<"reservations">[]>();
    for (const row of rows) {
      if (!row.isPreorder || !row.preorderProductId) continue;
      byProduct.set(row.preorderProductId, [...(byProduct.get(row.preorderProductId) ?? []), row]);
    }

    const groups = [];
    for (const [id, list] of byProduct) {
      const product = await ctx.db.get(id as Id<"products">);
      if (!product) continue;
      const live = list.filter((r) => (LIVE_STATUSES as readonly string[]).includes(r.status));
      const state = preorderState(product, live.reduce((sum, r) => sum + unitsIn(r), 0));
      groups.push({
        productId: product._id,
        productName: product.name, // staff see the internal name
        displayName: publicName(product),
        price: product.price,
        stock: product.stock,
        incomingQty: state.incomingQty,
        committed: state.committed,
        remaining: state.remaining,
        depositPerUnit: state.depositPerUnit,
        expectedLabel: state.expectedLabel,
        enabled: product.preorder?.enabled ?? false,
        // Waiting = not yet given real stock. These are the ones an arrival fills.
        waiting: allocationOrder(live.filter((r) => r.allocatedAt === undefined)).map(shape),
        allocated: live.filter((r) => r.allocatedAt !== undefined).sort((a, b) => (b.allocatedAt ?? 0) - (a.allocatedAt ?? 0)).map(shape),
        cancelled: list.filter((r) => !(LIVE_STATUSES as readonly string[]).includes(r.status)).length,
      });
    }

    return groups.sort((a, b) => b.waiting.length - a.waiting.length || a.productName.localeCompare(b.productName));
  },
});

function shape(r: Doc<"reservations">) {
  return {
    reservationId: r._id,
    code: r.reservationCode ?? `RES-${r._id.slice(-6).toUpperCase()}`,
    name: r.guestInfo?.name ?? "Customer",
    email: r.guestInfo?.email ?? "",
    phone: r.guestInfo?.phone ?? "",
    quantity: unitsIn(r),
    totalAmount: r.totalAmount ?? 0,
    depositDue: r.depositDue ?? 0,
    amountPaid: r.amountPaid ?? 0,
    paymentStatus: r.paymentStatus ?? "unpaid",
    status: r.status,
    allocatedAt: r.allocatedAt,
    notes: r.guestInfo?.notes,
    createdAt: r.createdAt,
  };
}

/** Totals for the top of the Pre-orders page. */
export const getPreorderSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = (await ctx.db.query("reservations").withIndex("by_created").order("desc").take(1500)).filter(
      (r) => r.isPreorder && (LIVE_STATUSES as readonly string[]).includes(r.status),
    );
    const waiting = rows.filter((r) => r.allocatedAt === undefined);
    return {
      waiting: waiting.length,
      units: waiting.reduce((sum, r) => sum + unitsIn(r), 0),
      depositsCollected: rows.reduce((sum, r) => sum + (r.amountPaid ?? 0), 0),
      depositsOutstanding: waiting.reduce((sum, r) => sum + Math.max(0, (r.depositDue ?? 0) - (r.amountPaid ?? 0)), 0),
      committedValue: waiting.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0),
    };
  },
});

/**
 * Hands real stock to the people waiting, best-funded first. Called automatically when a
 * shipment is received, and from the "Allocate now" button.
 *
 * Only ever allocates stock that exists, and never more than one pre-order's full quantity — a
 * partial shipment fills whoever it can and leaves the rest waiting.
 */
export async function allocatePreordersForProduct(
  ctx: MutationCtx,
  productId: Id<"products">,
): Promise<{ allocated: number; units: number }> {
  const product = await ctx.db.get(productId);
  if (!product) return { allocated: 0, units: 0 };

  const waiting = allocationOrder(
    (await livePreorders(ctx, productId)).filter((r) => r.allocatedAt === undefined),
  );
  if (waiting.length === 0) return { allocated: 0, units: 0 };

  let available = product.stock;
  let allocated = 0;
  let units = 0;
  const now = Date.now();

  for (const preorder of waiting) {
    const needed = unitsIn(preorder);
    if (needed > available) continue; // leave them waiting rather than part-filling

    available -= needed;
    units += needed;
    allocated += 1;

    // From here it holds real stock, so the normal restore-on-cancel rules apply again.
    await ctx.db.patch(preorder._id, {
      status: "confirmed",
      allocatedAt: now,
      // The 7-day pickup clock starts now that the fish is actually here.
      expiryDate: now + PICKUP_WINDOW_MS,
      updatedAt: now,
    });
    // Same two steps an ordinary reservation takes: drop on-hand stock, then sync the batches
    // (reserveStockHelper writes the stockMovements rows and the low-stock alert).
    const fresh = await ctx.db.get(productId);
    await ctx.db.patch(productId, { stock: Math.max(0, (fresh?.stock ?? 0) - needed), updatedAt: now });
    await reserveStockHelper(ctx, { productId, quantity: needed });

    try {
      const to = normalizeCustomerEmail(preorder.guestInfo?.email);
      if (to) {
        await ctx.scheduler.runAfter(0, internal.services.email.sendPreorderArrivedEmail, {
          to,
          reservationId: preorder._id,
          reservationCode: preorder.reservationCode ?? `RES-${preorder._id.slice(-6).toUpperCase()}`,
          name: preorder.guestInfo?.name ?? "there",
          productName: publicName(product),
          quantity: needed,
          totalAmount: preorder.totalAmount ?? 0,
          amountPaid: preorder.amountPaid ?? 0,
          store: await loadStoreContact(ctx),
        });
      }
    } catch (error) {
      console.error("Failed to schedule pre-order arrival email:", error);
    }
  }

  return { allocated, units };
}

/**
 * Scheduled by services/stock.ts the moment a shipment is received, so the queue is filled
 * before the new stock can be sold to anyone else.
 */
export const allocateAfterRestock = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const result = await allocatePreordersForProduct(ctx, productId);
    if (result.allocated > 0) {
      const product = await ctx.db.get(productId);
      await recordAudit(ctx, {
        action: "preorder.allocate",
        category: "sales",
        summary: `Shipment of ${product?.name ?? "a product"} filled ${result.allocated} pre-order${result.allocated === 1 ? "" : "s"} (${result.units} unit${result.units === 1 ? "" : "s"})`,
        entityTable: "products",
        entityId: productId,
      });
    }
    return result;
  },
});

export const allocatePreorders = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const staff = await requireStaff(ctx);
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");

    const result = await allocatePreordersForProduct(ctx, productId);

    if (result.allocated > 0) {
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "preorder.allocate",
        category: "sales",
        summary: `Allocated ${product.name} to ${result.allocated} pre-order${result.allocated === 1 ? "" : "s"} (${result.units} unit${result.units === 1 ? "" : "s"})`,
        entityTable: "products",
        entityId: productId,
      });
    }
    return result;
  },
});

/**
 * Cancels a pre-order. No stock is given back unless it was already allocated —
 * `reservationHoldsStock` is the single rule for that, and a refund is handled separately
 * through the payments ledger so the money trail stays intact.
 */
export const cancelPreorder = mutation({
  args: { reservationId: v.id("reservations"), reason: v.string() },
  handler: async (ctx, { reservationId, reason }) => {
    const staff = await requireStaff(ctx);
    const preorder = await ctx.db.get(reservationId);
    if (!preorder) throw new Error("Pre-order not found");
    if (!preorder.isPreorder) throw new Error("That isn't a pre-order — cancel it from Reservations.");
    const why = reason.trim().slice(0, 500);
    if (!why) throw new Error("Give a reason — it goes on the record.");

    const now = Date.now();
    // Allocated pre-orders hold stock, so cancelling one must put it back.
    if (preorder.allocatedAt !== undefined) {
      for (const item of preorder.items ?? []) {
        const product = await ctx.db.get(item.productId);
        if (!product) continue;
        await ctx.db.patch(item.productId, { stock: product.stock + item.quantity, updatedAt: now });
        await releaseReservedStockHelper(ctx, { productId: item.productId, quantity: item.quantity });
      }
    }

    await ctx.db.patch(reservationId, {
      status: "cancelled",
      notes: `${preorder.notes ?? ""}\nCancelled: ${why}`.trim(),
      updatedAt: now,
    });

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "preorder.cancel",
      category: "sales",
      summary: `Cancelled pre-order ${preorder.reservationCode ?? reservationId} (${preorder.guestInfo?.name ?? "customer"}) — ${why}`,
      entityTable: "reservations",
      entityId: reservationId,
      amount: preorder.amountPaid,
    });

    return {
      success: true,
      // Flagged so the UI can tell staff a deposit still needs refunding.
      depositToRefund: preorder.amountPaid ?? 0,
      depositToRefundLabel: formatPeso(preorder.amountPaid ?? 0),
    };
  },
});
