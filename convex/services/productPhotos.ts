import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";

/** Photos above this size slow the storefront on mobile data; the admin can re-shrink them. */
export const OVERSIZED_BYTES = 1024 * 1024;

/**
 * Staff: product photos stored in Convex that are larger than OVERSIZED_BYTES, with their sizes.
 * (Missing / single-photo checks are done in the admin UI from the product list itself.)
 */
export const getOversizedPhotos = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const bigFiles = new Map<string, number>();
    for (const file of await ctx.db.system.query("_storage").collect()) {
      if (file.size <= OVERSIZED_BYTES || (file.contentType && !file.contentType.startsWith("image/"))) continue;
      const url = await ctx.storage.getUrl(file._id);
      if (url) bigFiles.set(url, file.size);
    }
    if (bigFiles.size === 0) return [];

    const oversized: { productId: string; url: string; size: number }[] = [];
    for (const product of await ctx.db.query("products").collect()) {
      const urls = new Set([product.image, ...(product.images ?? [])].filter((u): u is string => !!u));
      for (const url of urls) {
        const size = bigFiles.get(url);
        if (size) oversized.push({ productId: product._id, url, size });
      }
    }
    return oversized.sort((a, b) => b.size - a.size);
  },
});

/**
 * Staff: swaps one product photo URL for a newly uploaded (smaller) file, keeping its position as
 * the cover or in the gallery. The old file is kept in storage so link previews built from it keep
 * working until the next site rebuild.
 */
export const replaceProductPhoto = mutation({
  args: { productId: v.id("products"), oldUrl: v.string(), newStorageId: v.id("_storage") },
  handler: async (ctx, { productId, oldUrl, newStorageId }) => {
    const staff = await requireStaff(ctx);
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");
    const newUrl = await ctx.storage.getUrl(newStorageId);
    if (!newUrl) throw new Error("Uploaded photo not found");
    const images = product.images ?? [];
    if (product.image !== oldUrl && !images.includes(oldUrl)) throw new Error("That photo is no longer on this product");

    await ctx.db.patch(productId, {
      image: product.image === oldUrl ? newUrl : product.image,
      images: images.map((u) => (u === oldUrl ? newUrl : u)),
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "product.photo_optimized",
      category: "inventory",
      summary: `Replaced a large photo on ${product.name} with a smaller copy`,
      entityTable: "products",
      entityId: productId,
    });
    return newUrl;
  },
});
