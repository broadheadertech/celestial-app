import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newTest, seedCatalog, signedInAs } from "./setup";

// placeWebOrder schedules a confirmation email; fake timers keep scheduled functions from
// running after a test has finished.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("public catalog", () => {
  test("never exposes cost fields or inactive products", async () => {
    const t = newTest();
    await seedCatalog(t);
    const products = await t.query(api.services.products.getCatalogProducts, {});
    expect(products.map((p) => p.name)).not.toContain("Hidden Item");
    for (const p of products) {
      expect(p).not.toHaveProperty("costPrice");
      expect(p).not.toHaveProperty("movingAverageCost");
    }
  });

  test("purchase mode defaults by category and respects the admin setting", async () => {
    const t = newTest();
    await seedCatalog(t);
    const byName = Object.fromEntries(
      (await t.query(api.services.products.getCatalogProducts, {})).map((p) => [p.name, p.purchaseMode]),
    );
    expect(byName["Super Red Arowana"]).toBe("enquire"); // Fish category default
    expect(byName["Aquarium Light"]).toBe("cart"); // everything else defaults to cart
    expect(byName["Custom Tank Build"]).toBe("enquire"); // explicit override
  });

  test("an unknown or inactive product returns null instead of throwing", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    await expect(t.query(api.services.products.getProduct, { productId: "not-a-real-id" })).resolves.toBeNull();
    await expect(t.query(api.services.products.getProduct, { productId: ids.inactive })).resolves.toBeNull();
  });
});

describe("web checkout", () => {
  const customer = {
    paymentMethod: "cash",
    customerName: "Juan dela Cruz",
    customerEmail: "juan@example.test",
    customerPhone: "09171234567",
    notes: "Fulfilment: pickup at the gallery",
  };

  test("enquire-only products can't be ordered", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    await expect(
      t.mutation(api.services.orders.placeWebOrder, { ...customer, items: [{ productId: ids.fish as Id<"products">, quantity: 1 }] }),
    ).rejects.toThrow(/enquiry only/i);
    await expect(
      t.mutation(api.services.orders.placeWebOrder, { ...customer, items: [{ productId: ids.gearAsEnquire as Id<"products">, quantity: 1 }] }),
    ).rejects.toThrow(/enquiry only/i);
  });

  test("cart products create a pending, unpaid order at the catalog price", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const result = await t.mutation(api.services.orders.placeWebOrder, {
      ...customer,
      items: [{ productId: ids.gear as Id<"products">, quantity: 2 }],
    });
    expect(result.totalAmount).toBe(3000);
    expect(result.orderCode).toMatch(/^ORD-[A-Z0-9]{6}$/);

    const { order, product } = await t.run(async (ctx) => ({
      order: await ctx.db.get(result.orderId),
      product: await ctx.db.get(ids.gear as Id<"products">),
    }));
    expect(order?.status).toBe("pending");
    expect(order?.paymentStatus).toBe("unpaid");
    expect(product?.stock).toBe(8);
  });

  test("invalid quantities are rejected", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    for (const quantity of [0, -1, 1.5]) {
      await expect(
        t.mutation(api.services.orders.placeWebOrder, { ...customer, items: [{ productId: ids.gear as Id<"products">, quantity }] }),
      ).rejects.toThrow();
    }
  });
});

describe("internal-only products", () => {
  test("are hidden from customers but visible to staff, and can't be bought or reserved", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    await t.run((ctx) => ctx.db.patch(ids.gear as Id<"products">, { visibility: "internal" }));

    const catalog = await t.query(api.services.products.getCatalogProducts, {});
    expect(catalog.map((p) => p.name)).not.toContain("Aquarium Light");
    await expect(t.query(api.services.products.getProduct, { productId: ids.gear })).resolves.toBeNull();

    await expect(
      t.mutation(api.services.orders.placeWebOrder, {
        paymentMethod: "cash",
        customerName: "Juan",
        customerEmail: "juan@example.test",
        items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
      }),
    ).rejects.toThrow(/not available/i);

    await expect(
      t.mutation(api.services.reservations.createReservation, {
        guestId: "guest_test-internal",
        guestInfo: { name: "Juan", email: "juan@example.test", phone: "09171234567" },
        items: [{ productId: ids.gear as Id<"products">, quantity: 1, reservedPrice: 1 }],
        totalAmount: 1,
        totalQuantity: 1,
      }),
    ).rejects.toThrow(/not available/i);

    const admin = await signedInAs(t, "admin");
    await expect(admin.as.query(api.services.products.getProduct, { productId: ids.gear })).resolves.toMatchObject({ name: "Aquarium Light" });
    const adminList = await admin.as.query(api.services.admin.getAllProductsAdmin, {});
    expect(adminList.map((p) => p.name)).toContain("Aquarium Light");
  });
});

describe("order tracking", () => {
  test("needs the right code AND the email used at checkout", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const { orderCode } = await t.mutation(api.services.orders.placeWebOrder, {
      paymentMethod: "gcash",
      customerName: "Maria",
      customerEmail: "maria@example.test",
      customerPhone: "09181234567",
      notes: "Fulfilment: delivery",
      address: "1 Test Street, Quezon City",
      items: [{ productId: ids.gear as Id<"products">, quantity: 1 }],
    });

    const found = await t.query(api.services.tracking.trackByCode, { code: orderCode.toLowerCase(), email: "MARIA@example.test" });
    expect(found?.status).toBe("pending");
    expect(found?.fulfilment).toBe("delivery");
    expect(found?.items[0]?.name).toBe("Aquarium Light");

    await expect(t.query(api.services.tracking.trackByCode, { code: orderCode, email: "someone@example.test" })).resolves.toBeNull();
    await expect(t.query(api.services.tracking.trackByCode, { code: "ORD-ZZZZZZ", email: "maria@example.test" })).resolves.toBeNull();
  });
});
