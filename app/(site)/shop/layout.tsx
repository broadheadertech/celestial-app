import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { allProductsList, availableOnly } from '@/components/dc/listings';
import { getBuildCatalog } from '@/lib/buildCatalog';
import { collectionLd } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const TITLE = 'Shop — Live fish, tanks, food & gear';
const DESCRIPTION =
  'Everything we keep, in one place: live arowana and exotic fish, plus tanks, filtration, food and lighting. ' +
  'Filter by what you are after. Fish are reserved by message; gear can be ordered online.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/shop' },
};

/**
 * The Shop is the one product surface now, so its ItemList covers every available product
 * rather than the cart-only subset it listed when fish lived on their own pages. It mirrors the
 * page's default view — available first — so the structured data matches what a visitor lands on.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const products = availableOnly(allProductsList((await getBuildCatalog()) ?? []));

  return (
    <>
      <JsonLd
        data={collectionLd(products, {
          siteUrl: SITE_URL,
          path: '/shop',
          name: TITLE,
          description: DESCRIPTION,
          limit: 120,
        })}
      />
      {children}
    </>
  );
}
