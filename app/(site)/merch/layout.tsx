import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { merchList } from '@/components/dc/listings';
import { getBuildCatalog } from '@/lib/buildCatalog';
import { collectionLd } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const TITLE = 'Dragon Merch — shirts, mugs & decals';
const DESCRIPTION =
  'Branded merch from Dragon’s Cave: shirts, mugs and decals, made in small runs. See the range worn and used, then order in the Shop.';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/merch' },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const merch = merchList((await getBuildCatalog()) ?? []);

  return (
    <>
      <JsonLd
        data={collectionLd(merch, { siteUrl: SITE_URL, path: '/merch', name: TITLE, description: DESCRIPTION })}
      />
      {children}
    </>
  );
}
