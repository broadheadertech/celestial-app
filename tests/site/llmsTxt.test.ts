import { describe, expect, it } from 'vitest';
import { buildLlmsTxt, hoursLines } from '@/lib/llmsTxt';
import type { BusinessLike, ProductLike } from '@/lib/structuredData';

const SITE = 'https://dc.broadheader.com';

const business: BusinessLike = {
  storeName: "Dragon's Cave",
  tagline: 'Home of Premium Arowanas',
  addressLine: '96 Purok 3, Lagundi, Plaridel, Bulacan',
  city: 'Malolos City',
  phone: '',
  email: '',
  facebookUrl: 'https://www.facebook.com/profile.php?id=123',
  hours: [
    { day: 'Monday', open: '06:00', close: '18:00', closed: false },
    { day: 'Tuesday', open: '06:00', close: '18:00', closed: true },
  ],
};

const fish = (name: string, slug: string, price: number): ProductLike => ({
  name,
  slug,
  price,
  stock: 1,
  categoryName: 'Fish',
});

const build = (over: Partial<Parameters<typeof buildLlmsTxt>[0]> = {}) =>
  buildLlmsTxt({
    business,
    siteUrl: SITE,
    arowana: [fish('SUPER RED', 'super-red', 150000)],
    cave: [fish('DISCUS', 'discus', 2500)],
    gear: [],
    faqs: [{ question: 'Do you ship?', answer: 'Within Luzon, yes.' }],
    ...over,
  });

describe('hoursLines', () => {
  it('lists open days and names the closed ones once', () => {
    expect(hoursLines(business)).toEqual(['Monday 06:00–18:00', 'Closed: Tuesday']);
  });

  it('is empty when no hours are set, so no blank bullets are emitted', () => {
    expect(hoursLines({})).toEqual([]);
  });
});

describe('buildLlmsTxt', () => {
  it('leads with the store name as an H1 and a blockquote summary', () => {
    const out = build();
    expect(out.startsWith("# Dragon's Cave")).toBe(true);
    expect(out).toContain('> Home of Premium Arowanas');
    expect(out).toContain('Plaridel, Bulacan');
  });

  it('omits contact lines that have no value on file', () => {
    const out = build();
    expect(out).not.toContain('- Phone:');
    expect(out).not.toContain('- Email:');
    expect(out).toContain('- Facebook: https://www.facebook.com/profile.php?id=123');
  });

  it('lists specimens with absolute URLs, price and category', () => {
    expect(build()).toContain(`- [SUPER RED](${SITE}/specimen/super-red) — ₱150,000 · Fish`);
  });

  it('separates arowana from the rest of the fish, with counts', () => {
    const out = build();
    expect(out).toContain('## Asian arowana available (1)');
    expect(out).toContain('## Other fish available (1)');
  });

  it('leaves out a section that has nothing in it', () => {
    expect(build({ gear: [] })).not.toContain('## Aquarium gear in stock');
  });

  it('includes published FAQs as question headings', () => {
    const out = build();
    expect(out).toContain('### Do you ship?');
    expect(out).toContain('Within Luzon, yes.');
  });

  it('caps each section so a large catalog cannot produce an enormous file', () => {
    const many = Array.from({ length: 200 }, (_, i) => fish(`FISH ${i}`, `fish-${i}`, 1000));
    const out = build({ arowana: many });
    const listed = out.split('\n').filter((l) => l.startsWith('- [FISH ')).length;
    expect(listed).toBe(80);
    // The heading still reports the true total, so a reader knows the list is partial.
    expect(out).toContain('## Asian arowana available (200)');
  });

  it('states the currency and that livestock is one-of-a-kind', () => {
    const out = build();
    expect(out).toContain('Philippine pesos (PHP)');
    expect(out).toContain('one-of-a-kind');
  });
});
