import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

/**
 * Resolve the account behind a reservation's `userId`.
 *
 * `reservations.userId` is `Id<"users">` for current records but may be a raw Facebook id on
 * legacy records, so it can't be passed to `ctx.db.get` directly (a non-id string throws).
 * A valid users id is looked up directly; anything else is treated as a Facebook id.
 *
 * This is for display/enrichment only — never use it for authorization (use lib/authz).
 */
export async function getReservationUser(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined,
): Promise<Doc<"users"> | null> {
  if (!userId) return null;
  const id = ctx.db.normalizeId("users", userId);
  if (id) return await ctx.db.get(id);
  return await ctx.db
    .query("users")
    .withIndex("by_facebook_id", (q) => q.eq("facebookId", userId))
    .first();
}
