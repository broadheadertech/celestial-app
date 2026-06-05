import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { recordAudit } from "./audit";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      v.literal("commissions"),
      v.literal("mortality"),
      v.literal("other"),
    )),
    amount: v.number(),
    description: v.string(),
    paymentMethod: v.string(),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    receiptImage: v.optional(v.string()),
    fundingSource: v.optional(v.union(v.literal("coh"), v.literal("investment"))),
    supplier: v.optional(v.string()),
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
      fundingSource: args.fundingSource,
      supplier: args.supplier?.trim() || undefined,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    await recordAudit(ctx, {
      actorId: args.userId,
      action: "expense.create",
      category: "finance",
      summary: `Added ${args.type} expense ${peso(args.amount)} — ${args.description.trim()}`,
      entityTable: "expenses",
      entityId: id,
      amount: args.amount,
      metadata: { category: args.category, paymentMethod: args.paymentMethod, fundingSource: args.fundingSource },
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
      v.literal("commissions"),
      v.literal("mortality"),
      v.literal("other"),
    )),
    paymentMethod: v.optional(v.string()),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    fundingSource: v.optional(v.union(v.literal("coh"), v.literal("investment"))),
    supplier: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { id, userId, ...updates }) => {
    const expense = await ctx.db.get(id);
    if (!expense) throw new Error("Expense not found");

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    await recordAudit(ctx, {
      actorId: userId,
      action: "expense.update",
      category: "finance",
      summary: `Edited expense — ${updates.description ?? expense.description}${updates.amount !== undefined ? ` (now ${peso(updates.amount)})` : ""}`,
      entityTable: "expenses",
      entityId: id,
      amount: updates.amount ?? expense.amount,
      metadata: { before: { amount: expense.amount, description: expense.description, category: expense.category }, changes: updates },
    });
    return { success: true };
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: { id: v.id("expenses"), userId: v.optional(v.id("users")) },
  handler: async (ctx, { id, userId }) => {
    const expense = await ctx.db.get(id);
    if (!expense) throw new Error("Expense not found");
    await ctx.db.delete(id);

    await recordAudit(ctx, {
      actorId: userId,
      action: "expense.delete",
      category: "finance",
      summary: `Deleted ${expense.type} expense ${peso(expense.amount)} — ${expense.description}`,
      entityTable: "expenses",
      entityId: id,
      amount: expense.amount,
      metadata: { deleted: { amount: expense.amount, description: expense.description, category: expense.category, paymentMethod: expense.paymentMethod } },
    });
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

    await recordAudit(ctx, {
      actorId: userId,
      action: "finance.opening_balance",
      category: "finance",
      summary: `Set opening cash balance to ${peso(amount)}`,
      entityTable: "financialSettings",
      amount,
    });

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
    const [orders, reservations, expenses, openingBalanceRecord, products, cashAdjustments, stockRecords, reservationPayments] =
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
        ctx.db.query("reservationPayments").collect(),
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

    // Expenses breakdown — operating expenses only. Restock is NOT a P&L expense (it's inventory
    // buying; the cost hits profit via COGS when it sells), so it's handled separately below.
    const filteredExpenses = expenses.filter(e => inRange(e.date));
    const operationalExpenses = filteredExpenses.filter(e => e.type === 'operational');
    const totalOperationalExpense = operationalExpenses.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = totalOperationalExpense;

    // Restock — declared on stock batches received in range, split by funding source.
    // COH-funded reduces Cash on Hand (below); investment-funded is declaration-only. Never P&L.
    const batchCost = (r: { initialQty: number; actualCostPrice?: number; productId: string }) =>
      r.initialQty * (r.actualCostPrice ?? fallbackCost(productMap.get(r.productId)));
    const restockBatches = stockRecords.filter(
      (r) =>
        !r.isMortalityLoss &&
        r.isRestock &&
        inRange(r.receivedDate) &&
        (r.fundingSource === "coh" || r.fundingSource === "investment"),
    );
    const totalRestockCost = restockBatches.reduce((s, r) => s + batchCost(r as any), 0);
    const restockFromCOH = restockBatches
      .filter((r) => r.fundingSource === "coh")
      .reduce((s, r) => s + batchCost(r as any), 0);
    const restockFromInvestment = restockBatches
      .filter((r) => r.fundingSource === "investment")
      .reduce((s, r) => s + batchCost(r as any), 0);
    const restockCount = restockBatches.length;

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
    // Operating cash expenses exclude restocking — a restock's COH impact is handled explicitly
    // below by funding source (COH-funded reduces the till; investment-funded does not).
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
    // Reservation cash collected (deposits + partials + balance settlements) from the
    // payment ledger, recognized at each payment's own date. Only cash-method entries
    // move the till; refund entries are negative and net themselves out. This is the
    // money that reservation revenueByPayment['reservation'] never accounted for, so it's
    // added as its own COH term (kept out of cashRevenue to preserve the digital/cash split).
    const reservationCashCollected = reservationPayments
      .filter((p) => p.method === "cash" && inRange(p.date))
      .reduce((s, p) => s + p.amount, 0);

    // COH-funded restock reduces the till; investment-funded restock is declaration-only.
    const cashOnHand = openingBalance + cashRevenue + reservationCashCollected - cashExpenses - restockFromCOH + cashAdjustmentsEffect;

    // ─── Reservation collections (lifetime, all non-cancelled) ───
    // Powers the P&L "Reservation Collections" card: total money actually collected vs
    // total money owed across every reservation that wasn't cancelled. amountPaid is the
    // cached ledger sum, so this counts every payment method (not just cash).
    const collectionReservations = reservations.filter((r) => r.status !== "cancelled");
    const collectionsCollected = collectionReservations.reduce((s, r) => s + (r.amountPaid || 0), 0);
    const collectionsToCollect = collectionReservations.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const collectionsOutstanding = Math.max(0, collectionsToCollect - collectionsCollected);
    const collectionsRate = collectionsToCollect > 0 ? (collectionsCollected / collectionsToCollect) * 100 : 0;

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
      totalOperationalExpense,
      // Restock (from stock batches)
      totalRestockCost,       // total restock spend
      restockFromCOH,         // reduced Cash on Hand
      restockFromInvestment,  // declaration-only (no balance moved)
      restockCount,
      // Back-compat aliases for older deployed bundles (renamed fields).
      totalRestockingExpense: totalRestockCost,
      restockingCount: restockCount,
      operationalByCategory,
      operationalCount: operationalExpenses.length,
      // Net
      netProfit,
      netMargin: netMargin.toFixed(1),
      // Cash flow
      cashOnHand,
      cashRevenue,
      reservationCashCollected,
      cashExpenses,
      cashAdjustmentsTotal,
      // Reservation collections (lifetime, all non-cancelled) — for the P&L collections card
      collectionsCollected,
      collectionsToCollect,
      collectionsOutstanding,
      collectionsRate: collectionsRate.toFixed(1),
      collectionsCount: collectionReservations.length,
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
    const [orders, reservations, expenses, cashAdjustments, openingRecord, stockRecords, products, reservationPayments] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("reservations").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("cashAdjustments").collect(),
      ctx.db.query("financialSettings").withIndex("by_key", (q) => q.eq("key", "opening_cash_balance")).first(),
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("reservationPayments").collect(),
    ]);
    const openingBalance = openingRecord?.value || 0;
    const productMap = new Map(products.map((p) => [p._id as string, p]));
    const fallbackUnitCost = (pid: string) => {
      const p = productMap.get(pid);
      return p?.movingAverageCost ?? p?.costPrice ?? 0;
    };

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
      // Restocking-type expenses are excluded here (inventory buying, not operating).
      if (!inRange(e.date) || e.type === "restocking") continue;
      bucket(dayIndex(e.date)).expense += e.amount;
    }
    // A restock funded from the Till is real cash out of the day — count it as a daily expense.
    // (Investment-funded restock doesn't touch the till, so it's not counted here.)
    for (const r of stockRecords) {
      if (r.isRestock && !r.isMortalityLoss && r.fundingSource === "coh" && inRange(r.receivedDate)) {
        const cost = r.initialQty * (r.actualCostPrice ?? fallbackUnitCost(r.productId as string));
        if (cost) bucket(dayIndex(r.receivedDate)).expense += cost;
      }
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

    // ── Running End-of-Day Cash on Hand ──
    // Mirrors the Finance COH formula, accumulated over ALL history (not just the filtered
    // window) so each day shows the real till balance at its close. Signed cash impacts:
    //  + cash sales collected (orders paid by cash)   − cash operating expenses
    //  − restock funded from the till                 ± cash adjustments (excl. investor injections)
    const cashEvents: { date: number; amt: number }[] = [];
    for (const o of orders) {
      if (o.status === "cancelled" || o.paymentMethod !== "cash") continue;
      const c = amountCollected(o);
      if (c) cashEvents.push({ date: o.createdAt, amt: c });
    }
    for (const e of expenses) {
      // Operating cash expenses only (restock is a stock batch, handled below).
      if (e.type !== "restocking" && e.paymentMethod === "cash") {
        cashEvents.push({ date: e.date, amt: -e.amount });
      }
    }
    for (const r of stockRecords) {
      // Restock funded from the Till reduces COH; investment-funded does not.
      if (r.isRestock && !r.isMortalityLoss && r.fundingSource === "coh") {
        const cost = r.initialQty * (r.actualCostPrice ?? fallbackUnitCost(r.productId as string));
        if (cost) cashEvents.push({ date: r.receivedDate, amt: -cost });
      }
    }
    for (const a of cashAdjustments) {
      if (a.type !== "injection") cashEvents.push({ date: a.date, amt: a.amount });
    }
    // Reservation cash payments (deposits/partials/balance) land in the till at their own
    // payment date — independent of when the reservation completes. Cash method only.
    for (const p of reservationPayments) {
      if (p.method === "cash") cashEvents.push({ date: p.date, amt: p.amount });
    }
    const eodCOH = (endMs: number) =>
      openingBalance + cashEvents.reduce((s, ev) => (ev.date <= endMs ? s + ev.amt : s), 0);

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
          eodCOH: eodCOH(endMs),
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

    // Expenses dated within the day, newest first. Operating expenses, plus COH-funded
    // restocks (real cash out of the till that day). Investment-funded restock is excluded.
    const operatingDayExpenses = expenses
      .filter((e) => inRange(e.date) && e.type !== "restocking")
      .map((e) => ({
        id: e._id as string,
        type: e.type as string,
        category: e.category ?? null,
        amount: e.amount,
        description: e.description,
        paymentMethod: e.paymentMethod,
        date: e.date,
      }));
    const cohRestockExpenses = stockRecords
      .filter((r) => r.isRestock && !r.isMortalityLoss && r.fundingSource === "coh" && inRange(r.receivedDate))
      .map((r) => {
        const p = productMap.get(r.productId as string);
        const unitCost = r.actualCostPrice ?? fallbackCost(p);
        return {
          id: r._id as string,
          type: "restocking",
          category: "restock" as string | null,
          amount: r.initialQty * unitCost,
          description: `Restock (Till): ${r.initialQty} × ${p?.name ?? "product"}${r.supplier ? ` · ${r.supplier}` : ""}`,
          paymentMethod: "cash",
          date: r.receivedDate,
        };
      });
    const dayExpenses = [...operatingDayExpenses, ...cohRestockExpenses].sort((a, b) => b.date - a.date);

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

/**
 * Stock Flow — per-day report of inventory purchasing declared via the "Restock / Reroll"
 * expense, split by funding source: stocked via COH (cash from the till) vs via Investment
 * (investor capital). Mirrors the Cash Flow report; zero-activity days are included. Only
 * tagged reroll declarations are counted.
 */
export const getStockFlowReport = query({
  args: {
    tzOffsetMinutes: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tzOffsetMinutes = -480, startDate, endDate, limit = 370 }) => {
    const [stockRecords, products] = await Promise.all([
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("products").collect(),
    ]);
    const productMap = new Map(products.map((p) => [p._id as string, p]));
    const fallbackCost = (pid: string) => {
      const p = productMap.get(pid);
      return p?.movingAverageCost ?? p?.costPrice ?? 0;
    };

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const offMs = tzOffsetMinutes * 60 * 1000;
    const inRange = (ts: number) => (!startDate || ts >= startDate) && (!endDate || ts <= endDate);
    const dayIndex = (ts: number) => Math.floor((ts - offMs) / DAY_MS);

    // Tagged restock batches only.
    const batches = stockRecords.filter(
      (r) => r.isRestock && !r.isMortalityLoss && (r.fundingSource === "coh" || r.fundingSource === "investment"),
    );
    const batchCost = (r: any) => r.initialQty * (r.actualCostPrice ?? fallbackCost(r.productId as string));

    type Bucket = { viaCOH: number; viaInvestment: number; count: number; suppliers: Set<string> };
    const buckets = new Map<number, Bucket>();
    const bucket = (k: number) =>
      buckets.get(k) ?? buckets.set(k, { viaCOH: 0, viaInvestment: 0, count: 0, suppliers: new Set<string>() }).get(k)!;

    for (const r of batches) {
      if (!inRange(r.receivedDate)) continue;
      const b = bucket(dayIndex(r.receivedDate));
      b.count += 1;
      if (r.fundingSource === "coh") b.viaCOH += batchCost(r);
      else b.viaInvestment += batchCost(r);
      if (r.supplier && r.supplier.trim()) b.suppliers.add(r.supplier.trim());
    }

    // Gap-fill every day in the window (filtered range, else earliest restock → today).
    let loTs = startDate;
    if (loTs === undefined) {
      let earliest = Infinity;
      for (const r of batches) earliest = Math.min(earliest, r.receivedDate);
      loTs = Number.isFinite(earliest) ? earliest : now;
    }
    let hiTs = endDate ?? now;
    if (hiTs > now) hiTs = now;
    const loDay = dayIndex(loTs);
    const hiDay = dayIndex(hiTs);
    const dayKeys = new Set<number>();
    for (let k = loDay; k <= hiDay; k++) dayKeys.add(k);
    for (const k of buckets.keys()) dayKeys.add(k);

    const rows = Array.from(dayKeys)
      .map((k) => {
        const b = buckets.get(k) ?? { viaCOH: 0, viaInvestment: 0, count: 0, suppliers: new Set<string>() };
        const startMs = k * DAY_MS + offMs;
        const endMs = startMs + DAY_MS - 1;
        const dateKey = new Date(k * DAY_MS).toISOString().slice(0, 10);
        return {
          dateKey,
          startMs,
          endMs,
          viaCOH: b.viaCOH,
          viaInvestment: b.viaInvestment,
          total: b.viaCOH + b.viaInvestment,
          count: b.count,
          suppliers: Array.from(b.suppliers),
        };
      })
      .sort((a, b) => b.startMs - a.startMs)
      .slice(0, limit);

    const summary = {
      dayCount: rows.length,
      viaCOH: rows.reduce((s, r) => s + r.viaCOH, 0),
      viaInvestment: rows.reduce((s, r) => s + r.viaInvestment, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    };

    return { rows, summary };
  },
});

/**
 * Stock Flow detail — the individual restock batches in a day window, for the drilldown.
 */
export const getStockFlowDetail = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const [stockRecords, products] = await Promise.all([
      ctx.db.query("stockRecords").collect(),
      ctx.db.query("products").collect(),
    ]);
    const productMap = new Map(products.map((p) => [p._id as string, p]));
    const fallbackCost = (pid: string) => {
      const p = productMap.get(pid);
      return p?.movingAverageCost ?? p?.costPrice ?? 0;
    };
    const inRange = (ts: number) => ts >= startDate && ts <= endDate;

    const items = stockRecords
      .filter(
        (r) =>
          r.isRestock &&
          !r.isMortalityLoss &&
          (r.fundingSource === "coh" || r.fundingSource === "investment") &&
          inRange(r.receivedDate),
      )
      .map((r) => {
        const p = productMap.get(r.productId as string);
        const unitCost = r.actualCostPrice ?? fallbackCost(r.productId as string);
        return {
          id: r._id as string,
          description: `${r.initialQty} × ${p?.name ?? "Unknown product"}`,
          productName: p?.name ?? "Unknown product",
          image: p?.image || null,
          quantity: r.initialQty,
          unitCost,
          amount: r.initialQty * unitCost,
          source: r.fundingSource as "coh" | "investment",
          supplier: r.supplier ?? null,
          batchCode: r.batchCode,
          date: r.receivedDate,
        };
      })
      .sort((a, b) => b.date - a.date);

    const viaCOH = items.filter((i) => i.source === "coh").reduce((s, i) => s + i.amount, 0);
    const viaInvestment = items.filter((i) => i.source === "investment").reduce((s, i) => s + i.amount, 0);

    return { startDate, endDate, items, totals: { viaCOH, viaInvestment, total: viaCOH + viaInvestment } };
  },
});
