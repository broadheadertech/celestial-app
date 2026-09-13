import { query, mutation, MutationCtx } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { getViewer, isStaffRole, requireStaff, requireUser } from "../lib/authz";

/*
 * Authorization model for the (single, shared) notifications table:
 * - Staff (admin/super_admin) manage every notification.
 * - A signed-in client sees global promotions plus notifications addressed to their own
 *   account (their user id or their account email). Identity comes from the session, never
 *   from userId/userEmail arguments.
 * - Guests have no notification access.
 * - Internal notifications raised by business flows (reservations, sign-up, low stock) are
 *   plain helpers below, not public mutations, so they can't be spammed from the client.
 */

function isPromotion(notification: Doc<"notifications">): boolean {
  return notification.type === "system" && notification.relatedType === "promotion";
}

function isAddressedToUser(notification: Doc<"notifications">, viewer: Doc<"users">): boolean {
  if (notification.relatedType === "user" && notification.relatedId === viewer._id) {
    return true;
  }
  if (viewer.email && notification.metadata?.customerEmail === viewer.email) {
    return true;
  }
  return false;
}

function forbidden() {
  return new ConvexError({ code: "FORBIDDEN", message: "You don't have permission to do that." });
}

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
    await requireStaff(ctx);
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
    await requireStaff(ctx);
    let notifications;

    if (onlyUnread) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_read", (q) => q.eq("isRead", false))
        .order("desc")
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .order("desc")
        .take(limit);
    }

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

// Get notification counts
export const getNotificationCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
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
    const viewer = await requireUser(ctx);
    const notification = await ctx.db.get(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (
      !isStaffRole(viewer.role) &&
      !isPromotion(notification) &&
      !isAddressedToUser(notification, viewer)
    ) {
      throw forbidden();
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
    const viewer = await requireUser(ctx);
    const allUnread = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();

    // Staff mark the whole feed; clients only their own notifications (and promotions).
    const unreadNotifications = isStaffRole(viewer.role)
      ? allUnread
      : allUnread.filter((n) => isPromotion(n) || isAddressedToUser(n, viewer));

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
    const viewer = await requireUser(ctx);
    const notification = await ctx.db.get(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Clients may only delete notifications addressed to them (not shared promotions).
    if (!isStaffRole(viewer.role) && !isAddressedToUser(notification, viewer)) {
      throw forbidden();
    }

    await ctx.db.delete(notificationId);
    return { success: true };
  },
});

// Clear all notifications
export const clearAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const everyNotification = await ctx.db.query("notifications").collect();

    // Staff clear the whole feed; clients only notifications addressed to them.
    const allNotifications = isStaffRole(viewer.role)
      ? everyNotification
      : everyNotification.filter((n) => isAddressedToUser(n, viewer));

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
    await requireStaff(ctx);
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
export async function notifyReservationCreated(
  ctx: MutationCtx,
  args: {
    reservationId: string;
    customerName: string;
    customerEmail?: string;
    productName: string;
    quantity: number;
    isGuest: boolean;
  },
): Promise<void> {
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
}

// Helper function to create reservation status update notifications
export async function notifyReservationStatusChanged(
  ctx: MutationCtx,
  args: {
    reservationId: string;
    customerName: string;
    productName: string;
    oldStatus: string;
    newStatus: string;
  },
): Promise<void> {
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
}

// Helper function to notify customers when their reservation is ready for pickup
export async function notifyReservationReadyForPickup(
  ctx: MutationCtx,
  args: {
    reservationId: string;
    customerName: string;
    customerEmail?: string;
    productName: string;
    quantity: number;
    pickupLocation?: string;
    notes?: string;
    pickupDate?: string;
    pickupTime?: string;
  },
): Promise<void> {
  const title = "🎉 Your Reservation is Ready for Pickup!";
  const pickupInfo = args.pickupLocation ? ` at ${args.pickupLocation}` : "";
  const pickupDateTime = args.pickupDate && args.pickupTime ? `\n\n📅 Pickup Schedule: ${args.pickupDate} at ${args.pickupTime}` : "";
  const additionalNotes = args.notes ? `\n\nNote: ${args.notes}` : "";

  const message = `Hello ${args.customerName}! Your reservation for ${args.quantity}x ${args.productName} is now ready for pickup${pickupInfo}. Please visit us to collect your items.${pickupDateTime}${additionalNotes}`;

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
      status: "ready_for_pickup",
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// Helper function to create user registration notifications
export async function notifyUserRegistered(
  ctx: MutationCtx,
  args: {
    userId: string;
    userName: string;
    userEmail: string;
  },
): Promise<void> {
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
}

// Helper function to create low stock alerts
export async function notifyLowStock(
  ctx: MutationCtx,
  args: {
    productId: string;
    productName: string;
    currentStock: number;
    threshold?: number;
  },
): Promise<void> {
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
}

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
    await requireStaff(ctx);
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
  // userId/userEmail are kept for client compatibility but ignored: identity comes from the session.
  handler: async (ctx, { limit = 50, onlyUnread = false }) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    // Build query for notifications
    let allNotifications;

    if (onlyUnread) {
      allNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_read", (q) => q.eq("isRead", false))
        .order("desc")
        .collect();
    } else {
      allNotifications = await ctx.db
        .query("notifications")
        .order("desc")
        .collect();
    }

    // Filter notifications relevant to the signed-in client: promotions + their own
    const clientNotifications = allNotifications.filter(
      (notification) => isPromotion(notification) || isAddressedToUser(notification, viewer),
    );

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
  // userId/userEmail are kept for client compatibility but ignored: identity comes from the session.
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return { unread: 0, total: 0, read: 0 };
    }

    const allNotifications = await ctx.db.query("notifications").collect();

    // Filter notifications relevant to the signed-in client (same logic as getClientNotifications)
    const clientNotifications = allNotifications.filter(
      (notification) => isPromotion(notification) || isAddressedToUser(notification, viewer),
    );

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
    await requireStaff(ctx);
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: "system",
      isRead: false,
      priority: "medium",
      relatedType: "promotion",
      metadata: {
        status: "promotion",
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
    await requireStaff(ctx);
    const title = "✅ Reservation Confirmed";
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
        status: "confirmed",
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
    await requireStaff(ctx);
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


// Auto-cleanup old notifications (run periodically)
export const cleanupOldNotifications = mutation({
  args: {
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, { daysToKeep = 30 }) => {
    await requireStaff(ctx);
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
    await requireStaff(ctx);
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

// Schedule push notification for a specific notification
export const schedulePushNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    scheduledTime: v.optional(v.number()), // Unix timestamp
    immediate: v.optional(v.boolean()),
  },
  handler: async (ctx, { notificationId, scheduledTime, immediate = false }) => {
    await requireStaff(ctx);
    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    const now = Date.now();
    const scheduleTime = immediate ? now + 1000 : (scheduledTime || now + 1000);

    await ctx.db.patch(notificationId, {
      scheduledPushTime: scheduleTime,
      pushNotificationSent: false,
      updatedAt: now,
    });

    return { success: true, scheduledTime };
  },
});

// Mark push notification as sent
export const markPushNotificationSent = mutation({
  args: {
    notificationId: v.id("notifications"),
    localNotificationId: v.optional(v.number()),
  },
  handler: async (ctx, { notificationId, localNotificationId }) => {
    await requireStaff(ctx);
    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(notificationId, {
      pushNotificationSent: true,
      pushNotificationId: localNotificationId,
      updatedAt: Date.now(),
    });

    return notification;
  },
});

// Get notifications that need push notifications scheduled
export const getPendingPushNotifications = query({
  args: {
    currentTime: v.optional(v.number()),
  },
  handler: async (ctx, { currentTime = Date.now() }) => {
    await requireStaff(ctx);
    const pendingNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_push_scheduled")
      .filter((q) =>
        q.and(
          q.eq(q.field("pushNotificationSent"), false),
          q.lte(q.field("scheduledPushTime"), currentTime),
          q.gt(q.field("scheduledPushTime"), 0)
        )
      )
      .collect();

    return pendingNotifications;
  },
});

// Create notification with push notification integration
export const createNotificationWithPush = mutation({
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
    targetUserId: v.optional(v.string()),
    targetUserEmail: v.optional(v.string()),
    scheduledPushTime: v.optional(v.number()),
    pushAction: v.optional(v.string()),
    pushData: v.optional(v.object({
      reservationId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      productId: v.optional(v.string()),
    })),
    metadata: v.optional(v.object({
      customerName: v.optional(v.string()),
      customerEmail: v.optional(v.string()),
      productName: v.optional(v.string()),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: args.type,
      isRead: false,
      priority: args.priority || "medium",
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      targetUserId: args.targetUserId,
      targetUserEmail: args.targetUserEmail,
      scheduledPushTime: args.scheduledPushTime,
      pushNotificationSent: false,
      metadata: {
        ...args.metadata,
        pushAction: args.pushAction,
        pushData: args.pushData,
      },
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});

// Cancel push notifications for a specific entity
export const cancelPushNotifications = mutation({
  args: {
    relatedType: v.string(),
    relatedId: v.string(),
  },
  handler: async (ctx, { relatedType, relatedId }) => {
    await requireStaff(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("relatedType"), relatedType),
          q.eq(q.field("relatedId"), relatedId),
          q.eq(q.field("pushNotificationSent"), false)
        )
      )
      .collect();

    const cancelledIds: string[] = [];

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        scheduledPushTime: undefined,
        pushNotificationSent: true, // Mark as "sent" to prevent scheduling
        updatedAt: Date.now(),
      });
      cancelledIds.push(notification._id);
    }

    return { cancelledCount: cancelledIds.length, cancelledIds };
  },
});

// Get user's push notification preferences
export const getPushNotificationPreferences = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    // This would typically be stored in a user preferences table
    // For now, return default preferences
    return {
      orderUpdates: true,
      reservationUpdates: true,
      promotions: false,
      lowStockAlerts: false,
      newArrivals: true,
    };
  },
});

// Update push notification preferences
export const updatePushNotificationPreferences = mutation({
  args: {
    userId: v.string(),
    preferences: v.object({
      orderUpdates: v.optional(v.boolean()),
      reservationUpdates: v.optional(v.boolean()),
      promotions: v.optional(v.boolean()),
      lowStockAlerts: v.optional(v.boolean()),
      newArrivals: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { preferences }) => {
    await requireUser(ctx);
    // This would typically update a user preferences table
    // For now, just return success
    return { success: true, preferences };
  },
});