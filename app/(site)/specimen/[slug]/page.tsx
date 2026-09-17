import type { Metadata } from 'next';
import SpecimenView from '@/components/dc/SpecimenView';
import { getBuildCatalog } from '@/lib/buildCatalog';

/**
 * Readable product URLs, prerendered per product at build time so link previews on
 * Facebook/Messenger/WhatsApp show the product's own photo, name and price (their crawlers
 * don't run JavaScript). Products added after the last deploy aren't prerendered; Vercel
 * serves those through the vercel.json rewrite to /specimen-detail instead.
 */

export const dynamicParams = false;

// Static export needs at least one path; used only when Convex is unreachable during the build.
const OFFLINE_PLACEHOLDER = '__catalog-unavailable';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const products = await getBuildCatalog();
  const slugs = (products ?? []).flatMap((p) => (p.slug ? [{ slug: p.slug }] : []));
  return slugs.length ? slugs : [{ slug: OFFLINE_PLACEHOLDER }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getBuildCatalog())?.find((p) => p.slug === slug);
  if (!product) return { title: 'Specimen', robots: { index: false } };

  const title = product.name; // public payloads already carry the customer-facing display name
  const summary = `${peso.format(product.price)} · ${product.stock > 0 ? 'Available now' : 'Currently unavailable'} at Dragon's Cave`;
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
      siteName: "Dragon's Cave",
      locale: 'en_PH',
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default function SpecimenSlugPage() {
  return <SpecimenView />;
}
