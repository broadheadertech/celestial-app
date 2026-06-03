import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type AuditCategory =
  | "finance"
  | "inventory"
  | "sales"
  | "users"
  | "settings"
  | "system";

/**
 * Append one entry to the admin audit trail. Call from inside any mutation that
 * changes meaningful state. The actor's name/role are snapshotted at write time so
 * the log stays readable even if the user is later renamed or removed.
 *
 * Audit writes are best-effort: a failure here must never roll back the real action,
 * so any error is swallowed.
 */
export async function recordAudit(
  ctx: MutationCtx,
  args: {
    actorId?: Id<"users">;
    action: string;
    category: AuditCategory;
    summary: string;
    entityTable?: string;
    entityId?: string;
    amount?: number;
    metadata?: unknown;
  }
): Promise<void> {
  try {
    let actorName: string | undefined;
    let actorRole: string | undefined;
    if (args.actorId) {
      const u = await ctx.db.get(args.actorId);
      if (u) {
        actorName = `${u.firstName} ${u.lastName}`.trim();
        actorRole = u.role;
      }
    }
    await ctx.db.insert("auditLogs", {
      actorId: args.actorId,
      actorName,
      actorRole,
      action: args.action,
      category: args.category,
      summary: args.summary,
      entityTable: args.entityTable,
      entityId: args.entityId,
      amount: args.amount,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  } catch {
    // Never let audit logging break the underlying operation.
  }
}

const CATEGORY = v.union(
  v.literal("finance"),
  v.literal("inventory"),
  v.literal("sales"),
  v.literal("users"),
  v.literal("settings"),
  v.literal("system"),
);

/**
 * Paginated audit log, newest first, with optional category + date-range filters.
 * Designed for usePaginatedQuery on the settings activity-log page. Text search is
 * applied client-side on the loaded pages.
 */
export const getAuditLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(CATEGORY),
    actorId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { paginationOpts, category, actorId, startDate, endDate }) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_created")
      .order("desc")
      .filter((f) => {
        const conds = [];
        if (category) conds.push(f.eq(f.field("category"), category));
        if (actorId) conds.push(f.eq(f.field("actorId"), actorId));
        if (startDate !== undefined) conds.push(f.gte(f.field("createdAt"), startDate));
        if (endDate !== undefined) conds.push(f.lte(f.field("createdAt"), endDate));
        // Always-true fallback when no filters are active.
        return conds.length ? f.and(...conds) : f.eq(f.field("createdAt"), f.field("createdAt"));
      })
      .paginate(paginationOpts);
  },
});

/**
 * Category breakdown + total for a date range — powers the categorized summary
 * chips above the log. Bounded scan (admin volume is modest).
 */
export const getAuditSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const inRange = (ts: number) =>
      (startDate === undefined || ts >= startDate) && (endDate === undefined || ts <= endDate);

    const rows = await ctx.db.query("auditLogs").withIndex("by_created").order("desc").take(5000);
    const scoped = rows.filter((r) => inRange(r.createdAt));

    const byCategory: Record<string, number> = {
      finance: 0,
      inventory: 0,
      sales: 0,
      users: 0,
      settings: 0,
      system: 0,
    };
    for (const r of scoped) byCategory[r.category] = (byCategory[r.category] || 0) + 1;

    return { total: scoped.length, byCategory };
  },
});
