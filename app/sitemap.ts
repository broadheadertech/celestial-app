import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE = 'https://dc.broadheader.com';

// Static storefront pages. Individual specimens use ?id= query URLs, which aren't listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [
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
  return pages.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    changeFrequency: 'weekly',
    priority,
  }));
}
