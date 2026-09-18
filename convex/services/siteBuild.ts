import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, query, type ActionCtx, type QueryCtx } from "../_generated/server";
import { requireStaff } from "../lib/authz";

/**
 * Rebuilds the website on Vercel so the prerendered /specimen/<slug> pages (link previews) and the
 * sitemap pick up catalog changes. Uses a Vercel deploy hook URL stored in the Convex env var
 * VERCEL_DEPLOY_HOOK_URL (Vercel → Project → Settings → Git → Deploy Hooks). Without it, every
 * function here is a harmless no-op that reports "not configured".
 */

const MANUAL_COOLDOWN_MS = 10 * 60 * 1000;

const hookUrl = () => process.env.VERCEL_DEPLOY_HOOK_URL?.trim() || "";

async function latest(ctx: QueryCtx) {
  return await ctx.db.query("siteBuilds").order("desc").first();
}

/** Newest product change (any field) — what the prerendered pages were built from. */
async function lastCatalogChange(ctx: QueryCtx) {
  const products = await ctx.db.query("products").collect();
  return products.reduce((max, p) => Math.max(max, p.updatedAt, p.createdAt), 0);
}

/** Staff: whether rebuilds are set up, the last request, and whether products changed since. */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const last = await latest(ctx);
    const lastSent = await ctx.db
      .query("siteBuilds")
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "sent"))
      .first();
    return {
      configured: hookUrl() !== "",
      last: last ? { status: last.status, reason: last.reason, requestedAt: last.requestedAt, detail: last.detail } : null,
      changedSinceLastBuild: !lastSent || (await lastCatalogChange(ctx)) > lastSent.requestedAt,
    };
  },
});

/** Staff: rebuild now (e.g. right after adding a fish you want to share). */
export const requestRebuild = mutation({
  args: {},
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    if (!hookUrl()) {
      throw new Error("Automatic website updates aren't set up yet. Add the Vercel deploy hook (VERCEL_DEPLOY_HOOK_URL) first.");
    }
    const last = await latest(ctx);
    if (last && last.status !== "failed" && Date.now() - last.requestedAt < MANUAL_COOLDOWN_MS) {
      const minutes = Math.ceil((MANUAL_COOLDOWN_MS - (Date.now() - last.requestedAt)) / 60000);
      throw new Error(`The website is already updating. You can request another update in ${minutes} min.`);
    }
    const id = await ctx.db.insert("siteBuilds", { reason: "manual", requestedBy: staff._id, status: "pending", requestedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.services.siteBuild.send, { id });
    return null;
  },
});

export const shouldRebuild = internalQuery({
  args: {},
  handler: async (ctx) => {
    if (!hookUrl()) return false;
    const lastSent = await ctx.db
      .query("siteBuilds")
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "sent"))
      .first();
    return !lastSent || (await lastCatalogChange(ctx)) > lastSent.requestedAt;
  },
});

export const record = internalMutation({
  args: {
    id: v.optional(v.id("siteBuilds")),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, detail }) => {
    if (id) {
      await ctx.db.patch(id, { status, detail });
      return id;
    }
    return await ctx.db.insert("siteBuilds", { reason: "scheduled", status, detail, requestedAt: Date.now() });
  },
});

/** Calls the Vercel deploy hook and records the outcome on the siteBuilds row. */
async function callHook(ctx: ActionCtx, id: Id<"siteBuilds">) {
  const url = hookUrl();
  if (!url) {
    await ctx.runMutation(internal.services.siteBuild.record, { id, status: "failed", detail: "Deploy hook not configured" });
    return;
  }
  try {
    const res = await fetch(url, { method: "POST" });
    await ctx.runMutation(internal.services.siteBuild.record, {
      id,
      status: res.ok ? "sent" : "failed",
      detail: res.ok ? undefined : `Vercel responded ${res.status}`,
    });
  } catch (error) {
    await ctx.runMutation(internal.services.siteBuild.record, {
      id,
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : "Request failed",
    });
  }
}

export const send = internalAction({
  args: { id: v.id("siteBuilds") },
  handler: async (ctx, { id }) => callHook(ctx, id),
});

/** Daily cron: rebuild only when products changed since the last successful rebuild. */
export const rebuildIfCatalogChanged = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.runQuery(internal.services.siteBuild.shouldRebuild, {}))) return;
    const id = await ctx.runMutation(internal.services.siteBuild.record, { status: "pending" });
    await callHook(ctx, id);
  },
});
