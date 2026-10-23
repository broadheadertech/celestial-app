/**
 * Ordering rules for a product's photo gallery (components/admin/ProductPhotosField.tsx).
 *
 * The gallery is one ordered list, and **the first photo is the display picture** — that's the
 * invariant `products.image === products.images[0]`. The storefront already renders the gallery as
 * cover → videos → remaining photos, so "set as cover" simply moves a photo to the front and
 * everything downstream follows. Pure, so it's unit tested in tests/site/photoOrder.test.ts.
 */

/** The display picture: the first photo, or empty when there are none. */
export function coverOf(photos: string[]): string {
  return photos[0] ?? '';
}

/** Moves the photo at `index` by `delta` places. Out-of-range moves are ignored. */
export function movePhoto(photos: string[], index: number, delta: number): string[] {
  const target = index + delta;
  if (index < 0 || index >= photos.length || target < 0 || target >= photos.length) return photos;
  const next = [...photos];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Promotes a photo to the display picture, keeping the others in their existing order. */
export function setCover(photos: string[], index: number): string[] {
  if (index <= 0 || index >= photos.length) return photos;
  const next = [...photos];
  const [chosen] = next.splice(index, 1);
  return [chosen, ...next];
}

export function removePhoto(photos: string[], index: number): string[] {
  if (index < 0 || index >= photos.length) return photos;
  return photos.filter((_, i) => i !== index);
}

/** Appends newly uploaded photos, ignoring any already in the gallery. */
export function addPhotos(photos: string[], added: string[]): string[] {
  const seen = new Set(photos);
  return [...photos, ...added.filter((url) => url && !seen.has(url))];
}

/**
 * Reconciles a saved product into one ordered list with the display picture first — older rows
 * can have an `image` that isn't in `images` at all, or an empty `images`.
 */
export function galleryFrom(product: { image?: string; images?: string[] }): string[] {
  const photos = (product.images ?? []).filter(Boolean);
  const cover = product.image?.trim();
  if (!cover) return photos;
  const withoutCover = photos.filter((url) => url !== cover);
  return [cover, ...withoutCover];
}
