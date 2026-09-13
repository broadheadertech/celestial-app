import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { requireStaff } from "../lib/authz";
import { recordAudit } from "./audit";

/**
 * Journal (blog) posts. Public readers only ever see published posts; staff manage
 * everything from /admin/journal. The body is plain text: blank lines separate
 * paragraphs and lines starting "## " are headings (rendered by components/dc/JournalBody).
 */

const LIMITS = { title: 140, excerpt: 300, kicker: 40, body: 50_000, author: 80, slug: 80 } as const;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** ≈ words / 200, never less than one minute. */
function readingMinutes(body: string): number {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

/** "Ça va — 10 Tips!" → "ca-va-10-tips" (ascii, hyphens, ≤ 80 chars). */
function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
  return slug || "post";
}

async function slugTaken(ctx: MutationCtx, slug: string, exceptId?: Id<"journalPosts">) {
  const hit = await ctx.db
    .query("journalPosts")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return !!hit && hit._id !== exceptId;
}

/** Makes `base` unique by appending -2, -3… (keeping the whole slug within the length limit). */
async function uniqueSlug(ctx: MutationCtx, base: string, exceptId?: Id<"journalPosts">) {
  if (!(await slugTaken(ctx, base, exceptId))) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, LIMITS.slug - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!(await slugTaken(ctx, candidate, exceptId))) return candidate;
  }
  throw new Error("Couldn't find a free slug — please choose one manually");
}

/** Resolves the slug to store: a validated, unique custom slug, or one generated from the title. */
async function resolveSlug(
  ctx: MutationCtx,
  requested: string | undefined,
  title: string,
  exceptId?: Id<"journalPosts">,
) {
  const custom = requested?.trim().toLowerCase();
  if (!custom) return uniqueSlug(ctx, slugify(title), exceptId);
  if (custom.length > LIMITS.slug) throw new Error(`Slug is too long (max ${LIMITS.slug} characters)`);
  if (!SLUG_RE.test(custom)) {
    throw new Error("Slug may only use lowercase letters, numbers and single hyphens (e.g. caring-for-arowana)");
  }
  if (await slugTaken(ctx, custom, exceptId)) throw new Error(`The slug "${custom}" is already used by another post`);
  return custom;
}

const FIELDS = {
  slug: v.optional(v.string()),
  title: v.string(),
  kicker: v.optional(v.string()),
  excerpt: v.string(),
  body: v.string(),
  coverImageUrl: v.optional(v.string()),
  authorName: v.optional(v.string()),
  isPublished: v.boolean(),
};

type Fields = {
  slug?: string;
  title: string;
  kicker?: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string;
  authorName?: string;
  isPublished: boolean;
};

function validate(args: Fields) {
  const title = args.title.trim();
  if (!title) throw new Error("Title is required");
  if (title.length > LIMITS.title) throw new Error(`Title is too long (max ${LIMITS.title} characters)`);
  const excerpt = args.excerpt.trim();
  if (!excerpt) throw new Error("Excerpt is required");
  if (excerpt.length > LIMITS.excerpt) throw new Error(`Excerpt is too long (max ${LIMITS.excerpt} characters)`);
  if ((args.kicker?.trim().length ?? 0) > LIMITS.kicker) {
    throw new Error(`Kicker is too long (max ${LIMITS.kicker} characters)`);
  }
  if ((args.authorName?.trim().length ?? 0) > LIMITS.author) {
    throw new Error(`Author name is too long (max ${LIMITS.author} characters)`);
  }
  if (args.body.length > LIMITS.body) throw new Error(`Body is too long (max ${LIMITS.body.toLocaleString()} characters)`);
  if (args.isPublished && !args.body.trim()) throw new Error("Write the article body before publishing");
  if (args.coverImageUrl && !/^https:\/\//i.test(args.coverImageUrl)) throw new Error("Cover image must be an https URL");
}

const tidy = (args: Fields) => ({
  title: args.title.trim(),
  kicker: args.kicker?.trim() || undefined,
  excerpt: args.excerpt.trim(),
  body: args.body.replace(/\r\n?/g, "\n").trim(),
  coverImageUrl: args.coverImageUrl || undefined,
  authorName: args.authorName?.trim() || undefined,
  isPublished: args.isPublished,
});

const listFields = (p: Doc<"journalPosts">) => ({
  _id: p._id,
  slug: p.slug,
  title: p.title,
  kicker: p.kicker,
  excerpt: p.excerpt,
  coverImageUrl: p.coverImageUrl,
  authorName: p.authorName,
  publishedAt: p.publishedAt,
  readingMinutes: readingMinutes(p.body),
});

// ───── public ─────

/** Public: published posts, newest first (list fields only — no body). */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("journalPosts")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc")
      .take(100);
    return rows.map(listFields);
  },
});

/** Public: one published post by slug, or null (drafts and unknown slugs look the same). */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("journalPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!post || !post.isPublished) return null;
    return { ...listFields(post), body: post.body };
  },
});

// ───── staff ─────

/** Staff: every post, drafts included, newest first (no body; use getForEdit). */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("journalPosts").collect();
    return rows
      .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
      .map((p) => ({ ...listFields(p), isPublished: p.isPublished, createdAt: p.createdAt, updatedAt: p.updatedAt }));
  },
});

/** Staff: the full post for the editor. */
export const getForEdit = query({
  args: { id: v.id("journalPosts") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: FIELDS,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    validate(args);
    const slug = await resolveSlug(ctx, args.slug, args.title);
    const now = Date.now();
    const id = await ctx.db.insert("journalPosts", {
      ...tidy(args),
      slug,
      publishedAt: args.isPublished ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "journal.create",
      category: "settings",
      summary: `${args.isPublished ? "Published" : "Drafted"} journal post "${args.title.trim()}"`,
      entityTable: "journalPosts",
      entityId: id,
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: { id: v.id("journalPosts"), ...FIELDS },
  handler: async (ctx, { id, ...args }) => {
    const staff = await requireStaff(ctx);
    validate(args);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Journal post not found");
    // Without an explicit slug, keep the current one so shared links don't break on a title edit.
    const slug = args.slug?.trim() ? await resolveSlug(ctx, args.slug, args.title, id) : existing.slug;
    const now = Date.now();
    await ctx.db.patch(id, {
      ...tidy(args),
      slug,
      publishedAt: args.isPublished && !existing.publishedAt ? now : existing.publishedAt,
      updatedAt: now,
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "journal.update",
      category: "settings",
      summary: `Edited journal post "${args.title.trim()}"`,
      entityTable: "journalPosts",
      entityId: id,
      metadata: slug !== existing.slug ? { previousSlug: existing.slug, slug } : undefined,
    });
    return { id, slug };
  },
});

export const setPublished = mutation({
  args: { id: v.id("journalPosts"), isPublished: v.boolean() },
  handler: async (ctx, { id, isPublished }) => {
    const staff = await requireStaff(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Journal post not found");
    if (existing.isPublished === isPublished) return null;
    if (isPublished && !existing.body.trim()) throw new Error("Write the article body before publishing");
    const now = Date.now();
    await ctx.db.patch(id, {
      isPublished,
      publishedAt: isPublished && !existing.publishedAt ? now : existing.publishedAt,
      updatedAt: now,
    });
    await recordAudit(ctx, {
      actorId: staff._id,
      action: isPublished ? "journal.publish" : "journal.unpublish",
      category: "settings",
      summary: `${isPublished ? "Published" : "Unpublished"} journal post "${existing.title}"`,
      entityTable: "journalPosts",
      entityId: id,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("journalPosts") },
  handler: async (ctx, { id }) => {
    const staff = await requireStaff(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) return null;
    await ctx.db.delete(id);
    await recordAudit(ctx, {
      actorId: staff._id,
      action: "journal.delete",
      category: "settings",
      summary: `Deleted journal post "${existing.title}"`,
      entityTable: "journalPosts",
      entityId: id,
    });
    return null;
  },
});
