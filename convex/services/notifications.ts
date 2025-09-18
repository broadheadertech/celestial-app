import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new notification
export const createNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("reservation"),
      v.literal("order"),
      v.literal("user"),
      v.literal("product"),
      v.literal("payment"),
      v.literal("alert"),
      v.literal("warning"),
      v.literal("success"),
      v.literal("system")
    ),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
    metadata: v.optional(v.object({
      customerName: v.optional(v.string()),
      customerEmail: v.optional(v.string()),
      productName: v.optional(v.string()),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: args.type,
      isRead: false,
      priority: args.priority || "medium",
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});

// Get all notifications for admin (with pagination)
export const getAdminNotifications = query({
  args: {
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 50, onlyUnread = false }) => {
    let query = ctx.db.query("notifications");
    
    if (onlyUnread) {
      query = query.withIndex("by_read", (q) => q.eq("isRead", false));
    }
    
    const notifications = await query
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Get notification counts
export const getNotificationCounts = query({
  args: {},
  handler: async (ctx) => {
    const allNotifications = await ctx.db.query("notifications").collect();
    
    const unreadCount = allNotifications.filter(n => !n.isRead).length;
    const totalCount = allNotifications.length;
    
    return {
      unread: unreadCount,
      total: totalCount,
      read: totalCount - unreadCount,
    };
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(notificationId, {
      isRead: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(notificationId);
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();

    const now = Date.now();
    
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        updatedAt: now,
      });
    }

    return unreadNotifications.length;
  },
});

// Delete a specific notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(notificationId);
    return { success: true };
  },
});

// Clear all notifications
export const clearAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const allNotifications = await ctx.db.query("notifications").collect();
    
    for (const notification of allNotifications) {
      await ctx.db.delete(notification._id);
    }

    return allNotifications.length;
  },
});

// Clear only read notifications
export const clearReadNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const readNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("isRead", true))
      .collect();

    for (const notification of readNotifications) {
      await ctx.db.delete(notification._id);
    }

    return readNotifications.length;
  },
});

// Helper function to create reservation notifications
export const notifyReservationCreated = mutation({
  args: {
    reservationId: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    productName: v.string(),
    quantity: v.number(),
    isGuest: v.boolean(),
  },
  handler: async (ctx, args) => {
    const title = args.isGuest ? "New Guest Reservation" : "New Reservation Created";
    const message = `${args.customerName} reserved ${args.quantity} x ${args.productName}${args.isGuest ? " (Guest booking)" : ""}`;
    
    await ctx.db.insert("notifications", {
      title,
      message,
      type: "reservation",
      isRead: false,
      priority: args.isGuest ? "high" : "medium",
      relatedId: args.reservationId,
      relatedType: "reservation",
      metadata: {
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        productName: args.productName,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to create reservation status update notifications
export const notifyReservationStatusChanged = mutation({
  args: {
    reservationId: v.string(),
    customerName: v.string(),
    productName: v.string(),
    oldStatus: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const title = "Reservation Status Updated";
    const message = `Reservation by ${args.customerName} for ${args.productName} changed from ${args.oldStatus} to ${args.newStatus}`;
    
    const priority = args.newStatus === "cancelled" ? "high" : "medium";
    
    await ctx.db.insert("notifications", {
      title,
      message,
      type: "reservation",
      isRead: false,
      priority,
      relatedId: args.reservationId,
      relatedType: "reservation",
      metadata: {
        customerName: args.customerName,
        productName: args.productName,
        status: args.newStatus,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to create user registration notifications
export const notifyUserRegistered = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const title = "New User Registration";
    const message = `${args.userName} (${args.userEmail}) has registered an account`;
    
    await ctx.db.insert("notifications", {
      title,
      message,
      type: "user",
      isRead: false,
      priority: "low",
      relatedId: args.userId,
      relatedType: "user",
      metadata: {
        customerName: args.userName,
        customerEmail: args.userEmail,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to create low stock alerts
export const notifyLowStock = mutation({
  args: {
    productId: v.string(),
    productName: v.string(),
    currentStock: v.number(),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold || 5;
    const title = "Low Stock Alert";
    const message = `${args.productName} is running low (${args.currentStock} left)`;
    
    await ctx.db.insert("notifications", {
      title,
      message,
      type: "alert",
      isRead: false,
      priority: args.currentStock <= 1 ? "urgent" : "high",
      relatedId: args.productId,
      relatedType: "product",
      metadata: {
        productName: args.productName,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to create order notifications
export const notifyOrderCreated = mutation({
  args: {
    orderId: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    totalAmount: v.number(),
    itemCount: v.number(),
  },
  handler: async (ctx, args) => {
    const title = "New Order Received";
    const message = `${args.customerName} placed an order with ${args.itemCount} item${args.itemCount > 1 ? 's' : ''} worth ₱${args.totalAmount.toFixed(2)}`;
    
    await ctx.db.insert("notifications", {
      title,
      message,
      type: "order",
      isRead: false,
      priority: "medium",
      relatedId: args.orderId,
      relatedType: "order",
      metadata: {
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        amount: args.totalAmount,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get notifications for clients (user-specific and general)
export const getClientNotifications = query({
  args: {
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, userEmail, limit = 50, onlyUnread = false }) => {
    // Build query for notifications
    let notificationsQuery = ctx.db.query("notifications");

    if (onlyUnread) {
      notificationsQuery = notificationsQuery.withIndex("by_read", (q) => q.eq("isRead", false));
    }

    const allNotifications = await notificationsQuery.order("desc").collect();

    // Filter notifications relevant to the specific client
    const clientNotifications = allNotifications.filter(notification => {
      // Include general promotional/system notifications (for all users)
      if (notification.type === "system" && notification.relatedType === "promotion") {
        return true;
      }

      // If user is authenticated, include their specific notifications
      if (userId) {
        // Include user-specific notifications by user ID
        if (notification.relatedId === userId && notification.relatedType === "user") {
          return true;
        }

        // Include notifications for this user's email
        if (userEmail && notification.metadata?.customerEmail === userEmail) {
          return true;
        }
      }

      // If user is guest (no userId), only include notifications by email
      if (!userId && userEmail && notification.metadata?.customerEmail === userEmail) {
        return true;
      }

      return false;
    });

    // Sort by creation date (newest first) and apply limit
    return clientNotifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// Get client notification counts
export const getClientNotificationCounts = query({
  args: {
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, userEmail }) => {
    const allNotifications = await ctx.db.query("notifications").collect();

    // Filter notifications relevant to the specific client (same logic as getClientNotifications)
    const clientNotifications = allNotifications.filter(notification => {
      // Include general promotional/system notifications (for all users)
      if (notification.type === "system" && notification.relatedType === "promotion") {
        return true;
      }

      // If user is authenticated, include their specific notifications
      if (userId) {
        // Include user-specific notifications by user ID
        if (notification.relatedId === userId && notification.relatedType === "user") {
          return true;
        }

        // Include notifications for this user's email
        if (userEmail && notification.metadata?.customerEmail === userEmail) {
          return true;
        }
      }

      // If user is guest (no userId), only include notifications by email
      if (!userId && userEmail && notification.metadata?.customerEmail === userEmail) {
        return true;
      }

      return false;
    });

    const unreadCount = clientNotifications.filter(n => !n.isRead).length;
    const totalCount = clientNotifications.length;

    return {
      unread: unreadCount,
      total: totalCount,
      read: totalCount - unreadCount,
    };
  },
});

// Create promotion notifications (system-wide)
export const createPromotionNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    promoCode: v.optional(v.string()),
    discount: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: "system",
      isRead: false,
      priority: "medium",
      relatedType: "promotion",
      metadata: {
        promoCode: args.promoCode,
        discount: args.discount,
        expiryDate: args.expiryDate,
      },
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});

// Create client-specific reservation confirmation notification
export const notifyClientReservationConfirmed = mutation({
  args: {
    reservationId: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    productName: v.string(),
    quantity: v.number(),
    expiryDate: v.number(),
  },
  handler: async (ctx, args) => {
    const title = "Reservation Confirmed";
    const message = `Your reservation for ${args.quantity} x ${args.productName} has been confirmed. Please pick up within 48 hours.`;

    await ctx.db.insert("notifications", {
      title,
      message,
      type: "reservation",
      isRead: false,
      priority: "high",
      relatedId: args.reservationId,
      relatedType: "reservation",
      metadata: {
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        productName: args.productName,
        expiryDate: args.expiryDate,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Create client-specific order update notification
export const notifyClientOrderUpdate = mutation({
  args: {
    orderId: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    status: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const statusMessages: Record<string, string> = {
      confirmed: "Your order has been confirmed and is being prepared.",
      ready: "Your order is ready for pickup at our store.",
      completed: "Your order has been completed. Thank you!",
      cancelled: "Your order has been cancelled.",
    };

    const title = `Order ${args.status.charAt(0).toUpperCase() + args.status.slice(1)}`;
    const message = args.message || statusMessages[args.status] || `Your order status has been updated to ${args.status}.`;

    await ctx.db.insert("notifications", {
      title,
      message,
      type: "order",
      isRead: false,
      priority: args.status === "ready" ? "high" : "medium",
      relatedId: args.orderId,
      relatedType: "order",
      metadata: {
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        status: args.status,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get admin notifications (all types for admin dashboard)
export const getAdminNotifications = query({
  args: {
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 50, onlyUnread = false }) => {
    let notificationsQuery = ctx.db.query("notifications");

    if (onlyUnread) {
      notificationsQuery = notificationsQuery.withIndex("by_read", (q) => q.eq("isRead", false));
    }

    const notifications = await notificationsQuery
      .order("desc")
      .take(limit);

    // Sort by creation date (newest first) and priority (urgent first)
    return notifications.sort((a, b) => {
      // First sort by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then sort by creation date
      return b.createdAt - a.createdAt;
    });
  },
});

// Auto-cleanup old notifications (run periodically)
export const cleanupOldNotifications = mutation({
  args: {
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, { daysToKeep = 30 }) => {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), cutoffDate))
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return {
      deletedCount: oldNotifications.length,
      cutoffDate,
    };
  },
});

// Helper function to create sample notifications for testing
export const createTestNotification = mutation({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, { type = "order" }) => {
    const now = Date.now();

    const sampleNotifications = {
      order: {
        title: "New Order Received",
        message: "Order #ORD-001 has been placed by John Doe for ₱2,500.00",
        type: "order" as const,
        priority: "high" as const,
        metadata: {
          customerName: "John Doe",
          customerEmail: "john@example.com",
          amount: 2500,
          orderId: "ORD-001",
        }
      },
      reservation: {
        title: "Reservation Expiring Soon",
        message: "Reservation for Blue Tang Fish expires in 2 hours",
        type: "reservation" as const,
        priority: "urgent" as const,
        metadata: {
          customerName: "Jane Smith",
          productName: "Blue Tang Fish",
        }
      },
      user: {
        title: "New User Registered",
        message: "A new customer has registered: Mike Johnson",
        type: "user" as const,
        priority: "medium" as const,
        metadata: {
          customerName: "Mike Johnson",
          customerEmail: "mike@example.com",
        }
      },
      payment: {
        title: "Payment Issue Detected",
        message: "Payment failed for order #ORD-002",
        type: "payment" as const,
        priority: "urgent" as const,
        metadata: {
          orderId: "ORD-002",
          amount: 1500,
        }
      },
      alert: {
        title: "Low Stock Alert",
        message: "Tropical Fish category has items with low stock",
        type: "alert" as const,
        priority: "high" as const,
        metadata: {
          productName: "Tropical Fish Collection",
        }
      }
    };

    const notification = sampleNotifications[type as keyof typeof sampleNotifications] || sampleNotifications.order;

    const notificationId = await ctx.db.insert("notifications", {
      ...notification,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});