import type { MetadataRoute } from 'next';
import https from 'node:https';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

/** Minimal fetch over node:https (not intercepted or cached by Next.js). Build-time only. */
const uncachedFetch: typeof fetch = (input, init) =>
  new Promise<Response>((resolve, reject) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const req = https.request(url, { method: init?.method ?? 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === 'string') responseHeaders.set(key, value);
          else if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
        }
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 500, headers: responseHeaders }));
      });
    });
    req.on('error', reject);
    if (typeof init?.body === 'string') req.write(init.body);
    req.end();
  });

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

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return entries;
  try {
    // Bypass Next's patched fetch: its build-time data cache would reuse the catalog from an
    // older build (locally and in Vercel's build cache), and `no-store` isn't allowed here.
    const client = new ConvexHttpClient(convexUrl, { fetch: uncachedFetch });
    const products = await Promise.race([
      client.query(api.services.products.getCatalogProducts, {}),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15_000)),
    ]);
    for (const p of products) {
      if (!p.slug || p.stock <= 0) continue;
      entries.push({
        url: `${BASE}/specimen/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (error) {
    console.warn('[sitemap] could not load products, listing static pages only:', error);
  }
  return entries;
}
