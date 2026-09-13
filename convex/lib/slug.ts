import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/** "Super Red Arowana 10-12\"" → "super-red-arowana-10-12". */
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "item";
}

/**
 * A slug for `name` that no other product uses (appends -2, -3, …). Product slugs are set
 * once and kept when the product is renamed, so shared links don't break.
 */
export async function uniqueProductSlug(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"products">,
): Promise<string> {
  const base = slugify(name);
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!taken || taken._id === excludeId) return candidate;
  }
  // Pathological fallback: guarantee uniqueness with the id suffix.
  return `${base}-${Date.now().toString(36)}`;
}
