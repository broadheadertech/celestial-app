import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { authErrorCode, newTest, signedInAs } from "./setup";

const draft = {
  title: "On the patience required to keep a show arowana",
  kicker: "Husbandry",
  excerpt: "A fish you keep for fifteen years is not one you acquire in fifteen minutes.",
  body: "First paragraph.\n\n## A heading\n\nSecond paragraph.",
  isPublished: false,
};

describe("journal authorization", () => {
  test("guests and customers can't create or list drafts", async () => {
    const t = newTest();
    expect(await authErrorCode(t.mutation(api.services.journal.create, draft))).toBe("UNAUTHENTICATED");
    expect(await authErrorCode(t.query(api.services.journal.listAll, {}))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.mutation(api.services.journal.create, draft))).toBe("FORBIDDEN");
  });

  test("staff can create, publish and delete posts", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const { id, slug } = await admin.as.mutation(api.services.journal.create, draft);
    expect(slug).toBe("on-the-patience-required-to-keep-a-show-arowana");

    await admin.as.mutation(api.services.journal.setPublished, { id, isPublished: true });
    const published = await t.query(api.services.journal.listPublished, {});
    expect(published.map((p) => p.slug)).toEqual([slug]);
    expect(published[0]).not.toHaveProperty("body");
    expect(published[0].publishedAt).toBeTypeOf("number");

    const post = await t.query(api.services.journal.getBySlug, { slug });
    expect(post?.body).toContain("## A heading");

    // publishedAt is kept across unpublish/republish.
    const firstPublishedAt = published[0].publishedAt;
    await admin.as.mutation(api.services.journal.setPublished, { id, isPublished: false });
    await admin.as.mutation(api.services.journal.setPublished, { id, isPublished: true });
    expect((await t.query(api.services.journal.getBySlug, { slug }))?.publishedAt).toBe(firstPublishedAt);

    await admin.as.mutation(api.services.journal.remove, { id });
    expect(await t.query(api.services.journal.listPublished, {})).toEqual([]);
  });
});

describe("journal visibility", () => {
  test("drafts are hidden from listPublished and getBySlug", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const { slug } = await admin.as.mutation(api.services.journal.create, draft);
    expect(await t.query(api.services.journal.listPublished, {})).toEqual([]);
    expect(await t.query(api.services.journal.getBySlug, { slug })).toBeNull();
    expect(await t.query(api.services.journal.getBySlug, { slug: "no-such-post" })).toBeNull();
    // Staff still see it.
    expect((await admin.as.query(api.services.journal.listAll, {})).map((p) => p.slug)).toEqual([slug]);
  });
});

describe("journal slugs", () => {
  test("generated slugs are made unique", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const a = await admin.as.mutation(api.services.journal.create, draft);
    const b = await admin.as.mutation(api.services.journal.create, draft);
    const c = await admin.as.mutation(api.services.journal.create, draft);
    expect([a.slug, b.slug, c.slug]).toEqual([
      "on-the-patience-required-to-keep-a-show-arowana",
      "on-the-patience-required-to-keep-a-show-arowana-2",
      "on-the-patience-required-to-keep-a-show-arowana-3",
    ]);
  });

  test("custom slugs are validated and can't collide", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const a = await admin.as.mutation(api.services.journal.create, { ...draft, slug: "tank-of-one" });
    expect(a.slug).toBe("tank-of-one");
    await expect(admin.as.mutation(api.services.journal.create, { ...draft, slug: "tank-of-one" })).rejects.toThrow(
      /already used/,
    );
    await expect(admin.as.mutation(api.services.journal.create, { ...draft, slug: "Bad Slug!" })).rejects.toThrow(/slug/i);

    const b = await admin.as.mutation(api.services.journal.create, draft);
    await expect(
      admin.as.mutation(api.services.journal.update, { id: b.id, ...draft, slug: "tank-of-one" }),
    ).rejects.toThrow(/already used/);
    // Saving a post with its own slug is fine, and omitting the slug keeps the current one.
    await admin.as.mutation(api.services.journal.update, { id: a.id, ...draft, slug: "tank-of-one" });
    const kept = await admin.as.mutation(api.services.journal.update, { id: b.id, ...draft, title: "A new title" });
    expect(kept.slug).toBe(b.slug);
  });

  test("validates lengths, cover URLs and body before publishing", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await expect(admin.as.mutation(api.services.journal.create, { ...draft, title: "x".repeat(141) })).rejects.toThrow(/Title/);
    await expect(admin.as.mutation(api.services.journal.create, { ...draft, excerpt: "x".repeat(301) })).rejects.toThrow(/Excerpt/);
    await expect(
      admin.as.mutation(api.services.journal.create, { ...draft, coverImageUrl: "http://example.test/a.png" }),
    ).rejects.toThrow(/https/);
    await expect(
      admin.as.mutation(api.services.journal.create, { ...draft, body: "  ", isPublished: true }),
    ).rejects.toThrow(/body/);
  });
});
