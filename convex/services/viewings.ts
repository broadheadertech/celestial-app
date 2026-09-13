import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { getViewer, requireStaff } from "../lib/authz";
import {
  loadStoreContact,
  normalizeCustomerEmail,
  notifyViewingRequested,
  shouldSendAcknowledgement,
} from "./notifications";

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_DATE_TIME = 40;
const MAX_INTEREST = 200;
const MAX_NOTES = 2000;

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
    // Kept for client compatibility; the requester is derived from the session instead.
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) throw new Error("Name is required");
    if (!/.+@.+\..+/.test(args.email)) throw new Error("Valid email is required");
    if (args.phone.trim().length < 7) throw new Error("Valid phone is required");
    if (!args.date || !args.time) throw new Error("Date and time are required");
    if (!Number.isInteger(args.partySize) || args.partySize < 1 || args.partySize > 10) {
      throw new Error("Party size must be between 1 and 10");
    }
    if (args.name.trim().length > MAX_NAME) throw new Error(`Name must be at most ${MAX_NAME} characters`);
    if (args.email.trim().length > MAX_EMAIL) throw new Error("Email is too long");
    if (args.phone.trim().length > MAX_PHONE) throw new Error("Phone number is too long");
    if (args.date.length > MAX_DATE_TIME || args.time.length > MAX_DATE_TIME) {
      throw new Error("Invalid date or time");
    }
    if ((args.interest?.length ?? 0) > MAX_INTEREST) throw new Error(`Interest must be at most ${MAX_INTEREST} characters`);
    if ((args.notes?.length ?? 0) > MAX_NOTES) throw new Error(`Notes must be at most ${MAX_NOTES} characters`);

    const viewer = await getViewer(ctx);

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
      userId: viewer?._id,
      createdAt: now,
      updatedAt: now,
    });

    // Best-effort side effects: a failure here must never fail the booking itself.
    try {
      await notifyViewingRequested(ctx, {
        viewingId: id,
        name: args.name.trim(),
        date: args.date,
        time: args.time,
        partySize: args.partySize,
      });
    } catch (error) {
      console.error("Failed to create viewing request notification:", error);
    }

    try {
      const to = normalizeCustomerEmail(args.email);
      if (to && (await shouldSendAcknowledgement(ctx, "viewings", to, id))) {
        await ctx.scheduler.runAfter(0, internal.services.email.sendViewingRequestEmail, {
          to,
          viewingId: id,
          name: args.name.trim(),
          date: args.date,
          time: args.time,
          partySize: args.partySize,
          store: await loadStoreContact(ctx),
        });
      }
    } catch (error) {
      console.error("Failed to schedule viewing request email:", error);
    }

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
    await requireStaff(ctx);
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
    await requireStaff(ctx);
    const v = await ctx.db.get(id);
    if (!v) throw new Error("Viewing not found");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return { success: true };
  },
});
