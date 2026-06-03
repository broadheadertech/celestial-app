import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { recordAudit } from "./audit";

const DEFAULTS = {
  siteName: "Dragon Cave Inventory",
  siteDescription: "Aquarium fish, tanks, and aquatic accessories",
  timezone: "Asia/Manila",
  currency: "PHP",
  maintenanceMode: false,
  notifyLowStock: true,
  notifyNewOrders: true,
  notifyNewUsers: false,
  lowStockThreshold: 10,
};

export const getAppSettings = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("appSettings").first();
    if (!row) {
      return {
        _id: null,
        ...DEFAULTS,
        updatedAt: Date.now(),
      };
    }
    return row;
  },
});

export const updateAppSettings = mutation({
  args: {
    siteName: v.optional(v.string()),
    siteDescription: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    maintenanceMode: v.optional(v.boolean()),
    notifyLowStock: v.optional(v.boolean()),
    notifyNewOrders: v.optional(v.boolean()),
    notifyNewUsers: v.optional(v.boolean()),
    lowStockThreshold: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId: actorId, ...updates } = args;
    const now = Date.now();
    const existing = await ctx.db.query("appSettings").first();

    if (!existing) {
      await ctx.db.insert("appSettings", {
        ...DEFAULTS,
        ...updates,
        updatedAt: now,
        updatedBy: actorId,
      });
    } else {
      await ctx.db.patch(existing._id, { ...updates, updatedAt: now, updatedBy: actorId });
    }

    await recordAudit(ctx, {
      actorId,
      action: "settings.update",
      category: "settings",
      summary: `Updated app settings — ${Object.keys(updates).join(", ") || "no fields"}`,
      entityTable: "appSettings",
      metadata: { changes: updates },
    });
    return { success: true };
  },
});
