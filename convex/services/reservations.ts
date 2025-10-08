import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { 
  notifyLowStock, 
  notifyReservationCreated, 
  notifyReservationStatusChanged,
  notifyReservationReadyForPickup
} from './notifications';

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
      if (!product || !product.isActive) {
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

    let query;
    if (userId) {
      // Handle both Convex ID and string formats
      const userIdValue = typeof userId === 'string' ? userId as any : userId;
      query = ctx.db
        .query("reservations")
        .withIndex("by_user", (q) => q.eq("userId", userIdValue));
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
        // Handle new multi-item format
        if (reservation.items && reservation.items.length > 0) {
          const itemsWithProducts = await Promise.all(
            reservation.items.map(async (item) => {
              const product = await ctx.db.get(item.productId);
              return {
                ...item,
                product,
              };
            })
          );

          return {
            ...reservation,
            items: itemsWithProducts,
          };
        }
        // Handle legacy single-item format
        else if (reservation.productId) {
          const product = await ctx.db.get(reservation.productId);
          return {
            ...reservation,
            product,
            items: [{
              productId: reservation.productId,
              quantity: reservation.quantity || 1,
              reservedPrice: product?.price || 0,
              product,
            }],
          };
        }
        
        // Empty reservation (should not happen but handle gracefully)
        return {
          ...reservation,
          items: [],
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
  handler: async (ctx, { reservationCode, userId, guestId }) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_reservation_code", (q) => q.eq("reservationCode", reservationCode))
      .first();

    if (!reservation) {
      return null;
    }

    // Verify ownership
    if (userId) {
      const userIdValue = typeof userId === 'string' ? userId as any : userId;
      if (reservation.userId !== userIdValue) {
        throw new Error("You can only view your own reservations");
      }
    } else if (guestId && reservation.guestId !== guestId) {
      throw new Error("You can only view your own reservations");
    }

    // Get product details (handle both new and legacy format)
    let itemsWithProducts = [];
    
    // Handle new multi-item format
    if (reservation.items && reservation.items.length > 0) {
      itemsWithProducts = await Promise.all(
        reservation.items.map(async (item) => {
          const product = await ctx.db.get(item.productId);
          return {
            ...item,
            product,
          };
        })
      );
    }
    // Handle legacy single-item format
    else if (reservation.productId) {
      const product = await ctx.db.get(reservation.productId);
      itemsWithProducts = [{
        productId: reservation.productId,
        quantity: reservation.quantity || 1,
        reservedPrice: product?.price || 0,
        product,
      }];
    }

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
  handler: async (ctx, { reservationCode, userId, guestId }) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_reservation_code", (q) => q.eq("reservationCode", reservationCode))
      .first();
    
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Verify ownership
    if (userId) {
      const userIdValue = typeof userId === 'string' ? userId as any : userId;
      if (reservation.userId !== userIdValue) {
        throw new Error("You can only cancel your own reservations");
      }
    } else if (guestId && reservation.guestId !== guestId) {
      throw new Error("You can only cancel your own reservations");
    } else if (!userId && !guestId) {
      throw new Error("Authentication required");
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
        }
      }
    } else if (reservation.productId) {
      // Legacy single-item format
      const product = await ctx.db.get(reservation.productId);
      if (product) {
        await ctx.db.patch(reservation.productId, {
          stock: product.stock + (reservation.quantity || 1),
          updatedAt: Date.now(),
        });
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
      const user = await ctx.db.get(reservation.userId);
      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
      }
    }
    
    let itemsText;
    if (reservation.items && reservation.items.length > 0) {
      // New multi-item format
      itemsText = reservation.items.length === 1 
        ? `${reservation.items[0].quantity}x product`
        : `${reservation.items.length} items (${reservation.totalQuantity || reservation.items.reduce((sum, item) => sum + item.quantity, 0)} total)`;
    } else {
      // Legacy single-item format
      itemsText = `${reservation.quantity || 1}x product`;
    }
    
    await notifyReservationStatusChanged(ctx, {
      reservationId: reservation.reservationCode || reservation._id.toString(),
      customerName,
      customerEmail: reservation.guestInfo?.email,
      userId: reservation.userId,
      productName: itemsText,
      oldStatus: reservation.status,
      newStatus: 'cancelled',
    });

    const updatedReservation = await ctx.db.get(reservation._id);
    
    // Get product details for the response (handle both formats)
    if (updatedReservation) {
      let itemsWithProducts = [];
      
      if (updatedReservation.items && updatedReservation.items.length > 0) {
        // New multi-item format
        itemsWithProducts = await Promise.all(
          updatedReservation.items.map(async (item) => {
            const product = await ctx.db.get(item.productId);
            return {
              ...item,
              product,
            };
          })
        );
      } else if (updatedReservation.productId) {
        // Legacy single-item format
        const product = await ctx.db.get(updatedReservation.productId);
        itemsWithProducts = [{
          productId: updatedReservation.productId,
          quantity: updatedReservation.quantity || 1,
          reservedPrice: product?.price || 0,
          product,
        }];
      }

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
      const user = await ctx.db.get(reservation.userId as any);
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
    } else if (reservation.productId) {
      // Legacy single-item reservation
      const product = await ctx.db.get(reservation.productId);
      productName = product?.name || 'Product';
      totalQuantity = reservation.quantity || 1;
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
      customerEmail,
      userId: reservation.userId,
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
          }
        }
      } else if (reservation.productId) {
        // Legacy single-item format
        const product = await ctx.db.get(reservation.productId);
        if (product) {
          await ctx.db.patch(reservation.productId, {
            stock: product.stock + (reservation.quantity || 1),
            updatedAt: now,
          });
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
        const user = await ctx.db.get(reservation.userId);
        if (user) {
          customerName = `${user.firstName} ${user.lastName}`;
          customerEmail = user.email;
        }
      }
      
      let itemsText;
      let totalQuantity = 1;
      if (reservation.items && reservation.items.length > 0) {
        // New multi-item format
        totalQuantity = reservation.totalQuantity || reservation.items.reduce((sum, item) => sum + item.quantity, 0);
        itemsText = reservation.items.length === 1 
          ? `${reservation.items[0].quantity}x product`
          : `${reservation.items.length} items (${totalQuantity} total)`;
      } else {
        // Legacy single-item format
        totalQuantity = reservation.quantity || 1;
        itemsText = `${totalQuantity}x product`;
      }
      
      console.log(`🔔 Calling notifyReservationStatusChanged with:`);
      console.log(`   reservationId: ${reservation.reservationCode || reservation._id.toString()}`);
      console.log(`   customerName: ${customerName}`);
      console.log(`   customerEmail: ${customerEmail}`);
      console.log(`   userId: ${reservation.userId} (type: ${typeof reservation.userId})`);
      console.log(`   productName: ${itemsText}`);
      console.log(`   oldStatus: ${oldStatus} → newStatus: ${status}`);
      
      await notifyReservationStatusChanged(ctx, {
        reservationId: reservation.reservationCode || reservation._id.toString(),
        customerName,
        customerEmail,
        userId: reservation.userId,
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
    const reservation = await ctx.db.get(reservationId);

    if (!reservation) {
      return null;
    }

    // Get product and user details
    let itemsWithProducts = [];

    // Handle new multi-item format
    if (reservation.items && reservation.items.length > 0) {
      itemsWithProducts = await Promise.all(
        reservation.items.map(async (item) => {
          const product = await ctx.db.get(item.productId);
          return {
            ...item,
            product,
          };
        })
      );
    }
    // Handle legacy single-item format
    else if (reservation.productId) {
      const product = await ctx.db.get(reservation.productId);
      itemsWithProducts = [{
        productId: reservation.productId,
        quantity: reservation.quantity || 1,
        reservedPrice: product?.price || 0,
        product,
      }];
    }

    let user = null;
    if (reservation.userId) {
      try {
        // Try to get user by ID first (works for Convex IDs)
        user = await ctx.db.get(reservation.userId);
      } catch (error) {
        // If that fails, it might be a Facebook ID, try to find by facebookId
        try {
          user = await ctx.db
            .query("users")
            .withIndex("by_facebook_id", (q) => q.eq("facebookId", reservation.userId as string))
            .first();
        } catch (e) {
          console.warn("Could not find user:", reservation.userId);
        }
      }
    }

    return {
      ...reservation,
      items: itemsWithProducts,
      // Keep backward compatibility - use first product for main display
      product: itemsWithProducts[0]?.product || null,
      quantity: reservation.totalQuantity || reservation.quantity || itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0),
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
    let reservations = await ctx.db.query("reservations").collect();
    
    if (status && status !== 'all') {
      reservations = reservations.filter(reservation => reservation.status === status);
    }

    // Get product and user details for each reservation (handle both formats)
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        let itemsWithProducts = [];
        
        // Handle new multi-item format
        if (reservation.items && reservation.items.length > 0) {
          itemsWithProducts = await Promise.all(
            reservation.items.map(async (item) => {
              const product = await ctx.db.get(item.productId);
              return {
                ...item,
                product,
              };
            })
          );
        }
        // Handle legacy single-item format
        else if (reservation.productId) {
          const product = await ctx.db.get(reservation.productId);
          itemsWithProducts = [{
            productId: reservation.productId,
            quantity: reservation.quantity || 1,
            reservedPrice: product?.price || 0,
            product,
          }];
        }

        let user = null;
        if (reservation.userId) {
          try {
            // Try to get user by ID first (works for Convex IDs)
            user = await ctx.db.get(reservation.userId);
          } catch (error) {
            // If that fails, it might be a Facebook ID, try to find by facebookId
            try {
              user = await ctx.db
                .query("users")
                .withIndex("by_facebook_id", (q) => q.eq("facebookId", reservation.userId as string))
                .first();
            } catch (e) {
              console.warn("Could not find user:", reservation.userId);
            }
          }
        }

        return {
          ...reservation,
          items: itemsWithProducts,
          // Keep backward compatibility - use first product for main display
          product: itemsWithProducts[0]?.product || null,
          quantity: reservation.totalQuantity || reservation.quantity || itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0),
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
               reservation.reservationCode.toLowerCase().includes(searchLower);
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
      reservedPrice: v.number(),
    })),
    totalAmount: v.number(),
    totalQuantity: v.number(),
    reservationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, guestId, guestInfo, items, totalAmount, totalQuantity, reservationDate, notes }) => {
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    if (!userId && !guestInfo) {
      throw new Error("Guest information is required for guest reservations");
    }

    if (!items || items.length === 0) {
      throw new Error("No items provided for reservation");
    }

    const now = Date.now();
    const reservationDateTime = reservationDate || now;
    const expiryDate = reservationDateTime + (7 * 24 * 60 * 60 * 1000); // 7 days from reservation date

    // Generate unique reservation code
    const reservationCode = generateReservationCode();

    // Check stock availability and reduce stock for each item
    const productNames = [];
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product not available`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      productNames.push(product.name);

      // Reserve stock (reduce available stock)
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
        updatedAt: now,
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

    // Create reservation - handle userId as string for Facebook users
    const reservationId = await ctx.db.insert("reservations", {
      reservationCode,
      userId: typeof userId === 'string' ? userId as any : userId,
      guestId,
      guestInfo,
      items,
      totalAmount,
      totalQuantity,
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
      let user = null;
      if (typeof userId === 'string') {
        // For Facebook users, find by facebookId or userId field
        user = await ctx.db
          .query("users")
          .filter(q => q.or(
            q.eq(q.field("facebookId"), userId),
            q.eq(q.field("_id"), userId as any)
          ))
          .first();
      } else {
        user = await ctx.db.get(userId);
      }

      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
        customerEmail = user.email;
      }
    }

    const itemsText = items.length === 1
      ? `${items[0].quantity}x ${productNames[0]}`
      : `${items.length} items (${totalQuantity} total)`;

    await notifyReservationCreated(ctx, {
      reservationId: reservationCode,
      customerName,
      customerEmail,
      productName: itemsText,
      quantity: totalQuantity,
      isGuest: !!guestInfo,
    });

    return {
      reservationId,
      reservationCode,
      message: userId ? "Reservation created successfully" : "Reservation request submitted. You will receive a confirmation email shortly.",
      totalAmount,
      totalItems: items.length,
    };
  },
});

// Clean up expired reservations - UPDATED FOR MULTI-ITEM
export const cleanupExpiredReservations = mutation({
  args: {},
  handler: async (ctx) => {
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
          }
        }
      } else if (reservation.productId) {
        // Legacy single-item format
        const product = await ctx.db.get(reservation.productId);
        if (product) {
          await ctx.db.patch(reservation.productId, {
            stock: product.stock + (reservation.quantity || 1),
            updatedAt: now,
          });
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
