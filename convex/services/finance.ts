import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ==================== HELPER (callable from other mutations) ====================

/**
 * Create an internal-use expense — called from logInternalUse mutation.
 * Amount = product.costPrice × quantity. Payment method is always "internal"
 * (doesn't affect cash-on-hand — no cash actually leaves your hand).
 */
export async function createInternalUseExpenseHelper(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    quantity: number;
    unitCost: number;
    notes?: string;
    userId?: Id<"users">;
  }
) {
  const { productId, quantity, unitCost, notes, userId } = args;
  const product = await ctx.db.get(productId);
  if (!product) return null;

  const totalCost = unitCost * quantity;
  if (totalCost <= 0) return null;

  const now = Date.now();
  const id = await ctx.db.insert("expenses", {
    type: "operational",
    category: "supplies",
    amount: totalCost,
    description: `Internal use: ${quantity} × ${product.name}`,
    paymentMethod: "internal",
    date: now,
    productId,
    quantity,
    notes,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

/**
 * Create a restocking expense — called from restockProduct mutation.
 * Amount = product.costPrice × quantity. Defaults to cash payment.
 */
export async function createRestockExpenseHelper(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    stockRecordId: Id<"stockRecords">;
    quantity: number;
    batchCode: string;
    userId?: Id<"users">;
    paymentMethod?: string;
  }
) {
  const { productId, stockRecordId, quantity, batchCode, userId, paymentMethod = "cash" } = args;

  const product = await ctx.db.get(productId);
  if (!product) return null;

  // Use costPrice if set, otherwise fall back to 0 (admin should set costPrice)
  const unitCost = product.costPrice || 0;
  const totalCost = unitCost * quantity;

  if (totalCost === 0) return null; // skip if no cost data

  const now = Date.now();
  const id = await ctx.db.insert("expenses", {
    type: "restocking",
    amount: totalCost,
    description: `Restock: ${quantity} × ${product.name} (${batchCode})`,
    paymentMethod,
    date: now,
    stockRecordId,
    productId,
    quantity,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

// ==================== MUTATIONS ====================

// Create an operational (or any) expense manually
export const createExpense = mutation({
  args: {
    type: v.union(v.literal("restocking"), v.literal("operational")),
    category: v.optional(v.union(
      v.literal("travel"),
      v.literal("food"),
      v.literal("supplies"),
      v.literal("utilities"),
      v.literal("rent"),
      v.literal("salary"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("other"),
    )),
    amount: v.number(),
    description: v.string(),
    paymentMethod: v.string(),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    receiptImage: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("Amount must be greater than 0");
    if (!args.description.trim()) throw new Error("Description is required");

    const now = Date.now();
    const id = await ctx.db.insert("expenses", {
      type: args.type,
      category: args.category,
      amount: args.amount,
      description: args.description.trim(),
      paymentMethod: args.paymentMethod,
      date: args.date || now,
      notes: args.notes,
      receiptImage: args.receiptImage,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

// Update an expense
export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("travel"),
      v.literal("food"),
      v.literal("supplies"),
      v.literal("utilities"),
      v.literal("rent"),
      v.literal("salary"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("other"),
    )),
    paymentMethod: v.optional(v.string()),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const expense = await ctx.db.get(id);
    if (!expense) throw new Error("Expense not found");

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return { success: true };
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, { id }) => {
    const expense = await ctx.db.get(id);
    if (!expense) throw new Error("Expense not found");
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Set opening cash balance
export const setOpeningBalance = mutation({
  args: {
    amount: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { amount, userId }) => {
    if (amount < 0) throw new Error("Opening balance cannot be negative");

    const existing = await ctx.db
      .query("financialSettings")
      .withIndex("by_key", (q) => q.eq("key", "opening_cash_balance"))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: amount,
        updatedAt: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("financialSettings", {
        key: "opening_cash_balance",
        value: amount,
        updatedAt: now,
        updatedBy: userId,
      });
    }

    return { success: true, amount };
  },
});

// ==================== QUERIES ====================

// Get opening balance
export const getOpeningBalance = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("financialSettings")
      .withIndex("by_key", (q) => q.eq("key", "opening_cash_balance"))
      .first();
    return record?.value || 0;
  },
});

// List expenses with optional filters
export const getExpenses = query({
  args: {
    type: v.optional(v.union(v.literal("restocking"), v.literal("operational"))),
    category: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, category, startDate, endDate, limit = 100 }) => {
    let expenses;
    if (type) {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_type", (q) => q.eq("type", type))
        .collect();
    } else {
      expenses = await ctx.db.query("expenses").collect();
    }

    // Apply filters
    let filtered = expenses;
    if (category) filtered = filtered.filter(e => e.category === category);
    if (startDate) filtered = filtered.filter(e => e.date >= startDate);
    if (endDate) filtered = filtered.filter(e => e.date <= endDate);

    // Sort by date descending
    filtered.sort((a, b) => b.date - a.date);

    // Enrich with product name if applicable
    const enriched = await Promise.all(
      filtered.slice(0, limit).map(async (e) => {
        let productName: string | undefined;
        if (e.productId) {
          const p = await ctx.db.get(e.productId);
          productName = p?.name;
        }
        return { ...e, productName };
      })
    );

    return enriched;
  },
});

// Get comprehensive P&L summary
export const getFinancialSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const [orders, reservations, expenses, openingBalanceRecord, products] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db
        .query("financialSettings")
        .withIndex("by_key", (q) => q.eq("key", "opening_cash_balance"))
        .first(),
      ctx.db.query("products").collect(),
    ]);

    const openingBalance = openingBalanceRecord?.value || 0;

    // Filter by date range if provided
    const inRange = (ts: number) =>
      (!startDate || ts >= startDate) && (!endDate || ts <= endDate);

    // Revenue only counts what's been ACTUALLY paid.
    // Unpaid/refunded orders don't count toward cash flow or P&L revenue.
    const getAmountCollected = (o: any) => {
      const status = o.paymentStatus || 'unpaid';
      if (status === 'refunded' || status === 'unpaid') return 0;
      if (status === 'partial') return o.amountPaid || 0;
      // 'paid' — if amountPaid set, use that; otherwise full totalAmount
      return o.amountPaid ?? (o.totalAmount || 0);
    };

    const activeOrders = orders.filter(o => o.status !== 'cancelled' && inRange(o.createdAt));
    const completedReservations = reservations.filter(r => r.status === 'completed' && inRange(r.createdAt));

    // PAID revenue = what was actually collected
    const orderRevenue = activeOrders.reduce((s, o) => s + getAmountCollected(o), 0);
    const reservationRevenue = completedReservations.reduce((s, r) => s + getAmountCollected(r), 0);
    const totalRevenue = orderRevenue + reservationRevenue;

    // BILLED = total amount on all non-cancelled orders (for outstanding calc)
    const billedOrders = activeOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const billedReservations = completedReservations.reduce((s, r) => s + (r.totalAmount || 0), 0);

    // Outstanding = billed − paid (only unpaid/partial, excludes refunded)
    const outstandingOrders = activeOrders
      .filter(o => o.paymentStatus !== 'refunded')
      .reduce((s, o) => s + ((o.totalAmount || 0) - getAmountCollected(o)), 0);
    const outstandingReservations = reservations
      .filter(r => r.status !== 'cancelled' && r.status !== 'expired' && r.paymentStatus !== 'refunded' && inRange(r.createdAt))
      .reduce((s, r) => s + ((r.totalAmount || 0) - getAmountCollected(r)), 0);
    const totalOutstanding = outstandingOrders + outstandingReservations;

    // Count orders by payment status
    const paidCount = activeOrders.filter(o => (o.paymentStatus || 'unpaid') === 'paid').length;
    const unpaidCount = activeOrders.filter(o => (o.paymentStatus || 'unpaid') === 'unpaid').length;
    const partialCount = activeOrders.filter(o => o.paymentStatus === 'partial').length;
    const refundedCount = activeOrders.filter(o => o.paymentStatus === 'refunded').length;

    // Revenue by payment method (based on actual amount collected)
    const revenueByPayment: Record<string, number> = {};
    for (const o of activeOrders) {
      const collected = getAmountCollected(o);
      if (collected > 0) {
        const pm = o.paymentMethod || 'unknown';
        revenueByPayment[pm] = (revenueByPayment[pm] || 0) + collected;
      }
    }
    for (const r of completedReservations) {
      const collected = getAmountCollected(r);
      if (collected > 0) {
        const pm = 'reservation';
        revenueByPayment[pm] = (revenueByPayment[pm] || 0) + collected;
      }
    }

    // COGS using product.costPrice × quantity sold — count only paid+partial orders
    const cogsOrders = activeOrders.filter(o => o.paymentStatus !== 'unpaid' && o.paymentStatus !== 'refunded');
    let cogs = 0;
    for (const o of cogsOrders) {
      for (const item of o.items || []) {
        const p = products.find(prod => prod._id === item.productId);
        if (p?.costPrice) cogs += p.costPrice * item.quantity;
      }
    }
    for (const r of completedReservations) {
      if (r.paymentStatus === 'unpaid' || r.paymentStatus === 'refunded') continue;
      if (r.items) {
        for (const item of r.items) {
          const p = products.find(prod => prod._id === item.productId);
          if (p?.costPrice) cogs += p.costPrice * item.quantity;
        }
      }
    }

    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Total discounts given — line-level + order-level across paid/partial transactions
    const discountedOrders = activeOrders.filter(o => o.paymentStatus !== 'unpaid' && o.paymentStatus !== 'refunded');
    let totalLineDiscounts = 0;
    let totalOrderDiscounts = 0;
    for (const o of discountedOrders) {
      for (const item of o.items || []) {
        if (item.discount && item.discount > 0) {
          totalLineDiscounts += item.discount * item.quantity;
        }
      }
      if (o.orderDiscount && o.orderDiscount > 0) {
        totalOrderDiscounts += o.orderDiscount;
      }
    }
    for (const r of completedReservations) {
      if (r.paymentStatus === 'unpaid' || r.paymentStatus === 'refunded') continue;
      for (const item of r.items || []) {
        if (item.discount && item.discount > 0) {
          totalLineDiscounts += item.discount * item.quantity;
        }
      }
      if (r.orderDiscount && r.orderDiscount > 0) {
        totalOrderDiscounts += r.orderDiscount;
      }
    }
    const totalDiscountsGiven = totalLineDiscounts + totalOrderDiscounts;

    // Expenses breakdown
    const filteredExpenses = expenses.filter(e => inRange(e.date));
    const restockingExpenses = filteredExpenses.filter(e => e.type === 'restocking');
    const operationalExpenses = filteredExpenses.filter(e => e.type === 'operational');

    const totalRestockingExpense = restockingExpenses.reduce((s, e) => s + e.amount, 0);
    const totalOperationalExpense = operationalExpenses.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = totalRestockingExpense + totalOperationalExpense;

    // Operational expenses by category
    const operationalByCategory: Record<string, number> = {};
    for (const e of operationalExpenses) {
      const cat = e.category || 'other';
      operationalByCategory[cat] = (operationalByCategory[cat] || 0) + e.amount;
    }

    // Net Profit = Gross Profit − Operational Expenses
    // (Restocking is already reflected in COGS via costPrice)
    const netProfit = grossProfit - totalOperationalExpense;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Cash on hand = opening + cash revenue − cash expenses
    const cashRevenue = (revenueByPayment['cash'] || 0);
    const cashExpenses = filteredExpenses
      .filter(e => e.paymentMethod === 'cash')
      .reduce((s, e) => s + e.amount, 0);
    const cashOnHand = openingBalance + cashRevenue - cashExpenses;

    // Digital (non-cash) balance
    const digitalRevenue = totalRevenue - cashRevenue;
    const digitalExpenses = filteredExpenses
      .filter(e => e.paymentMethod !== 'cash')
      .reduce((s, e) => s + e.amount, 0);
    const digitalBalance = digitalRevenue - digitalExpenses;

    return {
      openingBalance,
      // Revenue (ACTUALLY COLLECTED)
      totalRevenue,
      orderRevenue,
      reservationRevenue,
      revenueByPayment,
      // Billed (total owed — paid + unpaid)
      billedOrders,
      billedReservations,
      // Outstanding (unpaid)
      totalOutstanding,
      outstandingOrders,
      outstandingReservations,
      // Payment counts
      paidCount,
      unpaidCount,
      partialCount,
      refundedCount,
      // Costs
      cogs,
      grossProfit,
      grossMargin: grossMargin.toFixed(1),
      // Discounts given
      totalDiscountsGiven,
      totalLineDiscounts,
      totalOrderDiscounts,
      // Expenses
      totalExpenses,
      totalRestockingExpense,
      totalOperationalExpense,
      operationalByCategory,
      restockingCount: restockingExpenses.length,
      operationalCount: operationalExpenses.length,
      // Net
      netProfit,
      netMargin: netMargin.toFixed(1),
      // Cash flow
      cashOnHand,
      cashRevenue,
      cashExpenses,
      digitalBalance,
      digitalRevenue,
      digitalExpenses,
    };
  },
});
