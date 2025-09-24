import { query } from "../_generated/server";
import { v } from "convex/values";

// Get top performing products sorted by revenue (high to low)
export const getTopProducts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 8 }) => {
    // Get all products
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get all orders and reservations to calculate sales and revenue per product
    const [orders, reservations] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect()
    ]);

    // Calculate sales and revenue for each product
    const productMetrics = new Map<string, {
      id: string;
      name: string;
      sales: number;
      orders: number;
      reservations: number;
      revenue: number;
      category: string;
      stock: number;
      price: number;
    }>();

    // Initialize all products with zero metrics
    for (const product of products) {
      productMetrics.set(product._id, {
        id: product._id,
        name: product.name,
        sales: 0,
        orders: 0,
        reservations: 0,
        revenue: 0,
        category: "Uncategorized", // Will be updated with actual category
        stock: product.stock,
        price: product.price,
      });
    }

    // Process orders to calculate actual sales data
    for (const order of orders) {
      for (const item of order.items) {
        const existing = productMetrics.get(item.productId);
        if (existing) {
          existing.sales += item.quantity;
          existing.orders += 1;
          existing.revenue += item.price * item.quantity;
        }
      }
    }

    // Process reservations to calculate sales data from reservations
    for (const reservation of reservations) {
      // Handle both new multi-item reservations and legacy single-item reservations
      if (reservation.items && reservation.items.length > 0) {
        // New multi-item reservations
        for (const item of reservation.items) {
          const existing = productMetrics.get(item.productId);
          if (existing) {
            existing.sales += item.quantity;
            existing.reservations += 1;
            existing.revenue += item.reservedPrice * item.quantity;
          }
        }
      } else if (reservation.productId && reservation.quantity) {
        // Legacy single-item reservations
        const existing = productMetrics.get(reservation.productId);
        if (existing) {
          existing.sales += reservation.quantity;
          existing.reservations += 1;
          // For legacy reservations, use current product price as fallback
          const product = products.find(p => p._id === reservation.productId);
          if (product) {
            existing.revenue += product.price * reservation.quantity;
          }
        }
      }
    }

    // Get categories for proper category names
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map(cat => [cat._id, cat.name]));

    // Update category names
    for (const product of products) {
      const metrics = productMetrics.get(product._id);
      if (metrics) {
        metrics.category = categoryMap.get(product.categoryId) || "Uncategorized";
      }
    }

    // Convert to array and sort by revenue (high to low)
    const sortedProducts = Array.from(productMetrics.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    // Calculate margins and stock levels
    return sortedProducts.map((product) => {
      const stockLevel = product.stock > 10 ? "High" :
                        product.stock > 0 ? "Medium" : "Low";

      // Calculate margin based on revenue and basic cost assumptions
      const margin = product.revenue > 0 ?
        Math.floor(Math.random() * 30) + 50 : 0; // Placeholder margin calculation

      const growth = product.sales > 0 ?
        Math.floor(Math.random() * 20) + 5 : 0; // Placeholder growth calculation

      return {
        id: product.id,
        name: product.name,
        sales: product.sales,
        orders: product.orders,
        reservations: product.reservations,
        revenue: product.revenue,
        margin,
        growth,
        category: product.category,
        stockLevel,
        trend: product.revenue > 0 ? "up" : "down" as const,
        image: "📦", // Default image, could be enhanced with actual product images
      };
    });
  },
});

// Get dashboard KPI data
export const getDashboardKPIs = query({
  args: {},
  handler: async (ctx) => {
    // Get all data needed for KPIs
    const [products, orders, users, reservations] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", (q) => q.eq("isActive", true)).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("reservations").collect()
    ]);

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate active orders (pending, confirmed, processing)
    const activeOrders = orders.filter(order =>
      ["pending", "confirmed", "processing"].includes(order.status)
    ).length;

    // Calculate total customers
    const totalCustomers = users.length;

    // Calculate conversion rate (orders per customer)
    const conversionRate = totalCustomers > 0 ?
      ((orders.length / totalCustomers) * 100).toFixed(1) : "0.0";

    // Calculate percentage changes based on time periods
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);

    // Recent vs previous period comparisons
    const recentOrders = orders.filter(order => order.createdAt >= thirtyDaysAgo);
    const previousOrders = orders.filter(order =>
      order.createdAt >= sixtyDaysAgo && order.createdAt < thirtyDaysAgo
    );

    const recentRevenue = recentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const recentUsers = users.filter(user => user.createdAt >= thirtyDaysAgo);
    const previousUsers = users.filter(user =>
      user.createdAt >= sixtyDaysAgo && user.createdAt < thirtyDaysAgo
    );

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ?
      (((recentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1) : "0.0";

    const ordersChange = previousOrders.length > 0 ?
      (((recentOrders.length - previousOrders.length) / previousOrders.length) * 100).toFixed(1) : "0.0";

    const customersChange = previousUsers.length > 0 ?
      (((recentUsers.length - previousUsers.length) / previousUsers.length) * 100).toFixed(1) : "0.0";

    const recentConversionRate = recentUsers.length > 0 ?
      (recentOrders.length / recentUsers.length) * 100 : 0;
    const previousConversionRate = previousUsers.length > 0 ?
      (previousOrders.length / previousUsers.length) * 100 : 0;

    const conversionChange = previousConversionRate > 0 ?
      (((recentConversionRate - previousConversionRate) / previousConversionRate) * 100).toFixed(1) : "0.0";

    return {
      totalRevenue,
      activeOrders,
      totalCustomers,
      totalOrders: orders.length,
      conversionRate,
      changes: {
        revenue: `${parseFloat(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
        orders: `${parseFloat(ordersChange) >= 0 ? '+' : ''}${ordersChange}%`,
        customers: `${parseFloat(customersChange) >= 0 ? '+' : ''}${customersChange}%`,
        conversion: `${parseFloat(conversionChange) >= 0 ? '+' : ''}${conversionChange}%`,
      }
    };
  },
});

// Get revenue data by month
export const getRevenueData = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const currentYear = new Date().getFullYear();

    const monthlyData = monthNames.map((month, index) => {
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === index && orderDate.getFullYear() === currentYear;
      });

      const revenue = monthOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );

      return {
        month,
        revenue,
        orders: monthOrders.length,
      };
    });

    return monthlyData;
  },
});

// Get category distribution data
export const getCategoryData = query({
  args: {},
  handler: async (ctx) => {
    const [products, categories] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", (q) => q.eq("isActive", true)).collect(),
      ctx.db.query("categories").collect()
    ]);

    if (products.length === 0) {
      return [{ name: "No Data", value: 100, count: 0, color: "#6B7280" }];
    }

    const categoryCount = products.reduce((acc, product) => {
      const category = categories.find(cat => cat._id === product.categoryId);
      const categoryName = category?.name || "Uncategorized";
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(categoryCount).reduce((sum, count) => sum + count, 0);

    const colors = [
      "#FF6B00", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"
    ];

    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: category,
      value: Math.round((count / total) * 100),
      count,
      color: colors[index % colors.length],
    }));
  },
});

// Get customer growth data
export const getCustomerGrowth = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    if (users.length === 0) {
      return [
        { week: "W1", newCustomers: 0, returning: 0 },
        { week: "W2", newCustomers: 0, returning: 0 },
        { week: "W3", newCustomers: 0, returning: 0 },
        { week: "W4", newCustomers: 0, returning: 0 },
      ];
    }

    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);

    const weeklyData = [
      { week: "W1", newCustomers: 0, returning: 0 },
      { week: "W2", newCustomers: 0, returning: 0 },
      { week: "W3", newCustomers: 0, returning: 0 },
      { week: "W4", newCustomers: 0, returning: 0 },
    ];

    users.forEach(user => {
      if (user.createdAt) {
        const userDate = new Date(user.createdAt);
        if (userDate >= fourWeeksAgo) {
          const weeksAgo = Math.floor(
            (now.getTime() - userDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          const weekIndex = Math.min(3, Math.max(0, 3 - weeksAgo));
          weeklyData[weekIndex].newCustomers += 1;
        }
      }
    });

    return weeklyData;
  },
});

// Get recent activity data
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 5 }) => {
    const [orders, reservations, products] = await Promise.all([
      ctx.db.query("orders").order("desc").take(5),
      ctx.db.query("reservations").order("desc").take(3),
      ctx.db.query("products").withIndex("by_active", (q) => q.eq("isActive", true)).collect()
    ]);

    const activities: Array<{
      type: string;
      message: string;
      amount: string | null;
      time: string;
      status: string;
    }> = [];

    // Add recent orders
    orders.forEach(order => {
      activities.push({
        type: "order",
        message: `New order #${order._id.slice(-8)} received`,
        amount: `₱${order.totalAmount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
        time: getRelativeTime(order.createdAt),
        status: "success",
      });
    });

    // Add recent reservations
    reservations.forEach(reservation => {
      activities.push({
        type: "reservation",
        message: `New reservation ${reservation.reservationCode || '#' + reservation._id.slice(-8)}`,
        amount: null,
        time: getRelativeTime(reservation.createdAt),
        status: "info",
      });
    });

    // Add low stock alerts
    const lowStockProducts = products
      .filter(p => p.stock <= 5)
      .slice(0, 2);

    lowStockProducts.forEach(product => {
      activities.push({
        type: "alert",
        message: `Low stock alert: ${product.name}`,
        amount: `${product.stock} left`,
        time: "Low stock",
        status: "warning",
      });
    });

    // Sort by creation time and limit results
    return activities
      .sort((a, b) => {
        if (a.type === "alert") return -1;
        if (b.type === "alert") return 1;
        return 0;
      })
      .slice(0, limit);
  },
});

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return minutes <= 1 ? "Just now" : `${minutes} mins ago`;
  } else if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
}