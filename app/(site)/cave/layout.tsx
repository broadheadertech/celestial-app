import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { caveList } from '@/components/dc/listings';
import { getBuildCatalog } from '@/lib/buildCatalog';
import { collectionLd } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const TITLE = 'The Cave — Exotic Fish';
const DESCRIPTION =
  'Discus, stingrays, cichlids, predators and oddballs from our gallery water. Enquire about any specimen.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/cave' },
};

/** Same listing as the page, emitted as CollectionPage/ItemList for search and answer engines. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const products = caveList((await getBuildCatalog()) ?? []);

  return (
    <>
      <JsonLd
        data={collectionLd(products, { siteUrl: SITE_URL, path: '/cave', name: TITLE, description: DESCRIPTION })}
      />
      {children}
    </>
  );
}
