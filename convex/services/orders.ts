import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { recordSaleHelper, restoreStockHelper } from "./stock";

// Get user's orders
export const getUserOrders = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, { userId, status }) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    const orders = await query.order("desc").collect();

    // Get product details for each order item
    const ordersWithProducts = await Promise.all(
      orders.map(async (order) => {
        const itemsWithProducts = await Promise.all(
          order.items.map(async (item) => {
            const product = await ctx.db.get(item.productId);
            return {
              ...item,
              product,
            };
          })
        );

        return {
          ...order,
          items: itemsWithProducts,
        };
      })
    );

    return ordersWithProducts;
  },
});

// Get order by ID
export const getOrder = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Get product details for order items
    const itemsWithProducts = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    // Get user details
    let user = null;
    if (order.userId) {
      try {
        user = await ctx.db.get(order.userId);
      } catch {
        // User may have been deleted
      }
    }

    return {
      ...order,
      items: itemsWithProducts,
      user: user ? {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      } : null,
    };
  },
});

// Create order from cart
export const createOrderFromCart = mutation({
  args: {
    userId: v.id("users"),
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
    }),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, shippingAddress, paymentMethod, notes }) => {
    // Get user's cart items
    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Prepare order items and calculate total
    const orderItems = [];
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = await ctx.db.get(cartItem.productId);

      if (!product || !product.isActive) {
        throw new Error(`Product ${product?.name || 'unknown'} is not available`);
      }

      if (product.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
      }

      const itemPrice = product.price;
      const itemTotal = itemPrice * cartItem.quantity;

      orderItems.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: itemPrice,
      });

      totalAmount += itemTotal;

      // Update product stock
      await ctx.db.patch(cartItem.productId, {
        stock: product.stock - cartItem.quantity,
        updatedAt: Date.now(),
      });

      // Sync with stockRecords (record as sale + log movement)
      await recordSaleHelper(ctx, {
        productId: cartItem.productId,
        quantity: cartItem.quantity,
      });
    }

    const now = Date.now();

    // Create order
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: "pending",
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      notes,
      createdAt: now,
      updatedAt: now,
    });

    // Clear user's cart
    await Promise.all(
      cartItems.map(item => ctx.db.delete(item._id))
    );

    return orderId;
  },
});

// Update order status (admin only)
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, status, notes }) => {
    const order = await ctx.db.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // If cancelling, restore stock for all items
    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          await ctx.db.patch(item.productId, {
            stock: product.stock + item.quantity,
            updatedAt: now,
          });
          // Restore stockRecords
          await restoreStockHelper(ctx, {
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }
    }

    await ctx.db.patch(orderId, {
      status,
      notes: notes || order.notes,
      updatedAt: now,
    });

    return await ctx.db.get(orderId);
  },
});

// Cancel order
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    userId: v.id("users"),
  },
  handler: async (ctx, { orderId, userId }) => {
    const order = await ctx.db.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId && order.userId !== userId) {
      throw new Error("You can only cancel your own orders");
    }

    if (order.status === "shipped" || order.status === "delivered") {
      throw new Error("Cannot cancel shipped or delivered orders");
    }

    if (order.status === "cancelled") {
      throw new Error("Order is already cancelled");
    }

    const now = Date.now();

    // Restore product stock + stockRecords
    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: product.stock + item.quantity,
          updatedAt: now,
        });
        await restoreStockHelper(ctx, {
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    await ctx.db.patch(orderId, {
      status: "cancelled",
      updatedAt: now,
    });

    return await ctx.db.get(orderId);
  },
});

// Get all orders for admin
export const getAllOrdersAdmin = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, search }) => {
    let orders = await ctx.db.query("orders").collect();

    if (status && status !== 'all') {
      orders = orders.filter(order => order.status === status);
    }

    // Get product and user details for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const itemsWithProducts = await Promise.all(
          order.items.map(async (item) => {
            const product = await ctx.db.get(item.productId);
            return {
              ...item,
              product,
            };
          })
        );

        let user = null;
        if (order.userId) {
          try {
            user = await ctx.db.get(order.userId);
          } catch {
            console.warn("Could not find user:", order.userId);
          }
        }

        return {
          ...order,
          items: itemsWithProducts,
          user: user ? {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          } : null,
        };
      })
    );

    // Filter by search if provided
    let filteredOrders = ordersWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = ordersWithDetails.filter(order => {
        const productNames = order.items.map(item => item.product?.name || '').join(' ').toLowerCase();
        const userEmail = order.user?.email?.toLowerCase() || '';
        const userName = `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.toLowerCase();

        return productNames.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               userName.includes(searchLower) ||
               order._id.toLowerCase().includes(searchLower);
      });
    }

    return filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Generate order code from ID
function generateOrderCode(id: string): string {
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

// Admin: Create order on behalf of a customer (walk-in / in-store)
export const adminCreateOrder = mutation({
  args: {
    userId: v.optional(v.id("users")),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
    })),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
    customerName: v.optional(v.string()),
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, items, paymentMethod, notes, customerName, salesAssociateId, salesAssociateName }) => {
    if (items.length === 0) {
      throw new Error("No items provided");
    }

    const orderItems = [];
    let totalAmount = 0;
    const now = Date.now();

    for (const item of items) {
      const product = await ctx.db.get(item.productId);

      if (!product || !product.isActive) {
        throw new Error(`Product ${product?.name || 'unknown'} is not available`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });

      totalAmount += product.price * item.quantity;

      // Deduct stock
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
        updatedAt: now,
      });

      await recordSaleHelper(ctx, {
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Use a placeholder address for in-store orders
    const orderId = await ctx.db.insert("orders", {
      userId: userId || undefined,
      status: "pending",
      items: orderItems,
      totalAmount,
      shippingAddress: {
        street: "In-Store Pickup",
        city: "N/A",
        state: "N/A",
        zipCode: "N/A",
        country: "Philippines",
      },
      paymentMethod,
      customerName: customerName || undefined,
      notes,
      salesAssociateId,
      salesAssociateName,
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId,
      orderCode: generateOrderCode(orderId),
      totalAmount,
      itemCount: orderItems.length,
    };
  },
});

// Admin: Acknowledge order (confirm + generate acknowledgement data)
export const acknowledgeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, adminNotes }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Only pending orders can be acknowledged");

    const now = Date.now();
    await ctx.db.patch(orderId, {
      status: "confirmed",
      notes: adminNotes
        ? `${order.notes || ''}\n[Acknowledged] ${adminNotes}`.trim()
        : order.notes,
      updatedAt: now,
    });

    // Return receipt data
    const itemsWithProducts = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return { ...item, productName: product?.name || 'Unknown', productImage: product?.image };
      })
    );

    let user = null;
    if (order.userId) { try { user = await ctx.db.get(order.userId); } catch { /* */ } }

    return {
      receiptType: "acknowledgement" as const,
      orderCode: generateOrderCode(orderId),
      orderId,
      status: "confirmed",
      items: itemsWithProducts,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      customer: user ? {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      } : order.customerName ? {
        name: order.customerName,
        email: 'Walk-in',
        phone: undefined,
      } : null,
      acknowledgedAt: now,
      createdAt: order.createdAt,
      notes: order.notes,
      salesAssociateName: order.salesAssociateName,
    };
  },
});

// Admin: Release order (mark delivered + generate release receipt data)
export const releaseOrder = mutation({
  args: {
    orderId: v.id("orders"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, adminNotes }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "confirmed" && order.status !== "processing") {
      throw new Error("Only confirmed or processing orders can be released");
    }

    const now = Date.now();
    await ctx.db.patch(orderId, {
      status: "delivered",
      notes: adminNotes
        ? `${order.notes || ''}\n[Released] ${adminNotes}`.trim()
        : order.notes,
      updatedAt: now,
    });

    const itemsWithProducts = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return { ...item, productName: product?.name || 'Unknown', productImage: product?.image };
      })
    );

    let user = null;
    if (order.userId) { try { user = await ctx.db.get(order.userId); } catch { /* */ } }

    return {
      receiptType: "release" as const,
      orderCode: generateOrderCode(orderId),
      orderId,
      status: "delivered",
      items: itemsWithProducts,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      customer: user ? {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      } : order.customerName ? {
        name: order.customerName,
        email: 'Walk-in',
        phone: undefined,
      } : null,
      releasedAt: now,
      acknowledgedAt: order.updatedAt,
      createdAt: order.createdAt,
      notes: order.notes,
      salesAssociateName: order.salesAssociateName,
    };
  },
});

// Get receipt data for an existing order (for reprinting)
export const getOrderReceipt = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    const itemsWithProducts = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return { ...item, productName: product?.name || 'Unknown', productImage: product?.image };
      })
    );

    let user = null;
    if (order.userId) {
      try { user = await ctx.db.get(order.userId); } catch { /* */ }
    }

    return {
      orderCode: generateOrderCode(orderId),
      orderId,
      status: order.status,
      items: itemsWithProducts,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      customer: user ? {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      } : order.customerName ? {
        name: order.customerName,
        email: 'Walk-in',
        phone: undefined,
      } : null,
      salesAssociateName: order.salesAssociateName,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      notes: order.notes,
    };
  },
});
