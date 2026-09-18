'use client';

import { useEffect } from 'react';

/** Hosts that report to Vercel Web Analytics (the script only exists on Vercel deployments). */
const ANALYTICS_HOSTS = new Set(['dc.broadheader.com']);

type AnalyticsEvent = { type: 'pageview' | 'event'; url: string };
type VaFn = ((...args: unknown[]) => void) & { q?: unknown[] };

/**
 * Privacy-friendly page-view counts via Vercel Web Analytics (no cookies), loaded the same way
 * @vercel/analytics does it — without the package, whose optional peer dependencies conflict with
 * this repo's tooling. Enable "Web Analytics" for the project in the Vercel dashboard to see data.
 *  - only on the live site: never in the Android app, previews or local builds (the script 404s there)
 *  - staff/admin and account screens are not counted
 *  - query strings are dropped except the product id on /specimen-detail
 */
export default function SiteAnalytics() {
  useEffect(() => {
    if (!ANALYTICS_HOSTS.has(window.location.hostname)) return;
    if (document.getElementById('vercel-analytics')) return;

    const w = window as unknown as { va?: VaFn; vaq?: unknown[] };
    w.va =
      w.va ||
      function (...args: unknown[]) {
        (w.vaq = w.vaq || []).push(args);
      };
    w.va('beforeSend', (event: AnalyticsEvent) => {
      const url = new URL(event.url);
      if (/^\/(admin|control_panel|client|auth|account)(\/|$)/.test(url.pathname)) return null;
      const id = url.pathname === '/specimen-detail' ? url.searchParams.get('id') : null;
      url.search = id ? `?id=${encodeURIComponent(id)}` : '';
      return { ...event, url: url.toString() };
    });

    const script = document.createElement('script');
    script.id = 'vercel-analytics';
    script.src = '/_vercel/insights/script.js';
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
