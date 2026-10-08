import type { CSSProperties, ReactNode } from 'react';

/**
 * The signature hero: a large 40px-radius card with its bottom-right corner carved out to hold a
 * secondary block (price, CTA, stats or a short form). On phones the notch stacks under the copy as a
 * rounded tab.
 *
 * - `tone`: `dark` (black + red glow), `light` (#F5F5F5) or `white` (white with hairline border).
 * - `behind`: the colour of the page behind the card, which the notch is filled with (default white).
 * - `notchHeight`: roughly how tall the notch content is, so the card leaves room for it.
 */
export default function NotchHero({
  tone = 'dark',
  behind = 'var(--dk-white)',
  notch,
  notchHeight = 132,
  notchWide = false,
  notchLabel,
  aside,
  flush = false,
  className = '',
  children,
}: {
  tone?: 'dark' | 'light' | 'white';
  behind?: string;
  notch?: ReactNode;
  notchHeight?: number;
  notchWide?: boolean;
  /** Accessible name for the notch region, e.g. "Featured specimen". */
  notchLabel?: string;
  /** Right-hand visual (photo, rack, receipt). Omit for a single-column hero. */
  aside?: ReactNode;
  /** No outer page gutter — for use inside an already-padded column (member app). */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const style = { '--notch-h': `${notch ? notchHeight : 0}px` } as CSSProperties;
  return (
    <section className={`dk-nhero${flush ? ' flush' : ''} ${className}`.trim()}>
      <div className={`dk-nhero-card ${tone}${tone === 'dark' ? ' dk-dark' : ''}`} style={style}>
        <div className={`dk-nhero-grid${aside ? '' : ' single'}`}>
          <div className="dk-nhero-copy">{children}</div>
          {aside}
        </div>
        {notch && (
          <aside
            className={`dk-notch dk-nhero-notch${notchWide ? ' wide' : ''} ${behind === 'var(--dk-black)' ? 'on-black' : 'on-light'}`}
            style={{ '--nc': behind, color: behind === 'var(--dk-black)' ? 'var(--dk-white)' : 'var(--dk-black)' } as CSSProperties}
            aria-label={notchLabel}
          >
            {notch}
          </aside>
        )}
      </div>
    </section>
  );
}
