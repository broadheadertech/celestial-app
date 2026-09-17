'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { useQuery } from './useQuery';
import { useBusiness } from './business';
import { bloodlineOf, familyOf, isArowana, kindName, type DcProduct } from './fish';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

type Rehomed = DcProduct & { rehomedStatus: 'reserved' | 'sold'; rehomedAt: number };

/**
 * "Recently rehomed" — fish that recently sold or are reserved (see products.getRehomedSpecimens),
 * shown under the Catalog (arowana) or Cave (everything else) grid. Renders nothing when empty.
 */
export default function RehomedStrip({ arowana }: { arowana: boolean }) {
  const all = useQuery(api.services.products.getRehomedSpecimens, { limit: 24 }) as Rehomed[] | undefined;
  const biz = useBusiness();
  const items = (all ?? []).filter((p) => isArowana(kindName(p)) === arowana).slice(0, 8);
  if (items.length === 0) return null;

  const similarHref = biz.wa(`Hi ${biz.storeName} — I saw your recently rehomed ${arowana ? 'arowana' : 'fish'}. Do you have anything similar available?`) ?? '/contact';

  return (
    <section style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', padding: '56px 0 72px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 10 }}>Recently rehomed</div>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(26px,3.4vw,38px)', lineHeight: 1.05, margin: 0, color: 'oklch(0.19 0.012 32)' }}>
              Already found <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>their keepers.</span>
            </h2>
          </div>
          <a href={similarHref} target={similarHref.startsWith('http') ? '_blank' : undefined} rel="noopener" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999 }}>
            Ask for something similar &rarr;
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 18 }}>
          {items.map((item) => (
            <Link key={item._id} href={`/specimen-detail?id=${item._id}`} style={{ display: 'block' }}>
              <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.22)' }}>
                {item.image && <img src={item.image} alt={item.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '12%', opacity: 0.72, filter: 'saturate(0.75)' }} draggable={false} />}
                <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 999, color: 'oklch(0.98 0.012 82)', background: item.rehomedStatus === 'reserved' ? 'oklch(0.55 0.12 70)' : 'oklch(0.50 0.216 27)' }}>
                  {item.rehomedStatus === 'reserved' ? 'Reserved' : 'Sold'}
                </span>
              </div>
              <div style={{ padding: '11px 2px 0' }}>
                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.50 0.03 34)', marginBottom: 4 }}>{arowana ? bloodlineOf(kindName(item)) : familyOf(kindName(item))}</div>
                <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 15.5, lineHeight: 1.2, color: 'oklch(0.26 0.012 32)' }}>{item.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
