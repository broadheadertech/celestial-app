import { query, mutation, MutationCtx, QueryCtx } from "../_generated/server";
import { v, ConvexError, Infer } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { getViewer, isStaffRole, requireStaff, requireUser } from "../lib/authz";
import { DEFAULT_BUSINESS_PROFILE } from "./business";

/*
 * Notifications have two audiences (`notifications.audience`):
 *
 * - "staff" — the shared admin team inbox. Raised by business flows: new reservations,
 *   reservation status changes, low stock, user sign-ups, web orders, viewing requests,
 *   contact messages, and the staff-only create/test mutations. Read state is the shared
 *   `isRead` flag (one staff member marking it read marks it read for the team). Only staff
 *   can see, read or delete these. Customers never see them, whatever their metadata says.
 *
 * - "customer" — a customer's own feed: "ready for pickup", client reservation confirmations,
 *   client order updates (addressed by metadata.customerEmail) and promotion broadcasts
 *   (addressed to every signed-in user). Read/dismiss state is per user in
 *   `notificationReceipts`; the shared row is never modified or deleted by a customer.
 *   These don't appear in the staff inbox.
 *
 * Identity always comes from the session (getViewer), never from userId/userEmail arguments.
 * Guests have no notification access. Helpers raised by business flows are plain functions,
 * not public mutations, so they can't be spammed from the client.
 */

type Audience = "staff" | "customer";
type Ctx = QueryCtx | MutationCtx;

const audienceValidator = v.union(v.literal("staff"), v.literal("customer"));

const MAX_LIMIT = 200;

function clampLimit(limit: number): number {
  return Math.max(1, Math.min(Math.floor(limit) || 1, MAX_LIMIT));
}

function isPromotion(notification: Doc<"notifications">): boolean {
  return notification.type === "system" && notification.relatedType === "promotion";
}

/**
 * The audience of a notification. Rows created before `audience` existed are classified by
 * how the old helpers built them: promotions and client updates (which carry both a
 * customerEmail and a status) were customer-facing; everything else was a staff alert
 * (staff alerts that carry customerEmail — new reservation, new order, user registered —
 * never set a status).
 */
export function audienceOf(notification: Doc<"notifications">): Audience {
  if (notification.audience) return notification.audience;
  if (isPromotion(notification)) return "customer";
  if (notification.metadata?.customerEmail && notification.metadata?.status) return "customer";
  return "staff";
}

function normalizeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** A customer-facing notification this signed-in user is a recipient of. */
function isVisibleToCustomer(notification: Doc<"notifications">, viewer: Doc<"users">): boolean {
  if (audienceOf(notification) !== "customer") return false;
  if (isPromotion(notification)) return true;
  if (notification.relatedType === "user" && notification.relatedId === viewer._id) return true;
  const viewerEmail = normalizeEmail(viewer.email);
  return viewerEmail !== "" && normalizeEmail(notification.metadata?.customerEmail) === viewerEmail;
}

function forbidden() {
  return new ConvexError({ code: "FORBIDDEN", message: "You don't have permission to do that." });
}

async function takeMatching<T>(
  rows: AsyncIterable<T>,
  predicate: (row: T) => boolean,
  limit: number,
): Promise<T[]> {
  const out: T[] = [];
  for await (const row of rows) {
    if (!predicate(row)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

const isStaffNotification = (n: Doc<"notifications">) => audienceOf(n) === "staff";
const isCustomerNotification = (n: Doc<"notifications">) => audienceOf(n) === "customer";

/** Staff-inbox rows, newest first (optionally only read/unread), up to `limit`. */
async function staffInbox(ctx: Ctx, opts: { isRead?: boolean; limit?: number } = {}) {
  const { isRead, limit = Number.MAX_SAFE_INTEGER } = opts;
  const byAudience = (audience: Audience | undefined) =>
    ctx.db
      .query("notifications")
      .withIndex("by_audience_and_read", (q) =>
        isRead === undefined ? q.eq("audience", audience) : q.eq("audience", audience).eq("isRead", isRead),
      )
      .order("desc");

  const [explicit, legacy] = await Promise.all([
    takeMatching(byAudience("staff"), () => true, limit),
    takeMatching(byAudience(undefined), isStaffNotification, limit),
  ]);
  return [...explicit, ...legacy].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

/** Every customer-facing row (explicit + legacy). Filter per viewer with isVisibleToCustomer. */
async function customerCandidates(ctx: Ctx) {
  const byAudience = (audience: Audience | undefined) =>
    ctx.db
      .query("notifications")
      .withIndex("by_audience_and_read", (q) => q.eq("audience", audience))
      .order("desc");

  const [explicit, legacy] = await Promise.all([
    byAudience("customer").collect(),
    takeMatching(byAudience(undefined), isCustomerNotification, Number.MAX_SAFE_INTEGER),
  ]);
  return [...explicit, ...legacy];
}

async function receiptsByNotification(ctx: Ctx, userId: Id<"users">) {
  const receipts = await ctx.db
    .query("notificationReceipts")
    .withIndex("by_user_and_notification", (q) => q.eq("userId", userId))
    .collect();
  return new Map(receipts.map((r) => [r.notificationId as string, r]));
}

/** The viewer's customer feed: visible, not dismissed, with `isRead` reflecting their own receipt. */
async function customerFeed(ctx: Ctx, viewer: Doc<"users">) {
  const [candidates, receipts] = await Promise.all([
    customerCandidates(ctx),
    receiptsByNotification(ctx, viewer._id),
  ]);
  return candidates
    .filter((n) => isVisibleToCustomer(n, viewer) && !receipts.get(n._id)?.dismissedAt)
    .map((n) => ({ ...n, isRead: Boolean(receipts.get(n._id)?.readAt) }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function upsertReceipt(
  ctx: MutationCtx,
  userId: Id<"users">,
  notificationId: Id<"notifications">,
  patch: { readAt?: number; dismissedAt?: number },
) {
  const existing = await ctx.db
    .query("notificationReceipts")
    .withIndex("by_user_and_notification", (q) => q.eq("userId", userId).eq("notificationId", notificationId))
    .unique();
  if (!existing) {
    await ctx.db.insert("notificationReceipts", { userId, notificationId, ...patch });
    return;
  }
  // Keep the first timestamps; only fill in what's missing.
  const update: { readAt?: number; dismissedAt?: number } = {};
  if (patch.readAt !== undefined && existing.readAt === undefined) update.readAt = patch.readAt;
  if (patch.dismissedAt !== undefined && existing.dismissedAt === undefined) update.dismissedAt = patch.dismissedAt;
  if (update.readAt !== undefined || update.dismissedAt !== undefined) {
    await ctx.db.patch(existing._id, update);
  }
}

async function deleteNotificationAndReceipts(ctx: MutationCtx, notificationId: Id<"notifications">) {
  const receipts = await ctx.db
    .query("notificationReceipts")
    .withIndex("by_notification", (q) => q.eq("notificationId", notificationId))
    .collect();
  for (const receipt of receipts) {
    await ctx.db.delete(receipt._id);
  }
  await ctx.db.delete(notificationId);
}

/** Which feed a no-arg bulk action applies to: explicit scope, else staff for staff users. */
function resolveScope(viewer: Doc<"users">, scope: Audience | undefined): Audience {
  const resolved = scope ?? (isStaffRole(viewer.role) ? "staff" : "customer");
  if (resolved === "staff" && !isStaffRole(viewer.role)) throw forbidden();
  return resolved;
}

// Create a new staff-inbox notification
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
      audience: "staff",
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

// Staff inbox (shared read state)
export const getAdminNotifications = query({
  args: {
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 50, onlyUnread = false }) => {
    await requireStaff(ctx);
    const notifications = await staffInbox(ctx, {
      isRead: onlyUnread ? false : undefined,
      limit: clampLimit(limit),
    });

    // Sort by priority (urgent first), then creation date (newest first)
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return notifications.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

// Staff inbox counts
export const getNotificationCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const allNotifications = await staffInbox(ctx);

    const unreadCount = allNotifications.filter((n) => !n.isRead).length;
    const totalCount = allNotifications.length;

    return {
      unread: unreadCount,
      total: totalCount,
      read: totalCount - unreadCount,
    };
  },
});

// Mark a notification as read: shared flag for staff-inbox rows, the viewer's own receipt
// for customer-facing rows.
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

    if (audienceOf(notification) === "staff") {
      if (!isStaffRole(viewer.role)) throw forbidden();
      await ctx.db.patch(notificationId, {
        isRead: true,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(notificationId);
    }

    if (!isVisibleToCustomer(notification, viewer)) throw forbidden();
    await upsertReceipt(ctx, viewer._id, notificationId, { readAt: Date.now() });
    return { ...notification, isRead: true };
  },
});

// Mark all notifications in a feed as read. `scope` defaults to the staff inbox for staff
// users and the customer feed for everyone else.
export const markAllAsRead = mutation({
  args: {
    scope: v.optional(audienceValidator),
  },
  handler: async (ctx, { scope }) => {
    const viewer = await requireUser(ctx);
    const now = Date.now();

    if (resolveScope(viewer, scope) === "staff") {
      const unread = await staffInbox(ctx, { isRead: false });
      for (const notification of unread) {
        await ctx.db.patch(notification._id, { isRead: true, updatedAt: now });
      }
      return unread.length;
    }

    const unread = (await customerFeed(ctx, viewer)).filter((n) => !n.isRead);
    for (const notification of unread) {
      await upsertReceipt(ctx, viewer._id, notification._id, { readAt: now });
    }
    return unread.length;
  },
});

// Delete a notification: staff delete staff-inbox rows for the team; customers dismiss
// customer-facing rows for themselves only (the shared row is kept).
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

    if (audienceOf(notification) === "staff") {
      if (!isStaffRole(viewer.role)) throw forbidden();
      await deleteNotificationAndReceipts(ctx, notificationId);
      return { success: true };
    }

    if (!isVisibleToCustomer(notification, viewer)) throw forbidden();
    await upsertReceipt(ctx, viewer._id, notificationId, { dismissedAt: Date.now() });
    return { success: true };
  },
});

// Clear a feed: staff delete every staff-inbox row; customers dismiss their whole feed.
// `scope` defaults as in markAllAsRead.
export const clearAllNotifications = mutation({
  args: {
    scope: v.optional(audienceValidator),
  },
  handler: async (ctx, { scope }) => {
    const viewer = await requireUser(ctx);

    if (resolveScope(viewer, scope) === "staff") {
      const inbox = await staffInbox(ctx);
      for (const notification of inbox) {
        await deleteNotificationAndReceipts(ctx, notification._id);
      }
      return inbox.length;
    }

    const now = Date.now();
    const feed = await customerFeed(ctx, viewer);
    for (const notification of feed) {
      await upsertReceipt(ctx, viewer._id, notification._id, { dismissedAt: now });
    }
    return feed.length;
  },
});

// Clear only read staff-inbox notifications
export const clearReadNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const readNotifications = await staffInbox(ctx, { isRead: true });

    for (const notification of readNotifications) {
      await deleteNotificationAndReceipts(ctx, notification._id);
    }

    return readNotifications.length;
  },
});

// Staff alert: a reservation was created.
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
    audience: "staff",
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

// Staff alert: a reservation's status changed (worded for staff; the customer-facing
// counterpart is notifyReservationReadyForPickup).
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
    audience: "staff",
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

// Customer notification: their reservation is ready for pickup (addressed by customerEmail).
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
    audience: "customer",
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

// Staff alert: a customer registered an account.
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
    audience: "staff",
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

// Staff alert: low stock.
export async function notifyLowStock(
  ctx: MutationCtx,
  args: {
    productId: string;
    productName: string;
    currentStock: number;
    threshold?: number;
  },
): Promise<void> {
  const title = "Low Stock Alert";
  const message = `${args.productName} is running low (${args.currentStock} left)`;

  await ctx.db.insert("notifications", {
    title,
    message,
    type: "alert",
    isRead: false,
    audience: "staff",
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

// Staff alert: an order was created.
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
      audience: "staff",
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

// The signed-in customer's feed (their own notifications + promotions), with per-user read
// state. Dismissed notifications are excluded.
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

    const feed = await customerFeed(ctx, viewer);
    return (onlyUnread ? feed.filter((n) => !n.isRead) : feed).slice(0, clampLimit(limit));
  },
});

// Counts for the signed-in customer's feed (per-user read state, dismissed excluded)
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

    const feed = await customerFeed(ctx, viewer);
    const unreadCount = feed.filter((n) => !n.isRead).length;
    const totalCount = feed.length;

    return {
      unread: unreadCount,
      total: totalCount,
      read: totalCount - unreadCount,
    };
  },
});

// Create a promotion broadcast (customer-facing, every signed-in user)
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
      audience: "customer",
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

// Customer notification: reservation confirmed (addressed by customerEmail)
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
      audience: "customer",
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

// Customer notification: order status update (addressed by customerEmail)
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
      audience: "customer",
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


// Auto-cleanup old notifications of both audiences, with their receipts (run periodically)
export const cleanupOldNotifications = mutation({
  args: {
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, { daysToKeep = 30 }) => {
    await requireStaff(ctx);
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoffDate))
      .collect();

    for (const notification of oldNotifications) {
      await deleteNotificationAndReceipts(ctx, notification._id);
    }

    return {
      deletedCount: oldNotifications.length,
      cutoffDate,
    };
  },
});

// Create a sample staff-inbox notification for testing
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
      audience: "staff",
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});

/* ------------------------------------------------------------------------------------------
 * Storefront submissions: staff notifications + shared helpers for customer emails.
 *
 * Staff notifications for web orders, viewing requests and contact messages are
 * audience "staff", so they never reach a customer's feed. They also omit
 * metadata.customerEmail, which keeps them classified as staff alerts even by the legacy
 * fallback in audienceOf().
 * ------------------------------------------------------------------------------------------ */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatPeso(amount: number): string {
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}₱${grouped}.${cents}`;
}

/** "2026-09-20" → "Sunday, 20 September 2026" (falls back to the raw value). */
export function formatViewingDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return date;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14:30" → "2:30 PM" (falls back to the raw value). */
export function formatViewingTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return time;
  const hours = Number(m[1]);
  if (hours > 23 || Number(m[2]) > 59) return time;
  return `${hours % 12 || 12}:${m[2]} ${hours < 12 ? "AM" : "PM"}`;
}

/** A trimmed, plausibly deliverable address, or null. */
export function normalizeCustomerEmail(email: string | undefined): string | null {
  const trimmed = (email ?? "").trim();
  if (!trimmed || trimmed.length > 254) return null;
  return /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(trimmed) ? trimmed : null;
}

/** Store contact details passed to email actions (from the businessProfile table). */
export const storeContactValidator = v.object({
  storeName: v.string(),
  phone: v.string(),
  landline: v.string(),
  whatsappNumber: v.string(),
  email: v.string(),
  addressLine: v.string(),
  city: v.string(),
  mapUrl: v.string(),
  hours: v.string(),
});

export type StoreContact = Infer<typeof storeContactValidator>;

type OpeningHours = { day: string; open: string; close: string; closed: boolean }[];

function summarizeHours(hours: OpeningHours): string {
  const label = (h: OpeningHours[number]) => (h.closed ? "Closed" : `${formatViewingTime(h.open)} – ${formatViewingTime(h.close)}`);
  const groups: { first: string; last: string; label: string }[] = [];
  for (const h of hours) {
    const current = label(h);
    const previous = groups[groups.length - 1];
    if (previous && previous.label === current) {
      previous.last = h.day;
    } else {
      groups.push({ first: h.day, last: h.day, label: current });
    }
  }
  return groups
    .map((g) => `${g.first === g.last ? g.first.slice(0, 3) : `${g.first.slice(0, 3)}–${g.last.slice(0, 3)}`}: ${g.label}`)
    .join(" · ");
}

export async function loadStoreContact(ctx: QueryCtx | MutationCtx): Promise<StoreContact> {
  const row = await ctx.db.query("businessProfile").first();
  const profile = { ...DEFAULT_BUSINESS_PROFILE, ...(row ?? {}) };
  const hours = summarizeHours(profile.hours ?? []);
  return {
    storeName: profile.storeName || DEFAULT_BUSINESS_PROFILE.storeName,
    phone: profile.phone ?? "",
    landline: profile.landline ?? "",
    whatsappNumber: profile.whatsappNumber ?? "",
    email: profile.email ?? "",
    addressLine: profile.addressLine ?? "",
    city: profile.city ?? "",
    mapUrl: profile.mapUrl ?? "",
    hours: profile.hoursNote ? `${hours}${hours ? " · " : ""}${profile.hoursNote}` : hours,
  };
}

const ACK_WINDOW_MS = 60 * 60 * 1000;
const ACK_SCAN_LIMIT = 100;
const MAX_ACKS_PER_ADDRESS = 3;
const MAX_ACKS_PER_WINDOW = 30;

/**
 * Throttle for acknowledgement emails from open (guest) forms, so they can't be used to
 * mail-bomb an address: at most a few per address and a global cap per hour. Reads only
 * the most recent submissions. The submission itself is always saved either way.
 */
export async function shouldSendAcknowledgement(
  ctx: QueryCtx | MutationCtx,
  table: "viewings" | "contactMessages",
  email: string,
  submissionId: string,
): Promise<boolean> {
  const rows: { _id: string; email: string; createdAt: number }[] =
    table === "viewings"
      ? await ctx.db.query("viewings").order("desc").take(ACK_SCAN_LIMIT)
      : await ctx.db.query("contactMessages").order("desc").take(ACK_SCAN_LIMIT);
  const since = Date.now() - ACK_WINDOW_MS;
  const earlier = rows.filter((row) => row._id !== submissionId && row.createdAt >= since);
  if (earlier.length >= MAX_ACKS_PER_WINDOW) return false;
  const key = email.toLowerCase();
  return earlier.filter((row) => row.email.toLowerCase() === key).length < MAX_ACKS_PER_ADDRESS;
}

// Staff notification: a guest or client placed a storefront (web checkout) order.
export async function notifyWebOrderPlaced(
  ctx: MutationCtx,
  args: {
    orderId: string;
    orderCode: string;
    customerName: string;
    itemCount: number;
    totalAmount: number;
    fulfilment: string;
  },
): Promise<void> {
  const now = Date.now();
  await ctx.db.insert("notifications", {
    title: `New web order ${args.orderCode}`,
    message: `${args.customerName} ordered ${args.itemCount} item${args.itemCount === 1 ? "" : "s"} · ${formatPeso(args.totalAmount)} · ${args.fulfilment}`,
    type: "order",
    isRead: false,
    audience: "staff",
    priority: "high",
    relatedId: args.orderId,
    relatedType: "order",
    metadata: {
      customerName: args.customerName,
      amount: args.totalAmount,
      status: "pending",
    },
    createdAt: now,
    updatedAt: now,
  });
}

// Staff notification: a gallery viewing was requested from the /visit page.
export async function notifyViewingRequested(
  ctx: MutationCtx,
  args: {
    viewingId: string;
    name: string;
    date: string;
    time: string;
    partySize: number;
  },
): Promise<void> {
  const now = Date.now();
  await ctx.db.insert("notifications", {
    title: "New viewing request",
    message: `${args.name} · ${formatViewingDate(args.date)} at ${formatViewingTime(args.time)} · party of ${args.partySize}`,
    type: "reservation",
    isRead: false,
    audience: "staff",
    priority: "medium",
    relatedId: args.viewingId,
    relatedType: "viewing",
    metadata: {
      customerName: args.name,
      status: "requested",
    },
    createdAt: now,
    updatedAt: now,
  });
}

// Staff notification: a message was sent from the /contact form.
export async function notifyContactMessageReceived(
  ctx: MutationCtx,
  args: {
    messageId: string;
    name: string;
    subject: string;
  },
): Promise<void> {
  const now = Date.now();
  await ctx.db.insert("notifications", {
    title: "New contact message",
    message: `${args.name}: ${args.subject}`,
    type: "user",
    isRead: false,
    audience: "staff",
    priority: "medium",
    relatedId: args.messageId,
    relatedType: "contactMessage",
    metadata: {
      customerName: args.name,
      status: "new",
    },
    createdAt: now,
    updatedAt: now,
  });
}