import type { MetadataRoute } from 'next';
import { getBuildCatalog } from '@/lib/buildCatalog';

export const dynamic = 'force-static';

const BASE = 'https://dc.broadheader.com';

// /visit and /about are 308 redirects into /cave (see vercel.json) and are deliberately absent.
const PAGES: [string, number][] = [
  ['', 1],
  ['/catalog', 0.9],
  ['/shop', 0.9],
  ['/cave', 0.8],
  ['/home-service', 0.7],
  ['/contact', 0.5],
  ['/journal', 0.4],
  ['/track', 0.3],
];

/**
 * Generated at build time (static export). Product URLs reflect the catalog as of the last
 * deploy; if Convex can't be reached during the build, only the static pages are listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = PAGES.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    changeFrequency: 'weekly',
    priority,
  }));

  const products = await getBuildCatalog();
  if (!products) {
    console.warn('[sitemap] could not load products, listing static pages only');
    return entries;
  }
  for (const p of products) {
    if (!p.slug) continue;
    // Out-of-stock specimens stay listed: their pages are real, prerendered content and more than
    // half the public catalog sits at zero stock, so skipping them hid most of the site from
    // search. They rank lower and are crawled less often than what is actually available.
    const available = p.stock > 0;
    entries.push({
      url: `${BASE}/specimen/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: available ? 'weekly' : 'monthly',
      priority: available ? 0.6 : 0.4,
    });
  }
  return entries;
}
