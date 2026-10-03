import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { getViewer, requireStaff } from "../lib/authz";
import { isListedPublicly } from "../lib/purchaseMode";
import { publicName } from "../lib/productName";
import { recordAudit } from "./audit";
import { loadStoreContact, normalizeCustomerEmail, notifyInquiryReceived } from "./notifications";

/**
 * Inquiries — one inbox for everything a customer asks.
 *
 *  - `source: "product"` comes from the enquiry form on a specimen page, with the fish, its price
 *    and its tank/SKU snapshotted onto the lead so a later rename or reprice can't rewrite it.
 *  - `source: "contact"` comes from the /contact form (services/contact.ts delegates here).
 *
 * Staff work it as a pipeline (new → replied → negotiating → won/lost, or closed for a general
 * question) and can reply from the app, which emails the customer and records what was sent.
 * `staffNotes` and `replies[].sentByName` are staff-only and never returned to a customer.
 */

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;
const MAX_REPLY = 5000;
const MAX_NOTES = 2000;

// An open form, so one address can't be used to flood the inbox.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const SCAN_LIMIT = 60;

const statusValidator = v.union(
  v.literal("new"),
  v.literal("replied"),
  v.literal("negotiating"),
  v.literal("won"),
  v.literal("lost"),
  v.literal("closed"),
);

export type InquiryStatus = Doc<"inquiries">["status"];

export function generateInquiryCode(id: string): string {
  return `INQ-${id.slice(-6).toUpperCase()}`;
}

function cleanContact(args: { name: string; email: string; phone?: string }) {
  const name = args.name.trim().slice(0, MAX_NAME);
  const email = args.email.trim().slice(0, MAX_EMAIL);
  const phone = args.phone?.trim().slice(0, MAX_PHONE) || undefined;
  if (!name) throw new Error("Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
  return { name, email, phone };
}

/** Refuses a burst from the same address; the first few always get through. */
async function checkFlood(ctx: MutationCtx, email: string) {
  const recent = await ctx.db.query("inquiries").withIndex("by_created").order("desc").take(SCAN_LIMIT);
  const since = Date.now() - WINDOW_MS;
  const mine = recent.filter((row) => row.createdAt >= since && row.email.toLowerCase() === email.toLowerCase());
  if (mine.length >= MAX_PER_WINDOW) {
    throw new Error("You've already sent us several messages. We'll reply as soon as we can.");
  }
}

/** Shared insert + notify + acknowledge. Side effects never fail the inquiry itself. */
async function saveInquiry(
  ctx: MutationCtx,
  fields: Omit<Doc<"inquiries">, "_id" | "_creationTime" | "code" | "status" | "createdAt" | "updatedAt">,
) {
  const now = Date.now();
  const inquiryId = await ctx.db.insert("inquiries", {
    ...fields,
    code: "", // replaced below; the code is derived from the row id
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
  const code = generateInquiryCode(inquiryId);
  await ctx.db.patch(inquiryId, { code });

  try {
    await notifyInquiryReceived(ctx, {
      inquiryId,
      code,
      source: fields.source,
      name: fields.name,
      productName: fields.productName,
      subject: fields.subject,
      message: fields.message,
    });
  } catch (error) {
    console.error("Failed to create inquiry notification:", error);
  }

  try {
    const to = normalizeCustomerEmail(fields.email);
    if (to) {
      await ctx.scheduler.runAfter(0, internal.services.email.sendInquiryAcknowledgementEmail, {
        to,
        inquiryId,
        code,
        name: fields.name,
        productName: fields.productName,
        store: await loadStoreContact(ctx),
      });
    }
  } catch (error) {
    console.error("Failed to schedule inquiry acknowledgement email:", error);
  }

  return { success: true as const, inquiryId, code };
}

// ---------------------------------------------------------------- public

/** The enquiry form on a specimen page. */
export const createProductInquiry = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = cleanContact(args);
    const message = args.message.trim().slice(0, MAX_MESSAGE);
    if (message.length < 5) throw new Error("Tell us a little more about what you'd like to know");
    await checkFlood(ctx, contact.email);

    // Internal-only products aren't public, so they can't be enquired about either.
    const product = await ctx.db.get(args.productId);
    if (!product || !isListedPublicly(product)) throw new Error("That item isn't available");

    const viewer = await getViewer(ctx);
    return await saveInquiry(ctx, {
      source: "product",
      ...contact,
      message,
      productId: product._id,
      productName: publicName(product),
      productPrice: product.price,
      productRef: product.tankNumber || (product.sku !== undefined ? String(product.sku) : undefined),
      userId: viewer?._id,
    });
  },
});

/**
 * A general message from the /contact form. Exported as a plain helper too, because
 * services/contact.ts still has to serve the older deployed build of the site.
 */
export async function submitGeneralInquiry(
  ctx: MutationCtx,
  args: { name: string; email: string; phone?: string; subject: string; message: string },
) {
  const contact = cleanContact(args);
  const subject = args.subject.trim().slice(0, MAX_SUBJECT);
  const message = args.message.trim().slice(0, MAX_MESSAGE);
  if (!subject) throw new Error("Subject is required");
  if (message.length < 5) throw new Error("Tell us a bit more");
  await checkFlood(ctx, contact.email);

  const viewer = await getViewer(ctx);
  return await saveInquiry(ctx, {
    source: "contact",
    ...contact,
    subject,
    message,
    userId: viewer?._id,
  });
}

export const createGeneralInquiry = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => await submitGeneralInquiry(ctx, args),
});

// ---------------------------------------------------------------- staff

export const getInquiries = query({
  args: {
    status: v.optional(statusValidator),
    source: v.optional(v.union(v.literal("product"), v.literal("contact"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const take = Math.min(Math.max(args.limit ?? 100, 1), 300);

    const rows = args.status
      ? await ctx.db.query("inquiries").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : await ctx.db.query("inquiries").withIndex("by_created").order("desc").take(take * 3);

    const needle = args.search?.trim().toLowerCase();
    const filtered = rows
      .filter((row) => (args.source ? row.source === args.source : true))
      .filter((row) =>
        needle
          ? `${row.code} ${row.name} ${row.email} ${row.phone ?? ""} ${row.subject ?? ""} ${row.message} ${row.productName ?? ""} ${row.productRef ?? ""}`
              .toLowerCase()
              .includes(needle)
          : true,
      );

    return filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, take);
  },
});

/** Counts for the filter chips, independent of the filtered page. */
export const getInquiryCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("inquiries").withIndex("by_created").order("desc").take(1000);
    const counts = { all: rows.length, new: 0, replied: 0, negotiating: 0, won: 0, lost: 0, closed: 0, product: 0, contact: 0 };
    for (const row of rows) {
      counts[row.status] += 1;
      counts[row.source] += 1;
    }
    return counts;
  },
});

export const updateInquiryStatus = mutation({
  args: { inquiryId: v.id("inquiries"), status: statusValidator },
  handler: async (ctx, { inquiryId, status }) => {
    const staff = await requireStaff(ctx);
    const inquiry = await ctx.db.get(inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");
    await ctx.db.patch(inquiryId, { status, updatedAt: Date.now() });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "inquiry.status",
      category: "sales",
      summary: `${inquiry.code} (${inquiry.productName ?? inquiry.subject ?? "general"}, ${inquiry.name}) → ${status}`,
      entityTable: "inquiries",
      entityId: inquiryId,
    });
    return { success: true };
  },
});

/** Assign an owner and keep a private note. Neither is ever shown to the customer. */
export const updateInquiryDetails = mutation({
  args: {
    inquiryId: v.id("inquiries"),
    assignedToId: v.optional(v.id("users")),
    staffNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");

    let assignedToName: string | undefined;
    if (args.assignedToId) {
      const person = await ctx.db.get(args.assignedToId);
      if (!person) throw new Error("That staff member no longer exists");
      assignedToName = `${person.firstName} ${person.lastName}`.trim();
    }

    await ctx.db.patch(args.inquiryId, {
      ...(args.assignedToId !== undefined ? { assignedToId: args.assignedToId, assignedToName } : {}),
      ...(args.staffNotes !== undefined
        ? { staffNotes: args.staffNotes.trim().slice(0, MAX_NOTES) || undefined }
        : {}),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Records a reply and (unless `sendEmail` is false) emails it to the customer. Pass
 * `sendEmail: false` when the answer was given on Messenger or by phone and you just want it on
 * record. A "new" inquiry moves to "replied"; later statuses are left alone.
 */
export const replyToInquiry = mutation({
  args: {
    inquiryId: v.id("inquiries"),
    body: v.string(),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");
    const body = args.body.trim().slice(0, MAX_REPLY);
    if (body.length < 2) throw new Error("Write a reply first");

    const to = normalizeCustomerEmail(inquiry.email);
    const wantsEmail = args.sendEmail !== false;
    const emailed = wantsEmail && !!to;
    if (wantsEmail && !to) {
      throw new Error("This inquiry has no usable email address — answer them on Messenger and untick the email option.");
    }

    const now = Date.now();
    const sentByName = `${staff.firstName} ${staff.lastName}`.trim() || "The team";
    await ctx.db.patch(args.inquiryId, {
      replies: [...(inquiry.replies ?? []), { body, sentAt: now, sentById: staff._id, sentByName, emailed }],
      lastRepliedAt: now,
      status: inquiry.status === "new" ? "replied" : inquiry.status,
      updatedAt: now,
    });

    if (emailed && to) {
      try {
        await ctx.scheduler.runAfter(0, internal.services.email.sendInquiryReplyEmail, {
          to,
          inquiryId: args.inquiryId,
          code: inquiry.code,
          name: inquiry.name,
          productName: inquiry.productName,
          body,
          replyIndex: (inquiry.replies ?? []).length,
          store: await loadStoreContact(ctx),
        });
      } catch (error) {
        console.error("Failed to schedule inquiry reply email:", error);
      }
    }

    await recordAudit(ctx, {
      actorId: staff._id,
      action: "inquiry.reply",
      category: "sales",
      summary: `Replied to ${inquiry.code} (${inquiry.name})${emailed ? " by email" : " — recorded only"}`,
      entityTable: "inquiries",
      entityId: args.inquiryId,
    });
    return { success: true, emailed };
  },
});

/**
 * Copies the old `contactMessages` rows into this inbox. Idempotent — a row already copied is
 * skipped — so it can be re-run safely. The source table is left untouched.
 */
export const backfillContactMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    const legacy = await ctx.db.query("contactMessages").collect();
    let copied = 0;

    for (const row of legacy) {
      const already = await ctx.db
        .query("inquiries")
        .withIndex("by_migrated_from", (q) => q.eq("migratedFrom", row._id))
        .first();
      if (already) continue;

      // "responded" became "replied"; an archived general message is "closed", not a lost sale.
      const status: InquiryStatus = row.status === "responded" ? "replied" : row.status === "archived" ? "closed" : "new";
      const inquiryId = await ctx.db.insert("inquiries", {
        code: "",
        source: "contact",
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        status,
        userId: row.userId,
        migratedFrom: row._id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      await ctx.db.patch(inquiryId, { code: generateInquiryCode(inquiryId) });
      copied += 1;
    }

    if (copied > 0) {
      await recordAudit(ctx, {
        actorId: staff._id,
        action: "inquiry.backfill",
        category: "system",
        summary: `Moved ${copied} contact message${copied === 1 ? "" : "s"} into the inquiries inbox`,
        entityTable: "inquiries",
      });
    }
    return { copied, total: legacy.length };
  },
});

/** How many legacy contact messages are still waiting to be copied (drives the admin banner). */
export const getBackfillStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const legacy = await ctx.db.query("contactMessages").collect();
    let pending = 0;
    for (const row of legacy) {
      const already = await ctx.db
        .query("inquiries")
        .withIndex("by_migrated_from", (q) => q.eq("migratedFrom", row._id))
        .first();
      if (!already) pending += 1;
    }
    return { pending, total: legacy.length };
  },
});

/** Leads attached to one product, for the admin product page. */
export const getInquiriesForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireStaff(ctx);
    const rows = await ctx.db
      .query("inquiries")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

/** Customer-safe view, used by the public /track lookup. */
export function customerInquiryView(inquiry: Doc<"inquiries">) {
  return {
    kind: "inquiry" as const,
    code: inquiry.code,
    status: inquiry.status,
    productName: inquiry.productName ?? null,
    subject: inquiry.subject ?? null,
    message: inquiry.message,
    // Only what we actually sent them, and never who wrote it internally.
    replies: (inquiry.replies ?? []).filter((r) => r.emailed).map((r) => ({ body: r.body, sentAt: r.sentAt })),
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
}

export type InquiryDoc = Doc<"inquiries">;
export type InquiryId = Id<"inquiries">;
