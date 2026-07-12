'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * The Cave — "beyond the dragons, the rest of the water."
 * A curated collection of the gallery's non-arowana exotics: monster-tank
 * centrepieces, ancient oddballs, and quiet exotics. These specimens live
 * outside the arowana catalog, so the collection is hand-curated here.
 */
type CaveFish = {
  id: string;
  name: string;
  species: 'cichlid' | 'catfish' | 'ray' | 'predator' | 'oddball';
  speciesLabel: string;
  grade: 'S' | 'AAA' | 'AA' | 'A';
  tank: string;
  origin: string;
  temperament: string;
  price: number;
  tint: string;
};

const CAVE: CaveFish[] = [
  { id: 'fh201', name: 'Kamfa Flowerhorn — “Fortune”', species: 'cichlid', speciesLabel: 'Cichlid', grade: 'S', tank: 'TANK II', origin: 'Selangor line', temperament: 'Bold · centrepiece', price: 18000, tint: 'oklch(0.66 0.16 45)' },
  { id: 'os334', name: 'Tiger Oscar', species: 'cichlid', speciesLabel: 'Cichlid', grade: 'AA', tank: 'TANK III', origin: 'Rio Amazonas', temperament: 'Curious · hardy', price: 1800, tint: 'oklch(0.63 0.14 52)' },
  { id: 'pb417', name: 'Blue Peacock Bass', species: 'cichlid', speciesLabel: 'Cichlid', grade: 'AAA', tank: 'TANK IV', origin: 'Rio Negro', temperament: 'Predator · fast', price: 6500, tint: 'oklch(0.60 0.10 205)' },
  { id: 'rt556', name: 'Red-Tail Catfish', species: 'catfish', speciesLabel: 'Catfish', grade: 'AA', tank: 'TANK V', origin: 'Amazon basin', temperament: 'Grows large · gentle', price: 3200, tint: 'oklch(0.56 0.03 40)' },
  { id: 'mr628', name: 'Motoro Stingray', species: 'ray', speciesLabel: 'Stingray', grade: 'S', tank: 'TANK VI', origin: 'Rio Paraná', temperament: 'Delicate · substrate', price: 42000, tint: 'oklch(0.63 0.04 68)' },
  { id: 'dt741', name: 'Siamese Tiger — Datnoid', species: 'predator', speciesLabel: 'Predator', grade: 'AAA', tank: 'TANK VII', origin: 'Mekong', temperament: 'Regal · shy', price: 28000, tint: 'oklch(0.68 0.13 72)' },
  { id: 'ch852', name: 'Emperor Snakehead', species: 'predator', speciesLabel: 'Predator', grade: 'AAA', tank: 'TANK VIII', origin: 'Myanmar', temperament: 'Clever · jumper', price: 9500, tint: 'oklch(0.56 0.09 235)' },
  { id: 'bp963', name: 'Ornate Bichir', species: 'oddball', speciesLabel: 'Oddball', grade: 'AA', tank: 'TANK IX', origin: 'Congo basin', temperament: 'Ancient · nocturnal', price: 2400, tint: 'oklch(0.58 0.06 132)' },
  { id: 'fp074', name: 'Fahaka Puffer', species: 'oddball', speciesLabel: 'Oddball', grade: 'A', tank: 'TANK X', origin: 'Nile', temperament: 'Feisty · solo only', price: 5800, tint: 'oklch(0.70 0.11 108)' },
  { id: 'gk185', name: 'Black Ghost Knifefish', species: 'oddball', speciesLabel: 'Oddball', grade: 'A', tank: 'TANK XI', origin: 'Suriname', temperament: 'Shy · electro-sense', price: 1600, tint: 'oklch(0.58 0.03 262)' },
];

const SPECIES = [
  { key: 'all', label: 'All' },
  { key: 'cichlid', label: 'Cichlid' },
  { key: 'catfish', label: 'Catfish' },
  { key: 'ray', label: 'Stingray' },
  { key: 'predator', label: 'Predator' },
  { key: 'oddball', label: 'Oddball' },
] as const;

const GRADES = [
  { key: 'all', label: 'All' },
  { key: 'S', label: 'S' },
  { key: 'AAA', label: 'AAA' },
  { key: 'AA', label: 'AA' },
  { key: 'A', label: 'A' },
] as const;

const PROMISE = [
  { n: '01', title: 'Provenance', body: 'Chipped where required, papered, and logged before it reaches the floor.' },
  { n: '02', title: 'Quarantine', body: '21 days observed in isolation. Nothing joins the tanks uncleared.' },
  { n: '03', title: 'Continuity', body: 'We answer the phone years after. Your fish has a long life to live.' },
];

export default function CavePage() {
  const [species, setSpecies] = useState<string>('all');
  const [grade, setGrade] = useState<string>('all');

  const items = useMemo(
    () =>
      CAVE.filter(
        (f) =>
          (species === 'all' || f.species === species) &&
          (grade === 'all' || f.grade === grade),
      ),
    [species, grade],
  );

  return (
    <main>
      {/* ───────── HERO ───────── */}
      <section
        className="relative overflow-hidden"
        style={{ borderBottom: '1px solid var(--line-soft)' }}
      >
        {/* Oversized watermark: 渊 — "the abyss / the wider water" */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none"
          style={{
            position: 'absolute',
            right: -70,
            top: -64,
            fontFamily: '"Noto Serif TC", serif',
            fontWeight: 900,
            fontSize: 330,
            lineHeight: 1,
            color: 'color-mix(in oklch, var(--red) 6%, transparent)',
          }}
        >
          渊
        </div>
        <div className="site-container relative" style={{ padding: '56px 32px 40px' }}>
          <div className="flex items-end justify-between gap-7 flex-wrap">
            <div>
              <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>
                The Cave · beyond the dragons
              </div>
              <h1 className="display-xl" style={{ fontSize: 'clamp(44px, 6.4vw, 84px)', margin: 0 }}>
                The wider <em className="italic-flourish">water.</em>
              </h1>
              <p
                className="max-w-[552px]"
                style={{
                  fontSize: 16.5,
                  lineHeight: 1.6,
                  color: 'var(--ink-2)',
                  margin: '18px 0 0',
                }}
              >
                Beyond the dragons, the rest of the water — monster-tank centrepieces, ancient
                oddballs, and quiet exotics. Each grown on in our own systems and released only when
                it is ready to keep. Prices in peso; message us to reserve.
              </p>
            </div>
            <div className="text-right">
              <div
                className="display"
                style={{ fontSize: 46, lineHeight: 1, color: 'var(--red)' }}
              >
                {items.length}
              </div>
              <div className="placard mt-1.5" style={{ color: 'var(--ink-3)' }}>
                In the cave
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PROMISE ───────── */}
      <section
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line-soft)' }}
      >
        <div
          className="site-container grid items-center"
          style={{ padding: '30px 32px', gridTemplateColumns: '0.85fr 2fr', gap: 44 }}
        >
          <div>
            <div className="placard mb-2.5" style={{ color: 'var(--red-hi)' }}>
              The Cave · our promise
            </div>
            <div
              className="display"
              style={{ fontSize: 25, lineHeight: 1.05, fontVariationSettings: '"opsz" 28, "wght" 700' }}
            >
              Provenance, then <em className="italic-flourish">patience.</em>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {PROMISE.map((p) => (
              <div key={p.n} style={{ borderLeft: '2px solid var(--gold)', paddingLeft: 16 }}>
                <div
                  className="font-mono-tabular mb-2"
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}
                >
                  {p.n}
                </div>
                <div
                  className="display mb-1.5"
                  style={{ fontSize: 16, fontVariationSettings: '"opsz" 18, "wght" 700' }}
                >
                  {p.title}
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', margin: 0 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FILTERS ───────── */}
      <section
        style={{
          position: 'sticky',
          top: 76,
          zIndex: 30,
          background: 'color-mix(in oklch, var(--bg) 90%, transparent)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div
          className="site-container flex flex-col gap-3"
          style={{ padding: '16px 32px' }}
        >
          <FilterRow
            label="Family"
            options={SPECIES}
            value={species}
            onChange={setSpecies}
          />
          <FilterRow label="Grade" options={GRADES} value={grade} onChange={setGrade} />
        </div>
      </section>

      {/* ───────── GRID ───────── */}
      <section style={{ padding: '44px 0 96px' }}>
        <div className="site-container">
          {items.length === 0 ? (
            <div className="text-center" style={{ padding: '80px 0', color: 'var(--ink-3)' }}>
              <div
                style={{
                  fontFamily: '"Noto Serif TC", serif',
                  fontSize: 56,
                  color: 'color-mix(in oklch, var(--red) 30%, transparent)',
                  marginBottom: 12,
                }}
              >
                渊
              </div>
              <div className="display" style={{ fontSize: 22, marginBottom: 8, color: 'var(--ink)' }}>
                Nothing in the cave matches those filters
              </div>
              <div style={{ fontSize: 14 }}>
                Message us — we often have unlisted fish in quarantine.
              </div>
            </div>
          ) : (
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))' }}
            >
              {items.map((f) => (
                <CaveCard key={f.id} fish={f} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 flex-wrap">
      <span className="placard" style={{ fontSize: 9.5, minWidth: 64, color: 'var(--ink-4)' }}>
        {label}
      </span>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => {
          const active = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.key)}
              className="font-mono-tabular whitespace-nowrap"
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '9px 15px',
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--red)' : 'var(--line)'}`,
                background: active ? 'var(--red)' : 'var(--surface)',
                color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CaveCard({ fish }: { fish: CaveFish }) {
  return (
    <div className="lift-card flex flex-col">
      <Link
        href="/visit"
        className="dc-card-media block"
        style={{
          position: 'relative',
          aspectRatio: '3 / 4',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.145 0.01 40) 100%)',
          boxShadow:
            '0 22px 46px -28px oklch(0.16 0.02 40 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)',
        }}
      >
        {/* gold aura */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.16), transparent 70%)',
          }}
        />
        {/* scale texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.38,
            backgroundImage:
              'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)',
            backgroundSize: '24px 12px',
          }}
        />
        {/* silhouette */}
        <span
          className="dc-sil"
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            color: fish.tint,
            transition: 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)',
          }}
        >
          <svg
            width="200"
            height="100"
            viewBox="0 0 240 120"
            style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }}
            aria-hidden="true"
          >
            <path
              d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z"
              fill="currentColor"
              opacity="0.9"
            />
            <circle cx="40" cy="56" r="3" fill="oklch(0.16 0.01 40)" />
          </svg>
        </span>
        {/* tank id */}
        <div
          className="font-mono-tabular"
          style={{
            position: 'absolute',
            top: 12,
            left: 13,
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'oklch(0.9 0.02 60 / 0.6)',
          }}
        >
          {fish.tank}
        </div>
        {/* grade */}
        <div
          style={{
            position: 'absolute',
            top: 11,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 26,
            height: 22,
            padding: '0 6px',
            borderRadius: 6,
            background: 'oklch(0.72 0.14 82 / 0.14)',
            border: '1px solid oklch(0.72 0.13 82 / 0.45)',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            fontVariationSettings: '"opsz" 24, "wght" 800',
            fontSize: 12,
            color: 'oklch(0.82 0.13 84)',
          }}
        >
          {fish.grade}
        </div>
        {/* awaiting photo */}
        <div
          className="font-mono-tabular"
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 8,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'oklch(0.9 0.02 60 / 0.4)',
          }}
        >
          ◇ awaiting photo
        </div>
      </Link>

      {/* body */}
      <div className="flex flex-col flex-1" style={{ padding: '15px 4px 4px' }}>
        <div className="placard mb-1.5">{fish.speciesLabel}</div>
        <Link
          href="/visit"
          className="display"
          style={{
            fontSize: 19,
            lineHeight: 1.15,
            marginBottom: 5,
            fontVariationSettings: '"opsz" 22, "wght" 600',
          }}
        >
          {fish.name}
        </Link>
        <div className="font-mono-tabular" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {fish.origin}
        </div>
        <div
          className="font-mono-tabular"
          style={{ fontSize: 10, letterSpacing: '0.03em', color: 'var(--ink-4)', marginTop: 5 }}
        >
          {fish.temperament}
        </div>
        <div
          className="flex items-center justify-between gap-2.5 mt-auto"
          style={{ paddingTop: 13, borderTop: '1px solid var(--line-soft)' }}
        >
          <span className="font-mono-tabular" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>
            {fmt(fish.price)}
          </span>
          <Link
            href="/visit"
            className="a-link inline-flex items-center gap-1.5"
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--red)', whiteSpace: 'nowrap' }}
          >
            <MessageCircle size={13} />
            Reserve
          </Link>
        </div>
      </div>
    </div>
  );
}
