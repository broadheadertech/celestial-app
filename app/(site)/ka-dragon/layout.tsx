import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { getBuildBusiness, getBuildTestimonials } from '@/lib/buildCatalog';
import { reviewGalleryLd, type BusinessLike } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const FALLBACK_BUSINESS: BusinessLike = { storeName: "Dragon's Cave" };
const TITLE = 'Certified Ka-Dragon — our keepers';
const DESCRIPTION =
  'The keepers who took a fish home: what they bought and what they made of it. Real customers of ' +
  "Dragon's Cave, published with their permission.";

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/ka-dragon' },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [testimonials, business] = await Promise.all([getBuildTestimonials(), getBuildBusiness()]);

  return (
    <>
      <JsonLd
        data={reviewGalleryLd(testimonials ?? [], business ?? FALLBACK_BUSINESS, {
          siteUrl: SITE_URL,
          path: '/ka-dragon',
          name: TITLE,
          description: DESCRIPTION,
        })}
      />
      {children}
    </>
  );
}
