import { v } from "convex/values";
import { requireStaff } from "../lib/authz";
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
    await requireStaff(ctx);
    // Category uses its own index so every page is full of matching rows (filtering the
    // newest-first stream left pages empty when a category was rare).
    const base = category
      ? ctx.db.query("auditLogs").withIndex("by_category_and_created", (q) => {
          const c = q.eq("category", category);
          if (startDate !== undefined && endDate !== undefined) return c.gte("createdAt", startDate).lte("createdAt", endDate);
          if (startDate !== undefined) return c.gte("createdAt", startDate);
          if (endDate !== undefined) return c.lte("createdAt", endDate);
          return c;
        })
      : ctx.db.query("auditLogs").withIndex("by_created", (q) => {
          if (startDate !== undefined && endDate !== undefined) return q.gte("createdAt", startDate).lte("createdAt", endDate);
          if (startDate !== undefined) return q.gte("createdAt", startDate);
          if (endDate !== undefined) return q.lte("createdAt", endDate);
          return q;
        });
    const ordered = base.order("desc");
    return await (actorId ? ordered.filter((f) => f.eq(f.field("actorId"), actorId)) : ordered).paginate(paginationOpts);
  },
});

/**
 * Staff: text search across the whole audit log (newest 5,000 entries, optionally one category) —
 * matches every word against the summary, action and person. Returns up to 200 newest matches.
 */
export const searchAuditLogs = query({
  args: { search: v.string(), category: v.optional(CATEGORY) },
  handler: async (ctx, { search, category }) => {
    await requireStaff(ctx);
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return { rows: [], scanned: 0, limited: false };
    const rows = category
      ? await ctx.db.query("auditLogs").withIndex("by_category_and_created", (q) => q.eq("category", category)).order("desc").take(5000)
      : await ctx.db.query("auditLogs").withIndex("by_created").order("desc").take(5000);
    const matches = rows.filter((r) => {
      const text = `${r.summary} ${r.action} ${r.actorName ?? ""} ${r.actorRole ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
    return { rows: matches.slice(0, 200), scanned: rows.length, limited: matches.length > 200 };
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
    await requireStaff(ctx);
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
