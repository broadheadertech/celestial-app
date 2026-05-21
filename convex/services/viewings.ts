import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Create a viewing request from the public /visit page.
export const createViewing = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    date: v.string(),
    time: v.string(),
    partySize: v.number(),
    interest: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) throw new Error("Name is required");
    if (!/.+@.+\..+/.test(args.email)) throw new Error("Valid email is required");
    if (args.phone.trim().length < 7) throw new Error("Valid phone is required");
    if (!args.date || !args.time) throw new Error("Date and time are required");
    if (args.partySize < 1 || args.partySize > 10) {
      throw new Error("Party size must be between 1 and 10");
    }

    const now = Date.now();
    const id = await ctx.db.insert("viewings", {
      name: args.name.trim(),
      email: args.email.trim(),
      phone: args.phone.trim(),
      date: args.date,
      time: args.time,
      partySize: args.partySize,
      interest: args.interest,
      notes: args.notes,
      status: "requested",
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id };
  },
});

// Admin: list viewings with optional status filter.
export const getViewings = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("requested"),
        v.literal("confirmed"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit = 100 }) => {
    const all = status
      ? await ctx.db
          .query("viewings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("viewings").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});

// Admin: change a viewing's status.
export const updateViewingStatus = mutation({
  args: {
    id: v.id("viewings"),
    status: v.union(
      v.literal("requested"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const v = await ctx.db.get(id);
    if (!v) throw new Error("Viewing not found");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return { success: true };
  },
});
