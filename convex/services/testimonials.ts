import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";

/** Public: published testimonials in display order. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("testimonials")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .take(24);
    return rows.map(({ clientName, clientLocation, quote, photoUrl, productName, rating, _id }) => ({
      _id,
      clientName,
      clientLocation,
      quote,
      photoUrl,
      productName,
      rating,
    }));
  },
});

/** Staff: every testimonial, drafts included. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("testimonials").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt - a.createdAt);
  },
});

const FIELDS = {
  clientName: v.string(),
  clientLocation: v.optional(v.string()),
  quote: v.string(),
  photoUrl: v.optional(v.string()),
  productName: v.optional(v.string()),
  rating: v.optional(v.number()),
  isPublished: v.boolean(),
};

function validate(args: { clientName: string; quote: string; rating?: number; photoUrl?: string }) {
  if (!args.clientName.trim()) throw new Error("Client name is required");
  if (!args.quote.trim()) throw new Error("Testimonial text is required");
  if (args.quote.length > 1000) throw new Error("Testimonial is too long (max 1000 characters)");
  if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
    throw new Error("Rating must be between 1 and 5");
  }
  if (args.photoUrl && !/^https:\/\//i.test(args.photoUrl)) throw new Error("Photo must be an https URL");
}

const tidy = (args: {
  clientName: string;
  clientLocation?: string;
  quote: string;
  photoUrl?: string;
  productName?: string;
  rating?: number;
  isPublished: boolean;
}) => ({
  clientName: args.clientName.trim().slice(0, 80),
  clientLocation: args.clientLocation?.trim().slice(0, 80) || undefined,
  quote: args.quote.trim(),
  photoUrl: args.photoUrl || undefined,
  productName: args.productName?.trim().slice(0, 120) || undefined,
  rating: args.rating,
  isPublished: args.isPublished,
});

export const create = mutation({
  args: FIELDS,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    validate(args);
    const last = await ctx.db.query("testimonials").collect();
    const sortOrder = last.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1;
    const now = Date.now();
    const id = await ctx.db.insert("testimonials", { ...tidy(args), sortOrder, createdAt: now, updatedAt: now });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "testimonial.create",
      category: "settings",
      summary: `Added testimonial from ${args.clientName.trim()}`,
      entityTable: "testimonials",
      entityId: id,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("testimonials"), ...FIELDS },
  handler: async (ctx, { id, ...args }) => {
    const staff = await requireStaff(ctx);
    validate(args);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Testimonial not found");
    await ctx.db.patch(id, { ...tidy(args), updatedAt: Date.now() });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "testimonial.update",
      category: "settings",
      summary: `Edited testimonial from ${args.clientName.trim()}`,
      entityTable: "testimonials",
      entityId: id,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("testimonials") },
  handler: async (ctx, { id }) => {
    const staff = await requireStaff(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) return null;
    await ctx.db.delete(id);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "testimonial.delete",
      category: "settings",
      summary: `Deleted testimonial from ${existing.clientName}`,
      entityTable: "testimonials",
      entityId: id,
    });
    return null;
  },
});

/** Moves a testimonial one place up or down in display order. */
export const move = mutation({
  args: { id: v.id("testimonials"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { id, direction }) => {
    await requireStaff(ctx);
    const all = (await ctx.db.query("testimonials").collect()).sort(
      (a, b) => a.sortOrder - b.sortOrder || b.createdAt - a.createdAt,
    );
    const i = all.findIndex((t) => t._id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return null;
    // Renumber so equal sortOrders can't get stuck.
    [all[i], all[j]] = [all[j], all[i]];
    await Promise.all(all.map((t, idx) => (t.sortOrder === idx + 1 ? null : ctx.db.patch(t._id, { sortOrder: idx + 1 }))));
    return null;
  },
});
