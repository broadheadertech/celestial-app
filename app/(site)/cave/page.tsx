'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

/**
 * The Cave — the design, wired to real Convex data.
 * "Beyond the dragons, the rest of the water": in-stock non-arowana fish.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { buildChips, DcProduct, familyOf, fmtPeso, gradeRank, isArowana, isFish, tintFor } from '@/components/dc/fish';
import { useBusiness } from '@/components/dc/business';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

export default function CavePage() {
  const products = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const biz = useBusiness();
  const [family, setFamily] = useState('all');
  const [grade, setGrade] = useState('all');

  const cave = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isFish(p) && p.stock > 0 && !isArowana(p.name)),
    [products],
  );
  const familyChips = useMemo(() => buildChips(cave, (p) => familyOf(p.name)), [cave]);
  const gradeChips = useMemo(() => ['all', ...Array.from(new Set(cave.filter((p) => p.grade).map((p) => p.grade!)))], [cave]);

  const items = useMemo(
    () =>
      cave
        .filter((p) => (family === 'all' || familyOf(p.name) === family) && (grade === 'all' || p.grade === grade))
        .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price),
    [cave, family, grade],
  );
  const loading = products === undefined;

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
              <p style={{ fontSize: 16.5, lineHeight: 1.6, maxWidth: 552, color: 'oklch(0.42 0.012 34)', margin: '18px 0 0' }}>Beyond the dragons, the rest of the water &mdash; monster-tank centrepieces, ancient oddballs, and quiet exotics. Each grown on in our own systems and released only when it is ready to keep. Message us to reserve.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 46, lineHeight: 1, color: 'oklch(0.50 0.216 27)' }}>{loading ? '—' : items.length}</div>
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
          <ChipRow label="Family" chips={familyChips} value={family} onChange={setFamily} />
          {gradeChips.length > 1 && <ChipRow label="Grade" chips={gradeChips} value={grade} onChange={setGrade} />}
        </div>
      </section>

      {/* GRID */}
      <section style={{ background: 'oklch(0.972 0.008 78)', padding: '44px 0 96px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px,1fr))', gap: 24 }}>
            {items.map((item) => (
              <div key={item._id} className="dc-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <Link href={`/specimen-detail?id=${item._id}`} className="dc-card-media" style={{ position: 'relative', aspectRatio: '3/4', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.145 0.01 40) 100%)', boxShadow: '0 22px 46px -28px oklch(0.16 0.02 40 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.16), transparent 70%)' }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.38, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: '100%', height: '100%', objectFit: 'contain', padding: '12%', filter: 'drop-shadow(0 14px 22px oklch(0 0 0 / 0.5))' }} draggable={false} />
                  ) : (
                    <span className="dc-sil" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', color: tintFor(item._id) }}>
                      <svg width="200" height="100" viewBox="0 0 240 120" style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }} aria-hidden="true">
                        <path d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z" fill="currentColor" opacity="0.9" />
                        <circle cx="40" cy="56" r="3" fill="oklch(0.16 0.01 40)" />
                      </svg>
                    </span>
                  )}
                  {item.tankNumber && <div style={{ position: 'absolute', top: 12, left: 13, fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.6)' }}>{item.tankNumber}</div>}
                  {item.grade && <div style={{ position: 'absolute', top: 11, right: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, padding: '0 6px', borderRadius: 6, background: 'oklch(0.72 0.14 82 / 0.14)', border: '1px solid oklch(0.72 0.13 82 / 0.45)', fontFamily: serif, fontWeight: 700, fontSize: 12, color: 'oklch(0.82 0.13 84)' }}>{item.grade}</div>}
                </Link>
                <div style={{ padding: '15px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 6 }}>{familyOf(item.name)}</div>
                  <Link href={`/specimen-detail?id=${item._id}`} style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: 'oklch(0.19 0.012 32)', marginBottom: 5 }}>{item.name}</Link>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 13, borderTop: '1px solid oklch(0.88 0.012 68)' }}>
                    <span style={{ fontFamily: mono, fontSize: 14.5, fontWeight: 600, color: 'oklch(0.22 0.012 32)', letterSpacing: '0.01em' }}>{fmtPeso(item.price)}</span>
                    <a href={biz.enquireHref(item.name, item.tankNumber || String(item.sku || ''))} target="_blank" rel="noopener" className="dc-reserve" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.50 0.216 27)', transition: 'color .18s', whiteSpace: 'nowrap' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.50 0.216 27)" /></svg>
                      Reserve
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'oklch(0.50 0.012 34)' }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 56, color: 'oklch(0.52 0.216 27 / 0.3)', marginBottom: 12 }}>渊</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: 'oklch(0.30 0.012 32)', marginBottom: 8 }}>Nothing in the cave matches those filters</div>
              <div style={{ fontSize: 14 }}>Message us &mdash; we often have unlisted fish in quarantine.</div>
            </div>
          )}
          {loading && <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: mono, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.60 0.02 40)' }}>Loading the cave&hellip;</div>}
        </div>
      </section>
    </>
  );
}

function ChipRow({ label, chips, value, onChange }: { label: string; chips: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', minWidth: 64 }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <button key={c} className="dc-chip" type="button" aria-pressed={value === c} onClick={() => onChange(c)}>{c === 'all' ? 'All' : c}</button>
        ))}
      </div>
    </div>
  );
}
