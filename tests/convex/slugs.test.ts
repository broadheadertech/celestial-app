import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { slugify } from "../../convex/lib/slug";
import { newTest, seedCatalog, signedInAs } from "./setup";

describe("product slugs", () => {
  test("slugify makes readable, URL-safe names", () => {
    expect(slugify('Super Red Arowana 10-12"')).toBe("super-red-arowana-10-12");
    expect(slugify("  RR Samurai & Ronin  ")).toBe("rr-samurai-and-ronin");
    expect(slugify("!!!")).toBe("item");
  });

  test("new products get unique slugs, and lookups by slug respect visibility", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const base = {
      price: 1200,
      categoryId: ids.gearCat,
      image: "https://example.test/filter.png",
      stock: 3,
      isActive: true,
    };
    const first = await admin.as.mutation(api.services.admin.createProduct, { ...base, name: "Canister Filter" });
    const second = await admin.as.mutation(api.services.admin.createProduct, { ...base, name: "Canister Filter" });

    const [a, b] = await t.run(async (ctx) => [await ctx.db.get(first as never), await ctx.db.get(second as never)]);
    expect((a as { slug?: string }).slug).toBe("canister-filter");
    expect((b as { slug?: string }).slug).toBe("canister-filter-2");

    const found = await t.query(api.services.products.getProductBySlug, { slug: "canister-filter-2" });
    expect(found?.name).toBe("Canister Filter");
    expect(found).not.toHaveProperty("costPrice");
    await expect(t.query(api.services.products.getProductBySlug, { slug: "nope" })).resolves.toBeNull();
    await expect(t.query(api.services.products.getProductBySlug, { slug: "../etc" })).resolves.toBeNull();
  });

  test("backfill gives existing products slugs", async () => {
    const t = newTest();
    await seedCatalog(t);
    const result = await t.mutation(internal.services.products.backfillProductSlugs, {});
    expect(result.remaining).toBe(0);
    const slugs = await t.run(async (ctx) => (await ctx.db.query("products").collect()).map((p) => p.slug));
    expect(slugs.every(Boolean)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
