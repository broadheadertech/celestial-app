import type { Metadata } from 'next';
import JsonLd from '@/components/dc/JsonLd';
import { getBuildBusiness } from '@/lib/buildCatalog';
import { venuePageLd, type BusinessLike } from '@/lib/structuredData';

const SITE_URL = 'https://dc.broadheader.com';
const FALLBACK_BUSINESS: BusinessLike = { storeName: "Dragon's Cave" };

/**
 * The Cave is the venue page now — address, hours, booking and how we work — so its title and
 * description are built from Business Details rather than describing a fish listing. The old
 * /visit and /about pages redirect here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const business = (await getBuildBusiness()) ?? FALLBACK_BUSINESS;
  const city = (business.city || '').trim();
  const name = business.storeName || FALLBACK_BUSINESS.storeName;

  return {
    title: city ? `The Cave — Visit us in ${city}` : 'The Cave — Visit us',
    description:
      `Where to find ${name}, our opening hours, and how to book a private viewing. ` +
      'See the fish in person before you commit — by appointment, no pressure to buy.',
    alternates: { canonical: '/cave' },
  };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const business = (await getBuildBusiness()) ?? FALLBACK_BUSINESS;
  const city = (business.city || '').trim();

  return (
    <>
      <JsonLd
        data={venuePageLd(business, {
          siteUrl: SITE_URL,
          path: '/cave',
          name: city ? `The Cave — Visit us in ${city}` : 'The Cave — Visit us',
          description: `Address, opening hours and viewing bookings for ${business.storeName || 'the shop'}.`,
        })}
      />
      {children}
    </>
  );
}
