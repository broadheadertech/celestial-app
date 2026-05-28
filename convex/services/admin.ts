import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { hashPassword } from "./auth";

// Admin Dashboard Analytics
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Get both orders and reservations
    const orders = await ctx.db.query("orders").collect();
    const reservations = await ctx.db.query("reservations").collect();
    
    // Calculate total revenue from completed orders and reservations
    const completedOrders = orders.filter(order => order.status === 'delivered');
    const completedReservations = reservations.filter(reservation => reservation.status === 'completed');
    
    let totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Add reservation revenue
    for (const reservation of completedReservations) {
      if (reservation.totalAmount) {
        totalRevenue += reservation.totalAmount;
      } else if (reservation.items && reservation.items.length > 0) {
        totalRevenue += reservation.items.reduce((sum, item) => sum + (item.reservedPrice * item.quantity), 0);
      } else if (reservation.productId && reservation.quantity) {
        // Fallback for legacy single-item reservations
        const product = await ctx.db.get(reservation.productId);
        if (product) {
          totalRevenue += product.price * reservation.quantity;
        }
      }
    }
    
    // Get user count
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const newUsersThisMonth = users.filter(user => {
      const userDate = new Date(user.createdAt);
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      return userDate >= monthAgo;
    }).length;
    
    // Get reservation-specific stats (primary focus)
    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(reservation =>
      reservation.status === 'pending' || reservation.status === 'confirmed'
    ).length;
    
    // Get combined stats for backward compatibility
    const totalOrders = orders.length + reservations.length;
    const pendingOrders = orders.filter(order => 
      order.status === 'pending' || order.status === 'processing' || order.status === 'confirmed'
    ).length + pendingReservations;
    
    // Get product stats
    const products = await ctx.db.query("products").collect();
    const activeProducts = products.filter(product => product.isActive).length;
    
    // Calculate Total Sales (revenue from all non-cancelled orders + completed reservations)
    const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSales = nonCancelledOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      + completedReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    // Calculate Gross Profit = Sales - Cost
    // For each sold item, profit = (selling price - cost price) * quantity
    let totalCost = 0;

    // Cost from orders
    for (const order of nonCancelledOrders) {
      for (const item of order.items) {
        const product = await ctx.db.get(item.productId);
        if (product?.costPrice) {
          totalCost += product.costPrice * item.quantity;
        }
      }
    }

    // Cost from completed reservations
    for (const reservation of completedReservations) {
      if (reservation.items && reservation.items.length > 0) {
        for (const item of reservation.items) {
          const product = await ctx.db.get(item.productId);
          if (product?.costPrice) {
            totalCost += product.costPrice * item.quantity;
          }
        }
      }
    }

    const grossProfit = totalSales - totalCost;
    const totalOrdersCount = orders.length; // Orders only (not reservations)

    return {
      totalRevenue,
      totalSales,
      totalCost,
      grossProfit,
      totalUsers,
      newUsersThisMonth,
      // Primary reservation stats
      totalReservations,
      pendingReservations,
      // Combined stats
      totalOrders,
      totalOrdersCount, // Orders only
      pendingOrders,
      activeProducts,
      totalProducts: products.length,
    };
  },
});

// Get recent orders for dashboard (includes both orders and reservations)
export const getRecentOrders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    // Get both orders and reservations
    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(limit);
      
    const reservations = await ctx.db
      .query("reservations")
      .order("desc")
      .take(limit);
    
    // Transform orders to unified format
    const ordersWithUsers = await Promise.all(
      orders.map(async (order) => {
        let user = null;
        if (order.userId) {
          try { user = await ctx.db.get(order.userId); } catch { /* */ }
        }
        const customerName = user ? `${user.firstName} ${user.lastName}` : (order.customerName || 'Walk-in Customer');

        return {
          _id: order._id,
          userId: order.userId,
          type: 'order' as const,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          itemCount: order.items.length,
          customerName,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          } : null,
        };
      })
    );
    
    // Transform reservations to unified format
    const reservationsWithUsers = await Promise.all(
      reservations.map(async (reservation) => {
        let user = null;
        let customerName = 'Unknown Customer';
        
        if (reservation.userId) {
          // Try Convex Id first; if it fails, fallback to facebookId lookup
          try {
            // @ts-expect-error runtime may be string; db.get will throw if invalid
            const u = await ctx.db.get(reservation.userId);
            if (u) {
              user = u;
            }
          } catch (_) {
            // Not a Convex Id, attempt facebookId index
            user = await ctx.db
              .query("users")
              .withIndex("by_facebook_id", (q) =>
                q.eq("facebookId", String(reservation.userId))
              )
              .unique();
          }

          if (user) {
            customerName = `${user.firstName} ${user.lastName}`;
          }
        } else if (reservation.guestInfo) {
          customerName = reservation.guestInfo.name;
        }
        
        // Calculate total amount for reservations
        let totalAmount = 0;
        if (reservation.totalAmount) {
          totalAmount = reservation.totalAmount;
        } else if (reservation.items && reservation.items.length > 0) {
          totalAmount = reservation.items.reduce((sum, item) => sum + (item.reservedPrice * item.quantity), 0);
        } else if (reservation.productId && reservation.quantity) {
          // Fallback for legacy single-item reservations
          const product = await ctx.db.get(reservation.productId);
          if (product) {
            totalAmount = product.price * reservation.quantity;
          }
        }

        return {
          _id: reservation._id,
          userId: reservation.userId,
          type: 'reservation' as const,
          status: reservation.status,
          totalAmount: totalAmount,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt,
          reservationCode: reservation.reservationCode,
          user: user,
          customerName: customerName,
          itemCount:
            reservation.totalQuantity ??
            (reservation.items ? reservation.items.reduce((sum, item) => sum + item.quantity, 0) : undefined) ??
            reservation.quantity ??
            0,
        };
      })
    );
    
    // Combine and sort by creation date
    const allOrders = [...ordersWithUsers, ...reservationsWithUsers]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    
    return allOrders;
  },
});

// Admin Product Management
export const getAllProductsAdmin = query({
  args: { 
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { category, status, search }) => {
    const query = ctx.db.query("products");
    
    // Apply filters
    let products = await query.collect();
    
    if (category && category !== 'All') {
      const allCategories = await ctx.db.query("categories").collect();
      const categoryDoc = allCategories.find(cat => cat.name === category);
      if (categoryDoc) {
        products = products.filter(p => p.categoryId === categoryDoc._id);
      }
    }
    
    if (status && status !== 'all') {
      if (status === 'active') {
        products = products.filter(p => p.isActive);
      } else if (status === 'inactive') {
        products = products.filter(p => !p.isActive);
      } else if (status === 'out_of_stock') {
        products = products.filter(p => p.stock === 0);
      }
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Get category names for each product
    const productsWithCategories = await Promise.all(
      products.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        return {
          ...product,
          categoryName: category?.name || 'Unknown',
        };
      })
    );
    
    return productsWithCategories.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getProductStats = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const activeProducts = products.filter(p => p.isActive);
    const outOfStock = products.filter(p => p.stock === 0);
    
    // Get orders to calculate sales stats
    const orders = await ctx.db.query("orders").collect();
    const completedOrders = orders.filter(order => order.status === 'delivered');
    
    // Calculate top rated products (rating >= 4.5)
    const topRated = products.filter(p => p.rating && p.rating >= 4.5);
    
    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      outOfStock: outOfStock.length,
      topRated: topRated.length,
      totalSales: completedOrders.length,
    };
  },
});

// Product CRUD Operations
export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    costPrice: v.optional(v.number()),
    originalPrice: v.optional(v.number()),
    categoryId: v.id("categories"),
    image: v.string(),
    images: v.optional(v.array(v.string())),
    stock: v.number(),
    badge: v.optional(v.string()),
    isActive: v.boolean(),
    certificate: v.optional(v.string()),
    sku: v.optional(v.string()),
    productStatus: v.optional(v.string()),
    lifespan: v.optional(v.string()),
    tankNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Generate batch code: BATCH-YYYYMMDD-RANDOM
    const generateBatchCode = () => {
      const date = new Date(now);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `BATCH-${year}${month}${day}-${random}`;
    };
    
    const batchCode = generateBatchCode();
    
    // Get category to determine stock category type
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    
    // Determine stock category based on category name
    const determineStockCategory = (categoryName: string): "fish" | "tank" | "accessory" => {
      const lower = categoryName.toLowerCase();
      if (lower.includes("fish") || lower.includes("aquatic")) {
        return "fish";
      }
      if (lower.includes("tank") || lower.includes("aquarium")) {
        return "tank";
      }
      return "accessory";
    };
    
    const stockCategory = determineStockCategory(category.name);
    const isFishCategory = stockCategory === "fish";
    
    // Calculate expiry date for fish (if lifespan is provided)
    let expiryDate: number | undefined;
    if (isFishCategory && args.lifespan) {
      const lifespanMatch = args.lifespan.match(/(\d+)\s*(year|month|day)/i);
      if (lifespanMatch) {
        const value = parseInt(lifespanMatch[1]);
        const unit = lifespanMatch[2].toLowerCase();
        
        let lifespanMs = 0;
        if (unit.startsWith('year')) {
          lifespanMs = value * 365 * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('month')) {
          lifespanMs = value * 30 * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('day')) {
          lifespanMs = value * 24 * 60 * 60 * 1000;
        }
        expiryDate = now + lifespanMs;
      }
    }
    
    // Create product
    const productId = await ctx.db.insert("products", {
      ...args,
      rating: 0,
      reviews: 0,
      originalPrice: args.originalPrice || args.price,
      images: args.images || [args.image],
      certificate: args.certificate || "No certificate provided",
      sku: args.sku || `SKU-${Math.floor(Math.random() * 1000000)}`,
      lifespan: args.lifespan,
      productStatus: args.productStatus || "active",
      tankNumber: args.tankNumber,
      batchCode: batchCode,
      createdAt: now,
      updatedAt: now,
    });
    
    // Create initial stock record
    const stockRecordId = await ctx.db.insert("stockRecords", {
      productId: productId,
      batchCode: batchCode,
      category: stockCategory,
      
      // Initial quantities
      initialQty: args.stock,
      currentQty: args.stock,
      reservedQty: 0,
      soldQty: 0,
      mortalityLossQty: 0,
      returnedQty: 0,
      
      // Location
      tankNumber: args.tankNumber,
      
      // Dates
      receivedDate: now,
      manufactureDate: isFishCategory ? now : undefined,
      expiryDate: expiryDate,
      
      // Status
      status: "active",
      qualityGrade: args.badge ? "premium" : "standard",
      
      // Audit
      notes: `Initial stock from product creation - ${args.name}`,
      createdAt: now,
      updatedAt: now,
    });
    
    // Log initial stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: productId,
      batchCode: batchCode,
      movementType: "initial",
      quantityBefore: 0,
      quantityChange: args.stock,
      quantityAfter: args.stock,
      createdAt: now,
    });

    return productId;
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    originalPrice: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stock: v.optional(v.number()),
    badge: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    certificate: v.optional(v.string()),
    sku: v.optional(v.string()),
    productStatus: v.optional(v.string()),
    lifespan: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const toggleProductStatus = mutation({
  args: {
    productId: v.id("products"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { productId, isActive }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    await ctx.db.patch(productId, { 
      isActive,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const deleteProduct = mutation({
  args: {
    id: v.id("products"),
    forceDelete: v.optional(v.boolean()), // bypass history guard + cascade orders/reservations/expenses
  },
  handler: async (ctx, { id, forceDelete }) => {
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    const [orders, reservations] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
    ]);

    // Default path: deactivate if any history exists.
    if (!forceDelete) {
      const hasOrders = orders.some(order =>
        order.items.some(item => item.productId === id)
      );
      const hasReservations = reservations.some(r => {
        if (r.productId === id) return true;
        return r.items?.some(item => item.productId === id) ?? false;
      });

      if (hasOrders || hasReservations) {
        await ctx.db.patch(id, {
          isActive: false,
          updatedAt: Date.now(),
        });
        return {
          success: true,
          deleted: false,
          message: hasOrders
            ? "Product deactivated (has order history)"
            : "Product deactivated (has reservation history)",
        };
      }
    }

    // Force delete OR no history — proceed with cascade cleanup.
    let deletedOrders = 0;
    let trimmedOrders = 0;
    let deletedReservations = 0;
    let trimmedReservations = 0;
    let deletedExpenses = 0;

    if (forceDelete) {
      // Orders: drop the matching line item; if no items remain, delete the order.
      for (const order of orders) {
        const matches = order.items.some(item => item.productId === id);
        if (!matches) continue;
        const remaining = order.items.filter(item => item.productId !== id);
        if (remaining.length === 0) {
          await ctx.db.delete(order._id);
          deletedOrders++;
        } else {
          const subtotal = remaining.reduce((s, it) => s + it.price * it.quantity, 0);
          const orderDiscount = order.orderDiscount ?? 0;
          await ctx.db.patch(order._id, {
            items: remaining,
            subtotal,
            totalAmount: Math.max(0, subtotal - orderDiscount),
            updatedAt: Date.now(),
          });
          trimmedOrders++;
        }
      }

      // Reservations: same logic, plus the legacy single-item shape.
      for (const r of reservations) {
        const isLegacyMatch = r.productId === id;
        const itemMatches = r.items?.some(item => item.productId === id) ?? false;
        if (!isLegacyMatch && !itemMatches) continue;

        if (isLegacyMatch && !r.items) {
          // Legacy single-item reservation pointed at this product — delete entirely.
          await ctx.db.delete(r._id);
          deletedReservations++;
          continue;
        }

        const remaining = (r.items ?? []).filter(item => item.productId !== id);
        if (remaining.length === 0) {
          await ctx.db.delete(r._id);
          deletedReservations++;
        } else {
          const subtotal = remaining.reduce((s, it) => s + it.reservedPrice * it.quantity, 0);
          const orderDiscount = r.orderDiscount ?? 0;
          const totalQuantity = remaining.reduce((s, it) => s + it.quantity, 0);
          await ctx.db.patch(r._id, {
            items: remaining,
            subtotal,
            totalAmount: Math.max(0, subtotal - orderDiscount),
            totalQuantity,
            updatedAt: Date.now(),
          });
          trimmedReservations++;
        }
      }

      // Expenses tied to this product (restocking + mortality + internal_use).
      const productExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_product", (q) => q.eq("productId", id))
        .collect();
      for (const e of productExpenses) {
        await ctx.db.delete(e._id);
        deletedExpenses++;
      }
    }

    // Always-cascade: stock + movements + fish/tank metadata + cart/wishlist refs.
    const [stockRecords, fishRows, tankRows, cartRows, wishlistRows, movements] = await Promise.all([
      ctx.db.query("stockRecords").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
      ctx.db.query("fish").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
      ctx.db.query("tank").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
      ctx.db.query("cart").collect(),
      ctx.db.query("wishlist").collect(),
      ctx.db.query("stockMovements").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
    ]);

    let deletedBatches = 0;
    let deletedMovements = 0;
    for (const m of movements) {
      await ctx.db.delete(m._id);
      deletedMovements++;
    }
    for (const rec of stockRecords) {
      await ctx.db.delete(rec._id);
      deletedBatches++;
    }
    for (const f of fishRows) await ctx.db.delete(f._id);
    for (const t of tankRows) await ctx.db.delete(t._id);
    for (const c of cartRows.filter(c => c.productId === id)) await ctx.db.delete(c._id);
    for (const w of wishlistRows.filter(w => w.productId === id)) await ctx.db.delete(w._id);

    await ctx.db.delete(id);

    const parts = [
      `${deletedBatches} batch${deletedBatches === 1 ? '' : 'es'}`,
      `${deletedMovements} movement${deletedMovements === 1 ? '' : 's'}`,
    ];
    if (forceDelete) {
      if (deletedOrders || trimmedOrders) parts.push(`${deletedOrders} order${deletedOrders === 1 ? '' : 's'} deleted, ${trimmedOrders} trimmed`);
      if (deletedReservations || trimmedReservations) parts.push(`${deletedReservations} reservation${deletedReservations === 1 ? '' : 's'} deleted, ${trimmedReservations} trimmed`);
      if (deletedExpenses) parts.push(`${deletedExpenses} expense${deletedExpenses === 1 ? '' : 's'}`);
    }

    return {
      success: true,
      deleted: true,
      forced: forceDelete ?? false,
      deletedBatches,
      deletedMovements,
      deletedOrders,
      trimmedOrders,
      deletedReservations,
      trimmedReservations,
      deletedExpenses,
      message: `Product ${forceDelete ? 'force-' : ''}deleted (${parts.join(', ')}).`,
    };
  },
});

// Sweep orphaned records — stockRecords / movements / fish / tank / cart / wishlist
// rows whose productId no longer points to an existing product. Created by legacy
// deletes that didn't cascade. Safe to run repeatedly.
export const cleanupOrphanedRecords = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const validIds = new Set<string>(products.map(p => p._id));

    const [stockRecords, movements, fishRows, tankRows, cartRows, wishlistRows] = await Promise.all([
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("stockMovements").collect(),
      ctx.db.query("fish").collect(),
      ctx.db.query("tank").collect(),
      ctx.db.query("cart").collect(),
      ctx.db.query("wishlist").collect(),
    ]);

    let removedBatches = 0;
    let removedMovements = 0;
    let removedFish = 0;
    let removedTank = 0;
    let removedCart = 0;
    let removedWishlist = 0;

    for (const m of movements) {
      if (!validIds.has(m.productId as unknown as string)) {
        await ctx.db.delete(m._id);
        removedMovements++;
      }
    }
    for (const r of stockRecords) {
      if (!validIds.has(r.productId as unknown as string)) {
        await ctx.db.delete(r._id);
        removedBatches++;
      }
    }
    for (const f of fishRows) {
      if (!validIds.has(f.productId as unknown as string)) {
        await ctx.db.delete(f._id);
        removedFish++;
      }
    }
    for (const t of tankRows) {
      if (!validIds.has(t.productId as unknown as string)) {
        await ctx.db.delete(t._id);
        removedTank++;
      }
    }
    for (const c of cartRows) {
      if (!validIds.has(c.productId as unknown as string)) {
        await ctx.db.delete(c._id);
        removedCart++;
      }
    }
    for (const w of wishlistRows) {
      if (!validIds.has(w.productId as unknown as string)) {
        await ctx.db.delete(w._id);
        removedWishlist++;
      }
    }

    return {
      success: true,
      removedBatches,
      removedMovements,
      removedFish,
      removedTank,
      removedCart,
      removedWishlist,
      total: removedBatches + removedMovements + removedFish + removedTank + removedCart + removedWishlist,
    };
  },
});

// Fish Data Management
export const createFishData = mutation({
  args: {
    productId: v.id("products"),
    scientificName: v.optional(v.string()),
    weight: v.optional(v.number()),
    size: v.number(),
    temperature: v.optional(v.number()),
    age: v.number(),
    phLevel: v.string(),
    lifespan: v.optional(v.string()),
    origin: v.optional(v.string()),
    diet: v.string(),
  },
  handler: async (ctx, args) => {
    const fishId = await ctx.db.insert("fish", args);
    return fishId;
  },
});

// Tank Data Management
export const createTankData = mutation({
  args: {
    productId: v.id("products"),
    tankType: v.string(),
    material: v.string(),
    capacity: v.number(),
    dimensions: v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    weight: v.optional(v.number()),
    thickness: v.number(),
    lighting: v.number(),
    filtation: v.number(),
  },
  handler: async (ctx, args) => {
    const tankId = await ctx.db.insert("tank", args);
    return tankId;
  },
});

// User Management
export const getAllUsers = query({
  args: { 
    role: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { role, search }) => {
    let users = await ctx.db.query("users").collect();
    
    if (role && role !== 'all') {
      users = users.filter(user => user.role === role);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower)
      );
    }
    
    // Get order counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const allOrders = await ctx.db.query("orders").collect();
        const userOrders = allOrders.filter(order => order.userId === user._id);
        
        const completedOrders = userOrders.filter(order => order.status === 'delivered');
        const totalSpent = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        return {
          ...user,
          totalOrders: userOrders.length,
          totalSpent,
          lastOrderDate: userOrders.length > 0 ? 
            Math.max(...userOrders.map(order => order.createdAt)) : null,
        };
      })
    );
    
    return usersWithStats.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Admin: Create customer manually (walk-in registration)
export const adminCreateCustomer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { firstName, lastName, email, phone }) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("A customer with this email already exists");
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      role: "client",
      isActive: true,
      loginMethod: "email",
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.toLowerCase(),
    };
  },
});

// Get staff users (admin + super_admin) for sales associate selection
export const getStaffUsers = query({
  args: {
    salesAssociatesOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { salesAssociatesOnly }) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const superAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    let staff = [...admins, ...superAdmins].filter(u => u.isActive !== false);

    if (salesAssociatesOnly) {
      staff = staff.filter(u => u.isSalesAssociate === true);
    }

    return staff.map(u => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isSalesAssociate: u.isSalesAssociate || false,
    }));
  },
});

// Toggle sales associate status for a user
export const toggleSalesAssociate = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const newValue = !user.isSalesAssociate;
    await ctx.db.patch(userId, {
      isSalesAssociate: newValue,
      updatedAt: Date.now(),
    });

    return {
      isSalesAssociate: newValue,
      name: `${user.firstName} ${user.lastName}`,
    };
  },
});

// Assign sales associate to an existing order
export const assignOrderSalesAssociate = mutation({
  args: {
    orderId: v.id("orders"),
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, salesAssociateId, salesAssociateName }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(orderId, {
      salesAssociateId,
      salesAssociateName,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Assign sales associate to an existing reservation
export const assignReservationSalesAssociate = mutation({
  args: {
    reservationId: v.id("reservations"),
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, salesAssociateId, salesAssociateName }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");

    await ctx.db.patch(reservationId, {
      salesAssociateId,
      salesAssociateName,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("client")),
  },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    await ctx.db.patch(userId, { 
      role,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const toggleUserStatus = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { userId, isActive }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    await ctx.db.patch(userId, { 
      isActive,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete user (permanent)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is super admin (prevent deletion)
    if (user.role === "super_admin") {
      throw new Error("Cannot delete super admin accounts");
    }

    // Delete the user
    await ctx.db.delete(userId);
    
    return { success: true, message: "User deleted successfully" };
  },
});

export const banUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role === "super_admin") throw new Error("Cannot ban super admin accounts");

    await ctx.db.patch(userId, {
      isBanned: true,
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const unbanUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userId, {
      isBanned: false,
      isActive: true,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Bulk update users: activate / deactivate / ban / unban / delete
export const bulkUpdateUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
    action: v.union(
      v.literal("activate"),
      v.literal("deactivate"),
      v.literal("ban"),
      v.literal("unban"),
      v.literal("delete"),
    ),
  },
  handler: async (ctx, { userIds, action }) => {
    const now = Date.now();
    let processed = 0;
    const skipped: string[] = [];

    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (!user) {
        skipped.push(userId);
        continue;
      }
      if (user.role === "super_admin" && action !== "activate" && action !== "deactivate") {
        skipped.push(userId);
        continue;
      }

      if (action === "activate") {
        await ctx.db.patch(userId, { isActive: true, isBanned: false, updatedAt: now });
      } else if (action === "deactivate") {
        await ctx.db.patch(userId, { isActive: false, updatedAt: now });
      } else if (action === "ban") {
        await ctx.db.patch(userId, { isBanned: true, isActive: false, updatedAt: now });
      } else if (action === "unban") {
        await ctx.db.patch(userId, { isBanned: false, isActive: true, updatedAt: now });
      } else if (action === "delete") {
        await ctx.db.delete(userId);
      }
      processed++;
    }

    return { success: true, processed, skipped: skipped.length };
  },
});

// Order Management
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
    
    // Get user details and filter by search if provided
    const ordersWithUsers = await Promise.all(
      orders.map(async (order) => {
        let user = null;
        if (order.userId) {
          try { user = await ctx.db.get(order.userId); } catch { /* */ }
        }
        return {
          ...order,
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
    
    let filteredOrders = ordersWithUsers;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = ordersWithUsers.filter(order => 
        order.user?.email.toLowerCase().includes(searchLower) ||
        order.user?.firstName.toLowerCase().includes(searchLower) ||
        order.user?.lastName.toLowerCase().includes(searchLower) ||
        order._id.includes(searchLower)
      );
    }
    
    return filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

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
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, status, adminNotes }) => {
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    
    await ctx.db.patch(orderId, {
      status,
      notes: adminNotes,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Category Management
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    image: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("categories", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return categoryId;
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }
    
    // Check if category has products
    const products = await ctx.db.query("products").collect();
    const hasProducts = products.some(product => product.categoryId === id);
    
    if (hasProducts) {
      throw new Error("Cannot delete category with existing products");
    }
    
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Analytics and Reports
export const getAnalyticsData = query({
  args: { 
    period: v.optional(v.string()), // 'week', 'month', 'year'
  },
  handler: async (ctx, { period = 'month' }) => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const orders = await ctx.db.query("orders").collect();
    const periodOrders = orders.filter(order => order.createdAt >= startDate.getTime());
    const completedOrders = periodOrders.filter(order => order.status === 'delivered');
    
    // Revenue calculation
    const revenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Order status distribution
    const statusDistribution = {
      pending: periodOrders.filter(o => o.status === 'pending').length,
      confirmed: periodOrders.filter(o => o.status === 'confirmed').length,
      processing: periodOrders.filter(o => o.status === 'processing').length,
      shipped: periodOrders.filter(o => o.status === 'shipped').length,
      delivered: periodOrders.filter(o => o.status === 'delivered').length,
      cancelled: periodOrders.filter(o => o.status === 'cancelled').length,
    };
    
    // Top selling products
    const productSales: Record<string, number> = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });
    
          const topProducts = await Promise.all(
      Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(async ([productId, sales]) => {
          try {
            const product = await ctx.db.get(productId as any);
            if (product && 'name' in product && 'price' in product) {
              return {
                name: product.name,
                sales,
                revenue: sales * product.price,
              };
            }
          } catch (error) {
            console.error('Error fetching product:', error);
          }
          return null;
        })
    );
    
    return {
      period,
      revenue,
      ordersCount: periodOrders.length,
      completedOrders: completedOrders.length,
      statusDistribution,
      topProducts: topProducts.filter(Boolean),
    };
  },
});

// ==================== SALES ASSOCIATE REGISTRATION ====================

/**
 * Register a new sales associate. Creates an admin user account (so they can log in
 * to the POS and have sales attributed to them) and tags them with isSalesAssociate.
 * Commission rate + basis are stored alongside for the performance report.
 */
export const registerAssociate = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    commissionRate: v.optional(v.number()),
    commissionBasis: v.optional(v.union(v.literal("revenue"), v.literal("profit"))),
    role: v.optional(v.union(v.literal("admin"), v.literal("super_admin"))),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (!args.firstName.trim() || !args.lastName.trim()) {
      throw new Error("First name and last name are required");
    }
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(args.password)) {
      throw new Error("Password must contain an uppercase letter, lowercase letter, and number");
    }
    if (args.phone && !/^\+?[\d\s\-()]{10,}$/.test(args.phone.replace(/\s/g, ""))) {
      throw new Error("Please enter a valid phone number");
    }
    if (args.commissionRate !== undefined && (args.commissionRate < 0 || args.commissionRate > 100)) {
      throw new Error("Commission rate must be between 0 and 100");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("A user with this email already exists");

    const passwordHash = await hashPassword(args.password);
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone?.trim(),
      passwordHash,
      role: args.role ?? "admin",
      isActive: true,
      isSalesAssociate: true,
      commissionRate: args.commissionRate,
      commissionBasis: args.commissionBasis,
      loginMethod: "email",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, userId };
  },
});

/**
 * Update an existing associate's profile and commission settings. Patches only the
 * fields provided. Toggling isSalesAssociate off effectively "unregisters" them
 * (the user account stays — just removes them from the associate roster).
 */
export const updateAssociate = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    commissionRate: v.optional(v.number()),
    commissionBasis: v.optional(v.union(v.literal("revenue"), v.literal("profit"))),
    isSalesAssociate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, ...updates }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Associate not found");

    if (updates.commissionRate !== undefined && (updates.commissionRate < 0 || updates.commissionRate > 100)) {
      throw new Error("Commission rate must be between 0 and 100");
    }
    if (updates.firstName !== undefined && !updates.firstName.trim()) {
      throw new Error("First name cannot be empty");
    }
    if (updates.lastName !== undefined && !updates.lastName.trim()) {
      throw new Error("Last name cannot be empty");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.firstName !== undefined) patch.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) patch.lastName = updates.lastName.trim();
    if (updates.phone !== undefined) patch.phone = updates.phone.trim() || undefined;
    if (updates.commissionRate !== undefined) patch.commissionRate = updates.commissionRate;
    if (updates.commissionBasis !== undefined) patch.commissionBasis = updates.commissionBasis;
    if (updates.isSalesAssociate !== undefined) patch.isSalesAssociate = updates.isSalesAssociate;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;

    await ctx.db.patch(userId, patch);
    return { success: true };
  },
});

/**
 * List every registered sales associate (staff with isSalesAssociate = true),
 * including commission settings. Used by the Associates management page.
 */
export const getAssociates = query({
  args: {},
  handler: async (ctx) => {
    const [admins, superAdmins] = await Promise.all([
      ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect(),
      ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect(),
    ]);
    return [...admins, ...superAdmins]
      .filter((u) => u.isSalesAssociate === true)
      .map((u) => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive !== false,
        commissionRate: u.commissionRate,
        commissionBasis: u.commissionBasis,
        createdAt: u.createdAt,
      }))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  },
});
