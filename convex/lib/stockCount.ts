import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logStockMovement } from "./stockLog";

/**
 * Sets a product's available stock to a counted/edited number and keeps its batches in step, so
 * `products.stock` and the batch totals (stockRecords: currentQty − reservedQty) agree again.
 * Logs one "adjustment" movement (before → after, with the note) for the audit trail.
 *  - more than the batches hold: the difference is added to the newest batch (one is created if none)
 *  - less: the difference is removed from the oldest batches first (reserved units are untouched)
 */
export async function setCountedStock(ctx: MutationCtx, product: Doc<"products">, counted: number, note: string) {
  const target = Math.max(0, Math.floor(counted));
  const now = Date.now();
  const batches = (
    await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect()
  ).filter((b) => !b.isMortalityLoss);
  const free = (b: Doc<"stockRecords">) => Math.max(0, b.currentQty - b.reservedQty);
  const batchTotal = batches.filter((b) => b.status !== "damaged" && b.status !== "expired").reduce((s, b) => s + free(b), 0);

  let delta = target - batchTotal;
  let homeBatch: Doc<"stockRecords"> | undefined = [...batches].sort((a, b) => b.createdAt - a.createdAt)[0];

  if (delta > 0) {
    const receivable = [...batches]
      .filter((b) => b.status === "active" || b.status === "depleted")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (receivable) {
      await ctx.db.patch(receivable._id, { currentQty: receivable.currentQty + delta, status: "active", updatedAt: now });
      homeBatch = receivable;
    } else {
      homeBatch = (await ctx.db.get(await createBatch(ctx, product, delta, note, now)))!;
    }
  } else if (delta < 0) {
    for (const b of [...batches].filter((x) => x.status === "active").sort((a, c) => a.createdAt - c.createdAt)) {
      if (delta >= 0) break;
      const take = Math.min(-delta, free(b));
      if (take <= 0) continue;
      const currentQty = b.currentQty - take;
      await ctx.db.patch(b._id, { currentQty, status: currentQty === 0 ? "depleted" : b.status, updatedAt: now });
      delta += take;
    }
  }

  if (!homeBatch) homeBatch = (await ctx.db.get(await createBatch(ctx, product, 0, note, now)))!;

  await ctx.db.patch(product._id, { stock: target, updatedAt: now });
  if (target !== product.stock || target !== batchTotal) {
    await logStockMovement(
      ctx,
      {
        stockRecordId: homeBatch._id,
        productId: product._id,
        batchCode: homeBatch.batchCode,
        movementType: "adjustment",
        quantityBefore: product.stock,
        quantityChange: target - product.stock,
        quantityAfter: target,
        createdAt: now,
      },
      { note: target !== batchTotal && batchTotal !== product.stock ? `${note} (batches held ${batchTotal})` : note },
    );
  }
  return { before: product.stock, batchTotalBefore: batchTotal, after: target };
}

async function createBatch(ctx: MutationCtx, product: Doc<"products">, qty: number, note: string, now: number): Promise<Id<"stockRecords">> {
  const category = await ctx.db.get(product.categoryId);
  const lower = (category?.name ?? "").toLowerCase();
  const kind = lower.includes("fish") || lower.includes("aquatic") ? "fish" : lower.includes("tank") || lower.includes("aquarium") ? "tank" : "accessory";
  const d = new Date(now);
  const batchCode = `BATCH-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  return await ctx.db.insert("stockRecords", {
    productId: product._id,
    batchCode,
    category: kind,
    initialQty: qty,
    currentQty: qty,
    reservedQty: 0,
    soldQty: 0,
    mortalityLossQty: 0,
    returnedQty: 0,
    receivedDate: now,
    status: qty > 0 ? "active" : "depleted",
    notes: `Created by stock count: ${note}`,
    createdAt: now,
    updatedAt: now,
  });
}
