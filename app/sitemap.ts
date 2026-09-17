import type { MetadataRoute } from 'next';
import { getBuildCatalog } from '@/lib/buildCatalog';

export const dynamic = 'force-static';

const BASE = 'https://dc.broadheader.com';

const PAGES: [string, number][] = [
  ['', 1],
  ['/catalog', 0.9],
  ['/cave', 0.8],
  ['/shop', 0.8],
  ['/visit', 0.7],
  ['/contact', 0.5],
  ['/track', 0.3],
  ['/about', 0.4],
  ['/journal', 0.4],
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
    if (!p.slug || p.stock <= 0) continue;
    entries.push({
      url: `${BASE}/specimen/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }
  return entries;
}
