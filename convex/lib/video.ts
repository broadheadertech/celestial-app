import { v, Infer } from "convex/values";

/**
 * Product videos: clips uploaded to Convex storage ("file"), or YouTube / Facebook links.
 * Stored on products.videos in display order.
 */
export const productVideoValidator = v.object({
  kind: v.union(v.literal("file"), v.literal("youtube"), v.literal("facebook")),
  url: v.string(),
  posterUrl: v.optional(v.string()), // still frame shown before playback (file videos)
  durationSec: v.optional(v.number()),
  storageId: v.optional(v.id("_storage")), // for uploaded clips, so they can be cleaned up later
});

export type ProductVideo = Infer<typeof productVideoValidator>;

export const MAX_VIDEOS_PER_PRODUCT = 5;

/** YouTube video id from watch / youtu.be / shorts / embed URLs, or null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = /^\/(shorts|embed|live)\/([^/?#]+)/.exec(u.pathname);
        id = m ? m[2] : null;
      }
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function isFacebookVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\.|^web\./, "");
    return u.protocol === "https:" && (host === "facebook.com" || host === "fb.watch");
  } catch {
    return false;
  }
}

const isHttps = (url: string | undefined) => {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/** Validates and canonicalises videos from the admin form; throws a user-facing message. */
export function normalizeVideos(videos: ProductVideo[] | undefined): ProductVideo[] | undefined {
  if (videos === undefined) return undefined;
  if (videos.length > MAX_VIDEOS_PER_PRODUCT) {
    throw new Error(`A product can have at most ${MAX_VIDEOS_PER_PRODUCT} videos`);
  }
  return videos.map((video) => {
    const durationSec =
      video.durationSec !== undefined && Number.isFinite(video.durationSec) && video.durationSec > 0
        ? Math.round(video.durationSec)
        : undefined;
    if (video.kind === "youtube") {
      const id = youtubeId(video.url.trim());
      if (!id) throw new Error("That doesn't look like a YouTube video link");
      return { kind: "youtube" as const, url: `https://www.youtube.com/watch?v=${id}`, durationSec };
    }
    if (video.kind === "facebook") {
      const url = video.url.trim();
      if (!isFacebookVideoUrl(url)) throw new Error("That doesn't look like a Facebook video link");
      return { kind: "facebook" as const, url, durationSec };
    }
    if (!isHttps(video.url)) throw new Error("Uploaded video URL must be https");
    if (video.posterUrl && !isHttps(video.posterUrl)) throw new Error("Video poster URL must be https");
    return {
      kind: "file" as const,
      url: video.url,
      posterUrl: video.posterUrl,
      durationSec,
      storageId: video.storageId,
    };
  });
}
