import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { hashPassword } from "../../convex/lib/password";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const PASSWORD = "correct horse 42";

/** Corrections are super-admin only, so these tests sign in as one. */
async function staffWithPassword(t: ReturnType<typeof newTest>, role: "admin" | "super_admin" = "super_admin") {
  const staff = await signedInAs(t, role);
  const passwordHash = await hashPassword(PASSWORD);
  await t.run((ctx) => ctx.db.patch(staff.userId, { passwordHash }));
  return staff;
}

describe("sale corrections", () => {
  test("sales can be backdated, but not into the future", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    const threeDaysAgo = Date.now() - 3 * 86_400_000;
    const { orderId } = await admin.as.mutation(api.services.orders.adminCreateOrder, {
      items: [{ productId: gear, quantity: 1 }],
      paymentMethod: "cash",
      orderDate: threeDaysAgo,
    });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.createdAt).toBe(threeDaysAgo);
    expect(order?.enteredAt).toBeGreaterThan(threeDaysAgo);
    await expect(
      admin.as.mutation(api.services.orders.adminCreateOrder, {
        items: [{ productId: gear, quantity: 1 }],
        paymentMethod: "cash",
        orderDate: Date.now() + 86_400_000,
      }),
    ).rejects.toThrow(/future/);
  });

  test("void needs the right password and a reason, returns stock and keeps the record", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await staffWithPassword(t);
    const gear = ids.gear as Id<"products">;
    const { orderId } = await admin.as.mutation(api.services.orders.adminCreateOrder, { items: [{ productId: gear, quantity: 3 }], paymentMethod: "cash" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(7);

    // Paid sales can't be cancelled from the status menu.
    await expect(admin.as.mutation(api.services.orders.updateOrderStatus, { orderId, status: "cancelled" })).rejects.toThrow(/Void/);
    await expect(admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: PASSWORD, reason: "" })).rejects.toThrow(/reason/);
    expect(await admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: "nope", reason: "wrong customer" })).toEqual({
      ok: false,
      error: "Wrong password.",
    });
    expect((await t.run((ctx) => ctx.db.get(orderId)))?.status).not.toBe("cancelled");

    const res = await admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: PASSWORD, reason: "Rang up twice" });
    expect(res.ok).toBe(true);
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order).toMatchObject({ status: "cancelled", voidReason: "Rang up twice", voidedByName: "Test super_admin" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(10);
    const audit = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(audit).toContain("order.void");
  });

  test("five wrong passwords lock corrections", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await staffWithPassword(t);
    const { orderId } = await admin.as.mutation(api.services.orders.adminCreateOrder, {
      items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
      paymentMethod: "cash",
    });
    for (let i = 0; i < 5; i++) await admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: "x", reason: "test" });
    const locked = await admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: PASSWORD, reason: "test" });
    expect(locked).toMatchObject({ ok: false, error: expect.stringMatching(/Too many wrong passwords/) });
  });

  test("correcting a sale voids it and re-enters it at the original price and date", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await staffWithPassword(t);
    const gear = ids.gear as Id<"products">;
    const saleDate = Date.now() - 2 * 86_400_000;
    const { orderId } = await admin.as.mutation(api.services.orders.adminCreateOrder, {
      items: [{ productId: gear, quantity: 2 }],
      paymentMethod: "cash",
      orderDate: saleDate,
    });
    await t.run((ctx) => ctx.db.patch(gear, { price: 2000 })); // price went up since

    const res = await admin.as.mutation(api.services.salesCorrections.correctSale, {
      orderId,
      password: PASSWORD,
      reason: "Customer bought 3, not 2",
      items: [{ productId: gear, quantity: 3 }],
      paymentMethod: "gcash",
    });
    if (!res.ok) throw new Error(res.error);
    const [oldOrder, newOrder, product] = await t.run((ctx) => Promise.all([ctx.db.get(orderId), ctx.db.get(res.orderId), ctx.db.get(gear)]));
    expect(oldOrder).toMatchObject({ status: "cancelled", correctedBy: res.orderId });
    expect(newOrder).toMatchObject({ correctionOf: orderId, totalAmount: 4500, paymentStatus: "paid", amountPaid: 4500, paymentMethod: "gcash", createdAt: saleDate });
    expect(product?.stock).toBe(7);
  });
});

describe("delivery corrections", () => {
  test("correct quantity and cost; can't go below what was sold; void only when untouched", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await staffWithPassword(t);
    const gear = ids.gear as Id<"products">;
    // Put the seed stock on record first so FIFO sales draw from real batches.
    await admin.as.mutation(api.services.stockAudit.recordStockCount, { productId: gear, counted: 0 });
    await admin.as.mutation(api.services.stock.restockProduct, { productId: gear, quantity: 20, actualCostPrice: 900, fundingSource: "investment", supplier: "Aqua" });
    const delivery = (await admin.as.query(api.services.restockCorrections.getRecentDeliveries, {})).find((d) => d.initialQty === 20)!;
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(20);

    // Typo: it was 12 at ₱950, not 20 at ₱900.
    const res = await admin.as.mutation(api.services.restockCorrections.correctDelivery, {
      stockRecordId: delivery.stockRecordId,
      password: PASSWORD,
      reason: "Typo on quantity",
      quantity: 12,
      actualCostPrice: 950,
    });
    expect(res.ok).toBe(true);
    const product = await t.run((ctx) => ctx.db.get(gear));
    expect(product?.stock).toBe(12);
    expect(product?.movingAverageCost).toBe(950);
    const moves = (await admin.as.query(api.services.stockAudit.getStockActivity, { movementType: "adjustment" })).rows;
    expect(moves[0]).toMatchObject({ quantityChange: -8, performedByName: "Test super_admin" });

    // Sell 5 from it: it can no longer go below 5, and can't be voided.
    await admin.as.mutation(api.services.orders.adminCreateOrder, { items: [{ productId: gear, quantity: 5 }], paymentMethod: "cash" });
    const after = (await admin.as.query(api.services.restockCorrections.getRecentDeliveries, {})).find((d) => d.stockRecordId === delivery.stockRecordId)!;
    expect(after.usedQty).toBe(5);
    await expect(
      admin.as.mutation(api.services.restockCorrections.correctDelivery, { stockRecordId: delivery.stockRecordId, password: PASSWORD, reason: "test", quantity: 4 }),
    ).rejects.toThrow(/can't be less than 5/);
    await expect(
      admin.as.mutation(api.services.restockCorrections.voidDelivery, { stockRecordId: delivery.stockRecordId, password: PASSWORD, reason: "test" }),
    ).rejects.toThrow(/can't be voided/);
  });

  test("voiding an untouched delivery removes its stock and keeps the record", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await staffWithPassword(t);
    const gear = ids.gear as Id<"products">;
    await admin.as.mutation(api.services.stock.restockProduct, { productId: gear, quantity: 6, actualCostPrice: 900, fundingSource: "investment" });
    const delivery = (await admin.as.query(api.services.restockCorrections.getRecentDeliveries, {})).find((d) => d.initialQty === 6)!;
    expect(await admin.as.mutation(api.services.restockCorrections.voidDelivery, { stockRecordId: delivery.stockRecordId, password: "bad", reason: "dup" })).toEqual({
      ok: false,
      error: "Wrong password.",
    });
    expect((await admin.as.mutation(api.services.restockCorrections.voidDelivery, { stockRecordId: delivery.stockRecordId, password: PASSWORD, reason: "Entered twice" })).ok).toBe(true);
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(10);
    const voided = (await admin.as.query(api.services.restockCorrections.getRecentDeliveries, {})).find((d) => d.stockRecordId === delivery.stockRecordId)!;
    expect(voided).toMatchObject({ voidReason: "Entered twice", voidedByName: "Test super_admin", initialQty: 0 });
  });
});

describe("super-admin-only actions", () => {
  test("a plain admin can't void sales, correct deliveries, delete products or open finance", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const boss = await staffWithPassword(t);
    const admin = await staffWithPassword(t, "admin");
    const gear = ids.gear as Id<"products">;
    const { orderId } = await admin.as.mutation(api.services.orders.adminCreateOrder, { items: [{ productId: gear, quantity: 1 }], paymentMethod: "cash" });
    await admin.as.mutation(api.services.stock.restockProduct, { productId: gear, quantity: 4, actualCostPrice: 900, fundingSource: "investment" });
    const delivery = (await admin.as.query(api.services.restockCorrections.getRecentDeliveries, {})).find((d) => d.initialQty === 4)!;

    expect(await authErrorCode(admin.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: PASSWORD, reason: "test" }))).toBe("FORBIDDEN");
    expect(await authErrorCode(admin.as.mutation(api.services.restockCorrections.voidDelivery, { stockRecordId: delivery.stockRecordId, password: PASSWORD, reason: "test" }))).toBe("FORBIDDEN");
    expect(await authErrorCode(admin.as.mutation(api.services.admin.deleteProduct, { id: ids.gearAsEnquire as Id<"products"> }))).toBe("FORBIDDEN");
    expect(await authErrorCode(admin.as.query(api.services.finance.getFinancialSummary, {}))).toBe("FORBIDDEN");
    expect(await authErrorCode(admin.as.query(api.services.cashAdjustments.getCashAdjustments, {}))).toBe("FORBIDDEN");

    // The super admin can do all of it.
    expect((await boss.as.mutation(api.services.salesCorrections.voidSale, { orderId, password: PASSWORD, reason: "test" })).ok).toBe(true);
    expect((await boss.as.mutation(api.services.restockCorrections.voidDelivery, { stockRecordId: delivery.stockRecordId, password: PASSWORD, reason: "test" })).ok).toBe(true);
    await boss.as.mutation(api.services.admin.deleteProduct, { id: ids.gearAsEnquire as Id<"products"> });
    expect(await boss.as.query(api.services.cashAdjustments.getCashAdjustments, {})).toEqual([]);
  });
});
