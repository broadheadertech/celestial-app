import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newTest, seedCatalog, signedInAs } from "./setup";

// placeWebOrder schedules a confirmation email; keep it from running after the test.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("product display names", () => {
  test("customers see the display name; staff keep the internal name", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, displayName: "  LED Aquarium Light 120cm  " });

    const catalog = await t.query(api.services.products.getCatalogProducts, {});
    const listed = catalog.find((p) => p._id === gear);
    expect(listed?.name).toBe("LED Aquarium Light 120cm");
    expect(listed?.internalName).toBe("Aquarium Light");

    const publicView = await t.query(api.services.products.getProduct, { productId: gear });
    expect(publicView?.name).toBe("LED Aquarium Light 120cm");

    const staffView = await admin.as.query(api.services.products.getProduct, { productId: gear });
    expect(staffView?.name).toBe("Aquarium Light");
    expect(staffView?.displayName).toBe("LED Aquarium Light 120cm");

    const adminList = await admin.as.query(api.services.admin.getAllProductsAdmin, {});
    expect(adminList.find((p) => p._id === gear)?.name).toBe("Aquarium Light");
  });

  test("the first display name gives the product a matching slug; clearing falls back", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    await t.run((ctx) => ctx.db.patch(gear, { slug: "aquarium-light" }));

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, displayName: "LED Aquarium Light 120cm" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.slug).toBe("led-aquarium-light-120cm");

    // Changing an existing display name keeps the URL stable.
    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, displayName: "LED Light 120cm" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.slug).toBe("led-aquarium-light-120cm");

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, displayName: "" });
    const cleared = await t.run((ctx) => ctx.db.get(gear));
    expect(cleared?.displayName).toBeUndefined();
    expect((await t.query(api.services.products.getProduct, { productId: gear }))?.name).toBe("Aquarium Light");
  });

  test("order tracking shows customers the display name", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;
    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, displayName: "LED Aquarium Light 120cm" });

    const { orderCode } = await t.mutation(api.services.orders.placeWebOrder, {
      paymentMethod: "cash",
      customerName: "Ana",
      customerEmail: "ana@example.test",
      items: [{ productId: gear, quantity: 1 }],
    });
    const tracked = await t.query(api.services.tracking.trackByCode, { code: orderCode, email: "ana@example.test" });
    expect(tracked?.items[0]?.name).toBe("LED Aquarium Light 120cm");
  });
});
