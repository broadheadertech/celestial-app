import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get user's wishlist with product details
export const getWishlist = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const wishlistItems = await ctx.db
      .query("wishlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Enrich with product details
    const itemsWithProducts = await Promise.all(
      wishlistItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    // Filter out items where product no longer exists
    return itemsWithProducts.filter((item) => item.product !== null);
  },
});

// Check if a product is in user's wishlist
export const isInWishlist = query({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, { userId, productId }) => {
    const item = await ctx.db
      .query("wishlist")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId)
      )
      .first();

    return !!item;
  },
});

// Add product to wishlist
export const addToWishlist = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, { userId, productId }) => {
    // Check if already in wishlist
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId)
      )
      .first();

    if (existing) {
      return existing._id; // Already exists, return existing ID
    }

    // Verify product exists
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const id = await ctx.db.insert("wishlist", {
      userId,
      productId,
      createdAt: Date.now(),
    });

    return id;
  },
});

// Remove product from wishlist
export const removeFromWishlist = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, { userId, productId }) => {
    const item = await ctx.db
      .query("wishlist")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId)
      )
      .first();

    if (!item) {
      throw new Error("Item not found in wishlist");
    }

    await ctx.db.delete(item._id);
    return { success: true };
  },
});

// Toggle wishlist (add if not present, remove if present)
export const toggleWishlist = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, { userId, productId }) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { added: false };
    }

    // Verify product exists
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.insert("wishlist", {
      userId,
      productId,
      createdAt: Date.now(),
    });

    return { added: true };
  },
});

// Get wishlist count for a user
export const getWishlistCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return items.length;
  },
});
