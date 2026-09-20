import { v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { confirmStaffPassword, requireReason } from "../lib/staffConfirm";
import { fullName } from "../lib/stockLog";
import { restoreStockHelper } from "./stock";
import { createStaffSale, generateOrderCode, resolveSaleDate } from "./orders";
import { recordAudit } from "./audit";

/**
 * Sales are never edited in place. A mistake is fixed by:
 *  - voidSale: the sale is cancelled (kept on record as voided) and its stock goes back, or
 *  - correctSale: the sale is voided and a corrected copy is created with the same sale date.
 * Both need the staff member's own password and a reason, and both are written to the audit log.
 */

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

async function voidInPlace(ctx: MutationCtx, order: Doc<"orders">, staff: Doc<"users">, reason: string) {
  if (order.status === "cancelled") throw new Error("This sale is already voided or cancelled.");
  // Released (delivered) sales are voided the same way: a typo'd sale's items go back to stock.
  const now = Date.now();
  for (const item of order.items) {
    const product = await ctx.db.get(item.productId);
    if (!product) continue;
    await ctx.db.patch(item.productId, { stock: product.stock + item.quantity, updatedAt: now });
    await restoreStockHelper(ctx, { productId: item.productId, quantity: item.quantity });
  }
  await ctx.db.patch(order._id, {
    status: "cancelled",
    voidedAt: now,
    voidedByName: fullName(staff),
    voidReason: reason,
    updatedAt: now,
  });
}

/** Staff + password: void a sale. Stock is returned; the order stays on record, marked voided. */
export const voidSale = mutation({
  args: { orderId: v.id("orders"), password: v.string(), reason: v.string() },
  handler: async (ctx, { orderId, password, reason }) => {
    const why = requireReason(reason);
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("This sale is already voided or cancelled.");

    const confirm = await confirmStaffPassword(ctx, password, { superAdminOnly: true });
    if (!confirm.ok) return { ok: false as const, error: confirm.error };
    const staff = confirm.staff;

    await voidInPlace(ctx, order, staff, why);
    const code = generateOrderCode(orderId);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "order.void",
      category: "sales",
      summary: `Voided sale ${code} (${peso(order.totalAmount)}) — ${why}`,
      entityTable: "orders",
      entityId: orderId,
      amount: order.totalAmount,
      metadata: { reason: why, before: { items: order.items, totalAmount: order.totalAmount, paymentMethod: order.paymentMethod, createdAt: order.createdAt } },
    });
    return { ok: true as const, orderCode: code };
  },
});

/**
 * Staff + password: void a sale and re-enter it with corrections (items, quantities, discounts,
 * payment method, customer, notes or date). The new sale keeps the original date unless a new one
 * is given, and both sales point at each other.
 */
export const correctSale = mutation({
  args: {
    orderId: v.id("orders"),
    password: v.string(),
    reason: v.string(),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number(), discount: v.optional(v.number()) })),
    orderDiscount: v.optional(v.number()),
    paymentMethod: v.string(),
    customerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    orderDate: v.optional(v.number()),
  },
  handler: async (ctx, { orderId, password, reason, orderDate, ...changes }) => {
    const why = requireReason(reason);
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("This sale is already voided — create a new sale instead.");
    if (changes.items.length === 0) throw new Error("A corrected sale needs at least one item. To cancel the sale, use Void.");

    const confirm = await confirmStaffPassword(ctx, password, { superAdminOnly: true });
    if (!confirm.ok) return { ok: false as const, error: confirm.error };
    const staff = confirm.staff;

    const createdAt = orderDate === undefined ? order.createdAt : resolveSaleDate(orderDate, Date.now());
    // Return the original stock first, so the corrected quantities can reuse it.
    await voidInPlace(ctx, order, staff, `Corrected — ${why}`);
    const sale = await createStaffSale(
      ctx,
      {
        userId: order.userId,
        // Items already on the sale keep the price they were sold at; new items use today's price.
        items: changes.items.map((item) => {
          const original = order.items.find((o) => o.productId === item.productId);
          return { ...item, listPrice: original ? (original.originalPrice ?? original.price + (original.discount ?? 0)) : undefined };
        }),
        orderDiscount: changes.orderDiscount,
        paymentMethod: changes.paymentMethod,
        notes: changes.notes,
        customerName: changes.customerName,
        salesAssociateId: order.salesAssociateId,
        salesAssociateName: order.salesAssociateName,
      },
      { createdAt, correctionOf: orderId },
    );
    // A paid sale stays paid at its corrected total; otherwise keep what was collected.
    const wasPaidInFull = order.paymentStatus === "paid" || (order.amountPaid ?? 0) >= order.totalAmount;
    const collected = order.amountPaid ?? 0;
    await ctx.db.patch(sale.orderId, {
      status: order.status === "pending" ? "pending" : order.status,
      paymentStatus: wasPaidInFull ? "paid" : collected > 0 ? (collected >= sale.totalAmount ? "paid" : "partial") : "unpaid",
      amountPaid: wasPaidInFull ? sale.totalAmount : Math.min(collected, sale.totalAmount),
    });
    await ctx.db.patch(orderId, { correctedBy: sale.orderId });

    const oldCode = generateOrderCode(orderId);
    const newCode = generateOrderCode(sale.orderId);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "order.correct",
      category: "sales",
      summary: `Corrected sale ${oldCode} → ${newCode} (${peso(order.totalAmount)} → ${peso(sale.totalAmount)}) — ${why}`,
      entityTable: "orders",
      entityId: sale.orderId,
      amount: sale.totalAmount,
      metadata: {
        reason: why,
        voidedOrderId: orderId,
        before: { items: order.items, totalAmount: order.totalAmount, paymentMethod: order.paymentMethod, customerName: order.customerName, createdAt: order.createdAt },
        after: { items: sale.orderItems, totalAmount: sale.totalAmount, paymentMethod: changes.paymentMethod, customerName: changes.customerName, createdAt },
      },
    });
    return { ok: true as const, orderId: sale.orderId as Id<"orders">, orderCode: newCode };
  },
});
