import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

/**
 * Auth failures are ConvexErrors with a machine-readable code, so the client can tell
 * them apart from other errors (and so the message survives prod error redaction).
 * The client's error boundary redirects UNAUTHENTICATED/FORBIDDEN to the login page.
 */
export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

function authError(code: AuthErrorCode, message: string) {
  return new ConvexError({ code, message });
}

export const STAFF_ROLES = ["admin", "super_admin"] as const;

export function isStaffRole(role: string | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * The signed-in user making this call, or null for guests.
 *
 * Identity comes from the JWT Convex verified (issued by services/session.ts), never
 * from function arguments. The session named in the token must still be live, and the
 * account must be active and not banned — so logout, deactivation and bans take effect
 * immediately rather than when the token expires.
 */
export async function getViewer(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const userId = ctx.db.normalizeId("users", identity.subject);
  const sessionId = typeof identity.sid === "string" ? ctx.db.normalizeId("sessions", identity.sid) : null;
  if (!userId || !sessionId) return null;

  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId || session.revokedAt || session.expiresAt < Date.now()) {
    return null;
  }

  const user = await ctx.db.get(userId);
  if (!user || user.isActive === false || user.isBanned) return null;
  return user;
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getViewer(ctx);
  if (!user) throw authError("UNAUTHENTICATED", "Please sign in to continue.");
  return user;
}

export async function requireStaff(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isStaffRole(user.role)) throw authError("FORBIDDEN", "You don't have permission to do that.");
  return user;
}

export async function requireSuperAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "super_admin") throw authError("FORBIDDEN", "Only a super admin can do that.");
  return user;
}

/** Allows the user acting on their own record, or any staff member. */
export async function requireSelfOrStaff(ctx: Ctx, userId: Id<"users">): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user._id !== userId && !isStaffRole(user.role)) {
    throw authError("FORBIDDEN", "You don't have permission to do that.");
  }
  return user;
}
