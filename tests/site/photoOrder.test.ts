import { describe, expect, test } from "vitest";
import { addPhotos, coverOf, galleryFrom, movePhoto, removePhoto, setCover } from "../../lib/photoOrder";

const A = "a.webp";
const B = "b.webp";
const C = "c.webp";

describe("the display picture is the first photo", () => {
  test("coverOf reads it, and copes with an empty gallery", () => {
    expect(coverOf([A, B])).toBe(A);
    expect(coverOf([])).toBe("");
  });

  test("setCover promotes a photo and keeps the rest in order", () => {
    expect(setCover([A, B, C], 2)).toEqual([C, A, B]);
    expect(setCover([A, B, C], 1)).toEqual([B, A, C]);
  });

  test("setCover on the current cover, or out of range, changes nothing", () => {
    const photos = [A, B, C];
    expect(setCover(photos, 0)).toBe(photos);
    expect(setCover(photos, 9)).toBe(photos);
    expect(setCover(photos, -1)).toBe(photos);
  });
});

describe("reordering", () => {
  test("moves a photo one place in either direction", () => {
    expect(movePhoto([A, B, C], 0, 1)).toEqual([B, A, C]);
    expect(movePhoto([A, B, C], 2, -1)).toEqual([A, C, B]);
  });

  test("moving past either end is ignored rather than losing a photo", () => {
    const photos = [A, B, C];
    expect(movePhoto(photos, 0, -1)).toBe(photos);
    expect(movePhoto(photos, 2, 1)).toBe(photos);
    expect(movePhoto(photos, 5, 1)).toBe(photos);
  });

  test("moving the second photo to the front makes it the display picture", () => {
    const next = movePhoto([A, B, C], 1, -1);
    expect(coverOf(next)).toBe(B);
  });
});

describe("adding and removing", () => {
  test("removing the display picture promotes the next photo", () => {
    const next = removePhoto([A, B, C], 0);
    expect(next).toEqual([B, C]);
    expect(coverOf(next)).toBe(B);
  });

  test("removing the last photo leaves no display picture", () => {
    expect(coverOf(removePhoto([A], 0))).toBe("");
  });

  test("removing a middle photo leaves the cover alone", () => {
    expect(coverOf(removePhoto([A, B, C], 1))).toBe(A);
  });

  test("new photos go on the end, and duplicates are ignored", () => {
    expect(addPhotos([A], [B, C])).toEqual([A, B, C]);
    expect(addPhotos([A, B], [B, C])).toEqual([A, B, C]);
    expect(addPhotos([], [A])).toEqual([A]);
    expect(addPhotos([A], [""])).toEqual([A]);
  });
});

describe("reading a saved product", () => {
  test("puts the saved display picture first", () => {
    expect(galleryFrom({ image: C, images: [A, B, C] })).toEqual([C, A, B]);
  });

  test("repairs an older row whose image wasn't in images", () => {
    expect(galleryFrom({ image: C, images: [A, B] })).toEqual([C, A, B]);
  });

  test("copes with only a single image, or none at all", () => {
    expect(galleryFrom({ image: A })).toEqual([A]);
    expect(galleryFrom({ image: A, images: [] })).toEqual([A]);
    expect(galleryFrom({ images: [A, B] })).toEqual([A, B]);
    expect(galleryFrom({})).toEqual([]);
    expect(galleryFrom({ image: "  " })).toEqual([]);
  });

  test("a round trip through the gallery is stable", () => {
    const saved = { image: A, images: [A, B, C] };
    const gallery = galleryFrom(saved);
    expect(gallery).toEqual([A, B, C]);
    // What the form would save back.
    expect({ image: coverOf(gallery), images: gallery }).toEqual(saved);
  });
});
