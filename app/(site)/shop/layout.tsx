import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { shopList } from '@/components/dc/listings';
import { getBuildCatalog } from '@/lib/buildCatalog';
import { collectionLd } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const TITLE = 'Shop — Food, Lights & Gear';
const DESCRIPTION =
  'Aquarium food, lighting, tanks and accessories we use ourselves. Order online, pay after we confirm.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/shop' },
};

/** Same cart-mode stock as the page, emitted as CollectionPage/ItemList. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const products = shopList((await getBuildCatalog()) ?? []);

  return (
    <>
      <JsonLd
        data={collectionLd(products, { siteUrl: SITE_URL, path: '/shop', name: TITLE, description: DESCRIPTION })}
      />
      {children}
    </>
  );
}
