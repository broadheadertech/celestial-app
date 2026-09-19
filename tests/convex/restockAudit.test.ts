import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { suggestedOrderQty } from "../../convex/services/restock";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const lowStockAlerts = (t: ReturnType<typeof newTest>, productId: string) =>
  t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.relatedId === productId && n.title === "Low Stock Alert"));

describe("inventory audit", () => {
  test("stock changes record who made them and why", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;

    await admin.as.mutation(api.services.stock.restockProduct, {
      productId: gear, quantity: 5, actualCostPrice: 800, fundingSource: "investment", supplier: "AquaSupply", notes: "Weekly order",
    });
    const activity = await admin.as.query(api.services.stockAudit.getStockActivity, {});
    const restock = activity.rows.find((r) => r.movementType === "restock");
    expect(restock).toMatchObject({ productName: "Aquarium Light", quantityChange: 5, performedByName: "Test admin" });
    expect(restock?.note).toBe("Supplier: AquaSupply · Weekly order");
    expect(activity.totals.restock).toEqual({ entries: 1, units: 5 });
    expect(activity.people).toEqual([{ name: "Test admin", count: 1 }]);
  });

  test("stock check finds mismatches; a stock count fixes them and is logged", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;

    let check = await admin.as.query(api.services.stockAudit.getStockCheck, {});
    expect(check.noBatches.map((r) => r.productId)).toContain(gear);

    const result = await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 7, note: "shelf B" });
    expect(result).toEqual({ before: 10, batchTotalBefore: 0, after: 7 });
    check = await admin.as.query(api.services.stockAudit.getStockCheck, {});
    expect(check.noBatches.map((r) => r.productId)).not.toContain(gear);
    expect(check.mismatched.map((r) => r.productId)).not.toContain(gear);

    // Drift: product says 7 but its batch says 12 → listed, then a count of 9 brings both to 9.
    await t.run(async (ctx) => {
      const batch = (await ctx.db.query("stockRecords").withIndex("by_product", (q) => q.eq("productId", gear)).first())!;
      await ctx.db.patch(batch._id, { currentQty: 12 });
    });
    check = await admin.as.query(api.services.stockAudit.getStockCheck, {});
    expect(check.mismatched).toEqual([expect.objectContaining({ productId: gear, stock: 7, batchTotal: 12 })]);
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 9 });
    const batchQty = await t.run(async (ctx) =>
      (await ctx.db.query("stockRecords").withIndex("by_product", (q) => q.eq("productId", gear)).collect()).reduce((s, b) => s + b.currentQty, 0),
    );
    expect(batchQty).toBe(9);
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(9);

    const counts = (await admin.as.query(api.services.stockAudit.getStockActivity, { movementType: "adjustment" })).rows;
    expect(counts.map((r) => [r.quantityBefore, r.quantityAfter, r.note])).toEqual([
      [7, 9, "Stock count (batches held 12)"],
      [10, 7, "Stock count: shelf B (batches held 0)"],
    ]);
  });

  test("editing stock in the product form keeps batches in step and is logged", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 10 });
    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, stock: 14 });
    const check = await admin.as.query(api.services.stockAudit.getStockCheck, {});
    expect(check.mismatched).toEqual([]);
    const edit = (await admin.as.query(api.services.stockAudit.getStockActivity, {})).rows[0];
    expect(edit).toMatchObject({ movementType: "adjustment", quantityBefore: 10, quantityAfter: 14, note: "Edited in product form", performedByName: "Test admin" });
  });

  test("low stock raises one staff alert per product per day", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 10 });
    expect(await lowStockAlerts(t, gear)).toHaveLength(0);
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 3 });
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 2 });
    const alerts = await lowStockAlerts(t, gear);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Aquarium Light is running low (3 left)");
  });

  test("staff only", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.stockAudit.getStockActivity, {}))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.query(api.services.restock.getRestockList, {}))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.mutation(api.services.stockAudit.recordStockCount, { productId: ids.gear as Id<"products">, counted: 1 }))).toBe("FORBIDDEN");
  });
});

describe("restock list", () => {
  test("lists low and out-of-stock shop items with a suggested order; ordered marks clear on restock", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;

    const custom = ids.gearAsEnquire as Id<"products">; // stock 2

    // Default alert level 10: light (10) and custom build (2) are listed; the live fish and the inactive item aren't.
    let list = await admin.as.query(api.services.restock.getRestockList, {});
    expect(list.defaultThreshold).toBe(10);
    expect(list.rows.map((r) => [r.productId, r.status, r.suggestedQty])).toEqual([
      [gear, "low", 1],
      [custom, "low", 9],
    ]);
    expect((await admin.as.query(api.services.restock.getRestockList, { includeLiveFish: true })).rows.map((r) => r.productId)).toContain(ids.fish);

    // A product's own alert level overrides the default.
    await admin.as.mutation(api.services.restock.setReorderPoint, { productId: gear, reorderPoint: 5 });
    list = await admin.as.query(api.services.restock.getRestockList, {});
    expect(list.rows.map((r) => r.productId)).toEqual([custom]);
    await admin.as.mutation(api.services.restock.setReorderPoint, { productId: custom, reorderPoint: null });

    // Out of stock ranks first; ordered marks show who ordered and clear when stock arrives.
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: custom, counted: 0 });
    await admin.as.mutation(api.services.restock.setOrdered, { productIds: [custom], ordered: true });
    list = await admin.as.query(api.services.restock.getRestockList, {});
    expect(list.rows[0]).toMatchObject({ productId: custom, status: "out", orderedByName: "Test admin" });

    await admin.as.mutation(api.services.stock.restockProduct, { productId: custom, quantity: 20, actualCostPrice: 30000, fundingSource: "investment", supplier: "GlassWorks" });
    list = await admin.as.query(api.services.restock.getRestockList, {});
    expect(list.rows.find((r) => r.productId === custom)).toBeUndefined();
    const product = await t.run((ctx) => ctx.db.get(custom));
    expect(product?.restockOrderedAt).toBeUndefined();

    // Recent sales pull an item onto the list before it hits its alert level.
    await t.run(async (ctx) => {
      const batch = (await ctx.db.query("stockRecords").withIndex("by_product", (q) => q.eq("productId", custom)).first())!;
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("stockMovements", {
          stockRecordId: batch._id, productId: custom, batchCode: batch.batchCode, movementType: "sale",
          quantityBefore: 30, quantityChange: -30, quantityAfter: 0, createdAt: Date.now() - i * 86_400_000,
        });
      }
    });
    list = await admin.as.query(api.services.restock.getRestockList, {});
    expect(list.rows.find((r) => r.productId === custom)).toMatchObject({ status: "soon", sold30: 90, daysLeft: 6, lastUnitCost: 30000, supplier: "GlassWorks" });
  });

  test("suggested quantity covers ~30 days of sales and gets back above the alert level", () => {
    expect(suggestedOrderQty(2, 10, 0)).toBe(9);
    expect(suggestedOrderQty(0, 5, 2)).toBe(60);
    expect(suggestedOrderQty(0, 1, 1 / 30)).toBe(2);
    expect(suggestedOrderQty(-1, 0, 0)).toBe(1);
  });
});

describe("deleting products", () => {
  test("only products without transactions can be deleted; others are phased out", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    const custom = ids.gearAsEnquire as Id<"products">;

    // No transactions: deletable.
    expect(await admin.as.query(api.services.admin.getProductDeleteCheck, { productId: custom })).toEqual({ canDelete: true, reasons: [], isActive: true });
    await admin.as.mutation(api.services.admin.deleteProduct, { id: custom });
    expect(await t.run((ctx) => ctx.db.get(custom))).toBeNull();

    // A stock change makes it part of the records: delete is refused, deactivating works and is audited.
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 8 });
    const check = await admin.as.query(api.services.admin.getProductDeleteCheck, { productId: gear });
    expect(check).toMatchObject({ canDelete: false, reasons: ["1 stock change"] });
    await expect(admin.as.mutation(api.services.admin.deleteProduct, { id: gear })).rejects.toThrow(/can't be deleted.*Deactivate/);
    await admin.as.mutation(api.services.admin.toggleProductStatus, { productId: gear, isActive: false });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.isActive).toBe(false);
    const audit = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(audit).toEqual(expect.arrayContaining(["product.delete", "product.deactivate"]));
  });
});
