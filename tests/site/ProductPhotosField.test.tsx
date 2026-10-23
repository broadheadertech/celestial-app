import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/** Renders the admin photo gallery field, so its states are checked without a browser. */

vi.mock("convex/react", () => ({ useMutation: () => async () => "" }));
vi.mock("@/convex/_generated/api", () => ({ api: { files: { generateUploadUrl: "m", getFileUrl: "m" } } }));
vi.mock("@/lib/optimizeImage", () => ({ uploadOptimizedImage: async () => "storage-id" }));

const { default: ProductPhotosField } = await import("@/components/admin/ProductPhotosField");

const render = (photos: string[]) =>
  renderToStaticMarkup(<ProductPhotosField value={photos} onChange={() => {}} />);

describe("the photo gallery field", () => {
  test("invites a first upload when empty", () => {
    const html = render([]);
    expect(html).toContain("Add photos");
    expect(html).toContain("You can pick several at once");
    expect(html).toContain("(0/12)");
    // Nothing to reorder yet.
    expect(html).not.toContain("Display</span>");
  });

  test("marks the first photo as the display picture, and only that one", () => {
    const html = render(["a.webp", "b.webp", "c.webp"]);
    expect(html.match(/>Display</g)).toHaveLength(1);
    expect(html).toContain('alt="Display picture"');
    expect(html).toContain('alt="Photo 2"');
    expect(html).toContain("(3/12)");
  });

  test("offers 'use as display picture' on every photo except the cover", () => {
    const html = render(["a.webp", "b.webp", "c.webp"]);
    expect(html.match(/use photo \d+ as the display picture/gi)).toHaveLength(2);
    expect(html).not.toContain("Use photo 1 as the display picture");
  });

  test("disables the arrows at each end so a photo can't be lost", () => {
    const html = render(["a.webp", "b.webp"]);
    // The whole <button> tag carrying that label — attribute order isn't guaranteed, and the
    // Tailwind class `disabled:opacity-30` would match a looser pattern.
    const button = (label: string) => {
      const at = html.indexOf(`aria-label="${label}"`);
      expect(at, `no button labelled "${label}"`).toBeGreaterThan(-1);
      return html.slice(html.lastIndexOf("<button", at), html.indexOf(">", at) + 1);
    };
    const isDisabled = (label: string) => / disabled=""/.test(button(label));

    // First photo can't move earlier; last can't move later.
    expect(isDisabled("Move photo 1 earlier")).toBe(true);
    expect(isDisabled("Move photo 2 later")).toBe(true);
    expect(isDisabled("Move photo 1 later")).toBe(false);
    expect(isDisabled("Move photo 2 earlier")).toBe(false);
  });

  test("every photo can be removed, and each tile is draggable", () => {
    const html = render(["a.webp", "b.webp"]);
    expect(html.match(/aria-label="Remove photo \d+"/g)).toHaveLength(2);
    expect(html.match(/draggable="true"/g)).toHaveLength(2);
  });

  test("shows how much room is left, and closes the door at the maximum", () => {
    expect(render(Array.from({ length: 10 }, (_, i) => `p${i}.webp`))).toContain("Add more (2 left)");
    const full = render(Array.from({ length: 12 }, (_, i) => `p${i}.webp`));
    expect(full).toContain("Maximum 12 photos");
    expect(full).toMatch(/<button[^>]*disabled/);
  });
});
