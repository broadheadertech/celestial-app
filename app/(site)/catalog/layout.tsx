import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { catalogList } from '@/components/dc/listings';
import { getBuildCatalog } from '@/lib/buildCatalog';
import { collectionLd } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const TITLE = 'The Catalog — Asian Arowana';
const DESCRIPTION =
  'Asian arowana on display now: Super Red, Crossback, Red Tail Gold and more. Every specimen chipped, certified and quarantined.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/catalog' },
};

/**
 * The listing is also emitted as CollectionPage/ItemList structured data, built from the same
 * catalogList() the page itself uses, so answer engines can enumerate what is actually on show.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const products = catalogList((await getBuildCatalog()) ?? []);

  return (
    <>
      <JsonLd
        data={collectionLd(products, { siteUrl: SITE_URL, path: '/catalog', name: TITLE, description: DESCRIPTION })}
      />
      {children}
    </>
  );
}
