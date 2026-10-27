/**
 * schema.org JSON-LD for the storefront, built as plain objects by pure functions so they can be
 * rendered into the prerendered HTML (see components/dc/JsonLd.tsx) and unit-tested.
 *
 * Why server-rendered: the storefront used to inject its Product/FAQ JSON-LD from a useEffect, so
 * only browsers ever saw it. Facebook/Messenger link crawlers and the AI answer engines (GPTBot,
 * PerplexityBot, ClaudeBot, Google-Extended) do not run JavaScript, so none of it reached them.
 *
 * Rule for everything here: never emit a field we do not actually have. An empty string or a
 * zero rating is worse than an absent property — it reads as a lie to a validator.
 */

import { isIncoming, type MaybeIncoming } from '@/components/dc/preorder';

export type BusinessLike = {
  storeName?: string;
  tagline?: string;
  establishedYear?: string;
  phone?: string;
  landline?: string;
  whatsappNumber?: string;
  email?: string;
  addressLine?: string;
  city?: string;
  mapUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  hours?: { day: string; open: string; close: string; closed: boolean }[];
  hoursNote?: string;
};

/**
 * Extends the storefront's own MaybeIncoming so "is this pre-orderable" is decided by
 * isIncoming() here too — enabled alone isn't enough, it also needs an incoming quantity.
 */
export type ProductLike = MaybeIncoming & {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  images?: string[];
  sku?: string | number;
  slug?: string;
  categoryName?: string;
  updatedAt?: number;
};

export type Json = Record<string, unknown>;

/** Drops empty strings, null/undefined, empty arrays and empty objects, recursively. */
export function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value.map(compact).filter((v) => v !== undefined);
    return (arr.length ? arr : undefined) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = compact(v);
      if (c !== undefined) out[k] = c;
    }
    return (Object.keys(out).length ? out : undefined) as T;
  }
  if (typeof value === 'string') return (value.trim() || undefined) as T;
  return (value ?? undefined) as T;
}

const abs = (siteUrl: string, path: string) =>
  /^https?:\/\//.test(path) ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

/** The best phone number we actually hold, in international form where possible. */
export function bestPhone(b: BusinessLike): string | undefined {
  const raw = (b.phone || b.landline || b.whatsappNumber || '').trim();
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits || digits === '+') return undefined;
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('63')) return `+${digits}`;
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`;
  return digits;
}

/** schema.org OpeningHoursSpecification for the days the shop is actually open. */
export function openingHours(b: BusinessLike) {
  return (b.hours ?? [])
    .filter((h) => h && !h.closed && h.open && h.close)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.day,
      opens: h.open,
      closes: h.close,
    }));
}

/** Social profiles, which is how answer engines tie the site to the same real-world business. */
export function sameAs(b: BusinessLike) {
  return [b.facebookUrl, b.instagramUrl, b.tiktokUrl].map((u) => (u || '').trim()).filter(Boolean);
}

/**
 * The shop as a real-world place. PetStore is a LocalBusiness subtype, which is what earns the
 * map / "near me" treatment and gives an answer engine somewhere to attach the address and hours.
 */
export function localBusinessLd(b: BusinessLike, opts: { siteUrl: string; logoPath?: string }): Json {
  const { siteUrl, logoPath } = opts;
  const established = (b.establishedYear || '').trim();
  return compact({
    '@context': 'https://schema.org',
    '@type': 'PetStore',
    '@id': `${siteUrl}/#business`,
    name: b.storeName,
    description: b.tagline,
    url: siteUrl,
    image: logoPath ? abs(siteUrl, logoPath) : undefined,
    logo: logoPath ? abs(siteUrl, logoPath) : undefined,
    telephone: bestPhone(b),
    email: b.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.addressLine,
      addressLocality: b.city,
      addressCountry: 'PH',
    },
    hasMap: b.mapUrl,
    openingHoursSpecification: openingHours(b),
    sameAs: sameAs(b),
    currenciesAccepted: 'PHP',
    // Established year is free text in the admin, so only pass it through when it looks like a year.
    foundingDate: /^\d{4}$/.test(established) ? established : undefined,
  }) as Json;
}

/** The site itself, so an engine knows the name to credit and how to search it. */
export function websiteLd(b: BusinessLike, opts: { siteUrl: string }): Json {
  const { siteUrl } = opts;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: b.storeName,
    url: siteUrl,
    inLanguage: 'en-PH',
    publisher: { '@id': `${siteUrl}/#business` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/catalog?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }) as Json;
}

/**
 * A one-line factual summary used when a product has no description. Built only from fields we
 * hold — never invented prose about a live animal — so it beats a bare price as a meta
 * description and gives an answer engine something concrete to quote.
 */
export function productSummary(p: ProductLike, b: BusinessLike): string {
  const peso =
    typeof p.price === 'number' ? `₱${p.price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : '';
  const availability = p.stock > 0 ? 'Available now' : isIncoming(p) ? 'Open for pre-order' : 'Currently unavailable';
  const where = [b.storeName, b.city].filter(Boolean).join(', ');
  return [p.categoryName, peso, availability, where ? `at ${where}` : ''].filter(Boolean).join(' · ');
}

export function productLd(p: ProductLike, b: BusinessLike, opts: { siteUrl: string }): Json {
  const { siteUrl } = opts;
  const url = p.slug ? `${siteUrl}/specimen/${p.slug}` : siteUrl;
  const images = [p.image, ...(p.images ?? [])].filter((u): u is string => Boolean(u));
  const availability =
    p.stock > 0
      ? 'https://schema.org/InStock'
      : isIncoming(p)
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: (p.description || '').trim() || productSummary(p, b),
    image: [...new Set(images)],
    sku: p.sku === undefined || p.sku === null ? undefined : String(p.sku),
    category: p.categoryName,
    url,
    brand: { '@type': 'Brand', name: b.storeName },
    offers: {
      '@type': 'Offer',
      url,
      price: p.price,
      priceCurrency: 'PHP',
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${siteUrl}/#business` },
    },
    // Deliberately no aggregateRating: every product carries rating 0 / reviews 0, and inventing
    // one is both a schema.org violation and a Google manual-action risk.
  }) as Json;
}

export function breadcrumbLd(trail: { name: string; path: string }[], opts: { siteUrl: string }): Json {
  const { siteUrl } = opts;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: abs(siteUrl, t.path),
    })),
  }) as Json;
}

export function faqPageLd(faqs: { question?: string; answer?: string }[]): Json | undefined {
  const entries = (faqs ?? []).filter((f) => (f.question || '').trim() && (f.answer || '').trim());
  if (!entries.length) return undefined;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((f) => ({
      '@type': 'Question',
      name: (f.question || '').trim(),
      acceptedAnswer: { '@type': 'Answer', text: (f.answer || '').trim() },
    })),
  }) as Json;
}

/**
 * The venue page (The Cave). It isn't a product listing — it answers "who are you and where
 * are you" — so it points at the PetStore the site layout already declares rather than
 * restating the address, and an engine can follow the @id to the hours, map and socials.
 */
export function venuePageLd(
  b: BusinessLike,
  opts: { siteUrl: string; path: string; name: string; description?: string },
): Json {
  const { siteUrl, path, name, description } = opts;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name,
    description,
    url: abs(siteUrl, path),
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: { '@id': `${siteUrl}/#business` },
    // Booking a viewing is the page's purpose, so say so in a way an engine can act on.
    potentialAction: {
      '@type': 'ReserveAction',
      name: 'Book a viewing',
      target: { '@type': 'EntryPoint', urlTemplate: abs(siteUrl, path) },
      location: { '@id': `${siteUrl}/#business` },
    },
    about: b.storeName,
  }) as Json;
}

/** A listing page as a CollectionPage wrapping an ItemList, so engines can enumerate the stock. */
export function collectionLd(
  products: ProductLike[],
  opts: { siteUrl: string; path: string; name: string; description?: string; limit?: number },
): Json {
  const { siteUrl, path, name, description, limit = 60 } = opts;
  const listed = (products ?? []).filter((p) => p.slug).slice(0, limit);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: abs(siteUrl, path),
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: listed.length,
      itemListElement: listed.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/specimen/${p.slug}`,
        name: p.name,
      })),
    },
  }) as Json;
}
