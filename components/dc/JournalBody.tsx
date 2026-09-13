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

const serif = "'Noto Serif Display', serif";

export default function JournalBody({ body }: { body: string }) {
  const blocks = parseJournalBody(body);
  return (
    <div style={{ fontSize: 17.5, lineHeight: 1.75, color: 'oklch(0.30 0.012 34)', overflowWrap: 'break-word' }}>
      {blocks.map((b, i) =>
        b.type === 'h2' ? (
          <h2
            key={i}
            style={{
              fontFamily: serif,
              fontWeight: 700,
              fontSize: 'clamp(24px, 3.2vw, 30px)',
              lineHeight: 1.15,
              letterSpacing: '-0.012em',
              color: 'oklch(0.19 0.012 32)',
              margin: i === 0 ? '0 0 14px' : '44px 0 14px',
            }}
          >
            {b.text}
          </h2>
        ) : (
          <p key={i} style={{ margin: '0 0 22px' }}>
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
