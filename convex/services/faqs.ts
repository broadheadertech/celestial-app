import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";

export const QUESTION_MAX = 200;
export const ANSWER_MAX = 2000;

/** Public: published FAQs in display order (Contact page). */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("faqs")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .take(50);
    return rows.map(({ _id, question, answer }) => ({ _id, question, answer }));
  },
});

/** Staff: every FAQ, drafts included, in display order. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("faqs").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  },
});

const FIELDS = {
  question: v.string(),
  answer: v.string(),
  isPublished: v.boolean(),
};

function clean(args: { question: string; answer: string; isPublished: boolean }) {
  const question = args.question.trim();
  const answer = args.answer.trim().replace(/\r\n/g, "\n");
  if (!question) throw new Error("Question is required");
  if (!answer) throw new Error("Answer is required");
  if (question.length > QUESTION_MAX) throw new Error(`Question is too long (max ${QUESTION_MAX} characters)`);
  if (answer.length > ANSWER_MAX) throw new Error(`Answer is too long (max ${ANSWER_MAX} characters)`);
  return { question, answer, isPublished: args.isPublished };
}

export const create = mutation({
  args: FIELDS,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const fields = clean(args);
    const all = await ctx.db.query("faqs").collect();
    const sortOrder = all.reduce((m, f) => Math.max(m, f.sortOrder), 0) + 1;
    const now = Date.now();
    const id = await ctx.db.insert("faqs", { ...fields, sortOrder, createdAt: now, updatedAt: now });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "faq.create",
      category: "settings",
      summary: `Added FAQ “${fields.question.slice(0, 80)}”`,
      entityTable: "faqs",
      entityId: id,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("faqs"), ...FIELDS },
  handler: async (ctx, { id, ...args }) => {
    const staff = await requireStaff(ctx);
    const fields = clean(args);
    if (!(await ctx.db.get(id))) throw new Error("FAQ not found");
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "faq.update",
      category: "settings",
      summary: `Edited FAQ “${fields.question.slice(0, 80)}”`,
      entityTable: "faqs",
      entityId: id,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("faqs") },
  handler: async (ctx, { id }) => {
    const staff = await requireStaff(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) return null;
    await ctx.db.delete(id);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "faq.delete",
      category: "settings",
      summary: `Deleted FAQ “${existing.question.slice(0, 80)}”`,
      entityTable: "faqs",
      entityId: id,
    });
    return null;
  },
});

/** Moves an FAQ one place up or down in display order. */
export const move = mutation({
  args: { id: v.id("faqs"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { id, direction }) => {
    await requireStaff(ctx);
    const all = (await ctx.db.query("faqs").collect()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
    );
    const i = all.findIndex((f) => f._id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return null;
    // Renumber so equal sortOrders can't get stuck.
    [all[i], all[j]] = [all[j], all[i]];
    await Promise.all(all.map((f, idx) => (f.sortOrder === idx + 1 ? null : ctx.db.patch(f._id, { sortOrder: idx + 1 }))));
    return null;
  },
});

/**
 * One-time import of the questions the Contact page used to hardcode, so the site looks the same
 * until staff edit them. Does nothing if any FAQ already exists.
 * Run: npx convex run services/faqs:seedDefaults
 */
export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("faqs").first()) return { inserted: 0 };
    const defaults: [string, string][] = [
      ["Do you ship arowanas?", "No. Live specimens are pickup-only at our Quezon City gallery. Gear and food ship anywhere in the Philippines via Lalamove or LBC."],
      ["How does the deposit work?", "20% of the specimen price holds the fish in your name. We refund the deposit if you withdraw before quarantine ends; the balance settles when you collect the fish."],
      ["How long is quarantine?", "Twenty-one days minimum from import. Some specimens stay longer if we are not satisfied with their condition. We will tell you the day they're ready."],
      ["Do you offer financing?", "For specimens above ₱300,000 we offer split payments across three monthly installments after the deposit. Talk to us — every collector has a different budget cycle."],
      ["Can I sell a fish back to you?", "For specimens we placed and which have been kept according to our care guide, yes. We will quote you a fair buy-back. We do not buy fish we did not source."],
    ];
    const now = Date.now();
    for (const [i, [question, answer]] of defaults.entries()) {
      await ctx.db.insert("faqs", { question, answer, isPublished: true, sortOrder: i + 1, createdAt: now + i, updatedAt: now + i });
    }
    return { inserted: defaults.length };
  },
});
