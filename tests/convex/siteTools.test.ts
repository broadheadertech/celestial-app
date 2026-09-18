import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

const HOOK = "https://api.vercel.com/v1/integrations/deploy/prj_test/hook";

describe("website rebuilds", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.VERCEL_DEPLOY_HOOK_URL;
  });

  test("not configured: staff see it, requests are refused, the cron does nothing", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.siteBuild.getStatus, {}))).toBe("FORBIDDEN");
    expect((await admin.as.query(api.services.siteBuild.getStatus, {})).configured).toBe(false);
    await expect(admin.as.mutation(api.services.siteBuild.requestRebuild, {})).rejects.toThrow(/aren't set up/);
    await t.action(internal.services.siteBuild.rebuildIfCatalogChanged, {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("manual request calls the hook once, then cools down; the cron only runs after product changes", async () => {
    process.env.VERCEL_DEPLOY_HOOK_URL = HOOK;
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");

    await admin.as.mutation(api.services.siteBuild.requestRebuild, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(HOOK);
    let status = await admin.as.query(api.services.siteBuild.getStatus, {});
    expect(status.last?.status).toBe("sent");
    expect(status.changedSinceLastBuild).toBe(false);

    await expect(admin.as.mutation(api.services.siteBuild.requestRebuild, {})).rejects.toThrow(/already updating/);

    await t.action(internal.services.siteBuild.rebuildIfCatalogChanged, {});
    expect(fetchMock).toHaveBeenCalledTimes(1); // nothing changed

    vi.advanceTimersByTime(60_000);
    await admin.as.mutation(api.services.products.updateProduct, { productId: ids.gear as Id<"products">, price: 1600 });
    status = await admin.as.query(api.services.siteBuild.getStatus, {});
    expect(status.changedSinceLastBuild).toBe(true);
    await t.action(internal.services.siteBuild.rebuildIfCatalogChanged, {});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("a failed hook call is recorded as failed", async () => {
    process.env.VERCEL_DEPLOY_HOOK_URL = HOOK;
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 404 }));
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await admin.as.mutation(api.services.siteBuild.requestRebuild, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const status = await admin.as.query(api.services.siteBuild.getStatus, {});
    expect(status.last).toMatchObject({ status: "failed", detail: "Vercel responded 404" });
  });
});

describe("oversized product photos", () => {
  test("lists photos over 1 MB and swaps in a smaller copy", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const admin = await signedInAs(t, "admin");
    const client = await signedInAs(t, "client");
    const fish = ids.fish as Id<"products">;

    const { bigUrl, smallId } = await t.run(async (ctx) => {
      const bigId = await ctx.storage.store(new Blob([new Uint8Array(1_200_000)], { type: "image/jpeg" }));
      const smallId = await ctx.storage.store(new Blob([new Uint8Array(1000)], { type: "image/webp" }));
      const bigUrl = (await ctx.storage.getUrl(bigId))!;
      await ctx.db.patch(fish, { image: bigUrl, images: [bigUrl, "https://example.test/other.png"] });
      return { bigUrl, smallId };
    });

    expect(await authErrorCode(client.as.query(api.services.productPhotos.getOversizedPhotos, {}))).toBe("FORBIDDEN");
    const oversized = await admin.as.query(api.services.productPhotos.getOversizedPhotos, {});
    expect(oversized).toEqual([{ productId: fish, url: bigUrl, size: 1_200_000 }]);

    const newUrl = await admin.as.mutation(api.services.productPhotos.replaceProductPhoto, { productId: fish, oldUrl: bigUrl, newStorageId: smallId });
    const product = await t.run((ctx) => ctx.db.get(fish));
    expect(product?.image).toBe(newUrl);
    expect(product?.images).toEqual([newUrl, "https://example.test/other.png"]);
    expect(await admin.as.query(api.services.productPhotos.getOversizedPhotos, {})).toEqual([]);

    await expect(
      admin.as.mutation(api.services.productPhotos.replaceProductPhoto, { productId: fish, oldUrl: bigUrl, newStorageId: smallId }),
    ).rejects.toThrow(/no longer on this product/);
  });
});
