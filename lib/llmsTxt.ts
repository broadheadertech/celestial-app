import type { BusinessLike, ProductLike } from './structuredData';
import { bestPhone } from './structuredData';

/**
 * Builds /llms.txt — a plain-Markdown brief for AI answer engines (the llmstxt.org convention).
 *
 * Why bother when there is already JSON-LD and a sitemap: structured data tells an engine what a
 * single page is, and the sitemap tells it which pages exist. Neither says what the business
 * actually sells, where it is, or which way to point a customer. This does, in one fetch, in the
 * form a model reads best. It is regenerated on every site rebuild, so it ages with the catalog.
 *
 * Everything here is drawn from Business Details and the public catalog — no invented copy.
 */

export type LlmsFaq = { question?: string; answer?: string };

const PER_SECTION = 80;

const peso = (n: number | undefined) =>
  typeof n === 'number' ? `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : '';

/** "Monday 06:00–18:00" lines for the days the shop is open, closed days noted once. */
export function hoursLines(business: BusinessLike): string[] {
  const hours = business.hours ?? [];
  if (!hours.length) return [];
  const open = hours.filter((h) => !h.closed).map((h) => `${h.day} ${h.open}–${h.close}`);
  const closed = hours.filter((h) => h.closed).map((h) => h.day);
  return [...open, ...(closed.length ? [`Closed: ${closed.join(', ')}`] : [])];
}

function productLines(products: ProductLike[], siteUrl: string): string[] {
  return products.slice(0, PER_SECTION).map((p) => {
    const bits = [peso(p.price), p.categoryName].filter(Boolean).join(' · ');
    return `- [${p.name}](${siteUrl}/specimen/${p.slug})${bits ? ` — ${bits}` : ''}`;
  });
}

export function buildLlmsTxt(opts: {
  business: BusinessLike;
  siteUrl: string;
  arowana: ProductLike[];
  cave: ProductLike[];
  gear: ProductLike[];
  faqs: LlmsFaq[];
}): string {
  const { business, siteUrl, arowana, cave, gear, faqs } = opts;
  const name = business.storeName || "Dragon's Cave";
  const where = [business.addressLine, business.city].filter(Boolean).join(', ');
  const out: string[] = [];

  out.push(`# ${name}`, '');
  const summary = [business.tagline, where ? `Located at ${where}, Philippines.` : 'Philippines.']
    .filter(Boolean)
    .join('. ');
  out.push(`> ${summary}`, '');
  out.push(
    'Specialist aquarium shop: Asian arowana and other exotic freshwater fish, plus aquarium food,',
    'lighting and equipment. Live fish are sold by enquiry and viewing — not online checkout.',
    'Aquarium gear can be ordered online and paid for after we confirm it.',
    '',
  );

  out.push('## Visiting and contact', '');
  if (where) out.push(`- Address: ${where}`);
  const phone = bestPhone(business);
  if (phone) out.push(`- Phone: ${phone}`);
  if ((business.email || '').trim()) out.push(`- Email: ${business.email!.trim()}`);
  if ((business.facebookUrl || '').trim()) out.push(`- Facebook: ${business.facebookUrl!.trim()}`);
  if ((business.instagramUrl || '').trim()) out.push(`- Instagram: ${business.instagramUrl!.trim()}`);
  if ((business.mapUrl || '').trim()) out.push(`- Map: ${business.mapUrl!.trim()}`);
  for (const line of hoursLines(business)) out.push(`- ${line}`);
  if ((business.hoursNote || '').trim()) out.push(`- Note: ${business.hoursNote!.trim()}`);
  out.push('');

  out.push('## Key pages', '');
  out.push(`- [The Catalog](${siteUrl}/catalog): Asian arowana currently on display.`);
  out.push(
    `- [Shop](${siteUrl}/shop): every product in one place — live fish, tanks, filtration, food and lighting, filterable by category.`,
  );
  out.push(
    `- [The Cave](${siteUrl}/cave): the shop itself — address, opening hours, how we work, and the form to book a private viewing.`,
  );
  out.push(`- [Home service](${siteUrl}/home-service): tank setup and maintenance visits.`);
  out.push(`- [Contact](${siteUrl}/contact): enquiries and frequently asked questions.`);
  out.push(`- [Track an order](${siteUrl}/track): order, reservation and booking lookup by reference.`);
  out.push(`- [Journal](${siteUrl}/journal): care notes and shop news.`);
  out.push('');

  if (arowana.length) {
    out.push(`## Asian arowana available (${arowana.length})`, '', ...productLines(arowana, siteUrl), '');
  }
  if (cave.length) {
    out.push(`## Other fish available (${cave.length})`, '', ...productLines(cave, siteUrl), '');
  }
  if (gear.length) {
    out.push(`## Aquarium gear in stock (${gear.length})`, '', ...productLines(gear, siteUrl), '');
  }

  const usableFaqs = faqs.filter((f) => (f.question || '').trim() && (f.answer || '').trim());
  if (usableFaqs.length) {
    out.push('## Frequently asked', '');
    for (const f of usableFaqs) {
      out.push(`### ${f.question!.trim()}`, '', f.answer!.trim(), '');
    }
  }

  out.push('## Notes', '');
  out.push('- All prices are in Philippine pesos (PHP).');
  out.push('- Livestock is one-of-a-kind: a listed specimen is a single fish, not a restockable line.');
  out.push('- Stock changes often. This file is regenerated each time the website is rebuilt.');
  out.push('');

  return out.join('\n');
}
