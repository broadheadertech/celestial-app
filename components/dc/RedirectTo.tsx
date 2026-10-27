'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A retired page that now lives somewhere else.
 *
 * vercel.json sends a 308 for these on the website, which is what search engines and the AI
 * crawlers follow. This client-side replace is for the Capacitor app, which has no rewrite or
 * redirect layer at all — and for anyone who lands here from an old bookmark or a shared link.
 * The visible link is the fallback if JavaScript never runs.
 */
export default function RedirectTo({ to, what }: { to: string; what: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <main className="dk">
      <section className="dk-section">
        <div className="dk-wrap narrow" style={{ textAlign: 'center' }}>
          <p className="dk-eyebrow">Moved</p>
          <h1 className="dk-h2">{what} now lives in The Cave.</h1>
          <p className="dk-lede dk-muted" style={{ maxWidth: 480, margin: '16px auto 0' }}>
            Taking you there now.
          </p>
          <div className="dk-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
            <Link href={to} className="dk-btn dk-btn-red">
              Go to The Cave
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
