import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { requireStaff } from "../lib/authz";
import { publicName } from "../lib/productName";
import { formatPeso } from "../lib/serviceQuote";
import { recordAudit } from "./audit";
import { generateOrderCode } from "./orders";
import { loadStoreContact, normalizeCustomerEmail } from "./notifications";

/**
 * The delivery queue (Admin → Deliveries): web/app orders that have to be taken to a customer,
 * with a scheduled day, a driver and a delivery status of their own. The order's own `status`
 * stays the commercial one (pending → confirmed → …); `deliveryStatus` tracks the trip.
 *
 * Delivery fees are priced in orders.placeWebOrder from serviceAreas, never sent by the browser.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const deliveryStatusValidator = v.union(
  v.literal("unscheduled"),
  v.literal("scheduled"),
  v.literal("dispatched"),
  v.literal("delivered"),
  v.literal("failed"),
);

export type DeliveryStatus = Doc<"orders">["deliveryStatus"];

/**
 * Whether an order is a delivery. New orders say so explicitly; orders placed before the
 * delivery feature only recorded it as a line in `notes` ("Fulfilment: delivery").
 */
export function orderFulfilment(order: Doc<"orders">): "pickup" | "delivery" {
  if (order.fulfilment) return order.fulfilment;
  if (/^Fulfilment:\s*delivery/im.test(order.notes ?? "")) return "delivery";
  if (/^Address:/im.test(order.notes ?? "")) return "delivery";
  return "pickup";
}

/** The email the customer gave at checkout (placeWebOrder writes "Contact: email · phone"). */
export function orderContactEmail(order: Doc<"orders">): string | null {
  const line = /Contact: ([^\n]*)/i.exec(order.notes ?? "")?.[1] ?? "";
  const found = line.split("·").map((part) => part.trim()).find((part) => EMAIL_RE.test(part));
  return found ?? null;
}

/** The phone the customer gave at checkout, for the "call" link in the queue. */
export function orderContactPhone(order: Doc<"orders">): string | null {
  const line = /Contact: ([^\n]*)/i.exec(order.notes ?? "")?.[1] ?? "";
  const found = line.split("·").map((part) => part.trim()).find((part) => part && !EMAIL_RE.test(part));
  return found ?? null;
}

/** The customer-entered address: the shippingAddress street for web orders. */
export function orderAddress(order: Doc<"orders">): string {
  const street = order.shippingAddress?.street ?? "";
  if (street && street !== "In-Store Pickup" && street !== "N/A") return street;
  return /^Address:\s*(.+)$/im.exec(order.notes ?? "")?.[1]?.trim() ?? "";
}

async function itemSummary(ctx: QueryCtx | MutationCtx, order: Doc<"orders">) {
  const lines: { name: string; quantity: number }[] = [];
  for (const item of order.items) {
    const product = await ctx.db.get(item.productId);
    lines.push({ name: product ? publicName(product) : "Item", quantity: item.quantity });
  }
  return lines;
}

/**
 * The queue. Reads newest-first through the `by_created` index within the window the caller
 * displays, the same bounded pattern as the Orders page.
 */
export const getDeliveries = query({
  args: {
    deliveryStatus: v.optional(deliveryStatusValidator),
    search: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const take = Math.min(Math.max(args.limit ?? 100, 1), 300);
    const { from, to } = args;

    // Bounded read through the newest-first index, then filter — the same shape as the Orders page.
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) => {
        if (from !== undefined && to !== undefined) return q.gte("createdAt", from).lte("createdAt", to);
        if (from !== undefined) return q.gte("createdAt", from);
        if (to !== undefined) return q.lte("createdAt", to);
        return q;
      })
      .order("desc")
      .take(1500);

    const needle = args.search?.trim().toLowerCase();
    const rows = [];
    for (const order of orders) {
      if (orderFulfilment(order) !== "delivery" || order.status === "cancelled") continue;
      const status = order.deliveryStatus ?? "unscheduled";
      if (args.deliveryStatus && status !== args.deliveryStatus) continue;
      const row = await shape(ctx, order, status);
      if (needle && !`${row.code} ${row.customerName} ${row.address} ${row.areaName ?? ""} ${row.driverName ?? ""}`.toLowerCase().includes(needle)) {
        continue;
      }
      rows.push(row);
      if (rows.length >= take) break;
    }
    return rows;
  },
});

async function shape(ctx: QueryCtx | MutationCtx, order: Doc<"orders">, status: NonNullable<DeliveryStatus>) {
  return {
    orderId: order._id,
    code: generateOrderCode(order._id),
    customerName: order.customerName ?? "Customer",
    email: orderContactEmail(order),
    phone: orderContactPhone(order),
    address: orderAddress(order),
    areaName: order.deliveryAreaName,
    deliveryFee: order.deliveryFee ?? 0,
    deliveryDate: order.deliveryDate,
    deliveryStatus: status,
    driverName: order.driverName,
    deliveryNotes: order.deliveryNotes,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus ?? "unpaid",
    totalAmount: order.totalAmount,
    amountPaid: order.amountPaid ?? 0,
    items: await itemSummary(ctx, order),
    channel: order.channel ?? "web",
    createdAt: order.createdAt,
  };
}

/** Counts for the filter chips over the same window the page shows. */
export const getDeliveryCounts = query({
  args: { from: v.optional(v.number()) },
  handler: async (ctx, { from }) => {
    await requireStaff(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) => (from !== undefined ? q.gte("createdAt", from) : q))
      .order("desc")
      .take(1500);
    const counts = { all: 0, unscheduled: 0, scheduled: 0, dispatched: 0, delivered: 0, failed: 0 };
    for (const order of orders) {
      if (orderFulfilment(order) !== "delivery" || order.status === "cancelled") continue;
      counts.all += 1;
      counts[order.deliveryStatus ?? "unscheduled"] += 1;
    }
    return counts;
  },
});

/** Books the trip in: a day, a driver and (optionally) notes for whoever drives it. */
export const scheduleDelivery = mutation({
  args: {
    orderId: v.id("orders"),
    deliveryDate: v.string(),
    driverName: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    notifyCustomer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("This order was cancelled — it can't be scheduled.");
    if (!DATE_RE.test(args.deliveryDate)) throw new Error("Valid delivery date is required");

    await ctx.db.patch(args.orderId, {
      deliveryDate: args.deliveryDate,
      deliveryStatus: "scheduled",
      fulfilment: "delivery",
      driverName: args.driverName?.trim().slice(0, 120) || undefined,
      ...(args.deliveryNotes !== undefined
        ? { deliveryNotes: args.deliveryNotes.trim().slice(0, 1000) || undefined }
        : {}),
      updatedAt: Date.now(),
    });

    const code = generateOrderCode(args.orderId);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "delivery.schedule",
      category: "sales",
      summary: `${code} scheduled for delivery on ${args.deliveryDate}${args.driverName ? ` with ${args.driverName.trim()}` : ""}`,
      entityTable: "orders",
      entityId: args.orderId,
      amount: order.deliveryFee,
    });

    if (args.notifyCustomer !== false) {
      try {
        const to = normalizeCustomerEmail(orderContactEmail(order) ?? undefined);
        if (to) {
          await ctx.scheduler.runAfter(0, internal.services.email.sendDeliveryScheduledEmail, {
            to,
            orderId: args.orderId,
            orderCode: code,
            customerName: order.customerName ?? "there",
            deliveryDate: args.deliveryDate,
            areaName: order.deliveryAreaName,
            deliveryFee: order.deliveryFee ?? 0,
            totalAmount: order.totalAmount,
            store: await loadStoreContact(ctx),
          });
        }
      } catch (error) {
        console.error("Failed to schedule delivery email:", error);
      }
    }

    return { success: true };
  },
});

/**
 * Moves the trip along. "delivered" also advances the order itself to delivered; "failed"
 * keeps the order open so staff can reschedule.
 */
export const setDeliveryStatus = mutation({
  args: {
    orderId: v.id("orders"),
    deliveryStatus: deliveryStatusValidator,
    deliveryNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("This order was cancelled.");
    if (args.deliveryStatus === "dispatched" && !order.deliveryDate) {
      throw new Error("Schedule a delivery date before dispatching.");
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      deliveryStatus: args.deliveryStatus,
      fulfilment: "delivery",
      ...(args.deliveryNotes !== undefined
        ? { deliveryNotes: args.deliveryNotes.trim().slice(0, 1000) || undefined }
        : {}),
      // Keep the commercial status in step with the trip, without ever un-cancelling an order.
      ...(args.deliveryStatus === "dispatched" && order.status !== "delivered" ? { status: "shipped" as const } : {}),
      ...(args.deliveryStatus === "delivered" ? { status: "delivered" as const } : {}),
      updatedAt: now,
    });

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "delivery.status",
      category: "sales",
      summary: `${generateOrderCode(args.orderId)} delivery → ${args.deliveryStatus}${args.deliveryNotes?.trim() ? ` (${args.deliveryNotes.trim().slice(0, 120)})` : ""}`,
      entityTable: "orders",
      entityId: args.orderId,
    });
    return { success: true };
  },
});

/** Totals for the top of the Deliveries page: fees earned and what's still out there. */
export const getDeliverySummary = query({
  args: { from: v.optional(v.number()) },
  handler: async (ctx, { from }) => {
    await requireStaff(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) => (from !== undefined ? q.gte("createdAt", from) : q))
      .order("desc")
      .take(1500);

    let feesBilled = 0;
    let outstanding = 0;
    let openTrips = 0;
    for (const order of orders) {
      if (orderFulfilment(order) !== "delivery" || order.status === "cancelled") continue;
      feesBilled += order.deliveryFee ?? 0;
      const status = order.deliveryStatus ?? "unscheduled";
      if (status !== "delivered") {
        openTrips += 1;
        outstanding += Math.max(0, order.totalAmount - (order.amountPaid ?? 0));
      }
    }
    return { feesBilled, feesBilledLabel: formatPeso(feesBilled), outstanding, openTrips };
  },
});
