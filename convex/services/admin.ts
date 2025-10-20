import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
    
    return {
      totalRevenue,
      totalUsers,
      newUsersThisMonth,
      // Primary reservation stats
      totalReservations,
      pendingReservations,
      // Legacy combined stats
      totalOrders,
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
        const user = await ctx.db.get(order.userId);
        const customerName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Customer';

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
  },
  handler: async (ctx, args) => {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    // Check if product has orders
    const orders = await ctx.db.query("orders").collect();
    const hasOrders = orders.some(order => 
      order.items.some(item => item.productId === id)
    );
    
    if (hasOrders) {
      // Don't delete, just deactivate
      await ctx.db.patch(id, { 
        isActive: false,
        updatedAt: Date.now(),
      });
      return { success: true, message: "Product deactivated (has order history)" };
    }
    
    await ctx.db.delete(id);
    return { success: true, message: "Product deleted successfully" };
  },
});

// Fish Data Management
export const createFishData = mutation({
  args: {
    productId: v.id("products"),
    scientificName: v.string(),
    weight: v.optional(v.number()),
    size: v.number(),
    temperature: v.number(),
    age: v.number(),
    phLevel: v.string(),
    lifespan: v.string(),
    origin: v.string(),
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

// Ban user (placeholder - UI exists but functionality not implemented per request)
export const banUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Placeholder - do nothing for now but return success
    // TODO: Implement ban functionality in the future
    return { success: true, message: "Ban functionality not yet implemented" };
  },
});

// Unban user (placeholder - UI exists but functionality not implemented per request)
export const unbanUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Placeholder - do nothing for now but return success
    // TODO: Implement unban functionality in the future
    return { success: true, message: "Unban functionality not yet implemented" };
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
        const user = await ctx.db.get(order.userId);
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
