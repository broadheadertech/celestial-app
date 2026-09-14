import { youtubeId, type ProductVideo } from '@/convex/lib/video';

export type { ProductVideo };

/** Privacy-friendly YouTube embed (no cookies until play), or null. */
export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}

export function youtubeThumbUrl(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function facebookEmbedUrl(url: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=734`;
}

/** Best still image for a video thumbnail (poster for uploads, YouTube thumbnail for links). */
export function videoThumb(video: ProductVideo): string | null {
  if (video.kind === 'file') return video.posterUrl ?? null;
  if (video.kind === 'youtube') return youtubeThumbUrl(video.url);
  return null;
}

export const formatDuration = (sec?: number) =>
  sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : '';
