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
    internalUseCategory?: "treatment" | "display" | "feed" | "loss_prevention" | "other";
  }
) {
  const { productId, quantity, unitCost, notes, userId, internalUseCategory } = args;
  const product = await ctx.db.get(productId);
  if (!product) return null;

  const totalCost = unitCost * quantity;
  if (totalCost <= 0) return null;

  const now = Date.now();
  const reasonLabel = internalUseCategory
    ? ` [${internalUseCategory.replace("_", " ")}]`
    : "";
  const id = await ctx.db.insert("expenses", {
    type: "operational",
    category: "supplies",
    amount: totalCost,
    description: `Internal use${reasonLabel}: ${quantity} × ${product.name}`,
    paymentMethod: "internal",
    date: now,
    productId,
    quantity,
    internalUseCategory,
    notes,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

/**
 * Create a mortality (inventory write-off) expense — called from recordMortalityLossByProduct.
 * Amount = product.costPrice × quantity. Payment method is "internal" (no cash leaves the till).
 * Returns null if costPrice is missing or zero, so old products without cost data don't block
 * mortality recording — they just won't show up on the P&L until costPrice is set.
 */
export async function createMortalityExpenseHelper(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    quantity: number;
    notes?: string;
    userId?: Id<"users">;
  }
) {
  const { productId, quantity, notes, userId } = args;
  const product = await ctx.db.get(productId);
  if (!product) return null;

  // Prefer moving-average cost (per-batch actuals) over the static basis costPrice.
  const unitCost = product.movingAverageCost ?? product.costPrice ?? 0;
  const totalCost = unitCost * quantity;
  if (totalCost <= 0) return null; // skip silently when no cost data

  const now = Date.now();
  const id = await ctx.db.insert("expenses", {
    type: "operational",
    category: "mortality",
    amount: totalCost,
    description: `Mortality write-off: ${quantity} × ${product.name}`,
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
 * Amount = (actualCostPrice ?? product.costPrice) × quantity. Defaults to cash payment.
 * actualCostPrice is the price actually paid for THIS batch and trumps the product's base costPrice.
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
    actualCostPrice?: number;
  }
) {
  const { productId, stockRecordId, quantity, batchCode, userId, paymentMethod = "cash", actualCostPrice } = args;

  const product = await ctx.db.get(productId);
  if (!product) return null;

  // Prefer per-batch actual cost, fall back to product.costPrice
  const unitCost = actualCostPrice !== undefined && actualCostPrice >= 0
    ? actualCostPrice
    : (product.costPrice || 0);
  const totalCost = unitCost * quantity;

  if (totalCost === 0) return null; // skip if no cost data

  const now = Date.now();
  const description = actualCostPrice !== undefined
    ? `Restock: ${quantity} × ${product.name} (${batchCode}) @ ₱${unitCost.toLocaleString('en-PH')}/unit`
    : `Restock: ${quantity} × ${product.name} (${batchCode})`;
  const id = await ctx.db.insert("expenses", {
    type: "restocking",
    amount: totalCost,
    description,
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
      v.literal("investor_remit"),
      v.literal("mortality"),
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
      v.literal("investor_remit"),
      v.literal("mortality"),
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
    const [orders, reservations, expenses, openingBalanceRecord, products, cashAdjustments, stockRecords] =
      await Promise.all([
        ctx.db.query("orders").collect(),
        ctx.db.query("reservations").collect(),
        ctx.db.query("expenses").collect(),
        ctx.db
          .query("financialSettings")
          .withIndex("by_key", (q) => q.eq("key", "opening_cash_balance"))
          .first(),
        ctx.db.query("products").collect(),
        ctx.db.query("cashAdjustments").collect(),
        ctx.db.query("stockRecords").collect(),
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

    // ─── COGS via FIFO batch costing ───
    // Each sold unit is costed against the earliest-RECEIVED batch still holding
    // quantity, at that batch's actual acquisition cost (stockRecords.actualCostPrice).
    // Falls back to moving-average → basis cost for batches with no recorded cost,
    // or for units sold beyond the recorded batch quantity. Counts only paid+partial
    // transactions (revenue-matched), excluding cancelled/unpaid/refunded.
    const fallbackCost = (p?: { movingAverageCost?: number; costPrice?: number }) =>
      p?.movingAverageCost ?? p?.costPrice ?? 0;

    const productMap = new Map(products.map((p) => [p._id as string, p]));

    // Build per-product FIFO queues from purchase lots (exclude mortality write-offs).
    type QueueBatch = { remaining: number; cost: number; received: number };
    const fifoQueues = new Map<string, QueueBatch[]>();
    for (const r of stockRecords) {
      if (r.isMortalityLoss) continue; // write-offs are not purchase lots
      if (r.initialQty <= 0) continue;
      const product = productMap.get(r.productId as string);
      const cost = r.actualCostPrice ?? fallbackCost(product);
      const arr = fifoQueues.get(r.productId as string) ?? [];
      arr.push({ remaining: r.initialQty, cost, received: r.receivedDate });
      fifoQueues.set(r.productId as string, arr);
    }
    for (const arr of fifoQueues.values()) arr.sort((a, b) => a.received - b.received);

    // Replay ALL recognized sales chronologically (even out-of-range) so in-range
    // sales draw from the correct remaining batches; only in-range cost hits COGS.
    type SaleItem = { productId: string; quantity: number; date: number; inRange: boolean };
    const saleItems: SaleItem[] = [];
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      if ((o.paymentStatus || 'unpaid') === 'unpaid' || o.paymentStatus === 'refunded') continue;
      for (const item of o.items || []) {
        saleItems.push({ productId: item.productId as string, quantity: item.quantity, date: o.createdAt, inRange: inRange(o.createdAt) });
      }
    }
    for (const r of reservations) {
      if (r.status !== 'completed') continue;
      if ((r.paymentStatus || 'unpaid') === 'unpaid' || r.paymentStatus === 'refunded') continue;
      for (const item of r.items || []) {
        saleItems.push({ productId: item.productId as string, quantity: item.quantity, date: r.createdAt, inRange: inRange(r.createdAt) });
      }
    }
    saleItems.sort((a, b) => a.date - b.date);

    let cogs = 0;
    for (const sale of saleItems) {
      const queue = fifoQueues.get(sale.productId) ?? [];
      let remaining = sale.quantity;
      let lineCost = 0;
      while (remaining > 0 && queue.length > 0) {
        const head = queue[0];
        const take = Math.min(remaining, head.remaining);
        lineCost += take * head.cost;
        head.remaining -= take;
        remaining -= take;
        if (head.remaining <= 0) queue.shift();
      }
      if (remaining > 0) {
        // Queue exhausted (sold beyond recorded lots) — cost the remainder at fallback.
        lineCost += remaining * fallbackCost(productMap.get(sale.productId));
      }
      if (sale.inRange) cogs += lineCost;
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

    // Total restock cost — AUDIT ONLY. Restocking is funded by capital and expensed through
    // COGS (FIFO) as units sell, so it is never deducted from Cash on Hand or Net Profit here.
    // Derived from the stock batches themselves (qty × actual/fallback cost), received in range.
    const totalRestockCost = stockRecords
      .filter((r) => !r.isMortalityLoss && r.isRestock && inRange(r.receivedDate))
      .reduce((s, r) => s + r.initialQty * (r.actualCostPrice ?? fallbackCost(productMap.get(r.productId as string))), 0);

    // Operational expenses by category
    const operationalByCategory: Record<string, number> = {};
    for (const e of operationalExpenses) {
      const cat = e.category || 'other';
      operationalByCategory[cat] = (operationalByCategory[cat] || 0) + e.amount;
    }

    // Net Profit = Gross Profit − Operational Expenses
    // (Restocking is already reflected in COGS via FIFO batch costing, so it's not
    //  subtracted again here — that would double-count the cost of inventory.)
    const netProfit = grossProfit - totalOperationalExpense;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Cash on hand = opening + cash revenue − cash OPERATIONAL expenses + cash adjustments (signed).
    // Restocking is excluded — inventory purchases don't reduce the operating till (audit-only).
    const cashRevenue = (revenueByPayment['cash'] || 0);
    const cashExpenses = filteredExpenses
      .filter(e => e.paymentMethod === 'cash' && e.type !== 'restocking')
      .reduce((s, e) => s + e.amount, 0);
    const filteredAdjustments = cashAdjustments.filter((a) => inRange(a.date));
    const cashAdjustmentsTotal = filteredAdjustments.reduce((s, a) => s + a.amount, 0);
    // Break down for the UI (so we can show "+ injections" and "− withdrawals" separately).
    const cashInjections = filteredAdjustments
      .filter((a) => a.amount > 0)
      .reduce((s, a) => s + a.amount, 0);
    const cashWithdrawals = filteredAdjustments
      .filter((a) => a.amount < 0)
      .reduce((s, a) => s + Math.abs(a.amount), 0);
    // Investor deposits (injections) are CAPITAL — audited in the Cash Flow report but they
    // do NOT inflate the operating till. Only remittances (withdrawals) and reconciling
    // corrections move Cash on Hand.
    const cashAdjustmentsEffect = filteredAdjustments
      .filter((a) => a.type !== "injection")
      .reduce((s, a) => s + a.amount, 0);
    const cashOnHand = openingBalance + cashRevenue - cashExpenses + cashAdjustmentsEffect;

    // Digital (non-cash) balance
    const digitalRevenue = totalRevenue - cashRevenue;
    const digitalExpenses = filteredExpenses
      .filter(e => e.paymentMethod !== 'cash' && e.type !== 'restocking')
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
      cogsMethod: 'fifo' as const,
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
      totalRestockCost, // audit only — not deducted anywhere
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
      cashAdjustmentsTotal,
      cashInjections,
      cashWithdrawals,
      digitalBalance,
      digitalRevenue,
      digitalExpenses,
    };
  },
});

// Revenue actually collected on a transaction (shared rule with the P&L summary).
// Unpaid/refunded = 0; partial = amountPaid; paid = amountPaid ?? totalAmount.
function amountCollected(o: { paymentStatus?: string; amountPaid?: number; totalAmount?: number }) {
  const status = o.paymentStatus || "unpaid";
  if (status === "refunded" || status === "unpaid") return 0;
  if (status === "partial") return o.amountPaid || 0;
  return o.amountPaid ?? (o.totalAmount || 0);
}

/**
 * General daily report — one row per calendar day:
 *   Date · Total Sales (collected) · Total Expense (all) · Total Daily (sales − expense)
 *
 * "Sales" = revenue actually collected on non-cancelled orders + completed reservations
 * (same recognition as the P&L). "Expense" = every expense dated that day (restocking +
 * operational). Days are bucketed by the caller's timezone (tzOffsetMinutes from
 * Date.getTimezoneOffset(); defaults to Philippine time, UTC+8). Each row carries the
 * exact epoch [startMs, endMs] for that local day so the detail view can re-query precisely.
 */
export const getDailySalesReport = query({
  args: {
    tzOffsetMinutes: v.optional(v.number()), // Date.getTimezoneOffset(): minutes behind UTC (PH = -480)
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tzOffsetMinutes = -480, startDate, endDate, limit = 370 }) => {
    const [orders, reservations, expenses] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
      ctx.db.query("expenses").collect(),
    ]);

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const offMs = tzOffsetMinutes * 60 * 1000;
    const inRange = (ts: number) => (!startDate || ts >= startDate) && (!endDate || ts <= endDate);
    // Local-day index: shift by tz so day boundaries fall on local midnight.
    const dayIndex = (ts: number) => Math.floor((ts - offMs) / DAY_MS);

    type Bucket = { sales: number; expense: number; transactions: number; itemsSold: number };
    const buckets = new Map<number, Bucket>();
    const bucket = (k: number) =>
      buckets.get(k) ?? buckets.set(k, { sales: 0, expense: 0, transactions: 0, itemsSold: 0 }).get(k)!;

    for (const o of orders) {
      if (o.status === "cancelled" || !inRange(o.createdAt)) continue;
      const collected = amountCollected(o);
      if (collected <= 0) continue;
      const b = bucket(dayIndex(o.createdAt));
      b.sales += collected;
      b.transactions += 1;
      for (const item of o.items || []) b.itemsSold += item.quantity;
    }
    for (const r of reservations) {
      if (r.status !== "completed" || !inRange(r.createdAt)) continue;
      const collected = amountCollected(r);
      if (collected <= 0) continue;
      const b = bucket(dayIndex(r.createdAt));
      b.sales += collected;
      b.transactions += 1;
      if (r.items && r.items.length > 0) {
        for (const item of r.items) b.itemsSold += item.quantity;
      } else if (r.quantity) {
        b.itemsSold += r.quantity;
      }
    }
    for (const e of expenses) {
      // Restocking is excluded — it's funded by capital, not an operating cash expense.
      if (!inRange(e.date) || e.type === "restocking") continue;
      bucket(dayIndex(e.date)).expense += e.amount;
    }

    // Emit a row for EVERY day in the window — including zero-activity days — so the
    // report reads like a continuous end-of-day log. Bounds: the filtered range if set,
    // otherwise from the earliest record to today. Future days are never enumerated.
    let loTs = startDate;
    if (loTs === undefined) {
      let earliest = Infinity;
      for (const o of orders) earliest = Math.min(earliest, o.createdAt);
      for (const r of reservations) earliest = Math.min(earliest, r.createdAt);
      for (const e of expenses) earliest = Math.min(earliest, e.date);
      loTs = Number.isFinite(earliest) ? earliest : now;
    }
    let hiTs = endDate ?? now;
    if (hiTs > now) hiTs = now; // don't list future empty days

    const loDay = dayIndex(loTs);
    const hiDay = dayIndex(hiTs);

    const dayKeys = new Set<number>();
    for (let k = loDay; k <= hiDay; k++) dayKeys.add(k);
    for (const k of buckets.keys()) dayKeys.add(k); // include any out-of-bound days with data

    const rows = Array.from(dayKeys)
      .map((k) => {
        const b = buckets.get(k) ?? { sales: 0, expense: 0, transactions: 0, itemsSold: 0 };
        const startMs = k * DAY_MS + offMs;       // real epoch of local midnight
        const endMs = startMs + DAY_MS - 1;
        const dateKey = new Date(k * DAY_MS).toISOString().slice(0, 10); // YYYY-MM-DD (local calendar)
        return {
          dateKey,
          startMs,
          endMs,
          totalSales: b.sales,
          totalExpense: b.expense,
          netDaily: b.sales - b.expense,
          transactions: b.transactions,
          itemsSold: b.itemsSold,
        };
      })
      .sort((a, b) => b.startMs - a.startMs)
      .slice(0, limit);

    const summary = {
      dayCount: rows.length,
      totalSales: rows.reduce((s, r) => s + r.totalSales, 0),
      totalExpense: rows.reduce((s, r) => s + r.totalExpense, 0),
      netTotal: rows.reduce((s, r) => s + r.netDaily, 0),
    };

    return { rows, summary };
  },
});

/**
 * Daily report detail — the items sold within an exact [startDate, endDate] window
 * (pass a single day's startMs/endMs from getDailySalesReport), plus that day's
 * expenses. Per-product units / revenue / FIFO gross profit use the same recognition
 * and batch-costing as the P&L, so the detail ties out with the General Report row.
 */
export const getDailyReportDetail = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const [orders, reservations, expenses, products, stockRecords, categories] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("categories").collect(),
    ]);

    const inRange = (ts: number) => ts >= startDate && ts <= endDate;
    const categoryMap = new Map(categories.map((c) => [c._id as string, c.name]));
    const productMap = new Map(products.map((p) => [p._id as string, p]));
    const fallbackCost = (p?: { movingAverageCost?: number; costPrice?: number }) =>
      p?.movingAverageCost ?? p?.costPrice ?? 0;

    // FIFO purchase lots (exclude mortality write-offs), oldest received first.
    type Lot = { remaining: number; cost: number; received: number };
    const fifoQueues = new Map<string, Lot[]>();
    for (const r of stockRecords) {
      if (r.isMortalityLoss || r.initialQty <= 0) continue;
      const pid = r.productId as string;
      const cost = r.actualCostPrice ?? fallbackCost(productMap.get(pid));
      const arr = fifoQueues.get(pid) ?? [];
      arr.push({ remaining: r.initialQty, cost, received: r.receivedDate });
      fifoQueues.set(pid, arr);
    }
    for (const arr of fifoQueues.values()) arr.sort((a, b) => a.received - b.received);

    // Recognized sale lines (paid/partial orders + completed reservations), chronological.
    type SaleLine = { productId: string; quantity: number; revenue: number; date: number };
    const saleLines: SaleLine[] = [];
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      if ((o.paymentStatus || "unpaid") === "unpaid" || o.paymentStatus === "refunded") continue;
      for (const item of o.items || []) {
        saleLines.push({ productId: item.productId as string, quantity: item.quantity, revenue: item.price * item.quantity, date: o.createdAt });
      }
    }
    for (const r of reservations) {
      if (r.status !== "completed") continue;
      if ((r.paymentStatus || "unpaid") === "unpaid" || r.paymentStatus === "refunded") continue;
      if (r.items && r.items.length > 0) {
        for (const item of r.items) {
          saleLines.push({ productId: item.productId as string, quantity: item.quantity, revenue: item.reservedPrice * item.quantity, date: r.createdAt });
        }
      } else if (r.productId && r.quantity) {
        const p = productMap.get(r.productId as string);
        saleLines.push({ productId: r.productId as string, quantity: r.quantity, revenue: (p?.price ?? 0) * r.quantity, date: r.createdAt });
      }
    }
    saleLines.sort((a, b) => a.date - b.date);

    type Acc = { units: number; revenue: number; cogs: number };
    const acc = new Map<string, Acc>();
    const getAcc = (pid: string) => acc.get(pid) ?? acc.set(pid, { units: 0, revenue: 0, cogs: 0 }).get(pid)!;

    for (const line of saleLines) {
      // Always consume the queue (even out-of-range) so in-range lines draw correct lots.
      const queue = fifoQueues.get(line.productId) ?? [];
      let remaining = line.quantity;
      let lineCost = 0;
      while (remaining > 0 && queue.length > 0) {
        const head = queue[0];
        const take = Math.min(remaining, head.remaining);
        lineCost += take * head.cost;
        head.remaining -= take;
        remaining -= take;
        if (head.remaining <= 0) queue.shift();
      }
      if (remaining > 0) lineCost += remaining * fallbackCost(productMap.get(line.productId));

      if (!inRange(line.date)) continue;
      const a = getAcc(line.productId);
      a.units += line.quantity;
      a.revenue += line.revenue;
      a.cogs += lineCost;
    }

    const items = Array.from(acc.entries())
      .map(([pid, a]) => {
        const p = productMap.get(pid);
        const grossProfit = a.revenue - a.cogs;
        return {
          id: pid,
          name: p?.name ?? "Unknown product",
          image: p?.image || null,
          category: p ? categoryMap.get(p.categoryId as string) || "Uncategorized" : "Uncategorized",
          unitsSold: a.units,
          revenue: a.revenue,
          cogs: a.cogs,
          grossProfit,
          margin: a.revenue > 0 ? (grossProfit / a.revenue) * 100 : 0,
        };
      })
      .sort((x, y) => y.revenue - x.revenue);

    // Expenses dated within the day, newest first (operational only — restock is excluded).
    const dayExpenses = expenses
      .filter((e) => inRange(e.date) && e.type !== "restocking")
      .sort((a, b) => b.date - a.date)
      .map((e) => ({
        id: e._id as string,
        type: e.type,
        category: e.category ?? null,
        amount: e.amount,
        description: e.description,
        paymentMethod: e.paymentMethod,
        date: e.date,
      }));

    // Headline sales = collected (ties out with the General Report row).
    let totalCollected = 0;
    for (const o of orders) {
      if (o.status === "cancelled" || !inRange(o.createdAt)) continue;
      totalCollected += amountCollected(o);
    }
    for (const r of reservations) {
      if (r.status !== "completed" || !inRange(r.createdAt)) continue;
      totalCollected += amountCollected(r);
    }

    const itemsRevenue = items.reduce((s, i) => s + i.revenue, 0);
    const totalCogs = items.reduce((s, i) => s + i.cogs, 0);
    const totalExpense = dayExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      startDate,
      endDate,
      items,
      expenses: dayExpenses,
      totals: {
        totalSales: totalCollected,
        itemsRevenue,
        unitsSold: items.reduce((s, i) => s + i.unitsSold, 0),
        cogs: totalCogs,
        grossProfit: itemsRevenue - totalCogs,
        totalExpense,
        netDaily: totalCollected - totalExpense,
      },
    };
  },
});
