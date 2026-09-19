import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireStaff } from "../lib/authz";
import { fullName } from "../lib/stockLog";
import { recordAudit } from "./audit";

const DAY = 24 * 60 * 60 * 1000;
const SALES_WINDOW_DAYS = 30;
/** Items with sales that will run out within this many days are listed even above their alert level. */
const SOON_DAYS = 7;
const DEFAULT_THRESHOLD = 10;

export type RestockStatus = "out" | "low" | "soon";

/**
 * How much to order: enough for ~30 days at the recent sales rate, and enough to get back above the
 * alert level (so the item leaves the list), minus what is already available. At least 1.
 * Slow sellers therefore get small suggestions; set a lower alert level for big-ticket items.
 */
export function suggestedOrderQty(available: number, threshold: number, soldPerDay: number) {
  const target = Math.max(Math.ceil(soldPerDay * SALES_WINDOW_DAYS), threshold + 1);
  return Math.max(target - Math.max(available, 0), 1);
}

/**
 * Staff: products to reorder — out of stock, at/below their alert level, or selling fast enough to
 * run out within a week. Live fish (one-off specimens) are left out unless `includeLiveFish`.
 * Each row carries recent sales, days of stock left, a suggested quantity and the last supplier/cost.
 */
export const getRestockList = query({
  args: { includeLiveFish: v.optional(v.boolean()) },
  handler: async (ctx, { includeLiveFish = false }) => {
    await requireStaff(ctx);
    const settings = await ctx.db.query("appSettings").first();
    const defaultThreshold = settings?.lowStockThreshold ?? DEFAULT_THRESHOLD;

    const categories = new Map<string, string>();
    for (const c of await ctx.db.query("categories").collect()) categories.set(c._id, c.name);

    const since = Date.now() - SALES_WINDOW_DAYS * DAY;
    const sold = new Map<string, number>();
    const recentSales = await ctx.db
      .query("stockMovements")
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .collect();
    for (const m of recentSales) {
      if (m.movementType === "sale") sold.set(m.productId, (sold.get(m.productId) ?? 0) - m.quantityChange);
      if (m.movementType === "return" && m.quantityChange > 0) sold.set(m.productId, (sold.get(m.productId) ?? 0) - m.quantityChange);
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const rows = [];
    for (const p of products) {
      const categoryName = categories.get(p.categoryId) ?? "Uncategorized";
      if (!includeLiveFish && categoryName === "Fish") continue;
      const threshold = p.reorderPoint ?? defaultThreshold;
      const available = p.stock;
      const sold30 = Math.max(0, sold.get(p._id) ?? 0);
      const perDay = sold30 / SALES_WINDOW_DAYS;
      const daysLeft = perDay > 0 ? Math.floor(Math.max(available, 0) / perDay) : null;
      const status: RestockStatus | null =
        available <= 0 ? "out" : available <= threshold ? "low" : daysLeft !== null && daysLeft <= SOON_DAYS ? "soon" : null;
      if (!status) continue;

      const source = await lastSource(ctx, p);
      rows.push({
        productId: p._id,
        name: p.name,
        displayName: p.displayName,
        sku: p.sku,
        image: p.image,
        categoryName,
        stock: available,
        threshold,
        customThreshold: p.reorderPoint !== undefined,
        status,
        sold30,
        daysLeft,
        suggestedQty: suggestedOrderQty(available, threshold, perDay),
        supplier: source.supplier,
        lastUnitCost: source.unitCost ?? p.movingAverageCost ?? p.costPrice,
        lastRestockAt: source.receivedAt,
        orderedAt: p.restockOrderedAt,
        orderedByName: p.restockOrderedByName,
        visibility: p.visibility ?? "public",
      });
    }

    const rank: Record<RestockStatus, number> = { out: 0, low: 1, soon: 2 };
    rows.sort((a, b) => rank[a.status] - rank[b.status] || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || b.sold30 - a.sold30);
    return { defaultThreshold, windowDays: SALES_WINDOW_DAYS, rows };
  },
});

/** Most recent supplier and unit cost recorded on this product's batches. */
async function lastSource(ctx: { db: import("../_generated/server").QueryCtx["db"] }, product: Doc<"products">) {
  const batches = (
    await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect()
  )
    .filter((b) => !b.isMortalityLoss)
    .sort((a, b) => b.receivedDate - a.receivedDate);
  return {
    supplier: batches.find((b) => b.supplier?.trim())?.supplier?.trim(),
    unitCost: batches.find((b) => b.actualCostPrice !== undefined)?.actualCostPrice,
    receivedAt: batches[0]?.receivedDate,
  };
}

/** Staff: set a product's own alert level (null = use the App Settings default). */
export const setReorderPoint = mutation({
  args: { productId: v.id("products"), reorderPoint: v.union(v.number(), v.null()) },
  handler: async (ctx, { productId, reorderPoint }) => {
    const staff = await requireStaff(ctx);
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");
    if (reorderPoint !== null && (!Number.isFinite(reorderPoint) || reorderPoint < 0 || reorderPoint > 100000)) {
      throw new Error("Alert level must be 0 or more");
    }
    const value = reorderPoint === null ? undefined : Math.floor(reorderPoint);
    await ctx.db.patch(productId, { reorderPoint: value });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "product.reorder_point",
      category: "inventory",
      summary: value === undefined ? `Reset alert level for ${product.name} to default` : `Set alert level for ${product.name} to ${value}`,
      entityTable: "products",
      entityId: productId,
    });
    return null;
  },
});

/** Staff: mark products as ordered from the supplier (or clear it). Restocking clears it too. */
export const setOrdered = mutation({
  args: { productIds: v.array(v.id("products")), ordered: v.boolean() },
  handler: async (ctx, { productIds, ordered }) => {
    const staff = await requireStaff(ctx);
    if (productIds.length > 200) throw new Error("Too many items at once");
    const now = Date.now();
    const names: string[] = [];
    for (const id of productIds) {
      const product = await ctx.db.get(id);
      if (!product) continue;
      await ctx.db.patch(id, ordered ? { restockOrderedAt: now, restockOrderedByName: fullName(staff) } : { restockOrderedAt: undefined, restockOrderedByName: undefined });
      names.push(product.name);
    }
    if (names.length) {
      await recordAudit(ctx, {
        actorId: staff._id,
        action: ordered ? "restock.ordered" : "restock.unordered",
        category: "inventory",
        summary: `${ordered ? "Marked as ordered" : "Cleared ordered mark"}: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` +${names.length - 5} more` : ""}`,
        entityTable: "products",
      });
    }
    return names.length;
  },
});
