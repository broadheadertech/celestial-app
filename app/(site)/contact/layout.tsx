import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { getBuildFaqs } from '@/lib/buildCatalog';
import { faqPageLd } from '@/lib/structuredData';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Contact',
  description: 'Message us about a specimen, an order or a visit.',
  alternates: { canonical: '/contact' },
};

/**
 * FAQPage structured data, rendered into the HTML. The page used to build this in a useEffect,
 * which meant the one audience for it — crawlers and answer engines, none of which run
 * JavaScript — never saw a single question. FAQs published since the last deploy appear on the
 * next website rebuild.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const faqs = (await getBuildFaqs()) ?? [];

  return (
    <>
      <JsonLd data={faqPageLd(faqs)} />
      {children}
    </>
  );
}
