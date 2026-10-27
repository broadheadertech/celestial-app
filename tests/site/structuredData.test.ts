import { describe, expect, it } from 'vitest';
import {
  bestPhone,
  breadcrumbLd,
  collectionLd,
  compact,
  faqPageLd,
  localBusinessLd,
  openingHours,
  productLd,
  productSummary,
  venuePageLd,
  websiteLd,
  type BusinessLike,
  type ProductLike,
} from '@/lib/structuredData';

const SITE = 'https://dc.broadheader.com';

/** Mirrors the live Business Details: an address and Facebook, but no phone/email yet. */
const business: BusinessLike = {
  storeName: "Dragon's Cave",
  tagline: 'Home of Premium Arowanas',
  establishedYear: '20',
  phone: '',
  landline: '',
  whatsappNumber: '',
  email: '',
  addressLine: '96 Purok 3, Lagundi, Plaridel, Bulacan',
  city: 'Malolos City',
  mapUrl: 'https://maps.app.goo.gl/abc',
  facebookUrl: 'https://www.facebook.com/profile.php?id=123',
  instagramUrl: '',
  tiktokUrl: '',
  hours: [
    { day: 'Monday', open: '06:00', close: '23:59', closed: false },
    { day: 'Tuesday', open: '06:00', close: '23:59', closed: true },
  ],
};

const product = (over: Partial<ProductLike> = {}): ProductLike => ({
  name: 'SUPER RED AROWANA',
  price: 150000,
  stock: 1,
  slug: 'super-red-arowana',
  sku: 'SKU-1',
  categoryName: 'Fish',
  image: 'https://cdn/a.webp',
  images: ['https://cdn/a.webp', 'https://cdn/b.webp'],
  ...over,
});

describe('compact', () => {
  it('drops empty strings, arrays and objects recursively', () => {
    expect(compact({ a: '', b: '  ', c: [], d: {}, e: { f: '' }, g: 'keep' })).toEqual({ g: 'keep' });
  });

  it('keeps zero and false, which are real values', () => {
    expect(compact({ n: 0, b: false })).toEqual({ n: 0, b: false });
  });
});

describe('bestPhone', () => {
  it('returns undefined when no number is on file', () => {
    expect(bestPhone(business)).toBeUndefined();
  });

  it('normalises a local mobile to international form', () => {
    expect(bestPhone({ phone: '0917 123 4567' })).toBe('+639171234567');
  });

  it('prefixes a bare 63 number and leaves an explicit + alone', () => {
    expect(bestPhone({ phone: '639171234567' })).toBe('+639171234567');
    expect(bestPhone({ phone: '+639171234567' })).toBe('+639171234567');
  });

  it('falls back to the landline, then WhatsApp', () => {
    // Manila landline 02-8881-2345 → +63 2 8881 2345.
    expect(bestPhone({ landline: '0288812345' })).toBe('+63288812345');
    expect(bestPhone({ whatsappNumber: '639998887777' })).toBe('+639998887777');
  });
});

describe('openingHours', () => {
  it('lists only the days the shop is open', () => {
    expect(openingHours(business)).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '06:00', closes: '23:59' },
    ]);
  });
});

describe('localBusinessLd', () => {
  const ld = localBusinessLd(business, { siteUrl: SITE, logoPath: '/img/logo.png' });

  it('is a PetStore with a stable @id the other blocks can point at', () => {
    expect(ld['@type']).toBe('PetStore');
    expect(ld['@id']).toBe(`${SITE}/#business`);
  });

  it('carries the address from Business Details, in PH', () => {
    expect(ld.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '96 Purok 3, Lagundi, Plaridel, Bulacan',
      addressLocality: 'Malolos City',
      addressCountry: 'PH',
    });
  });

  it('omits telephone and email entirely rather than emitting blanks', () => {
    expect(ld).not.toHaveProperty('telephone');
    expect(ld).not.toHaveProperty('email');
  });

  it('drops a foundingDate that is not a real year', () => {
    // establishedYear is free text in the admin and currently reads "20".
    expect(ld).not.toHaveProperty('foundingDate');
    expect(localBusinessLd({ ...business, establishedYear: '2019' }, { siteUrl: SITE }).foundingDate).toBe('2019');
  });

  it('lists only the social profiles that are set', () => {
    expect(ld.sameAs).toEqual(['https://www.facebook.com/profile.php?id=123']);
  });

  it('makes the logo path absolute', () => {
    expect(ld.logo).toBe(`${SITE}/img/logo.png`);
  });
});

describe('websiteLd', () => {
  it('credits the business as publisher and declares the catalog search', () => {
    const ld = websiteLd(business, { siteUrl: SITE });
    expect(ld.publisher).toEqual({ '@id': `${SITE}/#business` });
    expect(JSON.stringify(ld.potentialAction)).toContain('/catalog?q={search_term_string}');
  });
});

describe('productSummary', () => {
  it('states category, price, availability and where, from real fields only', () => {
    expect(productSummary(product(), business)).toBe(
      "Fish · ₱150,000 · Available now · at Dragon's Cave, Malolos City",
    );
  });

  it('says pre-order only when stock is out AND something is actually incoming', () => {
    const incoming = product({ stock: 0, preorder: { enabled: true, incomingQty: 3 } });
    expect(productSummary(incoming, business)).toContain('Open for pre-order');

    const enabledButNoneComing = product({ stock: 0, preorder: { enabled: true, incomingQty: 0 } });
    expect(productSummary(enabledButNoneComing, business)).toContain('Currently unavailable');
  });
});

describe('productLd', () => {
  it('prices in PHP against the product URL and the shop as seller', () => {
    const ld = productLd(product(), business, { siteUrl: SITE }) as Record<string, Record<string, unknown>>;
    expect(ld.offers.price).toBe(150000);
    expect(ld.offers.priceCurrency).toBe('PHP');
    expect(ld.offers.url).toBe(`${SITE}/specimen/super-red-arowana`);
    expect(ld.offers.seller).toEqual({ '@id': `${SITE}/#business` });
  });

  it('maps stock to the three availability states', () => {
    const avail = (p: ProductLike) =>
      ((productLd(p, business, { siteUrl: SITE }).offers as Record<string, unknown>).availability as string);
    expect(avail(product())).toBe('https://schema.org/InStock');
    expect(avail(product({ stock: 0 }))).toBe('https://schema.org/OutOfStock');
    expect(avail(product({ stock: 0, preorder: { enabled: true, incomingQty: 2 } }))).toBe(
      'https://schema.org/PreOrder',
    );
  });

  it('falls back to the derived summary when the product has no description', () => {
    expect(productLd(product(), business, { siteUrl: SITE }).description).toBe(
      productSummary(product(), business),
    );
    expect(productLd(product({ description: 'A real write-up.' }), business, { siteUrl: SITE }).description).toBe(
      'A real write-up.',
    );
  });

  it('de-duplicates the cover photo against the gallery', () => {
    expect(productLd(product(), business, { siteUrl: SITE }).image).toEqual(['https://cdn/a.webp', 'https://cdn/b.webp']);
  });

  it('never invents a rating — every product is rating 0 / reviews 0', () => {
    const ld = productLd(product(), business, { siteUrl: SITE });
    expect(ld).not.toHaveProperty('aggregateRating');
    expect(ld).not.toHaveProperty('review');
  });

  it('stringifies a numeric SKU', () => {
    expect(productLd(product({ sku: 12345 }), business, { siteUrl: SITE }).sku).toBe('12345');
  });
});

describe('breadcrumbLd', () => {
  it('numbers the trail from one and makes every item absolute', () => {
    const ld = breadcrumbLd(
      [
        { name: 'Home', path: '/' },
        { name: 'Catalog', path: '/catalog' },
      ],
      { siteUrl: SITE },
    );
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE}/catalog` },
    ]);
  });
});

describe('faqPageLd', () => {
  it('is undefined when there is nothing publishable, so no empty block is rendered', () => {
    expect(faqPageLd([])).toBeUndefined();
    expect(faqPageLd([{ question: 'Q only' }])).toBeUndefined();
  });

  it('keeps only entries that have both a question and an answer', () => {
    const ld = faqPageLd([
      { question: 'Do you ship?', answer: 'Within Luzon, yes.' },
      { question: 'Half one', answer: '  ' },
    ]);
    expect((ld!.mainEntity as unknown[]).length).toBe(1);
  });
});

describe('venuePageLd', () => {
  const ld = venuePageLd(business, {
    siteUrl: SITE,
    path: '/cave',
    name: 'The Cave — Visit us in Malolos City',
    description: 'Address, hours and viewing bookings.',
  });

  it('is an AboutPage, not a product listing', () => {
    expect(ld['@type']).toBe('AboutPage');
    expect(ld).not.toHaveProperty('mainEntity.@type', 'ItemList');
  });

  it('points at the shop entity instead of restating the address', () => {
    expect(ld.mainEntity).toEqual({ '@id': `${SITE}/#business` });
    expect(ld).not.toHaveProperty('address');
  });

  it('advertises booking a viewing as an action against the shop', () => {
    const action = ld.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('ReserveAction');
    expect(action.location).toEqual({ '@id': `${SITE}/#business` });
    expect(JSON.stringify(action.target)).toContain('/cave');
  });
});

describe('collectionLd', () => {
  it('counts what it lists and skips products with no slug', () => {
    const ld = collectionLd([product(), product({ slug: undefined })], {
      siteUrl: SITE,
      path: '/catalog',
      name: 'The Catalog',
    });
    const list = ld.mainEntity as Record<string, unknown>;
    expect(list.numberOfItems).toBe(1);
    expect((list.itemListElement as unknown[]).length).toBe(1);
  });

  it('caps the list so a big catalog cannot bloat the page', () => {
    const many = Array.from({ length: 10 }, (_, i) => product({ slug: `s-${i}` }));
    const ld = collectionLd(many, { siteUrl: SITE, path: '/catalog', name: 'The Catalog', limit: 4 });
    expect((ld.mainEntity as Record<string, unknown>).numberOfItems).toBe(4);
  });
});
