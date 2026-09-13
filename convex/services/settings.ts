import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { recordAudit } from "./audit";
import { requireStaff } from "../lib/authz";

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

// Admin: read app settings (only the admin settings page reads these).
export const getAppSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
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
    // Kept for client compatibility; the actor is derived from the session instead.
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const { userId: _ignoredUserId, ...updates } = args;
    const actorId = staff._id;
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
