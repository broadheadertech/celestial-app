import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireStaff } from "../lib/authz";
import { setCountedStock } from "../lib/stockCount";
import { recordAudit } from "./audit";

const DAY = 24 * 60 * 60 * 1000;
const MAX_ROWS = 1000;

const MOVEMENT_TYPE = v.union(
  v.literal("initial"), v.literal("purchase"), v.literal("restock"), v.literal("sale"), v.literal("reservation"),
  v.literal("return"), v.literal("damage"), v.literal("adjustment"), v.literal("transfer"), v.literal("expiry"),
  v.literal("internal_use"),
);

/**
 * Staff: every stock change in the last `days` days (newest first) with product, who did it and
 * the note entered, plus totals per kind of change and per person. Older rows (before who/why
 * were recorded) show no person.
 */
export const getStockActivity = query({
  args: {
    days: v.optional(v.number()),
    movementType: v.optional(MOVEMENT_TYPE),
    productId: v.optional(v.id("products")),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, { days = 7, movementType, productId, performedByName }) => {
    await requireStaff(ctx);
    const span = Math.min(Math.max(Math.floor(days), 1), 365);
    const since = Date.now() - span * DAY;

    const all = await ctx.db
      .query("stockMovements")
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .order("desc")
      .take(5000);

    // Totals cover the whole period (before the type/person filters), so the summary stays useful.
    const totals: Record<string, { entries: number; units: number }> = {};
    const people = new Map<string, number>();
    for (const m of all) {
      const t = (totals[m.movementType] ??= { entries: 0, units: 0 });
      t.entries += 1;
      t.units += m.quantityChange;
      const who = m.performedByName ?? "Customer / system";
      people.set(who, (people.get(who) ?? 0) + 1);
    }

    const filtered = all.filter(
      (m) =>
        (!movementType || m.movementType === movementType) &&
        (!productId || m.productId === productId) &&
        (!performedByName || (m.performedByName ?? "Customer / system") === performedByName),
    );
    const rows = filtered.slice(0, MAX_ROWS);

    const productCache = new Map<string, Doc<"products"> | null>();
    const categoryCache = new Map<string, string>();
    const out = [];
    for (const m of rows) {
      if (!productCache.has(m.productId)) productCache.set(m.productId, await ctx.db.get(m.productId));
      const p = productCache.get(m.productId);
      let categoryName = "";
      if (p) {
        if (!categoryCache.has(p.categoryId)) categoryCache.set(p.categoryId, (await ctx.db.get(p.categoryId))?.name ?? "");
        categoryName = categoryCache.get(p.categoryId) ?? "";
      }
      out.push({
        _id: m._id,
        createdAt: m.createdAt,
        movementType: m.movementType,
        quantityChange: m.quantityChange,
        quantityBefore: m.quantityBefore,
        quantityAfter: m.quantityAfter,
        batchCode: m.batchCode,
        productId: m.productId,
        productName: p?.name ?? "Deleted product",
        sku: p?.sku,
        categoryName,
        performedByName: m.performedByName,
        note: m.note,
      });
    }

    return {
      days: span,
      rows: out,
      totalMatching: filtered.length,
      truncated: filtered.length > MAX_ROWS || all.length >= 5000,
      totals,
      people: [...people.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  },
});

/**
 * Staff: products whose stock number doesn't match what their batches hold (on hand − reserved),
 * and active products with no batch records at all. Fix with recordStockCount after counting.
 */
export const getStockCheck = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    const categories = new Map<string, string>();
    for (const c of await ctx.db.query("categories").collect()) categories.set(c._id, c.name);

    const mismatched = [];
    const noBatches = [];
    for (const p of products) {
      const batches = (
        await ctx.db
          .query("stockRecords")
          .withIndex("by_product", (q) => q.eq("productId", p._id))
          .collect()
      ).filter((b) => !b.isMortalityLoss);
      const row = { productId: p._id, name: p.name, sku: p.sku, categoryName: categories.get(p.categoryId) ?? "", stock: p.stock };
      if (batches.length === 0) {
        noBatches.push(row);
        continue;
      }
      const batchTotal = batches
        .filter((b) => b.status !== "damaged" && b.status !== "expired")
        .reduce((s, b) => s + Math.max(0, b.currentQty - b.reservedQty), 0);
      if (batchTotal !== p.stock) mismatched.push({ ...row, batchTotal });
    }
    mismatched.sort((a, b) => Math.abs(b.stock - b.batchTotal) - Math.abs(a.stock - a.batchTotal));
    return { checked: products.length, mismatched, noBatches };
  },
});

/** Staff: record a physical count; product stock and its batches are set to match, and it's logged. */
export const recordStockCount = mutation({
  args: { productId: v.id("products"), counted: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { productId, counted, note }) => {
    const staff = await requireStaff(ctx);
    if (!Number.isFinite(counted) || counted < 0 || counted > 1_000_000) throw new Error("Enter the number you counted (0 or more)");
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");
    const label = ["Stock count", note?.trim()].filter(Boolean).join(": ");
    const result = await setCountedStock(ctx, product, counted, label);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "stock.count",
      category: "inventory",
      summary: `Counted ${product.name}: ${Math.floor(counted)} (system said ${result.before}, batches ${result.batchTotalBefore})`,
      entityTable: "products",
      entityId: productId,
    });
    return result;
  },
});
