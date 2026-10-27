'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import RedirectTo from '@/components/dc/RedirectTo';

/**
 * Old article links keep working: the slug is carried over to the Drago-knows article page.
 * vercel.json preserves the query string on the 308; this covers the Capacitor app, which has
 * no redirect layer.
 */
function Redirect() {
  const slug = useSearchParams().get('slug');
  return <RedirectTo to={slug ? `/drago-knows/article?slug=${encodeURIComponent(slug)}` : '/drago-knows'} what="This article" />;
}

export default function JournalArticlePage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
