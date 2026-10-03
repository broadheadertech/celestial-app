import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

type T = ReturnType<typeof newTest>;

/** An incoming fish: no stock, 3 arriving, ₱20,000 deposit each. */
async function incomingFish(t: T, over: Record<string, unknown> = {}) {
  const ids = await seedCatalog(t);
  const fish = ids.fish as Id<"products">;
  await t.run((ctx) =>
    ctx.db.patch(fish, {
      stock: 0,
      preorder: { enabled: true, incomingQty: 3, expectedFrom: "2027-03-01", expectedTo: "2027-03-31", depositAmount: 20000, ...over },
    }),
  );
  return { ids, fish };
}

const CUSTOMER = {
  name: "Juan dela Cruz",
  email: "juan@example.test",
  phone: "09181234567",
};

async function preorder(t: T, productId: Id<"products">, over: Partial<typeof CUSTOMER> & { quantity?: number } = {}) {
  return t.mutation(api.services.preorders.createPreorder, { productId, ...CUSTOMER, ...over });
}

describe("the public pre-order offer", () => {
  test("shows the window, the deposit and the slots left", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const offer = await t.query(api.services.preorders.getPreorderOffer, { productId: fish });
    expect(offer).toMatchObject({
      open: true,
      remaining: 3,
      incomingQty: 3,
      depositPerUnit: 20000,
      expectedLabel: "March 2027",
      productName: "Super Red Arowana",
      price: 200000,
    });
  });

  test("is closed for a fish that's in stock, switched off, or internal-only", async () => {
    const t = newTest();
    const { ids, fish } = await incomingFish(t);
    await t.run((ctx) => ctx.db.patch(fish, { stock: 1 }));
    expect((await t.query(api.services.preorders.getPreorderOffer, { productId: fish }))?.open).toBe(false);

    await t.run((ctx) => ctx.db.patch(fish, { stock: 0, preorder: { enabled: false, incomingQty: 3 } }));
    expect((await t.query(api.services.preorders.getPreorderOffer, { productId: fish }))?.open).toBe(false);

    // An internal product isn't public at all.
    expect(await t.query(api.services.preorders.getPreorderOffer, { productId: ids.inactive as Id<"products"> })).toBeNull();
  });
});

describe("placing a pre-order", () => {
  test("a guest can commit, and it takes no stock", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    expect(res).toMatchObject({ success: true, depositDue: 20000, totalAmount: 200000, quantity: 1 });
    expect(res.reservationCode).toMatch(/^RES-/);

    // The fish is still at zero — nothing was taken out of inventory.
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);

    const row = await t.run((ctx) => ctx.db.get(res.reservationId));
    expect(row).toMatchObject({
      isPreorder: true,
      preorderProductId: fish,
      status: "pending",
      paymentStatus: "unpaid",
      depositDue: 20000,
      totalAmount: 200000,
    });
    expect(row?.allocatedAt).toBeUndefined();

    const notifications = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notifications.some((n) => n.relatedType === "preorder" && n.audience === "staff")).toBe(true);
  });

  test("slots run out, and a stale page can't claim one", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    await preorder(t, fish, { quantity: 2, email: "a@example.test" });
    expect((await t.query(api.services.preorders.getPreorderOffer, { productId: fish }))?.remaining).toBe(1);

    await expect(preorder(t, fish, { quantity: 2, email: "b@example.test" })).rejects.toThrow(/Only one slot/);
    await preorder(t, fish, { quantity: 1, email: "b@example.test" });
    await expect(preorder(t, fish, { quantity: 1, email: "c@example.test" })).rejects.toThrow(/Fully pre-ordered/);
  });

  test("rejects bad contact details, silly quantities and a closed fish", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    await expect(preorder(t, fish, { email: "nope" })).rejects.toThrow(/email/i);
    await expect(preorder(t, fish, { phone: "12" })).rejects.toThrow(/phone/i);
    await expect(preorder(t, fish, { name: " " })).rejects.toThrow(/Name is required/);
    await expect(preorder(t, fish, { quantity: 0 })).rejects.toThrow(/between 1 and/);
    await expect(preorder(t, fish, { quantity: 99 })).rejects.toThrow(/between 1 and/);

    await t.run((ctx) => ctx.db.patch(fish, { preorder: { enabled: false, incomingQty: 3 } }));
    await expect(preorder(t, fish)).rejects.toThrow(/Not open for pre-order/);
  });

  test("a percentage deposit is charged on the real price", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t, { depositAmount: undefined, depositPercent: 15 });
    const res = await preorder(t, fish, { quantity: 2 });
    // 15% of ₱200,000, twice.
    expect(res.depositDue).toBe(60000);
    expect(res.totalAmount).toBe(400000);
  });
});

describe("when the shipment lands", () => {
  test("receiving stock fills the queue, deposits first, and the fish leaves inventory", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const unpaid = await preorder(t, fish, { email: "early-unpaid@example.test" });
    const paid = await preorder(t, fish, { email: "later-paid@example.test" });
    // The second customer actually paid their deposit.
    await t.run((ctx) => ctx.db.patch(paid.reservationId, { amountPaid: 20000, paymentStatus: "partial" }));

    const staff = await signedInAs(t, "admin");
    await staff.as.mutation(api.services.stock.restockProduct, {
      productId: fish,
      quantity: 1,
      actualCostPrice: 120000,
      fundingSource: "investment",
    });
    // Allocation is scheduled, so let it run.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const [first, second, product] = await t.run((ctx) =>
      Promise.all([ctx.db.get(paid.reservationId), ctx.db.get(unpaid.reservationId), ctx.db.get(fish)]),
    );
    // Only one arrived, and it went to the customer who paid.
    expect(first).toMatchObject({ status: "confirmed" });
    expect(first?.allocatedAt).toBeGreaterThan(0);
    expect(second?.allocatedAt).toBeUndefined();
    expect(second?.status).toBe("pending");
    // That unit is now held for them, not sitting in sellable stock.
    expect(product?.stock).toBe(0);
  });

  test("a partial shipment never part-fills one pre-order", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const big = await preorder(t, fish, { quantity: 2, email: "big@example.test" });
    const staff = await signedInAs(t, "admin");

    // One fish arrives, but they asked for two.
    await t.run((ctx) => ctx.db.patch(fish, { stock: 1 }));
    const result = await staff.as.mutation(api.services.preorders.allocatePreorders, { productId: fish });
    expect(result).toEqual({ allocated: 0, units: 0 });
    expect((await t.run((ctx) => ctx.db.get(big.reservationId)))?.allocatedAt).toBeUndefined();
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(1);

    // The second one turns up, and now it can be filled.
    await t.run((ctx) => ctx.db.patch(fish, { stock: 2 }));
    expect(await staff.as.mutation(api.services.preorders.allocatePreorders, { productId: fish })).toEqual({ allocated: 1, units: 2 });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);
  });

  test("allocating is staff-only and is audited", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    await preorder(t, fish);
    await t.run((ctx) => ctx.db.patch(fish, { stock: 1 }));

    expect(await authErrorCode(t.mutation(api.services.preorders.allocatePreorders, { productId: fish }))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.mutation(api.services.preorders.allocatePreorders, { productId: fish }))).toBe("FORBIDDEN");

    const staff = await signedInAs(t, "admin");
    await staff.as.mutation(api.services.preorders.allocatePreorders, { productId: fish });
    const actions = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(actions).toContain("preorder.allocate");
  });
});

describe("cancelling must never invent stock", () => {
  test("cancelling an un-allocated pre-order leaves stock alone", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    const staff = await signedInAs(t, "admin");

    const out = await staff.as.mutation(api.services.preorders.cancelPreorder, { reservationId: res.reservationId, reason: "Changed their mind" });
    expect(out).toMatchObject({ success: true, depositToRefund: 0 });
    // The critical assertion: no stock was conjured out of a fish that never arrived.
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);
    expect((await t.run((ctx) => ctx.db.get(res.reservationId)))?.status).toBe("cancelled");
    // And the slot is free again.
    expect((await t.query(api.services.preorders.getPreorderOffer, { productId: fish }))?.remaining).toBe(3);
  });

  test("cancelling an allocated pre-order does put its stock back", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    const staff = await signedInAs(t, "admin");
    await t.run((ctx) => ctx.db.patch(fish, { stock: 1 }));
    await staff.as.mutation(api.services.preorders.allocatePreorders, { productId: fish });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);

    await staff.as.mutation(api.services.preorders.cancelPreorder, { reservationId: res.reservationId, reason: "Fell through" });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(1);
  });

  test("the admin reservation-status route also respects the invariant", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    const staff = await signedInAs(t, "admin");

    // Cancelling through the ordinary reservations screen must behave the same way.
    await staff.as.mutation(api.services.reservations.updateReservationStatus, {
      reservationId: res.reservationId,
      status: "cancelled",
    });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);
  });

  test("the expiry sweep can't invent stock from an un-allocated pre-order", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    const staff = await signedInAs(t, "admin");
    // Force it into the sweep's sights: expired, and "confirmed" like an allocated one.
    await t.run((ctx) => ctx.db.patch(res.reservationId, { status: "confirmed", expiryDate: Date.now() - 1000 }));

    await staff.as.mutation(api.services.reservations.cleanupExpiredReservations, {});
    expect((await t.run((ctx) => ctx.db.get(res.reservationId)))?.status).toBe("expired");
    expect((await t.run((ctx) => ctx.db.get(fish)))?.stock).toBe(0);
  });

  test("an ordinary reservation still gets its stock back when it expires", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const gear = ids.gear as Id<"products">;
    const staff = await signedInAs(t, "admin");
    const created = await staff.as.mutation(api.services.reservations.createReservation, {
      guestId: "guest-ana",
      items: [{ productId: gear, quantity: 2, reservedPrice: 1500 }],
      totalAmount: 3000,
      totalQuantity: 2,
      guestInfo: { name: "Ana", email: "ana@example.test", phone: "09181234567" },
    });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(8);

    const reservationId = (created as { reservationId: Id<"reservations"> }).reservationId;
    await t.run((ctx) => ctx.db.patch(reservationId, { status: "confirmed", expiryDate: Date.now() - 1000 }));
    await staff.as.mutation(api.services.reservations.cleanupExpiredReservations, {});
    // The guard must not have broken the normal path.
    expect((await t.run((ctx) => ctx.db.get(gear)))?.stock).toBe(10);
  });

  test("a real reservation can't be cancelled through the pre-order route", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const staff = await signedInAs(t, "admin");
    const created = await staff.as.mutation(api.services.reservations.createReservation, {
      guestId: "guest-ana",
      items: [{ productId: ids.gear as Id<"products">, quantity: 1, reservedPrice: 1500 }],
      totalAmount: 1500,
      totalQuantity: 1,
      guestInfo: { name: "Ana", email: "ana@example.test", phone: "09181234567" },
    });
    const reservationId = (created as { reservationId: Id<"reservations"> }).reservationId;
    await expect(
      staff.as.mutation(api.services.preorders.cancelPreorder, { reservationId, reason: "test" }),
    ).rejects.toThrow(/isn't a pre-order/);
  });
});

describe("the staff queue", () => {
  test("is staff-only, and groups who is waiting per fish", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const first = await preorder(t, fish, { email: "first@example.test" });
    await preorder(t, fish, { email: "second@example.test" });
    await t.run((ctx) => ctx.db.patch(first.reservationId, { amountPaid: 20000, paymentStatus: "partial" }));

    expect(await authErrorCode(t.query(api.services.preorders.getPreorderQueue, {}))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.preorders.getPreorderQueue, {}))).toBe("FORBIDDEN");

    const staff = await signedInAs(t, "admin");
    const [group] = await staff.as.query(api.services.preorders.getPreorderQueue, {});
    expect(group).toMatchObject({
      productName: "Super Red Arowana",
      incomingQty: 3,
      committed: 2,
      remaining: 1,
      depositPerUnit: 20000,
      expectedLabel: "March 2027",
      enabled: true,
    });
    // The paid deposit is first in line.
    expect(group.waiting.map((w) => w.email)).toEqual(["first@example.test", "second@example.test"]);

    expect(await staff.as.query(api.services.preorders.getPreorderSummary, {})).toMatchObject({
      waiting: 2,
      units: 2,
      depositsCollected: 20000,
      depositsOutstanding: 20000,
      committedValue: 400000,
    });
  });
});

describe("the customer can follow it", () => {
  test("the pre-order is trackable with its code and email", async () => {
    const t = newTest();
    const { fish } = await incomingFish(t);
    const res = await preorder(t, fish);
    const tracked = await t.query(api.services.tracking.trackByCode, { code: res.reservationCode, email: CUSTOMER.email });
    if (tracked?.kind !== "reservation") throw new Error("expected a reservation");
    expect(tracked).toMatchObject({ status: "pending", total: 200000 });
    await expect(t.query(api.services.tracking.trackByCode, { code: res.reservationCode, email: "nope@example.test" })).resolves.toBeNull();
  });
});
