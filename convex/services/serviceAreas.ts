import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";
import {
  DEFAULT_SERVICE_SETTINGS,
  formatPeso,
  toPeso,
  type ServiceArea,
  type ServiceSettings,
} from "../lib/serviceQuote";

/**
 * Delivery / home-service areas and the switchboard for both channels.
 *
 * Areas are shared: one row prices a goods delivery (`deliveryFee`) and a home visit
 * (`travelFee`), and either channel can be turned off per area. The public queries return only
 * what a customer needs to pick an area and see a price.
 */

const MAX_NAME = 80;
const MAX_NOTE = 120;
const MAX_FEE = 100_000;

function cleanName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  if (!name) throw new Error("Area name is required");
  return name;
}

function cleanFee(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be ₱0 or more`);
  if (value > MAX_FEE) throw new Error(`${label} looks too high (max ${formatPeso(MAX_FEE)})`);
  return toPeso(value);
}

/** The settings row, falling back to "both channels off" so an empty table is safe. */
export async function loadServiceSettings(ctx: QueryCtx | MutationCtx): Promise<ServiceSettings> {
  const row = await ctx.db.query("serviceSettings").first();
  if (!row) return { ...DEFAULT_SERVICE_SETTINGS };
  return {
    deliveryEnabled: row.deliveryEnabled,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
    minimumDeliveryOrder: row.minimumDeliveryOrder,
    deliveryNote: row.deliveryNote,
    homeServiceEnabled: row.homeServiceEnabled,
    homeServiceNote: row.homeServiceNote,
  };
}

/** Active areas in display order, as the pure pricing helpers expect them. */
export async function loadActiveAreas(
  ctx: QueryCtx | MutationCtx,
): Promise<(ServiceArea & { _id: string })[]> {
  const rows = await ctx.db.query("serviceAreas").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((a) => ({
      _id: a._id,
      name: a.name,
      deliveryFee: a.deliveryFee,
      travelFee: a.travelFee,
      note: a.note,
      deliveryEnabled: a.deliveryEnabled,
      homeServiceEnabled: a.homeServiceEnabled,
    }));
}

/** Public: the areas and rules a customer needs at checkout or on the booking page. */
export const getServiceOptions = query({
  args: {},
  handler: async (ctx) => {
    const settings = await loadServiceSettings(ctx);
    const areas = await loadActiveAreas(ctx);
    return {
      settings,
      deliveryAreas: areas.filter((a) => a.deliveryEnabled),
      homeServiceAreas: areas.filter((a) => a.homeServiceEnabled),
    };
  },
});

// ---------------------------------------------------------------- staff

export const listAreas = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("serviceAreas").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
});

export const saveArea = mutation({
  args: {
    areaId: v.optional(v.id("serviceAreas")),
    name: v.string(),
    deliveryFee: v.number(),
    travelFee: v.number(),
    note: v.optional(v.string()),
    deliveryEnabled: v.boolean(),
    homeServiceEnabled: v.boolean(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const now = Date.now();
    const fields = {
      name: cleanName(args.name),
      deliveryFee: cleanFee(args.deliveryFee, "Delivery fee"),
      travelFee: cleanFee(args.travelFee, "Travel fee"),
      note: args.note?.trim().slice(0, MAX_NOTE) || undefined,
      deliveryEnabled: args.deliveryEnabled,
      homeServiceEnabled: args.homeServiceEnabled,
      isActive: args.isActive ?? true,
      updatedAt: now,
    };

    if (args.areaId) {
      const existing = await ctx.db.get(args.areaId);
      if (!existing) throw new Error("Area not found");
      await ctx.db.patch(args.areaId, fields);
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "serviceArea.update",
        category: "settings",
        summary: `Updated service area ${fields.name} (delivery ${formatPeso(fields.deliveryFee)}, travel ${formatPeso(fields.travelFee)})`,
        entityTable: "serviceAreas",
        entityId: args.areaId,
      });
      return { areaId: args.areaId };
    }

    const existing = await ctx.db.query("serviceAreas").collect();
    const duplicate = existing.find((a) => a.name.toLowerCase() === fields.name.toLowerCase());
    if (duplicate) throw new Error(`“${fields.name}” already exists`);
    const areaId = await ctx.db.insert("serviceAreas", {
      ...fields,
      sortOrder: existing.reduce((max, a) => Math.max(max, a.sortOrder), 0) + 10,
      createdAt: now,
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "serviceArea.create",
      category: "settings",
      summary: `Added service area ${fields.name} (delivery ${formatPeso(fields.deliveryFee)}, travel ${formatPeso(fields.travelFee)})`,
      entityTable: "serviceAreas",
      entityId: areaId,
    });
    return { areaId };
  },
});

/**
 * Areas are referenced by past orders and bookings, so they're deactivated rather than deleted
 * once used; an unused area is removed outright.
 */
export const removeArea = mutation({
  args: { areaId: v.id("serviceAreas") },
  handler: async (ctx, { areaId }) => {
    const staff = await requireStaff(ctx);
    const area = await ctx.db.get(areaId);
    if (!area) throw new Error("Area not found");

    const usedByOrder = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("deliveryAreaId"), areaId))
      .first();
    const usedByBooking = await ctx.db
      .query("homeServiceBookings")
      .filter((q) => q.eq(q.field("areaId"), areaId))
      .first();

    if (usedByOrder || usedByBooking) {
      await ctx.db.patch(areaId, { isActive: false, updatedAt: Date.now() });
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "serviceArea.deactivate",
        category: "settings",
        summary: `Stopped serving ${area.name} (kept — it has past orders or bookings)`,
        entityTable: "serviceAreas",
        entityId: areaId,
      });
      return { deleted: false };
    }

    await ctx.db.delete(areaId);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "serviceArea.delete",
      category: "settings",
      summary: `Deleted unused service area ${area.name}`,
      entityTable: "serviceAreas",
      entityId: areaId,
    });
    return { deleted: true };
  },
});

export const reorderAreas = mutation({
  args: { orderedIds: v.array(v.id("serviceAreas")) },
  handler: async (ctx, { orderedIds }) => {
    await requireStaff(ctx);
    const now = Date.now();
    for (const [index, id] of orderedIds.entries()) {
      await ctx.db.patch(id, { sortOrder: (index + 1) * 10, updatedAt: now });
    }
    return { success: true };
  },
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await loadServiceSettings(ctx);
  },
});

export const updateSettings = mutation({
  args: {
    deliveryEnabled: v.boolean(),
    freeDeliveryThreshold: v.optional(v.number()),
    minimumDeliveryOrder: v.optional(v.number()),
    deliveryNote: v.optional(v.string()),
    homeServiceEnabled: v.boolean(),
    homeServiceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const now = Date.now();
    const threshold = args.freeDeliveryThreshold;
    const minimum = args.minimumDeliveryOrder;
    if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) {
      throw new Error("Free delivery threshold must be ₱0 or more");
    }
    if (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) {
      throw new Error("Minimum order must be ₱0 or more");
    }

    const fields = {
      deliveryEnabled: args.deliveryEnabled,
      freeDeliveryThreshold: threshold && threshold > 0 ? toPeso(threshold) : undefined,
      minimumDeliveryOrder: minimum && minimum > 0 ? toPeso(minimum) : undefined,
      deliveryNote: args.deliveryNote?.trim().slice(0, 300) || undefined,
      homeServiceEnabled: args.homeServiceEnabled,
      homeServiceNote: args.homeServiceNote?.trim().slice(0, 300) || undefined,
      updatedAt: now,
      updatedBy: staff._id,
    };

    const existing = await ctx.db.query("serviceSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("serviceSettings", fields);
    }

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "serviceSettings.update",
      category: "settings",
      summary: `Delivery ${args.deliveryEnabled ? "on" : "off"}, home service ${args.homeServiceEnabled ? "on" : "off"}`,
      entityTable: "serviceSettings",
    });
    return { success: true };
  },
});
