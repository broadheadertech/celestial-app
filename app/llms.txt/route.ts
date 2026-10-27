import { catalogList, caveList, shopList } from '@/components/dc/listings';
import { getBuildBusiness, getBuildCatalog, getBuildFaqs } from '@/lib/buildCatalog';
import { buildLlmsTxt } from '@/lib/llmsTxt';

/**
 * /llms.txt — the AI-crawler brief. Generated at build time into the static export, from the
 * same catalog and Business Details the pages are built from, so it never disagrees with them.
 */
export const dynamic = 'force-static';

export async function GET() {
  const [products, business, faqs] = await Promise.all([getBuildCatalog(), getBuildBusiness(), getBuildFaqs()]);
  const all = products ?? [];

  const body = buildLlmsTxt({
    business: business ?? { storeName: "Dragon's Cave" },
    siteUrl: 'https://dc.broadheader.com',
    arowana: catalogList(all),
    cave: caveList(all),
    gear: shopList(all),
    faqs: faqs ?? [],
  });

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
