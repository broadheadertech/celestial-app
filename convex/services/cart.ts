import { query, mutation, QueryCtx, MutationCtx } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { isListedPublicly } from "../lib/purchaseMode";
import { Doc, Id } from "../_generated/dataModel";
import { getViewer, isStaffRole, requireSelfOrStaff } from "../lib/authz";

/*
 * Cart access rules:
 * - A user cart (userId) belongs to that signed-in user; staff may also access it.
 * - A guest cart (guestId) is reachable by whoever holds the guestId (bearer capability).
 * Identity always comes from the session, never from the userId argument alone.
 */

// Queries: return false instead of throwing so pages don't crash during sign-in.
async function canReadCart(
  ctx: QueryCtx,
  userId: Id<"users"> | undefined,
  guestId: string | undefined,
): Promise<boolean> {
  if (userId) {
    const viewer = await getViewer(ctx);
    return !!viewer && (viewer._id === userId || isStaffRole(viewer.role));
  }
  return !!guestId;
}

// Mutations on a single cart row: owner (user or guestId holder) or staff.
async function assertCartItemAccess(
  ctx: MutationCtx,
  cartItem: Doc<"cart">,
  guestId: string | undefined,
): Promise<void> {
  if (cartItem.userId) {
    await requireSelfOrStaff(ctx, cartItem.userId);
    return;
  }
  if (cartItem.guestId && guestId && cartItem.guestId === guestId) {
    return;
  }
  const viewer = await getViewer(ctx);
  if (viewer && isStaffRole(viewer.role)) return;
  throw new ConvexError({ code: "FORBIDDEN", message: "You don't have permission to do that." });
}

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

    if (!(await canReadCart(ctx, userId, guestId))) return [];

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

    if (userId) {
      await requireSelfOrStaff(ctx, userId);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Check if product exists and is active
    const product = await ctx.db.get(productId);
    if (!product || !isListedPublicly(product)) {
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
    // Required for guest cart rows: proves the caller owns this guest cart.
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { cartItemId, quantity, guestId }) => {
    const cartItem = await ctx.db.get(cartItemId);
    if (!cartItem) {
      if (quantity <= 0) return null;
      throw new Error("Cart item not found");
    }

    await assertCartItemAccess(ctx, cartItem, guestId);

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await ctx.db.delete(cartItemId);
      return null;
    }

    if (!Number.isInteger(quantity)) {
      throw new Error("Quantity must be a whole number");
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
    // Required for guest cart rows: proves the caller owns this guest cart.
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { cartItemId, guestId }) => {
    const cartItem = await ctx.db.get(cartItemId);
    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    await assertCartItemAccess(ctx, cartItem, guestId);

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

    if (userId) {
      await requireSelfOrStaff(ctx, userId);
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

    if (!(await canReadCart(ctx, userId, guestId))) return 0;

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
    // Only the account owner (or staff) may receive items; guestId is the guest cart's capability.
    await requireSelfOrStaff(ctx, userId);

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