'use client';
/* eslint-disable @next/next/no-img-element -- verbatim design port uses the design's <img> assets */

/**
 * The Catalog — verbatim port of `dragons-cave-catalog.dc.html` (content only).
 * Header / footer / styles come from the (site) layout.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';

const IMG: Record<string, string> = {
  'assets/red.png': '/img/red.png',
  'assets/highback-gold.png': '/img/highback-gold.png',
  'assets/24k-gold.png': '/img/24k-gold.png',
};

const SPECIES = [
  { key: 'all', label: 'All' },
  { key: 'red', label: 'Asian Red' },
  { key: 'crossback', label: 'Crossback Gold' },
  { key: 'gold24', label: '24K Golden' },
  { key: 'redtail', label: 'Red Tail Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'jardini', label: 'Jardini' },
];
const GRADES = [
  { key: 'all', label: 'All' }, { key: 'S', label: 'S' }, { key: 'AAA', label: 'AAA' }, { key: 'AA', label: 'AA' }, { key: 'A', label: 'A' },
];

type Spec = { id: string; name: string; species: string; speciesLabel: string; grade: string; tank: string; origin: string; img?: string; isSil?: boolean; tint?: string };

const SPECIMENS: Spec[] = [
  { id: 'sr118', name: 'Chili Super Red', species: 'red', speciesLabel: 'Asian Red', grade: 'S', tank: 'TANK III', origin: 'Kapuas Hulu', img: 'assets/red.png' },
  { id: 'br204', name: 'Blood Red — “Ember”', species: 'red', speciesLabel: 'Asian Red', grade: 'AAA', tank: 'TANK IV', origin: 'Pontianak', img: 'assets/red.png' },
  { id: 'ur061', name: 'Ultra Red, 2yr', species: 'red', speciesLabel: 'Asian Red', grade: 'AA', tank: 'TANK II', origin: 'Kapuas', img: 'assets/red.png' },
  { id: 'hb512', name: 'Highback Golden', species: 'crossback', speciesLabel: 'Crossback Gold', grade: 'AAA', tank: 'TANK V', origin: 'Bukit Merah', img: 'assets/highback-gold.png' },
  { id: 'bb530', name: 'Blue-Base Crossback', species: 'crossback', speciesLabel: 'Crossback Gold', grade: 'S', tank: 'TANK VI', origin: 'Bukit Merah', img: 'assets/highback-gold.png' },
  { id: 'em880', name: 'Emperor 24K', species: 'gold24', speciesLabel: '24K Golden', grade: 'S', tank: 'TANK VIII', origin: 'Pekan', img: 'assets/24k-gold.png' },
  { id: 'gh907', name: 'Golden Head 24K', species: 'gold24', speciesLabel: '24K Golden', grade: 'AAA', tank: 'TANK IX', origin: 'Pekan', img: 'assets/24k-gold.png' },
  { id: 'rt742', name: 'Red Tail Golden', species: 'redtail', speciesLabel: 'Red Tail Gold', grade: 'AA', tank: 'TANK VII', origin: 'Pekanbaru', img: 'assets/highback-gold.png' },
  { id: 'sp310', name: 'Silver Pearl', species: 'silver', speciesLabel: 'Silver', grade: 'A', tank: 'TANK X', origin: 'Rio Negro', isSil: true, tint: 'oklch(0.78 0.02 230)' },
  { id: 'jd411', name: 'Jardini Pearl', species: 'jardini', speciesLabel: 'Jardini', grade: 'AA', tank: 'TANK XI', origin: 'Merauke', isSil: true, tint: 'oklch(0.70 0.10 150)' },
];

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

export default function CatalogPage() {
  const [species, setSpecies] = useState('all');
  const [grade, setGrade] = useState('all');

  const items = useMemo(
    () =>
      SPECIMENS.filter((s) => (species === 'all' || s.species === species) && (grade === 'all' || s.grade === grade)).map((s) => ({
        ...s,
        wa: 'https://wa.me/639172345678?text=' + encodeURIComponent("Hi Dragon's Cave — I'd like to enquire about " + s.name + ' (' + s.tank + '). Is it still available?'),
      })),
    [species, grade],
  );

  return (
    <>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid oklch(0.86 0.012 68)', background: 'oklch(0.972 0.008 78)' }}>
        <div style={{ position: 'absolute', right: -90, top: -40, fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 340, lineHeight: 1, color: 'oklch(0.52 0.216 27 / 0.05)', pointerEvents: 'none', userSelect: 'none' }}>龍</div>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 28px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>The catalog</div>
              <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(44px,6.4vw,84px)', lineHeight: 0.94, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>The living <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>gallery.</span></h1>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, maxWidth: 520, color: 'oklch(0.42 0.012 34)', margin: '18px 0 0' }}>Each fish is held in our gallery water until the right collector takes it home. Prices on enquiry &mdash; message us and we&rsquo;ll send a full video and lineage card.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 46, lineHeight: 1, color: 'oklch(0.50 0.216 27)' }}>{items.length}</div>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 6 }}>On display</div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section style={{ position: 'sticky', top: 70, zIndex: 40, background: 'oklch(0.972 0.008 78 / 0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid oklch(0.87 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>Bloodline</span>
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
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.20), transparent 70%)' }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.38, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  {item.isSil ? (
                    <span className="dc-sil" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', color: item.tint }}>
                      <svg width="200" height="100" viewBox="0 0 240 120" style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }} aria-hidden="true">
                        <path d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z" fill="currentColor" opacity="0.9" />
                        <circle cx="40" cy="56" r="3" fill="oklch(0.16 0.01 40)" />
                      </svg>
                    </span>
                  ) : (
                    <img src={IMG[item.img!]} alt={item.name} style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: '112%', filter: 'drop-shadow(0 14px 22px oklch(0 0 0 / 0.5))' }} draggable={false} />
                  )}
                  <div style={{ position: 'absolute', top: 12, left: 13, fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.6)' }}>{item.tank}</div>
                  <div style={{ position: 'absolute', top: 11, right: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, padding: '0 6px', borderRadius: 6, background: 'oklch(0.72 0.14 82 / 0.14)', border: '1px solid oklch(0.72 0.13 82 / 0.45)', fontFamily: serif, fontWeight: 700, fontSize: 12, color: 'oklch(0.82 0.13 84)' }}>{item.grade}</div>
                </Link>
                <div style={{ padding: '15px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 6 }}>{item.speciesLabel}</div>
                  <Link href="/specimen-detail" style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: 'oklch(0.19 0.012 32)', marginBottom: 4 }}>{item.name}</Link>
                  <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.56 0.02 40)', marginBottom: 14 }}>{item.origin}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, borderTop: '1px solid oklch(0.88 0.012 68)' }}>
                    <a href={item.wa} target="_blank" rel="noopener" className="dc-enq" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.50 0.216 27)', transition: 'color .18s' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.50 0.216 27)" /></svg>
                      Enquire
                    </a>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', color: 'oklch(0.58 0.02 40)' }}>1 of 1</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'oklch(0.50 0.012 34)' }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 56, color: 'oklch(0.52 0.216 27 / 0.3)', marginBottom: 12 }}>龍</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: 'oklch(0.30 0.012 32)', marginBottom: 8 }}>No specimens match those filters</div>
              <div style={{ fontSize: 14 }}>Message us &mdash; we often have unlisted fish in quarantine.</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
