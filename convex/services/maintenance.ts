import { internalMutation } from "../_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 500;

/**
 * Daily housekeeping (scheduled in convex/crons.ts):
 *  - loginAttempts rows untouched for a day (every throttle window/lock is ≤ 1 hour)
 *  - sessions that expired or were revoked more than 7 days ago
 * Deletes in bounded batches; leftovers are picked up on the next run.
 */
export const cleanupAuthTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    let attempts = 0;
    for (const row of await ctx.db.query("loginAttempts").take(BATCH)) {
      if (row.updatedAt < now - DAY_MS && (!row.lockedUntil || row.lockedUntil < now)) {
        await ctx.db.delete(row._id);
        attempts++;
      }
    }

    let sessions = 0;
    for (const s of await ctx.db.query("sessions").take(BATCH)) {
      const deadAt = Math.min(s.expiresAt, s.revokedAt ?? Infinity);
      if (deadAt < now - 7 * DAY_MS) {
        await ctx.db.delete(s._id);
        sessions++;
      }
    }

    return { attempts, sessions };
  },
});
