import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { getViewer, requireStaff } from "../lib/authz";
import { formatPeso, quoteHomeService, toPeso } from "../lib/serviceQuote";
import { recordAudit } from "./audit";
import { loadActiveAreas, loadServiceSettings } from "./serviceAreas";
import {
  formatViewingDate,
  formatViewingTime,
  loadStoreContact,
  normalizeCustomerEmail,
  notifyHomeServiceRequested,
} from "./notifications";

/**
 * Home service: customers book a technician to come to their place (tank cleaning, setup,
 * health check…). The menu is staff-managed (`homeServices`), travel is priced by area
 * (`serviceAreas.travelFee`), and prices are snapshotted onto the booking so later edits to the
 * menu never rewrite what a customer was quoted.
 *
 * Public pages must use `getHomeServiceCatalog` and `createHomeServiceBooking` only — everything
 * else is staff-gated, and `staffNotes` is never returned to a customer.
 */

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_ADDRESS = 400;
const MAX_TANK = 80;
const MAX_NOTES = 2000;
const BOOKING_WINDOW_MS = 60 * 60 * 1000;
const MAX_BOOKINGS_PER_WINDOW = 5;

export type BookingStatus = Doc<"homeServiceBookings">["status"];

const statusValidator = v.union(
  v.literal("requested"),
  v.literal("confirmed"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export function generateBookingCode(id: string): string {
  return `HSV-${id.slice(-6).toUpperCase()}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------- public

/** Everything the public booking page needs: the menu, the areas we travel to, and the rules. */
export const getHomeServiceCatalog = query({
  args: {},
  handler: async (ctx) => {
    const settings = await loadServiceSettings(ctx);
    const areas = await loadActiveAreas(ctx);
    const services = await ctx.db
      .query("homeServices")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return {
      enabled: settings.homeServiceEnabled,
      note: settings.homeServiceNote,
      areas: areas.filter((a) => a.homeServiceEnabled),
      services: services
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((s) => ({
          _id: s._id,
          name: s.name,
          description: s.description,
          price: s.price,
          priceNote: s.priceNote,
          durationMinutes: s.durationMinutes,
          image: s.image,
        })),
    };
  },
});

export const createHomeServiceBooking = mutation({
  args: {
    serviceId: v.id("homeServices"),
    areaId: v.id("serviceAreas"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
    date: v.string(),
    time: v.string(),
    tankSize: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await loadServiceSettings(ctx);
    if (!settings.homeServiceEnabled) {
      throw new Error("Home service bookings are closed at the moment — please message us instead.");
    }

    const name = args.name.trim().slice(0, MAX_NAME);
    const email = args.email.trim().slice(0, MAX_EMAIL);
    const phone = args.phone.trim().slice(0, MAX_PHONE);
    const address = args.address.trim().slice(0, MAX_ADDRESS);
    if (!name) throw new Error("Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
    if (phone.length < 7) throw new Error("Valid phone number is required");
    if (address.length < 10) throw new Error("Please give the full address, including the barangay and city");
    if (!DATE_RE.test(args.date)) throw new Error("Valid date is required");
    if (!TIME_RE.test(args.time)) throw new Error("Valid time is required");
    if ((args.notes?.length ?? 0) > MAX_NOTES) throw new Error(`Notes must be at most ${MAX_NOTES} characters`);

    const service = await ctx.db.get(args.serviceId);
    if (!service || !service.isActive) throw new Error("That service isn't available any more");
    const area = await ctx.db.get(args.areaId);
    if (!area || !area.isActive || !area.homeServiceEnabled) {
      throw new Error("We don't travel to that area yet — please message us to arrange something.");
    }

    // The price the customer is held to is computed here, never sent by the browser.
    const quote = quoteHomeService({
      servicePrice: service.price,
      area: {
        name: area.name,
        deliveryFee: area.deliveryFee,
        travelFee: area.travelFee,
        deliveryEnabled: area.deliveryEnabled,
        homeServiceEnabled: area.homeServiceEnabled,
      },
    });

    const viewer = await getViewer(ctx);
    const now = Date.now();

    // Open form: cap how many bookings one address can create in an hour.
    const recent = await ctx.db.query("homeServiceBookings").withIndex("by_created").order("desc").take(40);
    const fromSameEmail = recent.filter(
      (b) => b.createdAt >= now - BOOKING_WINDOW_MS && b.email.toLowerCase() === email.toLowerCase(),
    );
    if (fromSameEmail.length >= MAX_BOOKINGS_PER_WINDOW) {
      throw new Error("You've already sent several booking requests. We'll be in touch shortly.");
    }

    const bookingId = await ctx.db.insert("homeServiceBookings", {
      code: "", // replaced below; the code is derived from the row id
      name,
      email,
      phone,
      address,
      areaId: area._id,
      areaName: area.name,
      serviceId: service._id,
      serviceName: service.name,
      servicePrice: quote.servicePrice,
      travelFee: quote.travelFee,
      estimatedTotal: quote.estimatedTotal,
      tankSize: args.tankSize?.trim().slice(0, MAX_TANK) || undefined,
      date: args.date,
      time: args.time,
      notes: args.notes?.trim() || undefined,
      status: "requested",
      userId: viewer?._id,
      createdAt: now,
      updatedAt: now,
    });
    const code = generateBookingCode(bookingId);
    await ctx.db.patch(bookingId, { code });

    // Best-effort side effects: a failure here must never lose the booking.
    try {
      await notifyHomeServiceRequested(ctx, {
        bookingId,
        code,
        name,
        serviceName: service.name,
        areaName: area.name,
        date: args.date,
        time: args.time,
        estimatedTotal: quote.estimatedTotal,
      });
    } catch (error) {
      console.error("Failed to create home service notification:", error);
    }

    try {
      const to = normalizeCustomerEmail(email);
      if (to) {
        await ctx.scheduler.runAfter(0, internal.services.email.sendHomeServiceBookingEmail, {
          to,
          bookingId,
          code,
          name,
          serviceName: service.name,
          areaName: area.name,
          address,
          date: args.date,
          time: args.time,
          servicePrice: quote.servicePrice,
          travelFee: quote.travelFee,
          estimatedTotal: quote.estimatedTotal,
          store: await loadStoreContact(ctx),
        });
      }
    } catch (error) {
      console.error("Failed to schedule home service email:", error);
    }

    return { success: true, bookingId, code, estimatedTotal: quote.estimatedTotal, travelFee: quote.travelFee };
  },
});

// ---------------------------------------------------------------- staff: bookings

export const getBookings = query({
  args: {
    status: v.optional(statusValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, search, limit = 100 }) => {
    await requireStaff(ctx);
    const take = Math.min(Math.max(limit, 1), 300);
    const rows = status
      ? await ctx.db.query("homeServiceBookings").withIndex("by_status", (q) => q.eq("status", status)).collect()
      : await ctx.db.query("homeServiceBookings").withIndex("by_created").order("desc").take(take * 2);

    const needle = search?.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((b) =>
          `${b.name} ${b.phone} ${b.email} ${b.code} ${b.serviceName} ${b.areaName} ${b.address}`.toLowerCase().includes(needle),
        )
      : rows;

    return filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, take);
  },
});

/** Counts for the filter chips, so they don't depend on the filtered page. */
export const getBookingCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("homeServiceBookings").withIndex("by_created").order("desc").take(600);
    const counts = { all: rows.length, requested: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const row of rows) counts[row.status] += 1;
    return counts;
  },
});

export const updateBookingStatus = mutation({
  args: { bookingId: v.id("homeServiceBookings"), status: statusValidator },
  handler: async (ctx, { bookingId, status }) => {
    const staff = await requireStaff(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    await ctx.db.patch(bookingId, { status, updatedAt: Date.now() });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "homeService.status",
      category: "sales",
      summary: `${booking.code} (${booking.serviceName} for ${booking.name}) → ${status.replace("_", " ")}`,
      entityTable: "homeServiceBookings",
      entityId: bookingId,
    });
    return { success: true };
  },
});

/** Schedules the visit: confirmed day/time, who's going, the agreed price and any staff notes. */
export const updateBookingDetails = mutation({
  args: {
    bookingId: v.id("homeServiceBookings"),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    assignedToId: v.optional(v.id("users")),
    quotedTotal: v.optional(v.number()),
    staffNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (args.date !== undefined && !DATE_RE.test(args.date)) throw new Error("Valid date is required");
    if (args.time !== undefined && !TIME_RE.test(args.time)) throw new Error("Valid time is required");
    if (args.quotedTotal !== undefined && (!Number.isFinite(args.quotedTotal) || args.quotedTotal < 0)) {
      throw new Error("Agreed price must be ₱0 or more");
    }

    let assignedToName: string | undefined;
    if (args.assignedToId) {
      const person = await ctx.db.get(args.assignedToId);
      if (!person) throw new Error("That staff member no longer exists");
      assignedToName = `${person.firstName} ${person.lastName}`.trim();
    }

    await ctx.db.patch(args.bookingId, {
      ...(args.date !== undefined ? { date: args.date } : {}),
      ...(args.time !== undefined ? { time: args.time } : {}),
      ...(args.assignedToId !== undefined ? { assignedToId: args.assignedToId, assignedToName } : {}),
      ...(args.quotedTotal !== undefined ? { quotedTotal: toPeso(args.quotedTotal) } : {}),
      ...(args.staffNotes !== undefined ? { staffNotes: args.staffNotes.trim().slice(0, MAX_NOTES) || undefined } : {}),
      updatedAt: Date.now(),
    });

    const changes = [
      args.date !== undefined && `date ${args.date}`,
      args.time !== undefined && `time ${args.time}`,
      assignedToName && `assigned to ${assignedToName}`,
      args.quotedTotal !== undefined && `agreed ${formatPeso(args.quotedTotal)}`,
    ].filter(Boolean).join(", ");
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "homeService.update",
      category: "sales",
      summary: `${booking.code} updated${changes ? `: ${changes}` : ""}`,
      entityTable: "homeServiceBookings",
      entityId: args.bookingId,
    });
    return { success: true };
  },
});

// ---------------------------------------------------------------- staff: the menu

export const listServices = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("homeServices").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
});

export const saveService = mutation({
  args: {
    serviceId: v.optional(v.id("homeServices")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceNote: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const name = args.name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
    if (!name) throw new Error("Service name is required");
    if (args.price !== undefined && (!Number.isFinite(args.price) || args.price < 0)) {
      throw new Error("Price must be ₱0 or more — leave it empty for “quoted on inspection”");
    }
    if (args.durationMinutes !== undefined && (!Number.isFinite(args.durationMinutes) || args.durationMinutes < 0)) {
      throw new Error("Duration must be 0 minutes or more");
    }

    const now = Date.now();
    const fields = {
      name,
      description: args.description?.trim().slice(0, 600) || undefined,
      price: args.price && args.price > 0 ? toPeso(args.price) : undefined,
      priceNote: args.priceNote?.trim().slice(0, 60) || undefined,
      durationMinutes: args.durationMinutes && args.durationMinutes > 0 ? Math.round(args.durationMinutes) : undefined,
      image: args.image?.trim() || undefined,
      isActive: args.isActive ?? true,
      updatedAt: now,
    };

    if (args.serviceId) {
      const existing = await ctx.db.get(args.serviceId);
      if (!existing) throw new Error("Service not found");
      await ctx.db.patch(args.serviceId, fields);
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "homeService.serviceUpdate",
        category: "settings",
        summary: `Updated home service “${name}”${fields.price ? ` at ${formatPeso(fields.price)}` : " (quoted on inspection)"}`,
        entityTable: "homeServices",
        entityId: args.serviceId,
      });
      return { serviceId: args.serviceId };
    }

    const all = await ctx.db.query("homeServices").collect();
    const serviceId = await ctx.db.insert("homeServices", {
      ...fields,
      sortOrder: all.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 10,
      createdAt: now,
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "homeService.serviceCreate",
      category: "settings",
      summary: `Added home service “${name}”${fields.price ? ` at ${formatPeso(fields.price)}` : " (quoted on inspection)"}`,
      entityTable: "homeServices",
      entityId: serviceId,
    });
    return { serviceId };
  },
});

/** Kept (deactivated) once it has bookings, so their history still reads correctly. */
export const removeService = mutation({
  args: { serviceId: v.id("homeServices") },
  handler: async (ctx, { serviceId }) => {
    const staff = await requireStaff(ctx);
    const service = await ctx.db.get(serviceId);
    if (!service) throw new Error("Service not found");

    const booked = await ctx.db
      .query("homeServiceBookings")
      .filter((q) => q.eq(q.field("serviceId"), serviceId))
      .first();

    if (booked) {
      await ctx.db.patch(serviceId, { isActive: false, updatedAt: Date.now() });
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "homeService.serviceDeactivate",
        category: "settings",
        summary: `Stopped offering “${service.name}” (kept — it has bookings)`,
        entityTable: "homeServices",
        entityId: serviceId,
      });
      return { deleted: false };
    }

    await ctx.db.delete(serviceId);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "homeService.serviceDelete",
      category: "settings",
      summary: `Deleted unused home service “${service.name}”`,
      entityTable: "homeServices",
      entityId: serviceId,
    });
    return { deleted: true };
  },
});

export const reorderServices = mutation({
  args: { orderedIds: v.array(v.id("homeServices")) },
  handler: async (ctx, { orderedIds }) => {
    await requireStaff(ctx);
    const now = Date.now();
    for (const [index, id] of orderedIds.entries()) {
      await ctx.db.patch(id, { sortOrder: (index + 1) * 10, updatedAt: now });
    }
    return { success: true };
  },
});

/** Seeds a starter menu and the usual Metro Manila / province areas, once, on request. */
export const seedStarterServices = mutation({
  args: {},
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    const existingServices = await ctx.db.query("homeServices").first();
    const existingAreas = await ctx.db.query("serviceAreas").first();
    const now = Date.now();
    let services = 0;
    let areas = 0;

    if (!existingServices) {
      const starters: { name: string; description: string; price?: number; priceNote?: string; durationMinutes?: number }[] = [
        { name: "Tank cleaning & water change", description: "Full clean: glass, substrate vacuum, filter rinse and a partial water change with treated water.", price: 1500, priceNote: "per tank", durationMinutes: 90 },
        { name: "Monthly maintenance visit", description: "A scheduled visit each month — cleaning, water testing, filter media and a health check on your fish.", price: 2500, priceNote: "per month", durationMinutes: 120 },
        { name: "New tank setup & installation", description: "We deliver, position and plumb the tank, cycle the water and introduce your fish safely.", priceNote: "quoted", durationMinutes: 240 },
        { name: "Aquascaping", description: "Hardscape and planting designed around your tank and your fish.", priceNote: "quoted", durationMinutes: 180 },
        { name: "Fish health & water check", description: "On-site water testing and a health assessment, with a written plan for anything we find.", price: 800, durationMinutes: 60 },
      ];
      for (const [index, s] of starters.entries()) {
        await ctx.db.insert("homeServices", {
          name: s.name,
          description: s.description,
          price: s.price,
          priceNote: s.priceNote,
          durationMinutes: s.durationMinutes,
          isActive: true,
          sortOrder: (index + 1) * 10,
          createdAt: now,
          updatedAt: now,
        });
        services += 1;
      }
    }

    if (!existingAreas) {
      const starters = [
        { name: "Within the city", deliveryFee: 200, travelFee: 300, note: "Same or next day" },
        { name: "Metro Manila", deliveryFee: 400, travelFee: 600, note: "1–2 days" },
        { name: "Nearby province", deliveryFee: 800, travelFee: 1200, note: "2–3 days" },
      ];
      for (const [index, a] of starters.entries()) {
        await ctx.db.insert("serviceAreas", {
          ...a,
          deliveryEnabled: true,
          homeServiceEnabled: true,
          isActive: true,
          sortOrder: (index + 1) * 10,
          createdAt: now,
          updatedAt: now,
        });
        areas += 1;
      }
    }

    if (services || areas) {
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "homeService.seed",
        category: "settings",
        summary: `Seeded ${services} starter service${services === 1 ? "" : "s"} and ${areas} area${areas === 1 ? "" : "s"}`,
        entityTable: "homeServices",
      });
    }
    return { services, areas };
  },
});

/** Customer-safe view of a booking, used by the public /track lookup. */
export function customerBookingView(booking: Doc<"homeServiceBookings">) {
  return {
    kind: "homeService" as const,
    code: booking.code,
    status: booking.status,
    serviceName: booking.serviceName,
    areaName: booking.areaName,
    address: booking.address,
    date: booking.date,
    time: booking.time,
    dateLabel: formatViewingDate(booking.date),
    timeLabel: formatViewingTime(booking.time),
    servicePrice: booking.servicePrice,
    travelFee: booking.travelFee,
    total: booking.quotedTotal ?? booking.estimatedTotal,
    quoted: booking.quotedTotal !== undefined,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}
