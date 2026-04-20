import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
  },
  handler: async (ctx, updates) => {
    const now = Date.now();
    const existing = await ctx.db.query("appSettings").first();

    if (!existing) {
      await ctx.db.insert("appSettings", {
        ...DEFAULTS,
        ...updates,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, { ...updates, updatedAt: now });
    }
    return { success: true };
  },
});
