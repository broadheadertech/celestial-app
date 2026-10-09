import { Fragment } from 'react';

/**
 * Journal article body renderer, shared by the public article page and the admin
 * editor's preview so they can't drift apart.
 *
 * The body is plain text (convex/services/journal.ts): blank lines separate paragraphs,
 * lines starting "## " are headings, single line breaks inside a paragraph are kept.
 * Everything renders as React text nodes — never HTML — so post content can't inject markup.
 */

export type JournalBlock = { type: 'h2'; text: string } | { type: 'p'; lines: string[] };

export function parseJournalBody(body: string): JournalBlock[] {
  const blocks: JournalBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', lines: para });
    para = [];
  };
  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      const text = line.slice(3).trim();
      if (text) blocks.push({ type: 'h2', text });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** "14 September 2026" */
export function formatJournalDate(ts: number | undefined): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-PH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JournalBody({ body }: { body: string }) {
  const blocks = parseJournalBody(body);
  return (
    <div className="dk-prose" style={{ overflowWrap: 'break-word' }}>
      {blocks.map((b, i) =>
        b.type === 'h2' ? (
          <h2 key={i} style={i === 0 ? { marginTop: 0 } : undefined}>
            {b.text}
          </h2>
        ) : (
          <p key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {l}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
