'use client';

import { useTheme } from '@/store/theme';

export default function ArowanaSilhouette({
  size = 200,
  color = 'currentColor',
  mirror = false,
}: {
  size?: number;
  color?: string;
  mirror?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 240 120"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <g transform={mirror ? 'scale(-1,1) translate(-240,0)' : ''}>
        <path
          d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z M 196 56 C 200 58, 204 58, 206 60 M 178 50 L 184 56 M 178 60 L 184 56 M 86 22 L 92 30 M 78 24 L 88 32"
          fill={color}
          opacity="0.95"
        />
        <circle cx="40" cy="56" r="3" fill="var(--bg)" />
        <path
          d="M 56 50 C 60 60, 60 70, 56 78"
          stroke="var(--bg)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
        <g opacity="0.18" fill="var(--bg)">
          <circle cx="80" cy="52" r="2" />
          <circle cx="100" cy="48" r="2" />
          <circle cx="120" cy="50" r="2" />
          <circle cx="140" cy="54" r="2" />
          <circle cx="92" cy="68" r="2" />
          <circle cx="112" cy="72" r="2" />
          <circle cx="132" cy="70" r="2" />
          <circle cx="152" cy="66" r="2" />
        </g>
      </g>
    </svg>
  );
}

export function DragonsCaveMark({
  size = 36,
  rounded = false,
}: {
  /** Height of the mark in px. Width scales to the natural aspect ratio (~1.26:1). */
  size?: number;
  /** When true, clip to a rounded square — useful for tight sidebar/header tiles. */
  rounded?: boolean;
}) {
  const theme = useTheme((s) => s.theme);
  // Light theme: original black + red on white-knockout. Dark theme: black inverted to white.
  const src = theme === 'dark' ? '/img/dc-logo-dark.png' : '/img/dc-logo-light.png';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Dragon's Cave"
      height={size}
      style={{
        display: 'block',
        height: size,
        width: 'auto',
        objectFit: 'contain',
        borderRadius: rounded ? Math.round(size * 0.2) : 0,
      }}
      draggable={false}
    />
  );
}

export function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return null;
  const colorMap: Record<string, string> = {
    S: 'var(--grade-s)',
    AAA: 'var(--grade-aaa)',
    AA: 'var(--grade-aa)',
    A: 'var(--grade-a)',
  };
  const c = colorMap[grade] || colorMap.A;
  return (
    <span
      className="grade-badge"
      style={{
        color: c,
        background: `color-mix(in oklch, ${c} 14%, transparent)`,
      }}
    >
      {grade}
    </span>
  );
}

export function SpecimenPlate({
  product,
  ratio = '4 / 5',
  size = 240,
  showMeta = true,
  label,
}: {
  product: { _id?: string; sku?: string; name?: string; categoryName?: string; tankNumber?: string; image?: string };
  ratio?: string;
  size?: number;
  showMeta?: boolean;
  label?: string;
}) {
  // Pick a palette per category name (Asian Red / Crossback / Red Tail Gold / Silver / Jardini)
  const palette = pickPalette(product.categoryName);
  const seedChar = (product._id || product.sku || 'x').charCodeAt(0);
  const mirror = seedChar % 2 === 1;

  return (
    <div
      className="vitrine"
      style={{
        position: 'relative',
        aspectRatio: ratio,
        background: `radial-gradient(ellipse at 50% 40%, ${palette.from}, ${palette.to})`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div className="scales" style={{ position: 'absolute', inset: 0, opacity: 0.55 }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, oklch(1 0 0 / 0.08), transparent 60%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name || 'Specimen'}
            style={{
              maxHeight: '70%',
              maxWidth: '80%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))',
            }}
          />
        ) : (
          <span
            className="swim-x"
            style={{ color: palette.fish, filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }}
          >
            <ArowanaSilhouette size={size} color={palette.fish} mirror={mirror} />
          </span>
        )}
      </div>

      {showMeta && product.tankNumber && (
        <div
          className="placard"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            color: 'oklch(0.95 0 0 / 0.6)',
          }}
        >
          {product.tankNumber}
        </div>
      )}

      {showMeta && label && (
        <div
          className="placard"
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            color: 'oklch(0.95 0 0 / 0.7)',
            padding: '3px 8px',
            background: 'oklch(0 0 0 / 0.35)',
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
          }}
        >
          {label}
        </div>
      )}

      {showMeta && (
        <div
          className="placard"
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14,
            color: 'oklch(0.95 0 0 / 0.45)',
            fontSize: 9,
            letterSpacing: '0.18em',
          }}
        >
          [ Studio plate · {product.sku || product._id?.slice(-6).toUpperCase()} ]
        </div>
      )}
    </div>
  );
}

export function pickPalette(categoryName?: string) {
  const n = (categoryName || '').toLowerCase();
  if (n.includes('red') && !n.includes('tail')) return PALETTES.asianRed;
  if (n.includes('crossback') || n.includes('gold')) return PALETTES.crossback;
  if (n.includes('tail') && n.includes('gold')) return PALETTES.redTailGold;
  if (n.includes('silver')) return PALETTES.silver;
  if (n.includes('jardini') || n.includes('pearl')) return PALETTES.jardini;
  if (n.includes('fish') || n.includes('arowana')) return PALETTES.asianRed;
  return PALETTES.neutral;
}

const PALETTES = {
  asianRed: { from: 'oklch(0.32 0.16 27)', to: 'oklch(0.12 0.07 22)', fish: 'oklch(0.62 0.22 27)' },
  crossback: { from: 'oklch(0.32 0.12 75)', to: 'oklch(0.14 0.06 60)', fish: 'oklch(0.80 0.14 78)' },
  redTailGold: {
    from: 'oklch(0.32 0.13 50)',
    to: 'oklch(0.14 0.06 35)',
    fish: 'oklch(0.74 0.18 50)',
  },
  silver: { from: 'oklch(0.32 0.02 220)', to: 'oklch(0.14 0.02 220)', fish: 'oklch(0.84 0.01 230)' },
  jardini: { from: 'oklch(0.32 0.10 160)', to: 'oklch(0.14 0.05 160)', fish: 'oklch(0.72 0.11 140)' },
  neutral: { from: 'var(--bg-3)', to: 'var(--bg-2)', fish: 'var(--ink-3)' },
};

export function GearPlate({
  product,
  ratio = '1 / 1',
}: {
  product: { sku?: string; name?: string; image?: string };
  ratio?: string;
}) {
  return (
    <div
      className="vitrine"
      style={{
        position: 'relative',
        aspectRatio: ratio,
        background: 'radial-gradient(ellipse at 50% 40%, var(--bg-3), var(--bg-2))',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div className="scales" style={{ position: 'absolute', inset: 0, opacity: 0.25 }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name || 'Product'}
            style={{ maxHeight: '70%', maxWidth: '80%', objectFit: 'contain' }}
          />
        ) : (
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-4)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        )}
      </div>
      <div
        className="placard"
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          color: 'var(--ink-4)',
          fontSize: 9,
          letterSpacing: '0.18em',
        }}
      >
        [ Product plate · {product.sku || 'PRD'} ]
      </div>
    </div>
  );
}
