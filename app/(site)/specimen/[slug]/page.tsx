import type { Metadata } from 'next';
import SpecimenView from '@/components/dc/SpecimenView';
import JsonLd from '@/components/dc/JsonLd';
import { getBuildBusiness, getBuildCatalog } from '@/lib/buildCatalog';
import { breadcrumbLd, productLd, productSummary, type BusinessLike } from '@/lib/structuredData';
import { isArowana, isFish, kindName } from '@/components/dc/fish';

/**
 * Readable product URLs, prerendered per product at build time so link previews on
 * Facebook/Messenger/WhatsApp show the product's own photo, name and price (their crawlers
 * don't run JavaScript). Products added after the last deploy aren't prerendered; Vercel
 * serves those through the vercel.json rewrite to /specimen-detail instead.
 *
 * The Product and BreadcrumbList JSON-LD is rendered into the HTML here for the same reason:
 * SpecimenView also sets it on the client, but no crawler or answer engine sees that.
 */

export const dynamicParams = false;

// Static export needs at least one path; used only when Convex is unreachable during the build.
const OFFLINE_PLACEHOLDER = '__catalog-unavailable';

const SITE_URL = 'https://dc.broadheader.com';
const FALLBACK_BUSINESS: BusinessLike = { storeName: "Dragon's Cave" };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const products = await getBuildCatalog();
  const slugs = (products ?? []).flatMap((p) => (p.slug ? [{ slug: p.slug }] : []));
  return slugs.length ? slugs : [{ slug: OFFLINE_PLACEHOLDER }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getBuildCatalog())?.find((p) => p.slug === slug);
  if (!product) return { title: 'Specimen', robots: { index: false } };
  const business = (await getBuildBusiness()) ?? FALLBACK_BUSINESS;

  const title = product.name; // public payloads already carry the customer-facing display name
  // Most products have no description yet, so the fallback is built from the fields we do hold
  // (category, price, availability, town) rather than being the bare price it used to be.
  const summary = productSummary(product, business);
  const description = product.description ? `${product.description.trim().slice(0, 180)} — ${summary}` : summary;
  const image = product.image || product.images?.[0];
  const url = `/specimen/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: business.storeName || FALLBACK_BUSINESS.storeName,
      locale: 'en_PH',
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function SpecimenSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await getBuildCatalog())?.find((p) => p.slug === slug);
  const business = (await getBuildBusiness()) ?? FALLBACK_BUSINESS;

  // The crumb has to name the page the product is actually listed on: only arowana are in The
  // Bloodlines, and everything else — other fish included — is in the Shop. Classification uses
  // the internal name via kindName(), per the storefront rules.
  const inBloodlines = product ? isFish(product) && isArowana(kindName(product)) : false;
  const section = inBloodlines
    ? { name: 'The Bloodlines', path: '/catalog' }
    : { name: 'Shop', path: '/shop' };

  return (
    <>
      {product ? (
        <JsonLd
          id="product-jsonld"
          data={[
            productLd(product, business, { siteUrl: SITE_URL }),
            breadcrumbLd(
              [
                { name: 'Home', path: '/' },
                section,
                { name: product.name, path: `/specimen/${product.slug}` },
              ],
              { siteUrl: SITE_URL },
            ),
          ]}
        />
      ) : null}
      <SpecimenView />
    </>
  );
}
