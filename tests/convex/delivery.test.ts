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

async function setUpDelivery(t: T, rules: { freeDeliveryThreshold?: number; minimumDeliveryOrder?: number; deliveryEnabled?: boolean } = {}) {
  const staff = await signedInAs(t, "admin");
  await staff.as.mutation(api.services.serviceAreas.updateSettings, {
    deliveryEnabled: rules.deliveryEnabled ?? true,
    homeServiceEnabled: false,
    ...(rules.freeDeliveryThreshold !== undefined ? { freeDeliveryThreshold: rules.freeDeliveryThreshold } : {}),
    ...(rules.minimumDeliveryOrder !== undefined ? { minimumDeliveryOrder: rules.minimumDeliveryOrder } : {}),
  });
  const near = await staff.as.mutation(api.services.serviceAreas.saveArea, {
    name: "Quezon City",
    deliveryFee: 300,
    travelFee: 500,
    deliveryEnabled: true,
    homeServiceEnabled: true,
  });
  const noDelivery = await staff.as.mutation(api.services.serviceAreas.saveArea, {
    name: "Batanes",
    deliveryFee: 5000,
    travelFee: 9000,
    deliveryEnabled: false,
    homeServiceEnabled: false,
  });
  return { staff, areaId: near.areaId, closedAreaId: noDelivery.areaId };
}

const ADDRESS = "88 Katipunan Avenue, Barangay Loyola Heights, Quezon City";

describe("delivery fees at checkout", () => {
  test("the fee comes from the chosen area and is added to the order total", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const { areaId } = await setUpDelivery(t);

    // Light is ₱1,500; two of them plus ₱300 delivery.
    const res = await t.mutation(api.services.orders.placeWebOrder, {
      items: [{ productId: ids.gear as Id<"products">, quantity: 2 }],
      paymentMethod: "cash",
      customerName: "Maria",
      customerEmail: "maria@example.test",
      customerPhone: "09181234567",
      fulfilment: "delivery",
      deliveryAreaId: areaId,
      address: ADDRESS,
    });
    expect(res).toMatchObject({ totalAmount: 3300, deliveryFee: 300 });

    const order = await t.run((ctx) => ctx.db.get(res.orderId));
    expect(order).toMatchObject({
      subtotal: 3000,
      totalAmount: 3300,
      deliveryFee: 300,
      deliveryAreaName: "Quezon City",
      fulfilment: "delivery",
      deliveryStatus: "unscheduled",
      channel: "web",
    });
  });

  test("pickup is charged nothing and never joins the delivery queue", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const { staff, areaId } = await setUpDelivery(t);

    const res = await t.mutation(api.services.orders.placeWebOrder, {
      items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
      paymentMethod: "cash",
      customerName: "Ramon",
      customerEmail: "ramon@example.test",
      fulfilment: "pickup",
      // An area sent with a pickup order must be ignored, not charged.
      deliveryAreaId: areaId,
    });
    const order = await t.run((ctx) => ctx.db.get(res.orderId));
    expect(order).toMatchObject({ totalAmount: 1500, fulfilment: "pickup" });
    expect(order?.deliveryFee).toBeUndefined();
    expect(await staff.as.query(api.services.deliveries.getDeliveries, {})).toEqual([]);
  });

  test("free over the threshold, refused under the minimum or to an area we don't serve", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const { areaId, closedAreaId } = await setUpDelivery(t, { freeDeliveryThreshold: 3000, minimumDeliveryOrder: 1000 });
    const order = (over: Record<string, unknown>) => ({
      items: [{ productId: ids.gear as Id<"products">, quantity: 2 }],
      paymentMethod: "cash",
      customerName: "Maria",
      customerEmail: "maria@example.test",
      fulfilment: "delivery" as const,
      deliveryAreaId: areaId,
      address: ADDRESS,
      ...over,
    });

    // ₱3,000 reaches the free threshold.
    expect(await t.mutation(api.services.orders.placeWebOrder, order({}))).toMatchObject({ totalAmount: 3000, deliveryFee: 0 });

    // The ₱200 product is below the ₱1,000 minimum.
    const cheap = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("products", {
        name: "Fish food sachet",
        price: 200,
        categoryId: ids.gearCat as Id<"categories">,
        image: "https://example.test/f.png",
        stock: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(
      t.mutation(api.services.orders.placeWebOrder, order({ items: [{ productId: cheap, quantity: 1 }] })),
    ).rejects.toThrow(/start at ₱1,000/);

    await expect(t.mutation(api.services.orders.placeWebOrder, order({ deliveryAreaId: closedAreaId }))).rejects.toThrow(/Batanes/);
    await expect(t.mutation(api.services.orders.placeWebOrder, order({ address: "QC" }))).rejects.toThrow(/full delivery address/);
  });

  test("delivery can't be ordered while it's switched off", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const { areaId } = await setUpDelivery(t, { deliveryEnabled: false });
    await expect(
      t.mutation(api.services.orders.placeWebOrder, {
        items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
        paymentMethod: "cash",
        customerName: "Maria",
        fulfilment: "delivery",
        deliveryAreaId: areaId,
        address: ADDRESS,
      }),
    ).rejects.toThrow(/isn't available/i);
  });

  test("an older build of the site (no area picker) still checks out, with the fee quoted by hand", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    await setUpDelivery(t);
    const res = await t.mutation(api.services.orders.placeWebOrder, {
      items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
      paymentMethod: "cash",
      customerName: "Legacy",
      customerEmail: "legacy@example.test",
      notes: "Fulfilment: delivery",
      address: ADDRESS,
    });
    const order = await t.run((ctx) => ctx.db.get(res.orderId));
    expect(order).toMatchObject({ totalAmount: 1500, fulfilment: "delivery", deliveryStatus: "unscheduled" });
    expect(order?.deliveryFee).toBe(0);
  });
});

describe("the delivery queue", () => {
  async function placedOrder(t: T) {
    const ids = await seedCatalog(t);
    const { staff, areaId } = await setUpDelivery(t);
    const res = await t.mutation(api.services.orders.placeWebOrder, {
      items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
      paymentMethod: "cash",
      customerName: "Maria",
      customerEmail: "maria@example.test",
      customerPhone: "09181234567",
      fulfilment: "delivery",
      deliveryAreaId: areaId,
      address: ADDRESS,
    });
    return { staff, orderId: res.orderId, code: res.orderCode };
  }

  test("is staff-only", async () => {
    const t = newTest();
    await placedOrder(t);
    expect(await authErrorCode(t.query(api.services.deliveries.getDeliveries, {}))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.deliveries.getDeliveries, {}))).toBe("FORBIDDEN");
  });

  test("shows the trip with the customer's details, fee and balance", async () => {
    const t = newTest();
    const { staff, code } = await placedOrder(t);
    const [row] = await staff.as.query(api.services.deliveries.getDeliveries, {});
    expect(row).toMatchObject({
      code,
      customerName: "Maria",
      email: "maria@example.test",
      phone: "09181234567",
      address: ADDRESS,
      areaName: "Quezon City",
      deliveryFee: 300,
      deliveryStatus: "unscheduled",
      totalAmount: 1800,
      amountPaid: 0,
    });
    expect(row.items).toEqual([{ name: "Aquarium Light", quantity: 1 }]);
    expect(await staff.as.query(api.services.deliveries.getDeliveryCounts, {})).toMatchObject({ all: 1, unscheduled: 1 });
    expect(await staff.as.query(api.services.deliveries.getDeliverySummary, {})).toMatchObject({ feesBilled: 300, outstanding: 1800, openTrips: 1 });
  });

  test("scheduling, dispatching and delivering move the order's own status too", async () => {
    const t = newTest();
    const { staff, orderId } = await placedOrder(t);

    // Can't dispatch before it's booked in for a day.
    await expect(staff.as.mutation(api.services.deliveries.setDeliveryStatus, { orderId, deliveryStatus: "dispatched" })).rejects.toThrow(/Schedule a delivery date/);

    await staff.as.mutation(api.services.deliveries.scheduleDelivery, {
      orderId,
      deliveryDate: "2027-02-11",
      driverName: "Rico",
      deliveryNotes: "Call on arrival",
    });
    expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({
      deliveryDate: "2027-02-11",
      deliveryStatus: "scheduled",
      driverName: "Rico",
      deliveryNotes: "Call on arrival",
      status: "pending",
    });

    await staff.as.mutation(api.services.deliveries.setDeliveryStatus, { orderId, deliveryStatus: "dispatched" });
    expect((await t.run((ctx) => ctx.db.get(orderId)))?.status).toBe("shipped");

    await staff.as.mutation(api.services.deliveries.setDeliveryStatus, { orderId, deliveryStatus: "delivered" });
    expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({ status: "delivered", deliveryStatus: "delivered" });

    const actions = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(actions).toContain("delivery.schedule");
    expect(actions).toContain("delivery.status");

    // Nothing is outstanding once it's delivered.
    expect(await staff.as.query(api.services.deliveries.getDeliverySummary, {})).toMatchObject({ openTrips: 0, outstanding: 0 });
  });

  test("a rejected date is refused and a cancelled order can't be scheduled", async () => {
    const t = newTest();
    const { staff, orderId } = await placedOrder(t);
    await expect(staff.as.mutation(api.services.deliveries.scheduleDelivery, { orderId, deliveryDate: "11/02/2027" })).rejects.toThrow(/Valid delivery date/);

    await t.run((ctx) => ctx.db.patch(orderId, { status: "cancelled" }));
    await expect(staff.as.mutation(api.services.deliveries.scheduleDelivery, { orderId, deliveryDate: "2027-02-11" })).rejects.toThrow(/cancelled/);
    // ...and it drops out of the queue entirely.
    expect(await staff.as.query(api.services.deliveries.getDeliveries, {})).toEqual([]);
  });

  test("the customer can track the delivery without an account", async () => {
    const t = newTest();
    const { staff, orderId, code } = await placedOrder(t);
    await staff.as.mutation(api.services.deliveries.scheduleDelivery, { orderId, deliveryDate: "2027-02-11", notifyCustomer: false });

    const tracked = await t.query(api.services.tracking.trackByCode, { code, email: "maria@example.test" });
    if (tracked?.kind !== "order") throw new Error("expected an order");
    expect(tracked).toMatchObject({
      fulfilment: "delivery",
      deliveryFee: 300,
      deliveryArea: "Quezon City",
      deliveryDate: "2027-02-11",
      deliveryStatus: "scheduled",
      total: 1800,
    });
  });
});
