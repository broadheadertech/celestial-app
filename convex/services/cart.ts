import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get cart items for user or guest
export const getCartItems = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    let cartItems;
    if (userId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } else if (guestId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_guest", (q) => q.eq("guestId", guestId))
        .collect();
    } else {
      return [];
    }

    // Get product details for each cart item
    const cartWithProducts = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return cartWithProducts.filter(item => item.product);
  },
});

// Add item to cart (for both users and guests)
export const addToCart = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, { userId, guestId, productId, quantity }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Check if product exists and is active
    const product = await ctx.db.get(productId);
    if (!product || !product.isActive) {
      throw new Error("Product not found or not available");
    }

    // Check if product has enough stock
    if (product.stock < quantity) {
      throw new Error("Insufficient stock available");
    }

    // Check if item already exists in cart
    let existingItem;
    if (userId) {
      existingItem = await ctx.db
        .query("cart")
        .withIndex("by_user_product", (q) => q.eq("userId", userId).eq("productId", productId))
        .first();
    } else if (guestId) {
      existingItem = await ctx.db
        .query("cart")
        .withIndex("by_guest_product", (q) => q.eq("guestId", guestId).eq("productId", productId))
        .first();
    }

    const now = Date.now();

    if (existingItem) {
      // Update quantity if item already exists
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        throw new Error("Insufficient stock available");
      }

      await ctx.db.patch(existingItem._id, {
        quantity: newQuantity,
        updatedAt: now,
      });

      return existingItem._id;
    } else {
      // Add new item to cart
      const cartItemId = await ctx.db.insert("cart", {
        userId,
        guestId,
        productId,
        quantity,
        createdAt: now,
        updatedAt: now,
      });

      return cartItemId;
    }
  },
});

// Update cart item quantity
export const updateCartItem = mutation({
  args: {
    cartItemId: v.id("cart"),
    quantity: v.number(),
  },
  handler: async (ctx, { cartItemId, quantity }) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await ctx.db.delete(cartItemId);
      return null;
    }

    const cartItem = await ctx.db.get(cartItemId);
    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    // Check product stock
    const product = await ctx.db.get(cartItem.productId);
    if (!product || !product.isActive) {
      throw new Error("Product not found or not available");
    }

    if (product.stock < quantity) {
      throw new Error("Insufficient stock available");
    }

    await ctx.db.patch(cartItemId, {
      quantity,
      updatedAt: Date.now(),
    });

    return cartItemId;
  },
});

// Remove item from cart
export const removeFromCart = mutation({
  args: {
    cartItemId: v.id("cart"),
  },
  handler: async (ctx, { cartItemId }) => {
    const cartItem = await ctx.db.get(cartItemId);
    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    await ctx.db.delete(cartItemId);
    return true;
  },
});

// Clear cart (for both users and guests)
export const clearCart = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    let cartItems;
    if (userId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } else if (guestId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_guest", (q) => q.eq("guestId", guestId))
        .collect();
    } else {
      return true;
    }

    await Promise.all(
      cartItems.map(item => ctx.db.delete(item._id))
    );

    return true;
  },
});

// Get cart item count (for both users and guests)
export const getCartItemCount = query({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId }) => {
    if (!userId && !guestId) {
      return 0;
    }

    let cartItems;
    if (userId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } else if (guestId) {
      cartItems = await ctx.db
        .query("cart")
        .withIndex("by_guest", (q) => q.eq("guestId", guestId))
        .collect();
    } else {
      return 0;
    }

    return cartItems.reduce((total, item) => total + item.quantity, 0);
  },
});

// Migrate guest cart to user account (when guest logs in or registers)
export const migrateGuestCartToUser = mutation({
  args: {
    guestId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { guestId, userId }) => {
    // Get guest cart items
    const guestCartItems = await ctx.db
      .query("cart")
      .withIndex("by_guest", (q) => q.eq("guestId", guestId))
      .collect();

    if (guestCartItems.length === 0) {
      return true;
    }

    // Get existing user cart items
    const userCartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Create a map of existing user cart items by productId
    const userCartMap = new Map();
    userCartItems.forEach(item => {
      userCartMap.set(item.productId, item);
    });

    const now = Date.now();

    // Migrate guest cart items
    for (const guestItem of guestCartItems) {
      const existingUserItem = userCartMap.get(guestItem.productId);

      if (existingUserItem) {
        // Merge quantities
        await ctx.db.patch(existingUserItem._id, {
          quantity: existingUserItem.quantity + guestItem.quantity,
          updatedAt: now,
        });
      } else {
        // Create new item for user
        await ctx.db.insert("cart", {
          userId,
          guestId: undefined,
          productId: guestItem.productId,
          quantity: guestItem.quantity,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Delete guest cart item
      await ctx.db.delete(guestItem._id);
    }

    return true;
  },
});