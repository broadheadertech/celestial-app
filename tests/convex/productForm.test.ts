import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

/**
 * Guards the "Add product" path against the mistake that broke it once: the admin product form
 * calls `admin.createProduct` (not `products.createProduct`), and Convex rejects any field a
 * mutation doesn't declare. So a field added to the form must be added to *that* mutation —
 * these tests send exactly the payload the form sends.
 */

type FormPayload = Record<string, unknown>;

/** Everything app/admin/products/form/ProductFormContent.tsx sends on save. */
function formPayload(categoryId: Id<"categories">, over: FormPayload = {}): FormPayload {
  return {
    name: "New Arowana",
    description: "A fish",
    price: 150000,
    costPrice: 90000,
    categoryId,
    image: "https://example.test/a.png",
    images: [],
    stock: 1,
    badge: "",
    productStatus: "active",
    sku: "SKU-1",
    lifespan: "",
    tankNumber: "T-1",
    grade: "AAA",
    purchaseMode: "auto",
    visibility: "public",
    videos: [],
    displayName: "",
    preorder: null,
    isActive: true,
    ...over,
  };
}

describe("adding a product the way the admin form does", () => {
  test("saves with pre-orders off", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const staff = await signedInAs(t, "admin");

    const productId = await staff.as.mutation(
      api.services.admin.createProduct,
      formPayload(ids.fishCat as Id<"categories">) as never,
    );

    const product = await t.run((ctx) => ctx.db.get(productId as Id<"products">));
    expect(product).toMatchObject({ name: "New Arowana", price: 150000, stock: 1, isActive: true });
    // `null` from the form must become an absent field, not a stored null.
    expect(product?.preorder).toBeUndefined();
    // "auto" clears the explicit setting so the category default applies.
    expect(product?.purchaseMode).toBeUndefined();
  });

  test("saves with pre-orders on, and the settings survive the round trip", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const staff = await signedInAs(t, "admin");

    const productId = await staff.as.mutation(
      api.services.admin.createProduct,
      formPayload(ids.fishCat as Id<"categories">, {
        stock: 0,
        preorder: {
          enabled: true,
          incomingQty: 4,
          expectedFrom: "2027-03-01",
          expectedTo: "2027-03-31",
          depositAmount: 20000,
          note: "  From the March shipment.  ",
        },
      }) as never,
    );

    const product = await t.run((ctx) => ctx.db.get(productId as Id<"products">));
    expect(product?.preorder).toEqual({
      enabled: true,
      incomingQty: 4,
      expectedFrom: "2027-03-01",
      expectedTo: "2027-03-31",
      depositAmount: 20000,
      depositPercent: undefined,
      note: "From the March shipment.",
    });

    // And it's immediately pre-orderable on the storefront.
    const offer = await t.query(api.services.preorders.getPreorderOffer, { productId: productId as Id<"products"> });
    expect(offer).toMatchObject({ open: true, remaining: 4, depositPerUnit: 20000, expectedLabel: "March 2027" });
  });

  test("bad pre-order settings are refused with a readable reason", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const staff = await signedInAs(t, "admin");
    const create = (preorder: unknown) =>
      staff.as.mutation(api.services.admin.createProduct, formPayload(ids.fishCat as Id<"categories">, { preorder }) as never);

    await expect(create({ enabled: true, incomingQty: 9999 })).rejects.toThrow(/between 0 and 500/);
    await expect(create({ enabled: true, incomingQty: 2, expectedFrom: "soon" })).rejects.toThrow(/must be a date/);
    await expect(create({ enabled: true, incomingQty: 2, expectedFrom: "2027-04-01", expectedTo: "2027-03-01" })).rejects.toThrow(/ends before it starts/);
    await expect(create({ enabled: true, incomingQty: 2, depositPercent: 150 })).rejects.toThrow(/between 0 and 100/);
  });

  test("editing a product keeps the same pre-order rules", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const staff = await signedInAs(t, "admin");
    const fish = ids.fish as Id<"products">;

    // The form uses products.updateProduct for edits — the other half of the pair.
    await staff.as.mutation(api.services.products.updateProduct, {
      productId: fish,
      preorder: { enabled: true, incomingQty: 2, depositPercent: 10 },
    });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.preorder).toMatchObject({ enabled: true, incomingQty: 2, depositPercent: 10 });

    // Switching it off forgets the settings rather than leaving them behind.
    await staff.as.mutation(api.services.products.updateProduct, { productId: fish, preorder: null });
    expect((await t.run((ctx) => ctx.db.get(fish)))?.preorder).toBeUndefined();
  });

  test("only staff can add a product", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const client = await signedInAs(t, "client");
    expect(
      await authErrorCode(
        client.as.mutation(api.services.admin.createProduct, formPayload(ids.fishCat as Id<"categories">) as never),
      ),
    ).toBe("FORBIDDEN");
  });
});
