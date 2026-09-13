import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";

const HOURS = v.array(v.object({
  day: v.string(),
  open: v.string(), // "HH:MM" 24h
  close: v.string(),
  closed: v.boolean(),
}));

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Values used until an admin saves Business Details. They are the placeholders the
 * storefront shipped with, so `isConfigured: false` lets the admin page warn about them.
 */
export const DEFAULT_BUSINESS_PROFILE = {
  storeName: "Dragon's Cave",
  tagline: "Home of Premium Arowanas",
  establishedYear: "",
  whatsappNumber: "",
  phone: "",
  landline: "",
  email: "",
  addressLine: "",
  city: "Quezon City",
  mapUrl: "",
  gcashNumber: "",
  gcashName: "",
  bankDetails: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  hours: DAYS.map((day) => ({
    day,
    open: "10:00",
    close: "18:00",
    closed: day === "Monday",
  })),
  hoursNote: "",
};

/** Public: business details for the storefront, with defaults for unset fields. */
export const getBusinessProfile = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("businessProfile").first();
    if (!row) return { ...DEFAULT_BUSINESS_PROFILE, isConfigured: false };
    const { _id, _creationTime, updatedBy, ...fields } = row;
    return { ...DEFAULT_BUSINESS_PROFILE, ...fields, isConfigured: true };
  },
});

const clean = (s: string | undefined, max = 300) => (s ?? "").trim().slice(0, max);

export const updateBusinessProfile = mutation({
  args: {
    storeName: v.string(),
    tagline: v.optional(v.string()),
    establishedYear: v.optional(v.string()),
    whatsappNumber: v.string(),
    phone: v.string(),
    landline: v.optional(v.string()),
    email: v.string(),
    addressLine: v.string(),
    city: v.string(),
    mapUrl: v.optional(v.string()),
    gcashNumber: v.optional(v.string()),
    gcashName: v.optional(v.string()),
    bankDetails: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    hours: HOURS,
    hoursNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);

    if (!clean(args.storeName)) throw new Error("Store name is required");
    const whatsappNumber = args.whatsappNumber.replace(/\D/g, "");
    if (whatsappNumber && (whatsappNumber.length < 10 || whatsappNumber.length > 15)) {
      throw new Error("WhatsApp number must be in international format, e.g. 639171234567");
    }
    const email = clean(args.email, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }
    for (const url of [args.mapUrl, args.facebookUrl, args.instagramUrl, args.tiktokUrl]) {
      if (url && url.trim() && !/^https:\/\//i.test(url.trim())) {
        throw new Error("Links must start with https://");
      }
    }
    if (args.hours.length !== 7) throw new Error("Opening hours must list all 7 days");
    for (const h of args.hours) {
      if (!h.closed && !(/^\d{2}:\d{2}$/.test(h.open) && /^\d{2}:\d{2}$/.test(h.close) && h.open < h.close)) {
        throw new Error(`Check the opening hours for ${h.day}`);
      }
    }

    const fields = {
      storeName: clean(args.storeName, 80),
      tagline: clean(args.tagline, 120),
      establishedYear: clean(args.establishedYear, 4),
      whatsappNumber,
      phone: clean(args.phone, 40),
      landline: clean(args.landline, 40),
      email,
      addressLine: clean(args.addressLine, 200),
      city: clean(args.city, 80),
      mapUrl: clean(args.mapUrl, 500),
      gcashNumber: clean(args.gcashNumber, 40),
      gcashName: clean(args.gcashName, 80),
      bankDetails: clean(args.bankDetails, 500),
      facebookUrl: clean(args.facebookUrl, 300),
      instagramUrl: clean(args.instagramUrl, 300),
      tiktokUrl: clean(args.tiktokUrl, 300),
      hours: args.hours.map((h) => ({ day: clean(h.day, 12), open: h.open, close: h.close, closed: h.closed })),
      hoursNote: clean(args.hoursNote, 200),
      updatedAt: Date.now(),
      updatedBy: staff._id,
    };

    const existing = await ctx.db.query("businessProfile").first();
    if (existing) {
      await ctx.db.replace(existing._id, fields);
    } else {
      await ctx.db.insert("businessProfile", fields);
    }

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "settings.business_profile",
      category: "settings",
      summary: "Updated business details",
      entityTable: "businessProfile",
    });
    return { success: true };
  },
});
