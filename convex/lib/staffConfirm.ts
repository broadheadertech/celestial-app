import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireStaff } from "./authz";
import { verifyPassword } from "./password";
import { clearAttempts, getLockMinutes, recordAttempt, type ThrottlePolicy } from "./throttle";

/**
 * Re-checks the signed-in staff member's own password before a sensitive correction (voiding a sale,
 * correcting or voiding a delivery). Wrong passwords are counted — 5 within 15 minutes locks these
 * actions for that person for 15 minutes.
 *
 * Returns `{ ok: false, error }` instead of throwing on a wrong password: a thrown error would roll
 * back the mutation, including the attempt counter. Callers must return that result as-is and make
 * no other changes.
 */
const CONFIRM_POLICY: ThrottlePolicy = { max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 };

export type ConfirmResult = { ok: true; staff: Doc<"users"> } | { ok: false; error: string };

export async function confirmStaffPassword(ctx: MutationCtx, password: string): Promise<ConfirmResult> {
  const staff = await requireStaff(ctx);
  const key = staff._id;
  const locked = await getLockMinutes(ctx, "staff_confirm", key);
  if (locked) return { ok: false, error: `Too many wrong passwords. Try again in ${locked} minute${locked === 1 ? "" : "s"}.` };

  if (!staff.passwordHash) {
    return { ok: false, error: "Your account has no password (Facebook sign-in). Ask a manager with a password to do this." };
  }
  if (!password || !(await verifyPassword(password, staff.passwordHash))) {
    const lockedNow = await recordAttempt(ctx, "staff_confirm", key, CONFIRM_POLICY);
    return {
      ok: false,
      error: lockedNow ? `Wrong password. Locked for ${lockedNow} minutes after too many attempts.` : "Wrong password.",
    };
  }
  await clearAttempts(ctx, "staff_confirm", key);
  return { ok: true, staff };
}

/** Trimmed reason, required for every correction. */
export function requireReason(reason: string): string {
  const clean = reason.trim().slice(0, 300);
  if (clean.length < 3) throw new Error("Please enter a reason for this correction.");
  return clean;
}
