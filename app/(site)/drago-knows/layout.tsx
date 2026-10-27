import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { getBuildBusiness, getBuildPosts } from '@/lib/buildCatalog';
import { blogLd, type BusinessLike } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const FALLBACK_BUSINESS: BusinessLike = { storeName: "Dragon's Cave" };
const TITLE = 'Drago-knows — fishkeeping care guides';
const DESCRIPTION =
  'Care guides from our own tanks: arowana husbandry, water chemistry, filtration, feeding, tankmates and disease — ' +
  'how to keep a whole freshwater ecosystem healthy, not just one fish.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/drago-knows' },
};

/**
 * Blog + BlogPosting structured data. Care content is the most quotable thing on the site for an
 * answer engine fielding "how do I keep an arowana", so it is worth being explicit about who
 * wrote it and which shop stands behind it.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const [posts, business] = await Promise.all([getBuildPosts(), getBuildBusiness()]);

  return (
    <>
      <JsonLd
        data={blogLd(posts ?? [], business ?? FALLBACK_BUSINESS, {
          siteUrl: SITE_URL,
          path: '/drago-knows',
          name: TITLE,
          description: DESCRIPTION,
        })}
      />
      {children}
    </>
  );
}
