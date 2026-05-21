import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Password verifier — mirrors convex/services/auth.ts so corrections can require re-auth.
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function legacyHashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString() + password.length.toString();
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Legacy hashes don't contain ":"
  if (!storedHash.includes(":")) {
    return legacyHashPassword(password) === storedHash;
  }
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  return (await sha256(salt + password)) === hash;
}

/**
 * Create a cash-on-hand adjustment.
 *
 * - "deposit": ADDS to COH (owner capital, drawer float top-up, found cash). Amount must be > 0.
 * - "remit": REMOVES from COH (owner draw, investor remittance, bank-out). Amount must be > 0
 *   (sign is applied here). Use the dedicated investor_remit expense category if you want it on
 *   the P&L operational expense side as well.
 * - "correction": signed amount for cash-count reconciliation. Requires the operator's password
 *   and a reason, since corrections can mask discrepancies.
 *
 * Stored `amount` is always signed so the P&L summary just sums it.
 */
export const createCashAdjustment = mutation({
  args: {
    type: v.union(
      v.literal("deposit"),
      v.literal("remit"),
      v.literal("correction"),
      // Back-compat with the previous names — accepted but treated as their new equivalents.
      v.literal("injection"),
      v.literal("withdrawal"),
    ),
    amount: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    date: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    // Only required when type === "correction": the operator re-types their password.
    password: v.optional(v.string()),
  },
  handler: async (ctx, { type, amount, reason, notes, date, userId, password }) => {
    if (!reason.trim()) throw new Error("Reason is required");
    if (amount === 0) throw new Error("Amount must not be zero");

    // Normalize legacy type names
    const normalized: "deposit" | "remit" | "correction" =
      type === "injection" ? "deposit" : type === "withdrawal" ? "remit" : type;

    let signedAmount: number;
    if (normalized === "deposit") {
      if (amount < 0) throw new Error("Deposit amount must be positive");
      signedAmount = Math.abs(amount);
    } else if (normalized === "remit") {
      if (amount < 0) throw new Error("Use a positive amount for remittances");
      signedAmount = -Math.abs(amount);
    } else {
      // correction — signed as provided
      signedAmount = amount;
    }

    // Corrections require a password re-confirmation against the recording user.
    if (normalized === "correction") {
      if (!userId) {
        throw new Error("Sign in to record a correction");
      }
      if (reason.trim().length < 10) {
        throw new Error("Reason must be at least 10 characters for corrections");
      }
      if (!password || !password.trim()) {
        throw new Error("Password required to confirm a correction");
      }
      const user = await ctx.db.get(userId);
      if (!user) throw new Error("User not found");
      if (!user.passwordHash) {
        throw new Error("This account has no password set — corrections are blocked");
      }
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) throw new Error("Incorrect password");
    }

    const now = Date.now();
    const id = await ctx.db.insert("cashAdjustments", {
      // Persist using the original schema enum values
      type:
        normalized === "deposit"
          ? "injection"
          : normalized === "remit"
          ? "withdrawal"
          : "correction",
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
