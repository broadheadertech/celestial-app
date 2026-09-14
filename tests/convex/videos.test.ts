import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { normalizeVideos, youtubeId } from "../../convex/lib/video";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

describe("video links", () => {
  test("recognises the common YouTube URL shapes", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
    ]) {
      expect(youtubeId(url)).toBe("dQw4w9WgXcQ");
    }
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
  });

  test("normalizes links and rejects anything unexpected", () => {
    expect(normalizeVideos([{ kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }])).toEqual([
      { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", durationSec: undefined },
    ]);
    expect(() => normalizeVideos([{ kind: "youtube", url: "https://evil.example/watch?v=x" }])).toThrow(/YouTube/);
    expect(() => normalizeVideos([{ kind: "facebook", url: "https://example.com/video" }])).toThrow(/Facebook/);
    expect(() => normalizeVideos([{ kind: "file", url: "http://insecure.example/clip.mp4" }])).toThrow(/https/);
    const six = Array.from({ length: 6 }, () => ({ kind: "youtube" as const, url: "https://youtu.be/dQw4w9WgXcQ" }));
    expect(() => normalizeVideos(six)).toThrow(/at most 5/);
  });
});

describe("product videos", () => {
  test("staff can attach videos; customers see them; guests can't edit", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const fish = ids.fish as Id<"products">;

    expect(
      await authErrorCode(
        t.mutation(api.services.products.updateProduct, { productId: fish, videos: [{ kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }] }),
      ),
    ).toBe("UNAUTHENTICATED");

    await admin.as.mutation(api.services.products.updateProduct, {
      productId: fish,
      videos: [{ kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }],
    });

    const publicView = await t.query(api.services.products.getProduct, { productId: fish });
    expect(publicView?.videos).toEqual([
      { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    ]);
  });
});

describe("editing a product saves storefront settings", () => {
  test("purchase mode and visibility persist through updateProduct", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const gear = ids.gear as Id<"products">;

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, purchaseMode: "enquire", visibility: "internal" });
    const saved = await t.run((ctx) => ctx.db.get(gear));
    expect(saved?.purchaseMode).toBe("enquire");
    expect(saved?.visibility).toBe("internal");

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, visibility: "public" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.visibility).toBe("public");

    await admin.as.mutation(api.services.products.updateProduct, { productId: gear, purchaseMode: "auto" });
    expect((await t.run((ctx) => ctx.db.get(gear)))?.purchaseMode).toBeUndefined();
  });
});
