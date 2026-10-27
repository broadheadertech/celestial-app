import type { Json } from '@/lib/structuredData';

/**
 * Renders schema.org JSON-LD into the HTML itself (server component, no 'use client').
 *
 * This has to be server-rendered: the storefront is a static export, and the crawlers that matter
 * for structured data — Facebook/Messenger link previews, Google, and the AI answer engines —
 * read the HTML without executing JavaScript.
 *
 * `<` is escaped so a stray "</script>" inside any product name or FAQ answer can't close the
 * tag early and inject markup.
 */
export default function JsonLd({
  data,
  id,
}: {
  data: Json | (Json | undefined)[] | undefined;
  /**
   * DOM id for the first block. SpecimenView re-injects its Product block on the client (for
   * products added since the last deploy, which aren't prerendered); giving the server-rendered
   * block the id it looks for means it updates that one instead of adding a second copy.
   */
  id?: string;
}) {
  const blocks = (Array.isArray(data) ? data : [data]).filter((d): d is Json => Boolean(d));
  if (!blocks.length) return null;

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          {...(i === 0 && id ? { id } : {})}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
