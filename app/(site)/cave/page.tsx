'use client';

/**
 * The Cave — verbatim port of `dragons-cave-cave.dc.html` (content only).
 * Header / footer / FAB / styles come from the (site) layout.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';

const WA = '639172345678';

type Fish = {
  id: string; name: string; species: string; speciesLabel: string; grade: string;
  tank: string; origin: string; temperament: string; price: number; tint: string;
};

const FISH: Fish[] = [
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
  { key: 'all', label: 'All' }, { key: 'cichlid', label: 'Cichlid' }, { key: 'catfish', label: 'Catfish' },
  { key: 'ray', label: 'Stingray' }, { key: 'predator', label: 'Predator' }, { key: 'oddball', label: 'Oddball' },
];
const GRADES = [
  { key: 'all', label: 'All' }, { key: 'S', label: 'S' }, { key: 'AAA', label: 'AAA' }, { key: 'AA', label: 'AA' }, { key: 'A', label: 'A' },
];

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

export default function CavePage() {
  const [species, setSpecies] = useState('all');
  const [grade, setGrade] = useState('all');

  const items = useMemo(
    () =>
      FISH.filter((f) => (species === 'all' || f.species === species) && (grade === 'all' || f.grade === grade)).map((f) => ({
        ...f,
        priceLabel: '₱' + f.price.toLocaleString('en-US'),
        wa: 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi Dragon's Cave — I'd like to reserve the " + f.name + ' (' + f.tank + '). Is it still available?'),
      })),
    [species, grade],
  );

  return (
    <>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid oklch(0.86 0.012 68)', background: 'oklch(0.972 0.008 78)' }}>
        <div style={{ position: 'absolute', right: -70, top: -64, fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 330, lineHeight: 1, color: 'oklch(0.52 0.216 27 / 0.05)', pointerEvents: 'none', userSelect: 'none' }}>渊</div>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 28px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>The Cave &middot; beyond the dragons</div>
              <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(44px,6.4vw,84px)', lineHeight: 0.94, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>
                The <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>wider water.</span>
              </h1>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, maxWidth: 552, color: 'oklch(0.42 0.012 34)', margin: '18px 0 0' }}>Beyond the dragons, the rest of the water &mdash; monster-tank centrepieces, ancient oddballs, and quiet exotics. Each grown on in our own systems and released only when it is ready to keep. Prices in peso; message us to reserve.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 46, lineHeight: 1, color: 'oklch(0.50 0.216 27)' }}>{items.length}</div>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 6 }}>In the cave</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section style={{ background: 'oklch(0.955 0.010 74)', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 28px', display: 'grid', gridTemplateColumns: '0.85fr 2fr', gap: 44, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 10 }}>The Cave &middot; our promise</div>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 25, lineHeight: 1.05, letterSpacing: '-0.01em', color: 'oklch(0.19 0.012 32)' }}>Provenance, then <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>patience.</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
            {[{ n: '01', t: 'Provenance', b: 'Chipped where required, papered, and logged before it reaches the floor.' }, { n: '02', t: 'Quarantine', b: '21 days observed in isolation. Nothing joins the tanks uncleared.' }, { n: '03', t: 'Continuity', b: 'We answer the phone years after. Your fish has a long life to live.' }].map((p) => (
              <div key={p.n} style={{ borderLeft: '2px solid oklch(0.70 0.12 80)', paddingLeft: 16 }}>
                <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: 'oklch(0.50 0.216 27)', marginBottom: 8 }}>{p.n}</div>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 16, color: 'oklch(0.19 0.012 32)', marginBottom: 5 }}>{p.t}</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'oklch(0.44 0.012 34)', margin: 0 }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section style={{ position: 'sticky', top: 70, zIndex: 40, background: 'oklch(0.972 0.008 78 / 0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid oklch(0.87 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>Family</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SPECIES.map((c) => (<button key={c.key} className="dc-chip" type="button" aria-pressed={species === c.key} onClick={() => setSpecies(c.key)}>{c.label}</button>))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>Grade</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRADES.map((c) => (<button key={c.key} className="dc-chip" type="button" aria-pressed={grade === c.key} onClick={() => setGrade(c.key)}>{c.label}</button>))}
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section style={{ background: 'oklch(0.972 0.008 78)', padding: '44px 0 96px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px,1fr))', gap: 24 }}>
            {items.map((item) => (
              <div key={item.id} className="dc-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <Link href="/specimen-detail" className="dc-card-media" style={{ position: 'relative', aspectRatio: '3/4', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.145 0.01 40) 100%)', boxShadow: '0 22px 46px -28px oklch(0.16 0.02 40 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.16), transparent 70%)' }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.38, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  <span className="dc-sil" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', color: item.tint }}>
                    <svg width="200" height="100" viewBox="0 0 240 120" style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }} aria-hidden="true">
                      <path d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z" fill="currentColor" opacity="0.9" />
                      <circle cx="40" cy="56" r="3" fill="oklch(0.16 0.01 40)" />
                    </svg>
                  </span>
                  <div style={{ position: 'absolute', top: 12, left: 13, fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.6)' }}>{item.tank}</div>
                  <div style={{ position: 'absolute', top: 11, right: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, padding: '0 6px', borderRadius: 6, background: 'oklch(0.72 0.14 82 / 0.14)', border: '1px solid oklch(0.72 0.13 82 / 0.45)', fontFamily: serif, fontWeight: 700, fontSize: 12, color: 'oklch(0.82 0.13 84)' }}>{item.grade}</div>
                  <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.9 0.02 60 / 0.4)' }}>&#9671; awaiting photo</div>
                </Link>
                <div style={{ padding: '15px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 6 }}>{item.speciesLabel}</div>
                  <Link href="/specimen-detail" style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: 'oklch(0.19 0.012 32)', marginBottom: 5 }}>{item.name}</Link>
                  <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.56 0.02 40)' }}>{item.origin}</div>
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.03em', color: 'oklch(0.60 0.02 40)', marginTop: 5 }}>{item.temperament}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 13, borderTop: '1px solid oklch(0.88 0.012 68)' }}>
                    <span style={{ fontFamily: mono, fontSize: 14.5, fontWeight: 600, color: 'oklch(0.22 0.012 32)', letterSpacing: '0.01em' }}>{item.priceLabel}</span>
                    <a href={item.wa} target="_blank" rel="noopener" className="dc-reserve" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.50 0.216 27)', transition: 'color .18s', whiteSpace: 'nowrap' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.50 0.216 27)" /></svg>
                      Reserve
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'oklch(0.50 0.012 34)' }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 56, color: 'oklch(0.52 0.216 27 / 0.3)', marginBottom: 12 }}>渊</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: 'oklch(0.30 0.012 32)', marginBottom: 8 }}>Nothing in the cave matches those filters</div>
              <div style={{ fontSize: 14 }}>Message us &mdash; we often have unlisted fish in quarantine.</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
