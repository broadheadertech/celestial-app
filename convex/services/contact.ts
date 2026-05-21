import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Public submit from /contact form.
export const createContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) throw new Error("Name is required");
    if (!/.+@.+\..+/.test(args.email)) throw new Error("Valid email is required");
    if (!args.subject.trim()) throw new Error("Subject is required");
    if (args.message.trim().length < 5) throw new Error("Tell us a bit more");

    const now = Date.now();
    const id = await ctx.db.insert("contactMessages", {
      name: args.name.trim(),
      email: args.email.trim(),
      phone: args.phone?.trim(),
      subject: args.subject.trim(),
      message: args.message.trim(),
      status: "new",
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id };
  },
});

// Admin: list contact messages.
export const getContactMessages = query({
  args: {
    status: v.optional(
      v.union(v.literal("new"), v.literal("responded"), v.literal("archived")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit = 100 }) => {
    const all = status
      ? await ctx.db
          .query("contactMessages")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("contactMessages").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});

// Admin: update contact message status.
export const updateContactStatus = mutation({
  args: {
    id: v.id("contactMessages"),
    status: v.union(
      v.literal("new"),
      v.literal("responded"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Message not found");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return { success: true };
  },
});
