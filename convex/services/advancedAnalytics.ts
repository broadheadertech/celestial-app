import { query } from "../_generated/server";
import { v } from "convex/values";

// ============================================
// DIAGNOSTIC ANALYTICS
// Why did something happen?
// ============================================

/**
 * Analyze peak hours and sales distribution throughout the day
 */
export const getPeakHoursAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const [orders, reservations] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect()
    ]);

    const hourlyDistribution = new Array(24).fill(0).map((_, hour) => ({
      hour: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
      hourValue: hour,
      sales: 0,
      volume: 0
    }));

    // Process orders
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyDistribution[hour].sales += order.totalAmount || 0;
      hourlyDistribution[hour].volume += 1;
    });

    // Process reservations
    reservations.forEach(reservation => {
      const hour = new Date(reservation.createdAt).getHours();
      if (reservation.totalAmount) {
        hourlyDistribution[hour].sales += reservation.totalAmount;
      }
      hourlyDistribution[hour].volume += 1;
    });

    // Find peak hour
    const peakHour = hourlyDistribution.reduce((max, current) => 
      current.volume > max.volume ? current : max
    );

    // Find best combo (products frequently purchased together)
    const productCombos = await getProductCorrelations(ctx);

    return {
      peakHour: peakHour.hour,
      peakVolume: peakHour.volume,
      hourlyData: hourlyDistribution,
      bestCombo: productCombos[0] || { products: [], frequency: 0, revenue: 0 },
      retentionRate: await calculateRetentionRate(ctx)
    };
  }
});

/**
 * Product correlation analysis - which products are bought together
 */
export const getProductCorrelationAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const correlations = await getProductCorrelations(ctx);
    
    return {
      correlations: correlations.slice(0, 10),
      total: correlations.length
    };
  }
});

/**
 * Customer retention and segmentation analysis
 */
export const getCustomerRetentionAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const [users, orders, reservations] = await Promise.all([
      ctx.db.query("users").filter(q => q.eq(q.field("role"), "client")).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect()
    ]);

    // Segment customers by visit frequency
    const customerActivity = new Map<string, {
      userId: string;
      orders: number;
      reservations: number;
      totalSpent: number;
      lastActivity: number;
      firstActivity: number;
    }>();

    // Process orders
    orders.forEach(order => {
      const existing = customerActivity.get(order.userId) || {
        userId: order.userId,
        orders: 0,
        reservations: 0,
        totalSpent: 0,
        lastActivity: 0,
        firstActivity: order.createdAt
      };

      existing.orders += 1;
      existing.totalSpent += order.totalAmount || 0;
      existing.lastActivity = Math.max(existing.lastActivity, order.createdAt);
      existing.firstActivity = Math.min(existing.firstActivity, order.createdAt);
      
      customerActivity.set(order.userId, existing);
    });

    // Process reservations
    reservations.forEach(reservation => {
      if (!reservation.userId || typeof reservation.userId !== 'string') return;
      
      const existing = customerActivity.get(reservation.userId) || {
        userId: reservation.userId,
        orders: 0,
        reservations: 0,
        totalSpent: 0,
        lastActivity: 0,
        firstActivity: reservation.createdAt
      };

      existing.reservations += 1;
      existing.totalSpent += reservation.totalAmount || 0;
      existing.lastActivity = Math.max(existing.lastActivity, reservation.createdAt);
      existing.firstActivity = Math.min(existing.firstActivity, reservation.createdAt);
      
      customerActivity.set(reservation.userId, existing);
    });

    // Segment customers
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const segments = {
      frequent: 0, // >3 visits in 30 days
      occasional: 0, // 2-3 visits in 30 days
      rare: 0, // 1 visit in 30 days
      inactive: 0 // No visits in 30 days
    };

    customerActivity.forEach(customer => {
      const recentActivity = customer.orders + customer.reservations;
      const isActive = customer.lastActivity >= thirtyDaysAgo;

      if (!isActive) {
        segments.inactive += 1;
      } else if (recentActivity > 3) {
        segments.frequent += 1;
      } else if (recentActivity >= 2) {
        segments.occasional += 1;
      } else {
        segments.rare += 1;
      }
    });

    const totalCustomers = users.length;
    const activeCustomers = segments.frequent + segments.occasional + segments.rare;

    return {
      retentionRate: totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0,
      segments: [
        { name: 'Frequent', value: segments.frequent, color: '#10B981' },
        { name: 'Occasional', value: segments.occasional, color: '#3B82F6' },
        { name: 'Rare', value: segments.rare, color: '#F59E0B' },
        { name: 'Inactive', value: segments.inactive, color: '#EF4444' }
      ],
      totalCustomers,
      activeCustomers
    };
  }
});

/**
 * Sales performance diagnostics - why sales increased/decreased
 */
export const getSalesPerformanceDiagnostics = query({
  args: {},
  handler: async (ctx) => {
    const [orders, products, stockRecords] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("stockRecords").collect()
    ]);

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

    // Compare last 7 days vs previous 7 days
    const recentOrders = orders.filter(o => o.createdAt >= sevenDaysAgo);
    const previousOrders = orders.filter(o => o.createdAt >= fourteenDaysAgo && o.createdAt < sevenDaysAgo);

    const recentRevenue = recentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Analyze factors
    const factors = [];

    // Stock availability impact
    const lowStockProducts = products.filter(p => p.stock < 5).length;
    if (lowStockProducts > 5) {
      factors.push({
        factor: 'Low Stock',
        impact: 'negative',
        description: `${lowStockProducts} products have low stock`,
        severity: 'high'
      });
    }

    // Order value trends
    const avgRecentOrderValue = recentOrders.length > 0 ? recentRevenue / recentOrders.length : 0;
    const avgPreviousOrderValue = previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0;

    if (avgRecentOrderValue > avgPreviousOrderValue * 1.1) {
      factors.push({
        factor: 'Higher Order Value',
        impact: 'positive',
        description: `Average order value increased by ${((avgRecentOrderValue / avgPreviousOrderValue - 1) * 100).toFixed(1)}%`,
        severity: 'medium'
      });
    }

    // Product variety
    const recentProductsSold = new Set(recentOrders.flatMap(o => o.items.map(i => i.productId))).size;
    const previousProductsSold = new Set(previousOrders.flatMap(o => o.items.map(i => i.productId))).size;

    if (recentProductsSold < previousProductsSold * 0.8) {
      factors.push({
        factor: 'Reduced Product Variety',
        impact: 'negative',
        description: 'Fewer product types being sold',
        severity: 'medium'
      });
    }

    const revenueChange = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    return {
      revenueChange: revenueChange.toFixed(1),
      trend: revenueChange >= 0 ? 'up' : 'down',
      factors,
      metrics: {
        recentRevenue,
        previousRevenue,
        recentOrders: recentOrders.length,
        previousOrders: previousOrders.length,
        avgRecentOrderValue,
        avgPreviousOrderValue
      }
    };
  }
});

// ============================================
// PREDICTIVE ANALYTICS
// What is likely to happen?
// ============================================

/**
 * Revenue forecasting based on historical trends
 */
export const getRevenueForecast = query({
  args: {
    months: v.optional(v.number())
  },
  handler: async (ctx, { months = 3 }) => {
    const orders = await ctx.db.query("orders").collect();
    const reservations = await ctx.db.query("reservations").collect();

    // Get last 12 months of data
    const monthlyRevenue = new Array(12).fill(0).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        revenue: 0,
        orders: 0
      };
    });

    // Process historical data
    const twelveMonthsAgo = Date.now() - (12 * 30 * 24 * 60 * 60 * 1000);

    orders.forEach(order => {
      if (order.createdAt >= twelveMonthsAgo) {
        const monthIndex = Math.floor((Date.now() - order.createdAt) / (30 * 24 * 60 * 60 * 1000));
        if (monthIndex >= 0 && monthIndex < 12) {
          const index = 11 - monthIndex;
          monthlyRevenue[index].revenue += order.totalAmount || 0;
          monthlyRevenue[index].orders += 1;
        }
      }
    });

    reservations.forEach(reservation => {
      if (reservation.createdAt >= twelveMonthsAgo && reservation.totalAmount) {
        const monthIndex = Math.floor((Date.now() - reservation.createdAt) / (30 * 24 * 60 * 60 * 1000));
        if (monthIndex >= 0 && monthIndex < 12) {
          const index = 11 - monthIndex;
          monthlyRevenue[index].revenue += reservation.totalAmount;
          monthlyRevenue[index].orders += 1;
        }
      }
    });

    // Simple linear regression for forecasting
    const forecast = calculateLinearForecast(monthlyRevenue, months);

    // Calculate growth rate
    const recentAvg = monthlyRevenue.slice(-3).reduce((sum, m) => sum + m.revenue, 0) / 3;
    const previousAvg = monthlyRevenue.slice(-6, -3).reduce((sum, m) => sum + m.revenue, 0) / 3;
    const growthRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      historical: monthlyRevenue,
      forecast,
      growthRate: growthRate.toFixed(1),
      confidence: calculateForecastConfidence(monthlyRevenue)
    };
  }
});

/**
 * Predict which products will likely need restocking soon
 */
export const getPredictedRestockNeeds = query({
  args: {},
  handler: async (ctx) => {
    const [products, stockRecords, stockMovements] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("stockRecords").withIndex("by_status", q => q.eq("status", "active")).collect(),
      ctx.db.query("stockMovements").collect()
    ]);

    const predictions = [];

    for (const product of products) {
      // Get product's stock movements
      const productMovements = stockMovements
        .filter(m => m.productId === product._id)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30); // Last 30 movements

      if (productMovements.length < 3) continue; // Not enough data

      // Calculate average daily sales
      const salesMovements = productMovements.filter(m => m.movementType === 'sale');
      const daysSpan = salesMovements.length > 0
        ? (Date.now() - salesMovements[salesMovements.length - 1].createdAt) / (24 * 60 * 60 * 1000)
        : 1;

      const avgDailySales = salesMovements.length / Math.max(daysSpan, 1);

      // Calculate days until stockout
      const daysUntilStockout = avgDailySales > 0 ? product.stock / avgDailySales : Infinity;

      if (daysUntilStockout < 30) { // Will need restock within 30 days
        predictions.push({
          productId: product._id,
          productName: product.name,
          currentStock: product.stock,
          avgDailySales: avgDailySales.toFixed(2),
          daysUntilStockout: Math.floor(daysUntilStockout),
          urgency: daysUntilStockout < 7 ? 'high' : daysUntilStockout < 14 ? 'medium' : 'low',
          recommendedOrderQty: Math.ceil(avgDailySales * 30) // 30 days worth
        });
      }
    }

    return predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }
});

/**
 * Predict customer churn risk
 */
export const getPredictedCustomerChurn = query({
  args: {},
  handler: async (ctx) => {
    const [users, orders, reservations] = await Promise.all([
      ctx.db.query("users").filter(q => q.eq(q.field("role"), "client")).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect()
    ]);

    const customerRisk = [];

    for (const user of users) {
      const userOrders = orders.filter(o => o.userId === user._id);
      const userReservations = reservations.filter(r => r.userId === user._id);

      if (userOrders.length === 0 && userReservations.length === 0) continue;

      // Get last activity
      const lastOrderDate = userOrders.length > 0
        ? Math.max(...userOrders.map(o => o.createdAt))
        : 0;
      const lastReservationDate = userReservations.length > 0
        ? Math.max(...userReservations.map(r => r.createdAt))
        : 0;

      const lastActivity = Math.max(lastOrderDate, lastReservationDate);
      const daysSinceLastActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);

      // Calculate churn risk score (0-100)
      let riskScore = 0;

      if (daysSinceLastActivity > 60) riskScore += 40;
      else if (daysSinceLastActivity > 30) riskScore += 20;

      const totalActivity = userOrders.length + userReservations.length;
      if (totalActivity === 1) riskScore += 30;
      else if (totalActivity < 5) riskScore += 15;

      if (riskScore > 30) {
        customerRisk.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          riskScore,
          riskLevel: riskScore > 60 ? 'high' : riskScore > 40 ? 'medium' : 'low',
          daysSinceLastActivity: Math.floor(daysSinceLastActivity),
          totalActivity,
          recommendedAction: riskScore > 60 
            ? 'Send promotional offer' 
            : 'Send re-engagement email'
        });
      }
    }

    return customerRisk.sort((a, b) => b.riskScore - a.riskScore);
  }
});

// ============================================
// PRESCRIPTIVE ANALYTICS
// What should we do about it?
// ============================================

/**
 * Get actionable recommendations to improve business performance
 */
export const getBusinessRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const [products, orders, users, stockRecords, reservations] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("reservations").collect()
    ]);

    const recommendations = [];

    // Analyze low stock products
    const lowStockProducts = products.filter(p => p.stock < 10 && p.stock > 0);
    if (lowStockProducts.length > 0) {
      recommendations.push({
        category: 'inventory',
        priority: 'high',
        title: 'Low Stock Alert',
        description: `${lowStockProducts.length} products have low stock levels`,
        action: 'Review and restock these products',
        impact: 'Prevent stockouts and lost sales',
        estimatedRevenue: lowStockProducts.reduce((sum, p) => sum + (p.price * 20), 0),
        products: lowStockProducts.slice(0, 5).map(p => p.name)
      });
    }

    // Analyze pricing opportunities
    const highMarginProducts = products
      .filter(p => p.originalPrice && p.price < p.originalPrice)
      .slice(0, 5);
    
    if (highMarginProducts.length > 0) {
      recommendations.push({
        category: 'pricing',
        priority: 'medium',
        title: 'Pricing Optimization',
        description: 'Products with sale prices can be promoted',
        action: 'Create promotional campaign for discounted items',
        impact: 'Increase sales velocity',
        estimatedRevenue: highMarginProducts.reduce((sum, p) => sum + (p.price * 10), 0),
        products: highMarginProducts.map(p => p.name)
      });
    }

    // Analyze customer engagement
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const inactiveCustomers = users.filter(user => {
      const userOrders = orders.filter(o => o.userId === user._id);
      const lastActivity = userOrders.length > 0
        ? Math.max(...userOrders.map(o => o.createdAt))
        : user.createdAt;
      return lastActivity < thirtyDaysAgo;
    }).length;

    if (inactiveCustomers > 10) {
      recommendations.push({
        category: 'marketing',
        priority: 'high',
        title: 'Customer Re-engagement',
        description: `${inactiveCustomers} customers haven't ordered in 30+ days`,
        action: 'Launch re-engagement email campaign with special offers',
        impact: 'Reduce churn and increase repeat purchases',
        estimatedRevenue: inactiveCustomers * 500, // Estimated average order value
        customers: inactiveCustomers
      });
    }

    // Analyze product performance
    const productSales = new Map<string, number>();
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity);
      });
    });

    const slowMovingProducts = products.filter(p => {
      const sales = productSales.get(p._id) || 0;
      return sales < 5 && p.stock > 20;
    });

    if (slowMovingProducts.length > 0) {
      recommendations.push({
        category: 'inventory',
        priority: 'medium',
        title: 'Slow-Moving Inventory',
        description: `${slowMovingProducts.length} products have low sales but high stock`,
        action: 'Consider discounting or bundling these products',
        impact: 'Free up capital and warehouse space',
        estimatedRevenue: slowMovingProducts.reduce((sum, p) => sum + (p.price * p.stock * 0.7), 0),
        products: slowMovingProducts.slice(0, 5).map(p => p.name)
      });
    }

    // Analyze operational efficiency
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    if (pendingReservations > 10) {
      recommendations.push({
        category: 'operations',
        priority: 'high',
        title: 'Pending Reservations',
        description: `${pendingReservations} reservations awaiting confirmation`,
        action: 'Process pending reservations to avoid customer dissatisfaction',
        impact: 'Improve customer satisfaction and conversion rate',
        count: pendingReservations
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
});

/**
 * Get optimal pricing recommendations based on demand and competition
 */
export const getPricingRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const [products, orders, categories] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("categories").collect()
    ]);

    // Calculate demand for each product
    const productDemand = new Map<string, { sales: number, revenue: number }>();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productDemand.get(item.productId) || { sales: 0, revenue: 0 };
        existing.sales += item.quantity;
        existing.revenue += item.price * item.quantity;
        productDemand.set(item.productId, existing);
      });
    });

    const recommendations = [];

    for (const product of products) {
      const demand = productDemand.get(product._id);
      const categoryProducts = products.filter(p => p.categoryId === product.categoryId);
      
      if (!demand || categoryProducts.length < 2) continue;

      // Calculate category average price
      const categoryAvgPrice = categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length;

      // High demand + below average price = increase price opportunity
      if (demand.sales > 10 && product.price < categoryAvgPrice * 0.9) {
        const suggestedPrice = Math.min(product.price * 1.15, categoryAvgPrice);
        recommendations.push({
          productId: product._id,
          productName: product.name,
          currentPrice: product.price,
          suggestedPrice: Math.round(suggestedPrice),
          reason: 'High demand, price below category average',
          expectedImpact: `+₱${Math.round((suggestedPrice - product.price) * demand.sales * 0.8)}`,
          confidence: 'high'
        });
      }

      // Low demand + above average price = decrease price opportunity
      if (demand.sales < 3 && product.price > categoryAvgPrice * 1.1 && product.stock > 10) {
        const suggestedPrice = Math.max(product.price * 0.85, categoryAvgPrice);
        recommendations.push({
          productId: product._id,
          productName: product.name,
          currentPrice: product.price,
          suggestedPrice: Math.round(suggestedPrice),
          reason: 'Low demand, high stock, price above average',
          expectedImpact: `+${Math.round((suggestedPrice / product.price - 1) * 100)}% sales volume`,
          confidence: 'medium'
        });
      }
    }

    return recommendations;
  }
});

/**
 * Get marketing campaign recommendations
 */
export const getMarketingRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const [products, orders, users, categories] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("users").filter(q => q.eq(q.field("role"), "client")).collect(),
      ctx.db.query("categories").collect()
    ]);

    const campaigns = [];

    // 1. Best sellers bundle campaign
    const productSales = new Map<string, number>();
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity);
      });
    });

    const topProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([productId]) => products.find(p => p._id === productId))
      .filter(Boolean);

    if (topProducts.length >= 2) {
      campaigns.push({
        type: 'bundle',
        priority: 'high',
        title: 'Best Sellers Bundle',
        description: 'Create a bundle of top-selling products',
        products: topProducts.map(p => p!.name),
        discount: '15%',
        estimatedRevenue: topProducts.reduce((sum, p) => sum + p!.price, 0) * 10,
        targetAudience: 'All customers',
        duration: '2 weeks'
      });
    }

    // 2. New customer welcome campaign
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const newCustomers = users.filter(u => u.createdAt >= thirtyDaysAgo).length;

    if (newCustomers > 5) {
      campaigns.push({
        type: 'welcome',
        priority: 'high',
        title: 'New Customer Welcome',
        description: 'Welcome campaign for new customers',
        offer: 'First purchase 10% off',
        targetAudience: `${newCustomers} new customers`,
        estimatedRevenue: newCustomers * 500,
        duration: '1 week'
      });
    }

    // 3. Category-specific promotions
    for (const category of categories.slice(0, 2)) {
      const categoryProducts = products.filter(p => p.categoryId === category._id);
      const lowStockCount = categoryProducts.filter(p => p.stock < 10).length;

      if (lowStockCount > 2) {
        campaigns.push({
          type: 'clearance',
          priority: 'medium',
          title: `${category.name} Clearance Sale`,
          description: `Clear out low-stock ${category.name} inventory`,
          products: categoryProducts.slice(0, 5).map(p => p.name),
          discount: '20%',
          estimatedRevenue: categoryProducts.reduce((sum, p) => sum + (p.price * p.stock * 0.8), 0),
          targetAudience: 'All customers',
          duration: '1 week'
        });
      }
    }

    // 4. Loyalty program for repeat customers
    const repeatCustomers = users.filter(user => {
      const userOrders = orders.filter(o => o.userId === user._id);
      return userOrders.length >= 3;
    }).length;

    if (repeatCustomers > 10) {
      campaigns.push({
        type: 'loyalty',
        priority: 'medium',
        title: 'VIP Loyalty Rewards',
        description: 'Reward program for repeat customers',
        offer: 'Exclusive 20% discount + free shipping',
        targetAudience: `${repeatCustomers} loyal customers`,
        estimatedRevenue: repeatCustomers * 1000,
        duration: 'Ongoing'
      });
    }

    return campaigns;
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getProductCorrelations(ctx: any) {
  const orders = await ctx.db.query("orders").collect();
  const products = await ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect();

  // Track product combinations
  const combinations = new Map<string, {
    products: string[];
    frequency: number;
    revenue: number;
  }>();

  orders.forEach(order => {
    if (order.items.length < 2) return;

    // Get all pairs of products in the order
    for (let i = 0; i < order.items.length; i++) {
      for (let j = i + 1; j < order.items.length; j++) {
        const productIds = [order.items[i].productId, order.items[j].productId].sort();
        const key = productIds.join('-');

        const existing = combinations.get(key) || {
          products: productIds,
          frequency: 0,
          revenue: 0
        };

        existing.frequency += 1;
        existing.revenue += (order.items[i].price * order.items[i].quantity) + 
                           (order.items[j].price * order.items[j].quantity);

        combinations.set(key, existing);
      }
    }
  });

  // Convert to array and enrich with product names
  const result = Array.from(combinations.values())
    .map(combo => {
      const productNames = combo.products
        .map(id => products.find(p => p._id === id)?.name || 'Unknown')
        .filter(name => name !== 'Unknown');

      return {
        products: productNames,
        frequency: combo.frequency,
        revenue: combo.revenue
      };
    })
    .filter(combo => combo.products.length === 2)
    .sort((a, b) => b.frequency - a.frequency);

  return result;
}

async function calculateRetentionRate(ctx: any) {
  const [users, orders] = await Promise.all([
    ctx.db.query("users").filter(q => q.eq(q.field("role"), "client")).collect(),
    ctx.db.query("orders").collect()
  ]);

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const activeUsers = users.filter(user => {
    const userOrders = orders.filter(o => o.userId === user._id && o.createdAt >= thirtyDaysAgo);
    return userOrders.length > 0;
  }).length;

  return users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0;
}

function calculateLinearForecast(historicalData: any[], months: number) {
  const n = historicalData.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = historicalData.map(d => d.revenue);

  // Calculate linear regression
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast
  const forecast = [];
  for (let i = 0; i < months; i++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i + 1);
    const monthName = futureDate.toLocaleString('default', { month: 'short' });
    const predictedRevenue = Math.max(0, slope * (n + i) + intercept);

    forecast.push({
      month: monthName,
      revenue: Math.round(predictedRevenue),
      orders: Math.round(predictedRevenue / 1000) // Rough estimate
    });
  }

  return forecast;
}

function calculateForecastConfidence(historicalData: any[]) {
  if (historicalData.length < 6) return 'low';

  // Calculate variance
  const revenues = historicalData.map(d => d.revenue);
  const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
  const coefficient = Math.sqrt(variance) / mean;

  if (coefficient < 0.2) return 'high';
  if (coefficient < 0.4) return 'medium';
  return 'low';
}
