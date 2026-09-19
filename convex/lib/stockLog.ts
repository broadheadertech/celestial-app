import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getViewer } from "./authz";

/**
 * The single way to write a stockMovements row. Stamps who made the change (the signed-in staff
 * member or customer; unset for guests and system jobs) plus an optional note, and raises a
 * low-stock alert when stock available for sale drops to the product's alert level.
 */

type Movement = {
  stockRecordId: Id<"stockRecords">;
  productId: Id<"products">;
  batchCode: string;
  movementType:
    | "initial" | "purchase" | "restock" | "sale" | "reservation" | "return"
    | "damage" | "adjustment" | "transfer" | "expiry" | "internal_use";
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  createdAt: number;
};

const DEFAULT_THRESHOLD = 10;
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const fullName = (u: { firstName?: string; lastName?: string; email?: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "Unknown";

export async function logStockMovement(ctx: MutationCtx, movement: Movement, opts: { note?: string } = {}) {
  const viewer = await getViewer(ctx);
  const note = opts.note?.trim().slice(0, 300) || undefined;
  await ctx.db.insert("stockMovements", {
    ...movement,
    performedBy: viewer?._id,
    performedByName: viewer ? fullName(viewer) : undefined,
    note,
  });
  // Reservations reduce what's available even though on-hand stock is unchanged.
  const reducesAvailable = movement.movementType === "reservation" ? movement.quantityChange > 0 : movement.quantityChange < 0;
  if (reducesAvailable) await maybeAlertLowStock(ctx, movement.productId);
}

/** Alert level for a product: its own reorder point, else App Settings, else 10. */
export async function lowStockThreshold(ctx: MutationCtx | { db: MutationCtx["db"] }, product: { reorderPoint?: number }) {
  if (product.reorderPoint !== undefined) return product.reorderPoint;
  const settings = await ctx.db.query("appSettings").first();
  return settings?.lowStockThreshold ?? DEFAULT_THRESHOLD;
}

/**
 * One staff alert per product per day when available stock (on hand minus reserved, across its
 * active batches) is at or below the alert level. Respects App Settings → low-stock notifications.
 */
async function maybeAlertLowStock(ctx: MutationCtx, productId: Id<"products">) {
  const settings = await ctx.db.query("appSettings").first();
  if (settings && settings.notifyLowStock === false) return;
  const product = await ctx.db.get(productId);
  if (!product || !product.isActive) return;

  const batches = await ctx.db
    .query("stockRecords")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();
  const available = batches
    .filter((b) => !b.isMortalityLoss && (b.status === "active" || b.status === "depleted" || b.status === "reserved"))
    .reduce((sum, b) => sum + Math.max(0, b.currentQty - b.reservedQty), 0);
  const threshold = product.reorderPoint ?? settings?.lowStockThreshold ?? DEFAULT_THRESHOLD;
  if (available > threshold) return;

  const since = Date.now() - ALERT_COOLDOWN_MS;
  // Recent alerts are among the newest notifications; a bounded scan keeps this cheap.
  const latest = await ctx.db.query("notifications").order("desc").take(300);
  if (latest.some((n) => n.relatedId === productId && n.title === "Low Stock Alert" && n.createdAt >= since)) return;

  const now = Date.now();
  await ctx.db.insert("notifications", {
    title: "Low Stock Alert",
    message: available <= 0 ? `${product.name} is out of stock` : `${product.name} is running low (${available} left)`,
    type: "alert",
    isRead: false,
    audience: "staff",
    priority: available <= 1 ? "urgent" : "high",
    relatedId: productId,
    relatedType: "product",
    metadata: { productName: product.name },
    createdAt: now,
    updatedAt: now,
  });
}
