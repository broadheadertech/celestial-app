import https from 'node:https';
import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReturnType } from 'convex/server';
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

export type BuildCatalogProduct = FunctionReturnType<typeof api.services.products.getCatalogProducts>[number];

let catalog: Promise<BuildCatalogProduct[] | null> | undefined;

/**
 * The public catalog as of this build (sitemap, per-product share pages). Fetched once per
 * build worker. Resolves to null when Convex can't be reached, so pages degrade instead of
 * failing the build.
 */
export function getBuildCatalog(): Promise<BuildCatalogProduct[] | null> {
  catalog ??= (async () => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return null;
    try {
      // Bypass Next's patched fetch: its build-time data cache would reuse the catalog from an
      // older build (locally and in Vercel's build cache), and `no-store` isn't allowed here.
      const client = new ConvexHttpClient(convexUrl, { fetch: uncachedFetch });
      return await Promise.race([
        client.query(api.services.products.getCatalogProducts, {}),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15_000)),
      ]);
    } catch (error) {
      console.warn('[build catalog] could not load products:', error);
      return null;
    }
  })();
  return catalog;
}
