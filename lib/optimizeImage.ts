/**
 * Shrinks a photo in the browser before it is uploaded to Convex storage:
 *  - longest side capped at `maxEdge` (default 1600px), EXIF rotation applied
 *  - re-encoded as WebP (keeps transparency), or JPEG/PNG where WebP encoding isn't available
 *  - re-encoding drops EXIF metadata, including a phone's GPS location
 * Small images that wouldn't get smaller are uploaded unchanged.
 */

import type { Id } from '@/convex/_generated/dataModel';

export const MAX_IMAGE_EDGE = 1600;

const HEIC_MESSAGE =
  "HEIC photos can't be shown on the website. On iPhone, choose Settings → Camera → Formats → Most Compatible, or share the photo as JPG first.";

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeImage(file: File, { maxEdge = MAX_IMAGE_EDGE, quality = 0.82 } = {}): Promise<Blob> {
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  // Animated GIFs and SVGs would lose animation / sharpness on a canvas.
  if (/^image\/(gif|svg\+xml)$/i.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (isHeic) throw new Error(HEIC_MESSAGE);
    return file; // Unknown format the browser can't read — upload as-is.
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      // Older Safari can't encode WebP: keep PNG for PNGs (transparency), JPEG otherwise.
      blob = file.type === 'image/png' ? await toBlob(canvas, 'image/png', 1) : await toBlob(canvas, 'image/jpeg', quality);
    }
    if (!blob) {
      if (isHeic) throw new Error(HEIC_MESSAGE);
      return file;
    }
    // HEIC must always be converted (browsers other than Safari can't display it).
    return scale === 1 && blob.size >= file.size && !isHeic ? file : blob;
  } finally {
    bitmap.close();
  }
}

/** Optimizes then uploads to a Convex upload URL; returns the storage id. */
export async function uploadOptimizedImage(uploadUrl: string, file: File): Promise<Id<'_storage'>> {
  const body = await optimizeImage(file);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': body.type || file.type || 'application/octet-stream' },
    body,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const { storageId } = await res.json();
  return storageId as Id<'_storage'>;
}
