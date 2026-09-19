import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireStaff } from "../lib/authz";
import { confirmStaffPassword, requireReason } from "../lib/staffConfirm";
import { fullName, logStockMovement } from "../lib/stockLog";
import { recordAudit } from "./audit";

/**
 * Deliveries (restock batches) are corrected, never silently edited: correcting the quantity,
 * unit cost or supplier, or voiding a delivery entered by mistake, needs the staff member's own
 * password and a reason. Quantity changes add to / subtract from the product's stock, are logged as
 * stock movements (Inventory Audit) and in the audit log, and the product's average cost is
 * recalculated.
 */

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

/** Staff: recent deliveries (restocks and initial stock), newest first, with how much is still unsold. */
export const getRecentDeliveries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 60 }) => {
    await requireStaff(ctx);
    const batches = await ctx.db
      .query("stockRecords")
      .withIndex("by_received_date")
      .order("desc")
      .take(Math.min(Math.max(limit, 1), 200) * 2);
    const rows = [];
    for (const b of batches) {
      if (b.isMortalityLoss) continue;
      const product = await ctx.db.get(b.productId);
      rows.push({
        stockRecordId: b._id,
        productId: b.productId,
        productName: product?.name ?? "Deleted product",
        batchCode: b.batchCode,
        receivedDate: b.receivedDate,
        initialQty: b.initialQty,
        currentQty: b.currentQty,
        reservedQty: b.reservedQty,
        // Units that left this delivery (sold, lost, used) — a correction can't go below this.
        usedQty: Math.max(0, b.initialQty - b.currentQty),
        actualCostPrice: b.actualCostPrice,
        supplier: b.supplier,
        fundingSource: b.fundingSource,
        isRestock: b.isRestock ?? false,
        notes: b.notes,
        voidedAt: b.voidedAt,
        voidedByName: b.voidedByName,
        voidReason: b.voidReason,
      });
      if (rows.length >= limit) break;
    }
    return rows;
  },
});

/** Average cost of what's left on hand, from each batch's own cost. */
async function recomputeAverageCost(ctx: MutationCtx, productId: Id<"products">, fallback?: number) {
  const batches = (
    await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect()
  ).filter((b) => !b.isMortalityLoss && !b.voidedAt && b.currentQty > 0);
  let units = 0;
  let value = 0;
  for (const b of batches) {
    const cost = b.actualCostPrice ?? fallback;
    if (cost === undefined) continue;
    units += b.currentQty;
    value += b.currentQty * cost;
  }
  return units > 0 ? value / units : undefined;
}

async function applyDelta(ctx: MutationCtx, batch: Doc<"stockRecords">, product: Doc<"products">, delta: number, note: string) {
  const now = Date.now();
  const currentQty = batch.currentQty + delta;
  await ctx.db.patch(batch._id, {
    initialQty: batch.initialQty + delta,
    currentQty,
    status: currentQty > 0 ? (batch.status === "depleted" ? "active" : batch.status) : "depleted",
    updatedAt: now,
  });
  const newStock = Math.max(0, product.stock + delta);
  await ctx.db.patch(product._id, { stock: newStock, updatedAt: now });
  await logStockMovement(
    ctx,
    {
      stockRecordId: batch._id,
      productId: product._id,
      batchCode: batch.batchCode,
      movementType: "adjustment",
      quantityBefore: product.stock,
      quantityChange: delta,
      quantityAfter: newStock,
      createdAt: now,
    },
    { note },
  );
}

/** Staff + password: correct a delivery's quantity, unit cost and/or supplier. */
export const correctDelivery = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    password: v.string(),
    reason: v.string(),
    quantity: v.optional(v.number()),
    actualCostPrice: v.optional(v.number()),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, { stockRecordId, password, reason, quantity, actualCostPrice, supplier }) => {
    const why = requireReason(reason);
    const batch = await ctx.db.get(stockRecordId);
    if (!batch || batch.isMortalityLoss) throw new Error("Delivery not found");
    if (batch.voidedAt) throw new Error("This delivery was voided and can't be changed.");
    const product = await ctx.db.get(batch.productId);
    if (!product) throw new Error("Product not found");

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) throw new Error("Quantity must be a whole number, 0 or more");
    if (actualCostPrice !== undefined && (!Number.isFinite(actualCostPrice) || actualCostPrice < 0)) throw new Error("Unit cost can't be negative");
    const delta = quantity === undefined ? 0 : quantity - batch.initialQty;
    if (batch.currentQty + delta < batch.reservedQty) {
      const used = batch.initialQty - batch.currentQty + batch.reservedQty;
      throw new Error(`${used} unit${used === 1 ? " has" : "s have"} already been sold, used or reserved from this delivery, so it can't be less than ${used}.`);
    }
    const newSupplier = supplier === undefined ? batch.supplier : supplier.trim().slice(0, 120) || undefined;
    const costChanged = actualCostPrice !== undefined && actualCostPrice !== batch.actualCostPrice;
    if (delta === 0 && !costChanged && newSupplier === batch.supplier) throw new Error("Nothing to change.");

    const confirm = await confirmStaffPassword(ctx, password);
    if (!confirm.ok) return { ok: false as const, error: confirm.error };
    const staff = confirm.staff;

    const changes: string[] = [];
    if (delta !== 0) changes.push(`qty ${batch.initialQty} → ${quantity}`);
    if (costChanged) changes.push(`unit cost ${batch.actualCostPrice === undefined ? "—" : peso(batch.actualCostPrice)} → ${peso(actualCostPrice!)}`);
    if (newSupplier !== batch.supplier) changes.push(`supplier ${batch.supplier || "—"} → ${newSupplier || "—"}`);

    await ctx.db.patch(batch._id, {
      ...(costChanged ? { actualCostPrice } : {}),
      supplier: newSupplier,
      updatedAt: Date.now(),
    });
    if (delta !== 0) await applyDelta(ctx, (await ctx.db.get(batch._id))!, product, delta, `Delivery corrected (${changes.join(", ")}): ${why}`);
    const mac = await recomputeAverageCost(ctx, product._id, product.costPrice);
    await ctx.db.patch(product._id, { movingAverageCost: mac, updatedAt: Date.now() });

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "restock.correct",
      category: "inventory",
      summary: `Corrected delivery ${batch.batchCode} of ${product.name}: ${changes.join(", ")} — ${why}`,
      entityTable: "stockRecords",
      entityId: batch._id,
      metadata: {
        reason: why,
        by: fullName(staff),
        before: { initialQty: batch.initialQty, actualCostPrice: batch.actualCostPrice, supplier: batch.supplier },
        after: { initialQty: quantity ?? batch.initialQty, actualCostPrice: actualCostPrice ?? batch.actualCostPrice, supplier: newSupplier },
      },
    });
    return { ok: true as const };
  },
});

/** Staff + password: void a delivery entered by mistake. Only possible while none of it has been sold or used. */
export const voidDelivery = mutation({
  args: { stockRecordId: v.id("stockRecords"), password: v.string(), reason: v.string() },
  handler: async (ctx, { stockRecordId, password, reason }) => {
    const why = requireReason(reason);
    const batch = await ctx.db.get(stockRecordId);
    if (!batch || batch.isMortalityLoss) throw new Error("Delivery not found");
    if (batch.voidedAt) throw new Error("This delivery is already voided.");
    const product = await ctx.db.get(batch.productId);
    if (!product) throw new Error("Product not found");
    if (batch.currentQty < batch.initialQty || batch.reservedQty > 0) {
      const used = batch.initialQty - batch.currentQty + batch.reservedQty;
      throw new Error(`${used} unit${used === 1 ? " has" : "s have"} already been sold, used or reserved from this delivery, so it can't be voided. Correct the quantity instead.`);
    }

    const confirm = await confirmStaffPassword(ctx, password);
    if (!confirm.ok) return { ok: false as const, error: confirm.error };
    const staff = confirm.staff;

    const qty = batch.initialQty;
    if (qty > 0) await applyDelta(ctx, batch, product, -qty, `Delivery voided: ${why}`);
    await ctx.db.patch(batch._id, { status: "depleted", voidedAt: Date.now(), voidedByName: fullName(staff), voidReason: why, updatedAt: Date.now() });
    const mac = await recomputeAverageCost(ctx, product._id, product.costPrice);
    await ctx.db.patch(product._id, { movingAverageCost: mac, updatedAt: Date.now() });

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "restock.void",
      category: "inventory",
      summary: `Voided delivery ${batch.batchCode} of ${product.name} (${qty} unit${qty === 1 ? "" : "s"}${batch.actualCostPrice !== undefined ? ` @ ${peso(batch.actualCostPrice)}` : ""}) — ${why}`,
      entityTable: "stockRecords",
      entityId: batch._id,
      metadata: { reason: why, before: { initialQty: qty, actualCostPrice: batch.actualCostPrice, supplier: batch.supplier, fundingSource: batch.fundingSource } },
    });
    return { ok: true as const };
  },
});
