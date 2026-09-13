import { MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Fixed-window throttling for auth endpoints, stored in the `loginAttempts` table.
 *
 * Callers must make sure a recorded attempt actually commits: Convex rolls back a mutation's
 * writes when it throws, so record, then *return* a failure result rather than throwing.
 */

export type ThrottleKind = Doc<"loginAttempts">["kind"];

export interface ThrottlePolicy {
  /** Attempts allowed within the window before locking. */
  max: number;
  windowMs: number;
  lockMs: number;
}

export const LOGIN_POLICY: ThrottlePolicy = {
  max: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const PASSWORD_RESET_POLICY: ThrottlePolicy = {
  max: 3,
  windowMs: 60 * 60 * 1000,
  lockMs: 60 * 60 * 1000,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getRow(ctx: MutationCtx, kind: ThrottleKind, key: string) {
  return await ctx.db
    .query("loginAttempts")
    .withIndex("by_kind_key", (q) => q.eq("kind", kind).eq("key", key))
    .unique();
}

/** Minutes remaining on an active lock, or null when not locked. */
export async function getLockMinutes(
  ctx: MutationCtx,
  kind: ThrottleKind,
  key: string,
): Promise<number | null> {
  const row = await getRow(ctx, kind, key);
  const now = Date.now();
  if (!row?.lockedUntil || row.lockedUntil <= now) return null;
  return Math.max(1, Math.ceil((row.lockedUntil - now) / 60000));
}

/**
 * Counts one attempt. Returns the lock duration in minutes if this attempt reached the limit,
 * otherwise null.
 */
export async function recordAttempt(
  ctx: MutationCtx,
  kind: ThrottleKind,
  key: string,
  policy: ThrottlePolicy,
): Promise<number | null> {
  const now = Date.now();
  const row = await getRow(ctx, kind, key);

  const windowExpired =
    !row ||
    now - row.windowStart > policy.windowMs ||
    (row.lockedUntil !== undefined && row.lockedUntil <= now);
  const count = windowExpired ? 1 : row.count + 1;
  const windowStart = windowExpired ? now : row.windowStart;
  const lockedUntil = count >= policy.max ? now + policy.lockMs : undefined;

  if (row) {
    await ctx.db.patch(row._id, { count, windowStart, lockedUntil, updatedAt: now });
  } else {
    await ctx.db.insert("loginAttempts", { kind, key, count, windowStart, lockedUntil, updatedAt: now });
  }
  return lockedUntil ? Math.ceil(policy.lockMs / 60000) : null;
}

export async function clearAttempts(ctx: MutationCtx, kind: ThrottleKind, key: string): Promise<void> {
  const row = await getRow(ctx, kind, key);
  if (row) await ctx.db.delete(row._id);
}
