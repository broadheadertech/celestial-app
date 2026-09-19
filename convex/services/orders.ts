import { query, mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { customerProduct, publicName } from "../lib/productName";
import { recordSaleHelper, restoreStockHelper } from "./stock";
import { recordAudit } from "./audit";
import { getViewer, isStaffRole, requireStaff, requireUser } from "../lib/authz";
import { isListedPublicly, resolvePurchaseMode } from "../lib/purchaseMode";
import { internal } from "../_generated/api";
import { loadStoreContact, normalizeCustomerEmail, notifyWebOrderPlaced } from "./notifications";

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
    // Someone else's (or a signed-out) request sees no orders rather than an error,
    // so account pages don't crash while a session is still being established.
    const viewer = await getViewer(ctx);
    if (!viewer || (viewer._id !== userId && !isStaffRole(viewer.role))) {
      return [];
    }
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
              product: product ? customerProduct(product) : null,
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
    const viewer = await requireUser(ctx);
    const order = await ctx.db.get(orderId);

    if (!order || (order.userId !== viewer._id && !isStaffRole(viewer.role))) {
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
    const viewer = await requireUser(ctx);
    if (viewer._id !== userId) {
      throw new Error("You can only check out your own cart");
    }

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

      if (!product || !isListedPublicly(product)) {
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
      channel: "app",
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
    await requireStaff(ctx);
    const order = await ctx.db.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Paid sales can't be cancelled from the status menu — they must be voided (password + reason).
    if (status === "cancelled" && order.status !== "cancelled" && (order.paymentStatus === "paid" || order.paymentStatus === "partial")) {
      throw new Error("This sale has been paid, so it can't just be cancelled. Use Void (password required) instead.");
    }

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
  handler: async (ctx, { orderId }) => {
    // The userId argument is kept for compatibility; ownership is checked against the session.
    const viewer = await requireUser(ctx);
    const order = await ctx.db.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== viewer._id && !isStaffRole(viewer.role)) {
      throw new Error("You can only cancel your own orders");
    }

    if (order.status === "shipped" || order.status === "delivered") {
      throw new Error("Cannot cancel shipped or delivered orders");
    }

    if (order.status === "cancelled") {
      throw new Error("Order is already cancelled");
    }

    if (order.paymentStatus === "paid" || order.paymentStatus === "partial") {
      throw new Error("This order has been paid, so it can't be cancelled here. Staff can void it (password required).");
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
    await requireStaff(ctx);
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
          channel: orderChannel(order),
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
/** Sales channel of an order: explicit on new orders, inferred for older ones. */
export function orderChannel(order: { channel?: "pos" | "web" | "app"; notes?: string; shippingAddress: { street: string } }): "pos" | "web" | "app" {
  if (order.channel) return order.channel;
  if (/^Fulfilment:/im.test(order.notes ?? "")) return "web"; // storefront checkout always sends this line
  if (order.shippingAddress.street === "In-Store Pickup") return "pos";
  return "app";
}

export function generateOrderCode(id: string): string {
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

// Admin: Create order on behalf of a customer (walk-in / in-store)
const SALE_ITEMS = v.array(v.object({
  productId: v.id("products"),
  quantity: v.number(),
  discount: v.optional(v.number()), // Per-unit discount amount (₱)
}));

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sale date for a staff-entered order: now, or an earlier date (not in the future, at most a year back). */
export function resolveSaleDate(orderDate: number | undefined, now: number): number {
  if (orderDate === undefined) return now;
  if (!Number.isFinite(orderDate)) throw new Error("Invalid sale date");
  if (orderDate > now + 5 * 60 * 1000) throw new Error("The sale date can't be in the future");
  if (orderDate < now - 366 * DAY_MS) throw new Error("The sale date can't be more than a year ago");
  return orderDate;
}

export type StaffSaleInput = {
  userId?: Id<"users">;
  /** listPrice: keep this unit price instead of today's (used when re-entering a corrected sale). */
  items: { productId: Id<"products">; quantity: number; discount?: number; listPrice?: number }[];
  orderDiscount?: number;
  paymentMethod: string;
  notes?: string;
  customerName?: string;
  salesAssociateId?: Id<"users">;
  salesAssociateName?: string;
};

/**
 * Creates a walk-in/POS sale: checks stock, deducts it (FIFO batches + audit trail), records the
 * order as paid. Shared by adminCreateOrder and sale corrections (salesCorrections.ts).
 */
export async function createStaffSale(
  ctx: MutationCtx,
  input: StaffSaleInput,
  opts: { createdAt: number; correctionOf?: Id<"orders"> },
) {
  const { userId, items, orderDiscount, paymentMethod, notes, customerName, salesAssociateId, salesAssociateName } = input;
  if (items.length === 0) {
    throw new Error("No items provided");
  }
  const now = Date.now();
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Quantities must be whole numbers above 0");
    const product = await ctx.db.get(item.productId);

    if (!product || !product.isActive) {
      throw new Error(`Product ${product?.name || 'unknown'} is not available`);
    }

    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }

    const originalPrice = item.listPrice ?? product.price;
    const discount = Math.max(0, Math.min(item.discount || 0, originalPrice));
    const finalPrice = originalPrice - discount;

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: finalPrice,
      originalPrice,
      discount,
    });

    subtotal += finalPrice * item.quantity;

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

  const clampedOrderDiscount = Math.max(0, Math.min(orderDiscount || 0, subtotal));
  const totalAmount = subtotal - clampedOrderDiscount;
  const backdated = now - opts.createdAt > 60 * 60 * 1000;

  // Use a placeholder address for in-store orders
  const orderId = await ctx.db.insert("orders", {
    userId: userId || undefined,
    status: "pending",
    items: orderItems,
    subtotal,
    orderDiscount: clampedOrderDiscount,
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
    // Walk-in orders: assume paid immediately (cash on the spot)
    paymentStatus: "paid",
    amountPaid: totalAmount,
    salesAssociateId,
    salesAssociateName,
    correctionOf: opts.correctionOf,
    enteredAt: backdated ? now : undefined,
    channel: "pos",
    createdAt: opts.createdAt,
    updatedAt: now,
  });

  return { orderId, orderItems, subtotal, orderDiscount: clampedOrderDiscount, totalAmount, backdated };
}

export const adminCreateOrder = mutation({
  args: {
    userId: v.optional(v.id("users")),
    items: SALE_ITEMS,
    orderDiscount: v.optional(v.number()), // Order-wide flat discount (₱)
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
    customerName: v.optional(v.string()),
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
    // Sale date when entering a past sale (e.g. from a paper receipt). Omit for "now".
    orderDate: v.optional(v.number()),
  },
  handler: async (ctx, { orderDate, ...input }) => {
    const staff = await requireStaff(ctx);
    const createdAt = resolveSaleDate(orderDate, Date.now());
    const sale = await createStaffSale(ctx, input, { createdAt });
    const code = generateOrderCode(sale.orderId);

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "order.create",
      category: "sales",
      summary: `POS sale ${code} — ${sale.orderItems.length} item${sale.orderItems.length === 1 ? "" : "s"}, ₱${sale.totalAmount.toLocaleString("en-PH")}${input.customerName ? ` · ${input.customerName}` : ""}${sale.backdated ? ` · dated ${new Date(createdAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}` : ""}`,
      entityTable: "orders",
      entityId: sale.orderId,
      amount: sale.totalAmount,
      metadata: { itemCount: sale.orderItems.length, paymentMethod: input.paymentMethod, salesAssociateId: input.salesAssociateId, salesAssociateName: input.salesAssociateName, saleDate: createdAt, backdated: sale.backdated },
    });

    return {
      orderId: sale.orderId,
      orderCode: code,
      subtotal: sale.subtotal,
      orderDiscount: sale.orderDiscount,
      totalAmount: sale.totalAmount,
      itemCount: sale.orderItems.length,
    };
  },
});

// Storefront checkout for gear (non-live) items. Open to guests. Prices always come from
// the product records, no discounts are accepted, and the order stays pending + unpaid
// until staff confirm payment — unlike adminCreateOrder, which is the POS path.
export const placeWebOrder = mutation({
  args: {
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
    })),
    paymentMethod: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) throw new Error("No items provided");
    if (args.items.length > 50) throw new Error("Too many items in one order");
    const customerName = args.customerName.trim().slice(0, 120);
    if (!customerName) throw new Error("Name is required");

    const viewer = await getViewer(ctx);
    const now = Date.now();
    const orderItems = [];
    const emailItems: { name: string; quantity: number; unitPrice: number }[] = [];
    let totalAmount = 0;

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error("Invalid quantity");
      }
      const product = await ctx.db.get(item.productId);
      if (!product || !isListedPublicly(product)) {
        throw new Error(`Product ${product && product.visibility !== "internal" ? publicName(product) : "unknown"} is not available`);
      }
      const category = await ctx.db.get(product.categoryId);
      if (resolvePurchaseMode(product, category?.name) !== "cart") {
        throw new Error(`${publicName(product)} is available by enquiry only — message us to reserve it.`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${publicName(product)}. Available: ${product.stock}`);
      }

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        originalPrice: product.price,
        discount: 0,
      });
      emailItems.push({ name: publicName(product), quantity: item.quantity, unitPrice: product.price });
      totalAmount += product.price * item.quantity;

      await ctx.db.patch(item.productId, { stock: product.stock - item.quantity, updatedAt: now });
      await recordSaleHelper(ctx, { productId: item.productId, quantity: item.quantity });
    }

    const contact = [args.customerEmail, args.customerPhone].filter(Boolean).join(" · ");
    const notes = [
      "Web checkout",
      contact && `Contact: ${contact}`,
      args.address && `Address: ${args.address}`,
      args.notes,
    ].filter(Boolean).join("\n").slice(0, 2000);

    const orderId = await ctx.db.insert("orders", {
      userId: viewer?._id,
      status: "pending",
      items: orderItems,
      subtotal: totalAmount,
      orderDiscount: 0,
      totalAmount,
      shippingAddress: {
        street: args.address?.slice(0, 300) || "In-Store Pickup",
        city: "N/A",
        state: "N/A",
        zipCode: "N/A",
        country: "Philippines",
      },
      paymentMethod: args.paymentMethod.slice(0, 40),
      customerName,
      notes,
      paymentStatus: "unpaid",
      amountPaid: 0,
      channel: "web",
      createdAt: now,
      updatedAt: now,
    });

    const orderCode = generateOrderCode(orderId);
    const itemCount = orderItems.reduce((sum, line) => sum + line.quantity, 0);
    // The checkout sends "Fulfilment: pickup at the gallery|delivery" as the first notes line.
    const fulfilmentMatch = /^Fulfilment:\s*(.+)$/im.exec(args.notes ?? "");
    const fulfilment = (fulfilmentMatch?.[1].trim() || (args.address ? "delivery" : "pickup")).slice(0, 80);

    // Best-effort side effects: a failure here must never fail the order itself.
    try {
      await notifyWebOrderPlaced(ctx, {
        orderId,
        orderCode,
        customerName,
        itemCount,
        totalAmount,
        fulfilment,
      });
    } catch (error) {
      console.error("Failed to create web order notification:", error);
    }

    try {
      const to = normalizeCustomerEmail(args.customerEmail);
      if (to) {
        await ctx.scheduler.runAfter(0, internal.services.email.sendWebOrderConfirmationEmail, {
          to,
          orderId,
          orderCode,
          customerName,
          items: emailItems,
          totalAmount,
          fulfilment,
          store: await loadStoreContact(ctx),
        });
      }
    } catch (error) {
      console.error("Failed to schedule web order confirmation email:", error);
    }

    return { orderId, orderCode, totalAmount };
  },
});

// Admin: Acknowledge order (confirm + generate acknowledgement data)
export const acknowledgeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, adminNotes }) => {
    await requireStaff(ctx);
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
      subtotal: order.subtotal,
      orderDiscount: order.orderDiscount,
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
    await requireStaff(ctx);
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
      subtotal: order.subtotal,
      orderDiscount: order.orderDiscount,
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
    await requireStaff(ctx);
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
      customerName: order.customerName,
      subtotal: order.subtotal,
      orderDiscount: order.orderDiscount,
      paymentStatus: order.paymentStatus,
      amountPaid: order.amountPaid,
      enteredAt: order.enteredAt,
      voidedAt: order.voidedAt,
      voidedByName: order.voidedByName,
      voidReason: order.voidReason,
      correctionOf: order.correctionOf ? { orderId: order.correctionOf, orderCode: generateOrderCode(order.correctionOf) } : undefined,
      correctedBy: order.correctedBy ? { orderId: order.correctedBy, orderCode: generateOrderCode(order.correctedBy) } : undefined,
    };
  },
});
