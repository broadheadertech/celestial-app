import { query, mutation, QueryCtx, MutationCtx } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { isListedPublicly } from "../lib/purchaseMode";
import { Doc, Id } from "../_generated/dataModel";
import { getReservationUser } from "../lib/reservationUser";
import {
  notifyLowStock,
  notifyReservationCreated,
  notifyReservationStatusChanged,
  notifyReservationReadyForPickup
} from './notifications';
import { reserveStockHelper, releaseReservedStockHelper } from './stock';
import { recordAudit } from './audit';
import { getViewer, isStaffRole, requireStaff, requireUser } from "../lib/authz";

// ==================== AUTHORIZATION HELPERS ====================
// Identity always comes from the verified session (getViewer). userId/guestId arguments are
// only used to pick which records to act on: a userId must be the caller's own account (or the
// caller must be staff), and a guestId acts as a bearer capability for that guest's own records.

function forbidden(message = "You don't have permission to do that.") {
  return new ConvexError({ code: "FORBIDDEN", message });
}

// Reservation userIds are Convex user ids, or legacy Facebook ids for older records.
function isViewerUserId(viewer: Doc<"users">, userId: string | undefined): boolean {
  if (!userId) return false;
  return userId === viewer._id || (!!viewer.facebookId && userId === viewer.facebookId);
}

function canAccessReservation(
  viewer: Doc<"users"> | null,
  reservation: Doc<"reservations">,
  guestId: string | undefined,
): boolean {
  if (viewer && isStaffRole(viewer.role)) return true;
  if (viewer && isViewerUserId(viewer, reservation.userId)) return true;
  if (guestId && reservation.guestId && reservation.guestId === guestId) return true;
  return false;
}

// Creating a reservation for a userId requires being that user (or staff, e.g. POS).
async function assertCanReserveAs(
  ctx: MutationCtx,
  userId: string | undefined,
): Promise<Doc<"users"> | null> {
  if (!userId) return await getViewer(ctx);
  const viewer = await requireUser(ctx);
  if (!isStaffRole(viewer.role) && !isViewerUserId(viewer, userId)) {
    throw forbidden("You can only create reservations for your own account");
  }
  return viewer;
}

const LIMITS = {
  name: 100,
  email: 254,
  phone: 40,
  address: 500,
  guestNotes: 2000,
  schedule: 40,
  notes: 4000,
  items: 100,
};

function assertReservationInputLimits(
  guestInfo:
    | {
        name: string;
        email: string;
        phone: string;
        address?: string;
        completeAddress?: string;
        notes?: string;
        pickupSchedule?: { date: string; time: string };
      }
    | undefined,
  notes: string | undefined,
) {
  if (guestInfo) {
    if (!guestInfo.name.trim()) throw new Error("Name is required");
    if (guestInfo.name.length > LIMITS.name) throw new Error(`Name must be at most ${LIMITS.name} characters`);
    if (guestInfo.email.length > LIMITS.email) throw new Error("Email is too long");
    if (guestInfo.phone.length > LIMITS.phone) throw new Error("Phone number is too long");
    if ((guestInfo.address?.length ?? 0) > LIMITS.address || (guestInfo.completeAddress?.length ?? 0) > LIMITS.address) {
      throw new Error(`Address must be at most ${LIMITS.address} characters`);
    }
    if ((guestInfo.notes?.length ?? 0) > LIMITS.guestNotes) {
      throw new Error(`Notes must be at most ${LIMITS.guestNotes} characters`);
    }
    if (
      guestInfo.pickupSchedule &&
      (guestInfo.pickupSchedule.date.length > LIMITS.schedule || guestInfo.pickupSchedule.time.length > LIMITS.schedule)
    ) {
      throw new Error("Invalid pickup schedule");
    }
  }
  if ((notes?.length ?? 0) > LIMITS.notes) {
    throw new Error(`Notes must be at most ${LIMITS.notes} characters`);
  }
}

// Attach the product document to each reservation line item.
type ReservationItemWithProduct = NonNullable<Doc<"reservations">["items"]>[number] & {
  product: Doc<"products"> | null;
};

async function withProducts(
  ctx: QueryCtx | MutationCtx,
  reservation: Doc<"reservations">,
): Promise<ReservationItemWithProduct[]> {
  if (!reservation.items || reservation.items.length === 0) return [];
  return await Promise.all(
    reservation.items.map(async (item) => ({
      ...item,
      product: await ctx.db.get(item.productId),
    })),
  );
}

// Helper function to generate unique reservation codes
function generateReservationCode(): string {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
  return `RES-${timestamp}${random}`;
}

// Create reservation from cart (for both users and guests) - UPDATED FOR MULTI-ITEM
export const createReservationFromCart = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    guestInfo: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      // Accept both address keys from clients
      address: v.optional(v.string()),
      completeAddress: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    reservationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId, guestInfo, reservationDate, notes }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    if (!userId && !guestInfo) {
      throw new Error("Guest information is required for guest reservations");
    }

    const reserver = await assertCanReserveAs(ctx, userId);
    const reserverIsStaff = !!reserver && isStaffRole(reserver.role);
    assertReservationInputLimits(guestInfo, notes);

    // Get cart items
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
      throw new Error("No cart items found");
    }

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const now = Date.now();
    const reservationDateTime = reservationDate || now;
    const expiryDate = reservationDateTime + (7 * 24 * 60 * 60 * 1000); // 7 days from reservation date

    // Generate unique reservation code
    const reservationCode = generateReservationCode();

    // Prepare items and calculate totals
    const items = [];
    let totalAmount = 0;
    let totalQuantity = 0;
    const productNames = [];

    for (const cartItem of cartItems) {
      // Check product availability
      const product = await ctx.db.get(cartItem.productId);
      // Internal-only (inventory) products can't be reserved by customers; staff may use them.
      if (!product || !product.isActive || (!reserverIsStaff && !isListedPublicly(product))) {
        throw new Error(`Product ${product?.name || 'unknown'} is not available`);
      }

      if (product.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
      }

      // Add to items array
      items.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        reservedPrice: product.price,
      });

      totalAmount += product.price * cartItem.quantity;
      totalQuantity += cartItem.quantity;
      productNames.push(product.name);

      // Reserve stock (reduce available stock)
      await ctx.db.patch(cartItem.productId, {
        stock: product.stock - cartItem.quantity,
        updatedAt: now,
      });

      // Sync with stockRecords (update reservedQty + log movement)
      await reserveStockHelper(ctx, {
        productId: cartItem.productId,
        quantity: cartItem.quantity,
      });

      // Check for low stock and create alert if needed
      const newStock = product.stock - cartItem.quantity;
      if (newStock <= 5 && newStock > 0) {
        await notifyLowStock(ctx, {
          productId: product._id as string,
          productName: product.name,
          currentStock: newStock,
          threshold: 5,
        });
      }
    }

    // Create single reservation with all items
    // Normalize guestInfo to match DB schema (completeAddress, notes)
    const normalizedGuestInfo = guestInfo
      ? {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
          completeAddress: guestInfo.completeAddress ?? guestInfo.address,
          notes: guestInfo.notes,
        }
      : undefined;

    const reservationId = await ctx.db.insert("reservations", {
      reservationCode,
      userId,
      guestId,
      guestInfo: normalizedGuestInfo,
      items,
      totalAmount,
      totalQuantity,
      reservationDate: reservationDateTime,
      expiryDate,
      status: "pending", // All new reservations start as pending
      notes,
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for admin
    let customerName = 'Unknown Customer';
    let customerEmail: string | undefined = undefined;

    if (guestInfo) {
      // Guest reservation
      customerName = guestInfo.name;
      customerEmail = guestInfo.email;
    } else if (userId) {
      // User reservation - fetch user details
      const user = await ctx.db.get(userId);
      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
        customerEmail = user.email;
      }
    }

    const isGuest = !!guestInfo;

    // Create consolidated notification message
    const itemsText = items.length === 1
      ? `${items[0].quantity}x ${productNames[0]}`
      : `${items.length} items (${totalQuantity} total)`;

    await notifyReservationCreated(ctx, {
      reservationId: reservationCode,
      customerName,
      customerEmail,
      productName: itemsText,
      quantity: totalQuantity,
      isGuest,
    });

    // Remove all items from cart
    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    return {
      reservationId,
      reservationCode,
      message: userId ? "Reservation created successfully" : "Reservation request submitted. You will receive a confirmation email shortly.",
      totalAmount,
      totalItems: items.length,
    };
  },
});

// Get reservations (for both users and guests) - UPDATED FOR MULTI-ITEM
export const getReservations = query({
  args: {
    userId: v.optional(v.union(v.id("users"), v.string())),
    guestId: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, { userId, guestId, status }) => {
    if (!userId && !guestId) {
      return [];
    }

    // A userId must be the signed-in caller's own (or the caller is staff); a guestId is the
    // guest's own capability. Return empty rather than throwing so pages survive sign-in races.
    if (userId) {
      const viewer = await getViewer(ctx);
      if (!viewer || (!isStaffRole(viewer.role) && !isViewerUserId(viewer, userId))) {
        return [];
      }
    }

    let query;
    if (userId) {
      // userId may be a Convex user id or a legacy Facebook id; the index accepts both
      query = ctx.db
        .query("reservations")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    } else if (guestId) {
      query = ctx.db
        .query("reservations")
        .withIndex("by_guest", (q) => q.eq("guestId", guestId));
    } else {
      return [];
    }

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    const reservations = await query.order("desc").collect();

    // Get product details for each reservation (handle both new and legacy format)
    const reservationsWithProducts = await Promise.all(
      reservations.map(async (reservation) => {
        return {
          ...reservation,
          items: await withProducts(ctx, reservation),
        };
      })
    );

    return reservationsWithProducts;
  },
});

// Get single reservation by code - NEW
export const getReservationByCode = query({
  args: {
    reservationCode: v.string(),
    userId: v.optional(v.union(v.id("users"), v.string())),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { reservationCode, guestId }) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_reservation_code", (q) => q.eq("reservationCode", reservationCode))
      .first();

    if (!reservation) {
      return null;
    }

    // Verify ownership from the session (or the guest's own guestId). Callers who merely hold
    // the code (e.g. the post-checkout overlay) only learn its status, never its details.
    const viewer = await getViewer(ctx);
    if (!canAccessReservation(viewer, reservation, guestId)) {
      return {
        reservationCode: reservation.reservationCode,
        status: reservation.status,
      };
    }

    // Get product details
    const itemsWithProducts = await withProducts(ctx, reservation);

    return {
      ...reservation,
      product: itemsWithProducts[0]?.product || null, // For backward compatibility
      items: itemsWithProducts,
    };
  },
});

// Cancel reservation - UPDATED FOR MULTI-ITEM
export const cancelReservation = mutation({
  args: {
    reservationCode: v.string(),
    userId: v.optional(v.union(v.id("users"), v.string())),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, { reservationCode, guestId }) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_reservation_code", (q) => q.eq("reservationCode", reservationCode))
      .first();

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Verify ownership from the session (or the guest's own guestId), never the userId argument.
    const viewer = await getViewer(ctx);
    if (!canAccessReservation(viewer, reservation, guestId)) {
      if (!viewer && !guestId) {
        await requireUser(ctx); // throws UNAUTHENTICATED
      }
      throw forbidden("You can only cancel your own reservations");
    }

    if (reservation.status === "cancelled") {
      throw new Error("Reservation is already cancelled");
    }

    if (reservation.status === "confirmed") {
      throw new Error("Cannot cancel confirmed reservations. Please contact support.");
    }

    // Restore stock for all items (handle both new and legacy format)
    if (reservation.items && reservation.items.length > 0) {
      // New multi-item format
      for (const item of reservation.items) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          await ctx.db.patch(item.productId, {
            stock: product.stock + item.quantity,
            updatedAt: Date.now(),
          });
          // Release reserved stock in stockRecords
          await releaseReservedStockHelper(ctx, {
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }
    }

    // Update reservation status
    await ctx.db.patch(reservation._id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // Create notification for cancellation
    let customerName = 'Unknown Customer';

    if (reservation.guestInfo) {
      // Guest reservation
      customerName = reservation.guestInfo.name;
    } else if (reservation.userId) {
      // User reservation - fetch user details
      const user = await getReservationUser(ctx, reservation.userId);
      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
      }
    }

    let itemsText = 'items';
    if (reservation.items && reservation.items.length > 0) {
      itemsText = reservation.items.length === 1
        ? `${reservation.items[0].quantity}x product`
        : `${reservation.items.length} items (${reservation.totalQuantity || reservation.items.reduce((sum, item) => sum + item.quantity, 0)} total)`;
    }

    await notifyReservationStatusChanged(ctx, {
      reservationId: reservation.reservationCode || reservation._id.toString(),
      customerName,
      productName: itemsText,
      oldStatus: reservation.status,
      newStatus: 'cancelled',
    });

    const updatedReservation = await ctx.db.get(reservation._id);

    // Get product details for the response (handle both formats)
    if (updatedReservation) {
      const itemsWithProducts = await withProducts(ctx, updatedReservation);

      return {
        ...updatedReservation,
        product: itemsWithProducts[0]?.product || null, // For backward compatibility
        items: itemsWithProducts,
      };
    }

    return updatedReservation;
  },
});

// Admin: Mark reservation as ready for pickup (with customer notification)
export const markReservationReadyForPickup = mutation({
  args: {
    reservationId: v.id("reservations"),
    pickupLocation: v.optional(v.string()),
    notes: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, pickupLocation, notes, pickupDate, pickupTime }) => {
    await requireStaff(ctx);
    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "confirmed") {
      throw new Error("Reservation must be confirmed before marking as ready for pickup");
    }

    const now = Date.now();
    const oldStatus = reservation.status;

    // Update reservation status
    await ctx.db.patch(reservationId, {
      status: "ready_for_pickup",
      notes: notes || reservation.notes,
      updatedAt: now,
    });

    // Get customer information for notification
    let customerName = 'Unknown Customer';
    let customerEmail: string | undefined = undefined;

    if (reservation.guestInfo) {
      // Guest reservation
      customerName = reservation.guestInfo.name;
      customerEmail = reservation.guestInfo.email;
    } else if (reservation.userId) {
      // User reservation - fetch user details
      const user = await getReservationUser(ctx, reservation.userId);
      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
        customerEmail = user.email;
      }
    }

    // Get product information for notification
    let productName = 'Your items';
    let totalQuantity = reservation.totalQuantity || 1;

    if (reservation.items && reservation.items.length > 0) {
      // Multi-item reservation
      if (reservation.items.length === 1) {
        const product = await ctx.db.get(reservation.items[0].productId);
        productName = product?.name || 'Product';
        totalQuantity = reservation.items[0].quantity;
      } else {
        productName = `${reservation.items.length} items`;
      }
    }

    // Create customer notification with push notification
    await notifyReservationReadyForPickup(ctx, {
      reservationId: reservation.reservationCode || reservation._id,
      customerName,
      customerEmail,
      productName,
      quantity: totalQuantity,
      pickupLocation,
      notes,
      pickupDate,
      pickupTime,
    });

    // Create admin notification for status change
    await notifyReservationStatusChanged(ctx, {
      reservationId: reservation.reservationCode || reservation._id,
      customerName,
      productName,
      oldStatus,
      newStatus: "ready_for_pickup",
    });

    return {
      success: true,
      message: "Reservation marked as ready for pickup and customer has been notified",
      reservationCode: reservation.reservationCode,
      customerName,
    };
  },
});

// Admin: Update reservation status - UPDATED FOR MULTI-ITEM
export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("ready_for_pickup"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, status, adminNotes }) => {
    await requireStaff(ctx);
    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    const now = Date.now();
    const oldStatus = reservation.status;

    // If cancelling, restore stock for all items (handle both formats)
    if (status === "cancelled" && reservation.status !== "cancelled") {
      if (reservation.items && reservation.items.length > 0) {
        // New multi-item format
        for (const item of reservation.items) {
          const product = await ctx.db.get(item.productId);
          if (product) {
            await ctx.db.patch(item.productId, {
              stock: product.stock + item.quantity,
              updatedAt: now,
            });
            await releaseReservedStockHelper(ctx, {
              productId: item.productId,
              quantity: item.quantity,
            });
          }
        }
      }
    }

    await ctx.db.patch(reservationId, {
      status,
      notes: adminNotes || reservation.notes,
      updatedAt: now,
    });

    // Create notification for status change
    if (oldStatus !== status) {
      let customerName = 'Unknown Customer';
      let customerEmail: string | undefined = undefined;

      if (reservation.guestInfo) {
        // Guest reservation
        customerName = reservation.guestInfo.name;
        customerEmail = reservation.guestInfo.email;
      } else if (reservation.userId) {
        // User reservation - fetch user details
        const user = await getReservationUser(ctx, reservation.userId);
        if (user) {
          customerName = `${user.firstName} ${user.lastName}`;
          customerEmail = user.email;
        }
      }

      let itemsText = 'items';
      let totalQuantity = reservation.totalQuantity || 1;
      if (reservation.items && reservation.items.length > 0) {
        totalQuantity = reservation.totalQuantity || reservation.items.reduce((sum, item) => sum + item.quantity, 0);
        itemsText = reservation.items.length === 1
          ? `${reservation.items[0].quantity}x product`
          : `${reservation.items.length} items (${totalQuantity} total)`;
      }

      await notifyReservationStatusChanged(ctx, {
        reservationId: reservation.reservationCode || reservation._id.toString(),
        customerName,
        productName: itemsText,
        oldStatus,
        newStatus: status,
      });

      // No additional notification needed - standard notifications handled above
    }

    return await ctx.db.get(reservationId);
  },
});

// Get single reservation by ID for admin
export const getReservationByIdAdmin = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, { reservationId }) => {
    await requireStaff(ctx);
    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      return null;
    }

    // Get product (with category name) and user details
    const itemsWithProducts = await Promise.all(
      (await withProducts(ctx, reservation)).map(async (item) => {
        const category = item.product ? await ctx.db.get(item.product.categoryId) : null;
        return { ...item, categoryName: category?.name ?? null };
      }),
    );
    // Convex user id, or a Facebook id on legacy records
    const user = await getReservationUser(ctx, reservation.userId);

    return {
      ...reservation,
      items: itemsWithProducts,
      // Keep backward compatibility - use first product for main display
      product: itemsWithProducts[0]?.product || null,
      quantity: reservation.totalQuantity || itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0),
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

// Get all reservations for admin - UPDATED FOR MULTI-ITEM
export const getAllReservationsAdmin = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, search }) => {
    await requireStaff(ctx);
    let reservations = await ctx.db.query("reservations").collect();

    if (status && status !== 'all') {
      reservations = reservations.filter(reservation => reservation.status === status);
    }

    // Get product and user details for each reservation (handle both formats)
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        const itemsWithProducts = await withProducts(ctx, reservation);
        // Convex user id, or a Facebook id on legacy records
        const user = await getReservationUser(ctx, reservation.userId);

        return {
          ...reservation,
          items: itemsWithProducts,
          // Keep backward compatibility - use first product for main display
          product: itemsWithProducts[0]?.product || null,
          quantity: reservation.totalQuantity || itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0),
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
    let filteredReservations = reservationsWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredReservations = reservationsWithDetails.filter(reservation => {
        const productNames = reservation.items.map(item => item.product?.name || '').join(' ').toLowerCase();
        const userEmail = reservation.user?.email?.toLowerCase() || '';
        const userName = `${reservation.user?.firstName || ''} ${reservation.user?.lastName || ''}`.toLowerCase();
        const guestName = reservation.guestInfo?.name?.toLowerCase() || '';
        const guestEmail = reservation.guestInfo?.email?.toLowerCase() || '';

        return productNames.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               userName.includes(searchLower) ||
               guestName.includes(searchLower) ||
               guestEmail.includes(searchLower) ||
               (reservation.reservationCode ?? '').toLowerCase().includes(searchLower);
      });
    }

    return filteredReservations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create reservation with items directly (for client-side cart)
export const createReservation = mutation({
  args: {
    userId: v.optional(v.union(v.id("users"), v.string())),
    guestId: v.optional(v.string()),
    guestInfo: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      completeAddress: v.optional(v.string()),
      pickupSchedule: v.optional(v.object({
        date: v.string(),
        time: v.string(),
      })),
      notes: v.optional(v.string()),
    })),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      reservedPrice: v.number(), // Final unit price (post line-item discount)
      originalPrice: v.optional(v.number()), // Unit list price before discount
      discount: v.optional(v.number()), // Per-unit discount amount (₱)
    })),
    subtotal: v.optional(v.number()), // Sum of (price × qty) before order-level discount
    orderDiscount: v.optional(v.number()), // Order-wide discount amount (₱)
    totalAmount: v.number(),
    totalQuantity: v.number(),
    reservationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId, guestInfo, items, subtotal, orderDiscount, totalAmount, totalQuantity, reservationDate, notes }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    if (!userId && !guestInfo) {
      throw new Error("Guest information is required for guest reservations");
    }

    if (!items || items.length === 0) {
      throw new Error("No items provided for reservation");
    }

    if (items.length > LIMITS.items) {
      throw new Error(`A reservation can include at most ${LIMITS.items} items`);
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Item quantities must be whole numbers greater than 0");
      }
    }

    const viewer = await assertCanReserveAs(ctx, userId);
    // Only staff (e.g. POS) may set custom prices or discounts; customers and guests always
    // reserve at the current catalog price, with totals recomputed server-side.
    const callerIsStaff = !!viewer && isStaffRole(viewer.role);
    assertReservationInputLimits(guestInfo, notes);

    const now = Date.now();
    const reservationDateTime = reservationDate || now;
    const expiryDate = reservationDateTime + (7 * 24 * 60 * 60 * 1000); // 7 days from reservation date

    // Generate unique reservation code
    const reservationCode = generateReservationCode();

    // Check stock availability and reduce stock for each item
    const productNames = [];
    const catalogPricedItems: { productId: Id<"products">; quantity: number; reservedPrice: number }[] = [];
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive || (!callerIsStaff && !isListedPublicly(product))) {
        throw new Error(`Product not available`);
      }

      catalogPricedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        reservedPrice: product.price,
      });

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      productNames.push(product.name);

      // Reserve stock (reduce available stock)
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
        updatedAt: now,
      });

      // Sync with stockRecords (update reservedQty + log movement)
      await reserveStockHelper(ctx, {
        productId: item.productId,
        quantity: item.quantity,
      });

      // Check for low stock and create alert if needed
      const newStock = product.stock - item.quantity;
      if (newStock <= 5 && newStock > 0) {
        await notifyLowStock(ctx, {
          productId: product._id as string,
          productName: product.name,
          currentStock: newStock,
          threshold: 5,
        });
      }
    }

    const finalItems = callerIsStaff ? items : catalogPricedItems;
    const finalSubtotal = callerIsStaff ? subtotal : undefined;
    const finalOrderDiscount = callerIsStaff ? orderDiscount : undefined;
    const finalTotalAmount = callerIsStaff
      ? totalAmount
      : catalogPricedItems.reduce((sum, item) => sum + item.reservedPrice * item.quantity, 0);
    const finalTotalQuantity = callerIsStaff
      ? totalQuantity
      : catalogPricedItems.reduce((sum, item) => sum + item.quantity, 0);

    // Create reservation - handle userId as string for Facebook users
    const reservationId = await ctx.db.insert("reservations", {
      reservationCode,
      userId, // Convex user id, or a Facebook id for legacy Facebook users
      guestId,
      guestInfo,
      items: finalItems,
      ...(finalSubtotal !== undefined ? { subtotal: finalSubtotal } : {}),
      ...(finalOrderDiscount && finalOrderDiscount > 0 ? { orderDiscount: finalOrderDiscount } : {}),
      totalAmount: finalTotalAmount,
      totalQuantity: finalTotalQuantity,
      reservationDate: reservationDateTime,
      expiryDate,
      status: "pending",
      notes,
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for admin
    let customerName = 'Unknown Customer';
    let customerEmail: string | undefined = undefined;

    if (guestInfo) {
      customerName = guestInfo.name;
      customerEmail = guestInfo.email;
    } else if (userId) {
      // Handle both Convex ID and string ID for Facebook users
      const user = await getReservationUser(ctx, userId);

      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
        customerEmail = user.email;
      }
    }

    const itemsText = items.length === 1
      ? `${items[0].quantity}x ${productNames[0]}`
      : `${items.length} items (${finalTotalQuantity} total)`;

    await notifyReservationCreated(ctx, {
      reservationId: reservationCode,
      customerName,
      customerEmail,
      productName: itemsText,
      quantity: finalTotalQuantity,
      isGuest: !!guestInfo,
    });

    return {
      reservationId,
      reservationCode,
      message: userId ? "Reservation created successfully" : "Reservation request submitted. You will receive a confirmation email shortly.",
      totalAmount: finalTotalAmount,
      totalItems: items.length,
    };
  },
});

// Clean up expired reservations - UPDATED FOR MULTI-ITEM
export const cleanupExpiredReservations = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const now = Date.now();

    // Find expired reservations that are still confirmed (not yet completed)
    const expiredReservations = await ctx.db
      .query("reservations")
      .withIndex("by_expiry", (q) => q.lt("expiryDate", now))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    // Update status and restore stock for expired reservations (handle both formats)
    for (const reservation of expiredReservations) {
      // Restore stock for all items
      if (reservation.items && reservation.items.length > 0) {
        // New multi-item format
        for (const item of reservation.items) {
          const product = await ctx.db.get(item.productId);
          if (product) {
            await ctx.db.patch(item.productId, {
              stock: product.stock + item.quantity,
              updatedAt: now,
            });
            await releaseReservedStockHelper(ctx, {
              productId: item.productId,
              quantity: item.quantity,
            });
          }
        }
      }

      // Update reservation status
      await ctx.db.patch(reservation._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    return {
      cleanedCount: expiredReservations.length,
      message: `Cleaned up ${expiredReservations.length} expired reservations`,
    };
  },
});

// Admin: Acknowledge reservation (confirm + return receipt data)
export const acknowledgeReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, adminNotes }) => {
    await requireStaff(ctx);
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== "pending") throw new Error("Only pending reservations can be acknowledged");

    const now = Date.now();
    await ctx.db.patch(reservationId, {
      status: "confirmed",
      notes: adminNotes
        ? `${reservation.notes || ''}\n[Acknowledged] ${adminNotes}`.trim()
        : reservation.notes,
      updatedAt: now,
    });

    // Get items with product details
    const items = [];
    if (reservation.items && reservation.items.length > 0) {
      for (const item of reservation.items) {
        const product = await ctx.db.get(item.productId);
        items.push({
          productId: item.productId as string,
          quantity: item.quantity,
          price: item.reservedPrice,
          productName: product?.name || 'Unknown',
          productImage: product?.image,
        });
      }
    }

    // Get customer info
    let customer = null;
    if (reservation.guestInfo) {
      customer = {
        name: reservation.guestInfo.name,
        email: reservation.guestInfo.email,
        phone: reservation.guestInfo.phone,
      };
    } else if (reservation.userId) {
      const user = await getReservationUser(ctx, reservation.userId);
      if (user) {
        customer = {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
        };
      }
    }

    return {
      receiptType: "acknowledgement" as const,
      orderCode: reservation.reservationCode || `RES-${reservationId.slice(-6).toUpperCase()}`,
      items,
      totalAmount: reservation.totalAmount || items.reduce((s, i) => s + i.price * i.quantity, 0),
      paymentMethod: "reservation",
      customer,
      acknowledgedAt: now,
      createdAt: reservation.createdAt,
      notes: reservation.notes,
    };
  },
});

// Admin: Release reservation (mark completed + return receipt data)
export const releaseReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, adminNotes }) => {
    await requireStaff(ctx);
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== "confirmed" && reservation.status !== "ready_for_pickup") {
      throw new Error("Only confirmed or ready-for-pickup reservations can be released");
    }

    const now = Date.now();
    await ctx.db.patch(reservationId, {
      status: "completed",
      notes: adminNotes
        ? `${reservation.notes || ''}\n[Released] ${adminNotes}`.trim()
        : reservation.notes,
      updatedAt: now,
    });

    const items = [];
    if (reservation.items && reservation.items.length > 0) {
      for (const item of reservation.items) {
        const product = await ctx.db.get(item.productId);
        items.push({
          productId: item.productId as string,
          quantity: item.quantity,
          price: item.reservedPrice,
          productName: product?.name || 'Unknown',
          productImage: product?.image,
        });
      }
    }

    let customer = null;
    if (reservation.guestInfo) {
      customer = {
        name: reservation.guestInfo.name,
        email: reservation.guestInfo.email,
        phone: reservation.guestInfo.phone,
      };
    } else if (reservation.userId) {
      const user = await getReservationUser(ctx, reservation.userId);
      if (user) {
        customer = {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
        };
      }
    }

    return {
      receiptType: "release" as const,
      orderCode: reservation.reservationCode || `RES-${reservationId.slice(-6).toUpperCase()}`,
      items,
      totalAmount: reservation.totalAmount || items.reduce((s, i) => s + i.price * i.quantity, 0),
      paymentMethod: "reservation",
      customer,
      releasedAt: now,
      acknowledgedAt: reservation.updatedAt,
      createdAt: reservation.createdAt,
      notes: reservation.notes,
    };
  },
});

/**
 * One-time migration: convert any legacy single-item reservation (which stored a top-level
 * `productId` + `quantity` instead of the `items[]` array) into the multi-item shape, then
 * strip the legacy fields so the schema can drop them. Idempotent — reservations that already
 * use items[] and have no legacy fields are skipped. Legacy fields are read via a cast because
 * they no longer exist on the typed schema.
 *
 * RUN THIS BEFORE deploying the schema change that removes `productId`/`quantity`, otherwise
 * Convex will reject existing documents that still carry those fields.
 */
export const migrateLegacyReservations = mutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    const reservations = await ctx.db.query("reservations").collect();
    let migrated = 0;
    let skipped = 0;

    for (const r of reservations) {
      // Legacy fields are no longer on the typed schema, so widen the doc to read them.
      const legacy = r as typeof r & { productId?: string; quantity?: number };
      const legacyProductId = legacy.productId;
      const legacyQuantity = legacy.quantity;

      // Nothing legacy on this doc → leave it alone.
      if (!legacyProductId && legacyQuantity === undefined) {
        skipped++;
        continue;
      }

      const hasItems = Array.isArray(r.items) && r.items.length > 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clears legacy fields that are not in the schema's patch type
      const patch: any = { productId: undefined, quantity: undefined, updatedAt: Date.now() };

      // Only synthesize items[] when it's missing AND we have a legacy product.
      if (!hasItems && legacyProductId) {
        const product = await ctx.db.get(legacyProductId as Id<"products">);
        const qty = legacyQuantity || 1;
        const unitPrice =
          r.totalAmount && qty ? r.totalAmount / qty : (product?.price || 0);
        patch.items = [{ productId: legacyProductId, quantity: qty, reservedPrice: unitPrice }];
        if (r.totalAmount === undefined) patch.totalAmount = unitPrice * qty;
        if (r.totalQuantity === undefined) patch.totalQuantity = qty;
      }

      await ctx.db.patch(r._id, patch);
      migrated++;
    }

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "reservation.migrate_legacy",
      category: "system",
      summary: `Migrated ${migrated} legacy single-item reservation(s) to items[] and cleared legacy fields`,
      entityTable: "reservations",
      metadata: { migrated, skipped },
    });

    return { success: true, migrated, skipped };
  },
});
