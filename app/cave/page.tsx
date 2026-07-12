'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- verbatim port keeps the design's <a> tags */

/**
 * The Cave — verbatim port of the imported Claude Design file
 * `dragons-cave-cave.dc.html` (+ its site-header / site-footer imports).
 *
 * This page is intentionally self-contained: the design's own header, footer,
 * palette (oklch), fonts (Noto Serif Display / Geist / Geist Mono / Noto Serif TC),
 * WhatsApp buttons, 龍 tile and FAB — NOT the app's SiteHeader / tokens / plates.
 * It deliberately lives outside the (site) route group so no app chrome wraps it.
 */

import { useMemo, useState } from 'react';

const WA = '639172345678';
const enquireHref =
  'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20I%27d%20like%20to%20enquire%20about%20your%20arowana.';

type Fish = {
  id: string;
  name: string;
  species: string;
  speciesLabel: string;
  grade: string;
  tank: string;
  origin: string;
  temperament: string;
  price: number;
  tint: string;
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
  { key: 'all', label: 'All' },
  { key: 'cichlid', label: 'Cichlid' },
  { key: 'catfish', label: 'Catfish' },
  { key: 'ray', label: 'Stingray' },
  { key: 'predator', label: 'Predator' },
  { key: 'oddball', label: 'Oddball' },
];

const GRADES = [
  { key: 'all', label: 'All' },
  { key: 'S', label: 'S' },
  { key: 'AAA', label: 'AAA' },
  { key: 'AA', label: 'AA' },
  { key: 'A', label: 'A' },
];

const CSS = `
.dcpage a { color: inherit; text-decoration: none; }
.dcpage a:hover { color: oklch(0.52 0.216 27); }
.dcpage .dc-chip { font-family:'Geist Mono', monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; padding:9px 15px; border-radius:999px; border:1px solid oklch(0.82 0.02 50); background:oklch(0.985 0.006 80); color:oklch(0.42 0.012 34); cursor:pointer; transition:.18s; white-space:nowrap; }
.dcpage .dc-chip:hover { border-color:oklch(0.52 0.216 27); color:oklch(0.52 0.216 27); }
.dcpage .dc-chip[aria-pressed="true"] { background:oklch(0.50 0.216 27); border-color:oklch(0.50 0.216 27); color:oklch(0.98 0.012 82); }
.dcpage .dc-card-media { display:block; overflow:hidden; border-radius:8px; }
.dcpage .dc-card-media .dc-sil { transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.dcpage .dc-card:hover .dc-card-media .dc-sil { transform:translate(-50%,-50%) scale(1.06) !important; }
.dcpage .dc-reserve:hover { color:oklch(0.44 0.20 28) !important; }
.dcpage .dc-navlink:hover { color: oklch(0.19 0.012 32) !important; }
.dcpage .dc-enquire:hover { background: oklch(0.44 0.20 28) !important; }
.dcpage .dc-foot-link:hover { color: oklch(0.52 0.216 27) !important; }
.dcpage .dc-fab:hover { transform: scale(1.06); box-shadow: 0 18px 40px -12px oklch(0.52 0.216 27 / 0.75) !important; }
@keyframes dcFabPulse { 0%,100% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 0 oklch(0.52 0.216 27 / 0.4);} 50% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 14px oklch(0.52 0.216 27 / 0);} }
`;

const WaIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" />
    <circle cx="9" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
    <circle cx="12.5" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
    <circle cx="16" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
  </svg>
);

export default function CavePage() {
  const [species, setSpecies] = useState('all');
  const [grade, setGrade] = useState('all');

  const items = useMemo(
    () =>
      FISH.filter(
        (f) => (species === 'all' || f.species === species) && (grade === 'all' || f.grade === grade),
      ).map((f) => ({
        ...f,
        priceLabel: '₱' + f.price.toLocaleString('en-US'),
        wa:
          'https://wa.me/' + WA + '?text=' +
          encodeURIComponent(
            "Hi Dragon's Cave — I'd like to reserve the " + f.name + ' (' + f.tank + '). Is it still available?',
          ),
      })),
    [species, grade],
  );

  return (
    <div
      className="dcpage"
      style={{
        fontFamily: "'Geist', system-ui, sans-serif",
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'oklch(0.972 0.008 78)',
        color: 'oklch(0.19 0.012 32)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ───────── HEADER (site-header.dc.html) ───────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'oklch(0.972 0.008 78 / 0.82)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          borderBottom: '1px solid oklch(0.84 0.012 66 / 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, maxWidth: 1280, margin: '0 auto', padding: '14px 28px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/dc-logo-light.png" alt="Dragon's Cave" height={40} style={{ display: 'block', height: 40, width: 'auto' }} draggable={false} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.01em', color: 'oklch(0.19 0.012 32)' }}>Dragon&rsquo;s Cave</span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.52 0.10 30)', marginTop: 4 }}>Est. 2021 &middot; Quezon City</span>
            </span>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <a href="/catalog" className="dc-navlink" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', color: 'oklch(0.40 0.012 36)', padding: '8px 14px', transition: 'color .2s' }}>Catalog</a>
            </span>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <a href="/cave" className="dc-navlink" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', color: 'oklch(0.40 0.012 36)', padding: '8px 14px', transition: 'color .2s' }}>The Cave</a>
              <span style={{ position: 'absolute', left: '50%', bottom: 2, transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: 99, background: 'oklch(0.52 0.216 27)' }} />
            </span>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <a href="/visit" className="dc-navlink" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', color: 'oklch(0.40 0.012 36)', padding: '8px 14px', transition: 'color .2s' }}>Visit</a>
            </span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -8px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-3deg)' }}>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 22, lineHeight: 1, color: 'oklch(0.97 0.012 82)' }}>龍</span>
            </div>
            <a href={enquireHref} target="_blank" rel="noopener" className="dc-enquire" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', padding: '10px 16px', borderRadius: 999, transition: 'background .2s' }}>
              <WaIcon size={14} />
              Enquire
            </a>
          </div>
        </div>
      </header>

      {/* ───────── PAGE HERO ───────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid oklch(0.86 0.012 68)', background: 'oklch(0.972 0.008 78)' }}>
        <div style={{ position: 'absolute', right: -70, top: -64, fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 330, lineHeight: 1, color: 'oklch(0.52 0.216 27 / 0.05)', pointerEvents: 'none', userSelect: 'none' }}>渊</div>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 28px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>The Cave &middot; beyond the dragons</div>
              <h1 style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 'clamp(44px,6.4vw,84px)', lineHeight: 0.94, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>
                The <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>wider water.</span>
              </h1>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, maxWidth: 552, color: 'oklch(0.42 0.012 34)', margin: '18px 0 0' }}>
                Beyond the dragons, the rest of the water &mdash; monster-tank centrepieces, ancient oddballs, and quiet exotics. Each grown on in our own systems and released only when it is ready to keep. Prices in peso; message us to reserve.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 700, fontSize: 46, lineHeight: 1, color: 'oklch(0.50 0.216 27)' }}>{items.length}</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 6 }}>In the cave</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PROMISE INTRO ───────── */}
      <section style={{ background: 'oklch(0.955 0.010 74)', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 28px', display: 'grid', gridTemplateColumns: '0.85fr 2fr', gap: 44, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 10 }}>The Cave &middot; our promise</div>
            <div style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 700, fontSize: 25, lineHeight: 1.05, letterSpacing: '-0.01em', color: 'oklch(0.19 0.012 32)' }}>
              Provenance, then <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>patience.</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
            {[
              { n: '01', t: 'Provenance', b: 'Chipped where required, papered, and logged before it reaches the floor.' },
              { n: '02', t: 'Quarantine', b: '21 days observed in isolation. Nothing joins the tanks uncleared.' },
              { n: '03', t: 'Continuity', b: 'We answer the phone years after. Your fish has a long life to live.' },
            ].map((p) => (
              <div key={p.n} style={{ borderLeft: '2px solid oklch(0.70 0.12 80)', paddingLeft: 16 }}>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 600, color: 'oklch(0.50 0.216 27)', marginBottom: 8 }}>{p.n}</div>
                <div style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 700, fontSize: 16, color: 'oklch(0.19 0.012 32)', marginBottom: 5 }}>{p.t}</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'oklch(0.44 0.012 34)', margin: 0 }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FILTERS ───────── */}
      <section style={{ position: 'sticky', top: 70, zIndex: 40, background: 'oklch(0.972 0.008 78 / 0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid oklch(0.87 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>Family</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SPECIES.map((c) => (
                <button key={c.key} className="dc-chip" type="button" aria-pressed={species === c.key} onClick={() => setSpecies(c.key)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>Grade</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRADES.map((c) => (
                <button key={c.key} className="dc-chip" type="button" aria-pressed={grade === c.key} onClick={() => setGrade(c.key)}>{c.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── GRID ───────── */}
      <section style={{ flex: 1, background: 'oklch(0.972 0.008 78)', padding: '44px 0 96px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px,1fr))', gap: 24 }}>
            {items.map((item) => (
              <div key={item.id} className="dc-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <a href="/specimen-detail" className="dc-card-media" style={{ position: 'relative', aspectRatio: '3/4', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.145 0.01 40) 100%)', boxShadow: '0 22px 46px -28px oklch(0.16 0.02 40 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.16), transparent 70%)' }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.38, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  <span className="dc-sil" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', color: item.tint }}>
                    <svg width="200" height="100" viewBox="0 0 240 120" style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }} aria-hidden="true">
                      <path d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z" fill="currentColor" opacity="0.9" />
                      <circle cx="40" cy="56" r="3" fill="oklch(0.16 0.01 40)" />
                    </svg>
                  </span>
                  <div style={{ position: 'absolute', top: 12, left: 13, fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.6)' }}>{item.tank}</div>
                  <div style={{ position: 'absolute', top: 11, right: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, padding: '0 6px', borderRadius: 6, background: 'oklch(0.72 0.14 82 / 0.14)', border: '1px solid oklch(0.72 0.13 82 / 0.45)', fontFamily: "'Noto Serif Display', serif", fontWeight: 700, fontSize: 12, color: 'oklch(0.82 0.13 84)' }}>{item.grade}</div>
                  <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontFamily: "'Geist Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.9 0.02 60 / 0.4)' }}>&#9671; awaiting photo</div>
                </a>
                <div style={{ padding: '15px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 6 }}>{item.speciesLabel}</div>
                  <a href="/specimen-detail" style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: 'oklch(0.19 0.012 32)', marginBottom: 5 }}>{item.name}</a>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'oklch(0.56 0.02 40)' }}>{item.origin}</div>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.03em', color: 'oklch(0.60 0.02 40)', marginTop: 5 }}>{item.temperament}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 13, borderTop: '1px solid oklch(0.88 0.012 68)' }}>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 14.5, fontWeight: 600, color: 'oklch(0.22 0.012 32)', letterSpacing: '0.01em' }}>{item.priceLabel}</span>
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
              <div style={{ fontFamily: "'Noto Serif Display', serif", fontSize: 22, color: 'oklch(0.30 0.012 32)', marginBottom: 8 }}>Nothing in the cave matches those filters</div>
              <div style={{ fontSize: 14 }}>Message us &mdash; we often have unlisted fish in quarantine.</div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── FOOTER (site-footer.dc.html) ───────── */}
      <footer style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.84 0.012 66)', color: 'oklch(0.34 0.012 32)' }}>
        <div style={{ position: 'absolute', right: -60, bottom: -70, width: 560, opacity: 0.05, pointerEvents: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/highback-gold.png" alt="" style={{ width: '100%', display: 'block' }} draggable={false} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, oklch(0.70 0.12 80 / 0.55), oklch(0.52 0.216 27 / 0.55), transparent)' }} />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '72px 28px 32px', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.2fr', gap: 44 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/dc-logo-light.png" alt="Dragon's Cave" height={44} style={{ height: 44, width: 'auto', display: 'block' }} draggable={false} />
              <span style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 20, color: 'oklch(0.19 0.012 32)' }}>Dragon&rsquo;s Cave</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.65, maxWidth: 320, color: 'oklch(0.42 0.012 34)', margin: '0 0 22px' }}>Home of premium Asian arowana &mdash; the living dragon. Every specimen chipped, certified, and quarantined before it meets our gallery water.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.52 0.10 30)', border: '1px solid oklch(0.82 0.03 40)', borderRadius: 999, padding: '7px 14px' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(0.55 0.14 150)' }} /> CITES-certified dealer
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.55 0.05 40)', marginBottom: 18 }}>Explore</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <a href="/" className="dc-foot-link" style={{ color: 'oklch(0.34 0.012 32)', transition: 'color .2s' }}>Home</a>
              <a href="/catalog" className="dc-foot-link" style={{ color: 'oklch(0.34 0.012 32)', transition: 'color .2s' }}>The Catalog</a>
              <a href="/cave" className="dc-foot-link" style={{ color: 'oklch(0.34 0.012 32)', transition: 'color .2s' }}>The Cave</a>
              <a href="/visit" className="dc-foot-link" style={{ color: 'oklch(0.34 0.012 32)', transition: 'color .2s' }}>Visit &amp; Book</a>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.55 0.05 40)', marginBottom: 18 }}>Gallery</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, lineHeight: 1.5 }}>
              <span>34 Tomas Morato Ave<br />Quezon City, PH</span>
              <span style={{ color: 'oklch(0.48 0.012 34)' }}>Tue&ndash;Sat &middot; 10:00&ndash;18:00<br />By appointment</span>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.55 0.05 40)', marginBottom: 18 }}>Enquire</div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: 'oklch(0.30 0.012 32)', marginBottom: 6 }}>+63 917 234 5678</div>
            <div style={{ fontSize: 13, color: 'oklch(0.48 0.012 34)', marginBottom: 18 }}>hello@dragonscave.ph</div>
            <a href={enquireHref} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999 }}>
              <WaIcon size={15} />
              Message us on WhatsApp
            </a>
          </div>
        </div>

        <div style={{ position: 'relative', borderTop: '1px solid oklch(0.86 0.012 68)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.56 0.012 36)' }}>&copy; 2026 Dragon&rsquo;s Cave &middot; Quezon City, Philippines</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.56 0.012 36)' }}>龍 &middot; Kept, not merely sold.</span>
          </div>
        </div>
      </footer>

      {/* ───────── FLOATING WHATSAPP FAB ───────── */}
      <a href={enquireHref} target="_blank" rel="noopener" className="dc-fab" aria-label="Enquire on WhatsApp" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80, width: 58, height: 58, borderRadius: 999, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px oklch(0.52 0.216 27 / 0.6)', animation: 'dcFabPulse 3.2s ease-in-out infinite', transition: 'transform .2s, box-shadow .2s' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /><circle cx="9" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="12.5" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="16" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /></svg>
      </a>
    </div>
  );
}
