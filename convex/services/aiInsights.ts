import { query } from "../_generated/server";
import { v } from "convex/values";

// Generate insights purely from data — no external API needed
export const generateInsights = query({
  args: {
    focus: v.optional(v.string()),
  },
  handler: async (ctx, { focus }) => {
    const [orders, reservations, products, users, stockRecords, categories] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("categories").collect(),
    ]);

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    // ==================== COMPUTE METRICS ====================

    const activeProducts = products.filter(p => p.isActive);
    const clientUsers = users.filter(u => u.role === 'client');
    const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
    const completedReservations = reservations.filter(r => r.status === 'completed');
    const nonMortalityStock = stockRecords.filter(r => !r.isMortalityLoss);
    const mortalityRecords = stockRecords.filter(r => r.isMortalityLoss);

    // Revenue
    const orderRevenue = nonCancelledOrders.reduce((s, o) => s + o.totalAmount, 0);
    const reservationRevenue = completedReservations.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalRevenue = orderRevenue + reservationRevenue;

    // Cost & Profit
    let totalCost = 0;
    for (const o of nonCancelledOrders) {
      for (const item of o.items) {
        const product = products.find(p => p._id === item.productId);
        if (product?.costPrice) totalCost += product.costPrice * item.quantity;
      }
    }
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Period comparisons
    const recentOrders = orders.filter(o => o.createdAt >= thirtyDaysAgo);
    const prevOrders = orders.filter(o => o.createdAt >= sixtyDaysAgo && o.createdAt < thirtyDaysAgo);
    const recentRevenue = recentOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0);
    const prevRevenue = prevOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0);
    const revenueChange = prevRevenue > 0 ? ((recentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const recentUsers = clientUsers.filter(u => u.createdAt >= thirtyDaysAgo);
    const prevUsers = clientUsers.filter(u => u.createdAt >= sixtyDaysAgo && u.createdAt < thirtyDaysAgo);

    const weekOrders = orders.filter(o => o.createdAt >= sevenDaysAgo);
    const avgOrderValue = nonCancelledOrders.length > 0
      ? totalRevenue / nonCancelledOrders.length : 0;

    // Stock analysis
    const lowStockProducts = activeProducts.filter(p => p.stock > 0 && p.stock <= 10);
    const outOfStockProducts = activeProducts.filter(p => p.stock === 0);
    const totalMortality = mortalityRecords.reduce((s, r) => s + r.mortalityLossQty, 0);
    const totalStockValue = nonMortalityStock
      .filter(r => r.status === 'active')
      .reduce((s, r) => {
        const product = products.find(p => p._id === r.productId);
        return s + r.currentQty * (product?.price || 0);
      }, 0);

    // Category breakdown
    const categoryMap = new Map<string, string>(categories.map(c => [c._id, c.name]));
    const salesByCategory: Record<string, { qty: number; revenue: number }> = {};
    for (const o of nonCancelledOrders) {
      for (const item of o.items) {
        const product = products.find(p => p._id === item.productId);
        if (product) {
          const catName = categoryMap.get(product.categoryId) || 'Unknown';
          if (!salesByCategory[catName]) salesByCategory[catName] = { qty: 0, revenue: 0 };
          salesByCategory[catName].qty += item.quantity;
          salesByCategory[catName].revenue += item.price * item.quantity;
        }
      }
    }

    // Top selling products by quantity
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of nonCancelledOrders) {
      for (const item of o.items) {
        const product = products.find(p => p._id === item.productId);
        if (product) {
          const id = item.productId;
          if (!productSales[id]) productSales[id] = { name: product.name, qty: 0, revenue: 0 };
          productSales[id].qty += item.quantity;
          productSales[id].revenue += item.price * item.quantity;
        }
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Order status breakdown
    const ordersByStatus: Record<string, number> = {};
    for (const o of orders) { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; }
    const reservationsByStatus: Record<string, number> = {};
    for (const r of reservations) { reservationsByStatus[r.status] = (reservationsByStatus[r.status] || 0) + 1; }

    // Data completeness
    const productsNoCost = activeProducts.filter(p => !p.costPrice);
    const ordersNoSA = nonCancelledOrders.filter(o => !o.salesAssociateName);
    const reservationsNoSA = reservations.filter(r => !r.salesAssociateName && r.status !== 'cancelled');

    // ==================== BUILD INSIGHTS ====================

    const descriptive: string[] = [];
    const diagnostic: string[] = [];
    const predictive: string[] = [];
    const prescriptive: string[] = [];
    const dataQuality: string[] = [];

    const fmtCurrency = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    // --- DATA QUALITY ---
    if (productsNoCost.length > 0) {
      dataQuality.push(`${productsNoCost.length} product${productsNoCost.length > 1 ? 's' : ''} missing cost price — gross profit calculation is incomplete. Products: ${productsNoCost.slice(0, 3).map(p => p.name).join(', ')}${productsNoCost.length > 3 ? '...' : ''}`);
    }
    if (ordersNoSA.length > 0) {
      dataQuality.push(`${ordersNoSA.length} order${ordersNoSA.length > 1 ? 's' : ''} without a sales associate — incentive tracking has gaps`);
    }
    if (reservationsNoSA.length > 0) {
      dataQuality.push(`${reservationsNoSA.length} reservation${reservationsNoSA.length > 1 ? 's' : ''} without a sales associate assigned`);
    }

    // --- DESCRIPTIVE ---
    descriptive.push(`Total revenue: ${fmtCurrency(totalRevenue)} from ${nonCancelledOrders.length} orders and ${completedReservations.length} completed reservations`);
    descriptive.push(`Gross profit: ${fmtCurrency(grossProfit)} (${profitMargin.toFixed(1)}% margin)`);
    descriptive.push(`Average order value: ${fmtCurrency(avgOrderValue)}`);
    descriptive.push(`Last 30 days: ${recentOrders.length} orders | Last 7 days: ${weekOrders.length} orders`);
    descriptive.push(`Active products: ${activeProducts.length} | Low stock: ${lowStockProducts.length} | Out of stock: ${outOfStockProducts.length}`);
    descriptive.push(`Total customers: ${clientUsers.length} | New this month: ${recentUsers.length}`);

    if (totalMortality > 0) {
      descriptive.push(`Total mortality/damage losses: ${totalMortality} units`);
    }
    if (topProducts.length > 0) {
      descriptive.push(`Top seller: ${topProducts[0].name} (${topProducts[0].qty} units, ${fmtCurrency(topProducts[0].revenue)})`);
    }

    // --- DIAGNOSTIC ---
    if (revenueChange > 10) {
      diagnostic.push(`Revenue is up ${revenueChange.toFixed(1)}% vs previous 30 days — order volume increased from ${prevOrders.length} to ${recentOrders.length}`);
    } else if (revenueChange < -10) {
      diagnostic.push(`Revenue is down ${Math.abs(revenueChange).toFixed(1)}% vs previous 30 days — order volume dropped from ${prevOrders.length} to ${recentOrders.length}`);
    } else if (prevOrders.length > 0) {
      diagnostic.push(`Revenue is stable (${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs previous 30 days)`);
    }

    if (outOfStockProducts.length > 0) {
      diagnostic.push(`${outOfStockProducts.length} products are out of stock — potential lost sales. Products: ${outOfStockProducts.slice(0, 3).map(p => p.name).join(', ')}${outOfStockProducts.length > 3 ? '...' : ''}`);
    }

    if (totalMortality > 0) {
      const mortalityRate = nonMortalityStock.length > 0
        ? (totalMortality / nonMortalityStock.reduce((s, r) => s + r.initialQty, 0)) * 100 : 0;
      if (mortalityRate > 5) {
        diagnostic.push(`Mortality rate is ${mortalityRate.toFixed(1)}% — this is high and directly impacts profitability`);
      } else if (mortalityRate > 0) {
        diagnostic.push(`Mortality rate is ${mortalityRate.toFixed(1)}% — within acceptable range`);
      }
    }

    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const cancelRate = orders.length > 0 ? (cancelledOrders / orders.length) * 100 : 0;
    if (cancelRate > 10) {
      diagnostic.push(`Cancellation rate is ${cancelRate.toFixed(1)}% (${cancelledOrders} of ${orders.length}) — investigate root causes`);
    }

    const pendingCount = (ordersByStatus['pending'] || 0) + (reservationsByStatus['pending'] || 0);
    if (pendingCount > 5) {
      diagnostic.push(`${pendingCount} items still pending — may indicate processing bottleneck`);
    }

    if (Object.keys(salesByCategory).length > 0) {
      const topCategory = Object.entries(salesByCategory).sort((a, b) => b[1].revenue - a[1].revenue)[0];
      diagnostic.push(`Best performing category: ${topCategory[0]} (${fmtCurrency(topCategory[1].revenue)}, ${topCategory[1].qty} units)`);
    }

    // --- PREDICTIVE ---
    if (recentOrders.length > 0) {
      const dailyRate = recentOrders.length / 30;
      const projectedMonthly = Math.round(dailyRate * 30);
      const projectedRevenue = dailyRate > 0 ? (recentRevenue / recentOrders.length) * projectedMonthly : 0;
      predictive.push(`At current pace: ~${projectedMonthly} orders/month generating ~${fmtCurrency(projectedRevenue)}`);
    }

    if (lowStockProducts.length > 0) {
      predictive.push(`${lowStockProducts.length} products will likely run out soon: ${lowStockProducts.slice(0, 3).map(p => `${p.name} (${p.stock} left)`).join(', ')}`);
    }

    if (recentUsers.length > prevUsers.length) {
      predictive.push(`Customer growth is accelerating (${recentUsers.length} vs ${prevUsers.length} previous period) — expect higher demand`);
    } else if (recentUsers.length < prevUsers.length && prevUsers.length > 0) {
      predictive.push(`Customer acquisition is slowing (${recentUsers.length} vs ${prevUsers.length} previous period)`);
    }

    if (profitMargin < 20 && totalRevenue > 0) {
      predictive.push(`Profit margin at ${profitMargin.toFixed(1)}% — unsustainable long-term without cost optimization`);
    }

    // --- PRESCRIPTIVE ---
    if (outOfStockProducts.length > 0) {
      prescriptive.push(`Restock immediately: ${outOfStockProducts.slice(0, 3).map(p => p.name).join(', ')} — every day out of stock is lost revenue`);
    }

    if (lowStockProducts.length > 0) {
      prescriptive.push(`Schedule restock for ${lowStockProducts.length} low-stock items before they run out`);
    }

    if (productsNoCost.length > 0) {
      prescriptive.push(`Add cost prices to ${productsNoCost.length} products to enable accurate profit tracking`);
    }

    if (profitMargin > 0 && profitMargin < 30 && totalRevenue > 0) {
      prescriptive.push(`Review pricing strategy — ${profitMargin.toFixed(1)}% margin leaves little room for expenses. Consider raising prices on high-demand items`);
    }

    if (totalMortality > 0) {
      prescriptive.push(`Investigate mortality losses (${totalMortality} units) — check water quality, transport conditions, and supplier quality`);
    }

    if (cancelRate > 10) {
      prescriptive.push(`Reduce cancellation rate by confirming stock availability before accepting orders and improving communication`);
    }

    if (ordersNoSA.length > 0) {
      prescriptive.push(`Assign sales associates to ${ordersNoSA.length} orders for complete incentive program tracking`);
    }

    if (topProducts.length > 0 && topProducts[0].qty > 0) {
      prescriptive.push(`Promote ${topProducts[0].name} more — it's your top performer. Consider bundling it with slower-moving items`);
    }

    // Fallback if no data
    if (descriptive.length === 0) {
      descriptive.push('No sales data available yet. Start creating orders to see insights.');
    }
    if (diagnostic.length === 0) {
      diagnostic.push('Not enough historical data for trend analysis. Keep recording transactions.');
    }
    if (predictive.length === 0) {
      predictive.push('Need at least 30 days of data for meaningful predictions.');
    }
    if (prescriptive.length === 0) {
      prescriptive.push('Add products, create orders, and fill in cost prices to get actionable recommendations.');
    }

    return {
      insights: {
        dataQuality,
        descriptive,
        diagnostic,
        predictive,
        prescriptive,
      },
      dataSnapshot: {
        totalRevenue,
        grossProfit,
        profitMargin: profitMargin.toFixed(1),
        totalOrders: orders.length,
        totalReservations: reservations.length,
        activeProducts: activeProducts.length,
        totalCustomers: clientUsers.length,
        stockValue: totalStockValue,
      },
      generatedAt: now,
    };
  },
});
