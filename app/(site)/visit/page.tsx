'use client';

import RedirectTo from '@/components/dc/RedirectTo';

/** Visiting and booking are part of The Cave now — one page for the venue. */
export default function VisitPage() {
  return <RedirectTo to="/cave" what="Visiting and booking" />;
}
