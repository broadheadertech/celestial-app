import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a cash-on-hand adjustment.
 *
 * - "injection": ADDS to COH (owner capital, drawer float top-up, found cash). Amount must be > 0.
 * - "withdrawal": REMOVES from COH (owner draw, bank-out). Amount must be > 0 (sign applied here).
 * - "correction": signed amount (positive or negative) for cash-count reconciliation.
 *
 * The stored `amount` is always signed so the P&L summary can just sum it.
 */
export const createCashAdjustment = mutation({
  args: {
    type: v.union(
      v.literal("injection"),
      v.literal("withdrawal"),
      v.literal("correction"),
    ),
    amount: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    date: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { type, amount, reason, notes, date, userId }) => {
    if (!reason.trim()) throw new Error("Reason is required");
    if (amount === 0) throw new Error("Amount must not be zero");

    let signedAmount: number;
    if (type === "injection") {
      if (amount < 0) throw new Error("Injection amount must be positive");
      signedAmount = Math.abs(amount);
    } else if (type === "withdrawal") {
      if (amount < 0) throw new Error("Use a positive amount for withdrawals");
      signedAmount = -Math.abs(amount);
    } else {
      // correction — signed as provided
      signedAmount = amount;
    }

    const now = Date.now();
    const id = await ctx.db.insert("cashAdjustments", {
      type,
      amount: signedAmount,
      reason: reason.trim(),
      notes: notes?.trim() || undefined,
      date: date || now,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id, signedAmount };
  },
});

// List adjustments with optional date range + type filter.
export const getCashAdjustments = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("injection"),
        v.literal("withdrawal"),
        v.literal("correction"),
      ),
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, startDate, endDate, limit = 100 }) => {
    const all = type
      ? await ctx.db.query("cashAdjustments").withIndex("by_type", (q) => q.eq("type", type)).collect()
      : await ctx.db.query("cashAdjustments").collect();
    let filtered = all;
    if (startDate) filtered = filtered.filter((a) => a.date >= startDate);
    if (endDate) filtered = filtered.filter((a) => a.date <= endDate);
    return filtered.sort((a, b) => b.date - a.date).slice(0, limit);
  },
});

// Delete an adjustment (mistakes happen). Audit trail removed too — keep a notes log if you need history.
export const deleteCashAdjustment = mutation({
  args: { id: v.id("cashAdjustments") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Adjustment not found");
    await ctx.db.delete(id);
    return { success: true };
  },
});
