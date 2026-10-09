'use client';

/**
 * The Cave — design-reference/dragoncave-site.html (The Cave), wired to real Convex data.
 * "Beyond the dragons, the rest of the water": in-stock non-arowana fish.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { buildChips, DcProduct, familyOf, fmtPeso, isArowana, isFish, kindName } from '@/components/dc/fish';
import { useBusiness } from '@/components/dc/business';
import VideoBadge from '@/components/dc/VideoBadge';
import PreorderBadge from '@/components/dc/PreorderBadge';
import { incomingLabel, isIncoming, isListable } from '@/components/dc/preorder';
import CatalogSearchBar from '@/components/dc/CatalogSearchBar';
import RehomedStrip from '@/components/dc/RehomedStrip';
import { matchesSearch, sortProducts, type CatalogSort } from '@/components/dc/catalogFilters';
import Chips from '@/components/dc/kit/Chips';
import SpecimenCard from '@/components/dc/kit/SpecimenCard';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { ChatIcon, ChipIcon, ClockIcon, PhoneIcon } from '@/components/dc/kit/icons';

/** Families shown as photo tiles in the hero — the biggest ones that have a photo. */
const MOSAIC_SIZE = 4;

export default function CavePage() {
  const products = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const biz = useBusiness();
  const [family, setFamily] = useState('all');
  const [grade, setGrade] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CatalogSort>('featured');

  const cave = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isFish(p) && isListable(p) && !isArowana(kindName(p))),
    [products],
  );
  const familyChips = useMemo(() => buildChips(cave, (p) => familyOf(kindName(p))), [cave]);
  const gradeChips = useMemo(() => ['all', ...Array.from(new Set(cave.filter((p) => p.grade).map((p) => p.grade!)))], [cave]);

  const items = useMemo(
    () =>
      sortProducts(
        cave.filter(
          (p) =>
            (family === 'all' || familyOf(kindName(p)) === family) &&
            (grade === 'all' || p.grade === grade) &&
            matchesSearch(p, query, familyOf(kindName(p))),
        ),
        sort,
      ),
    [cave, family, grade, query, sort],
  );
  const loading = products === undefined;
  const familyCount = familyChips.length - 1;

  /** Hero tiles: one per family (largest first), each with a representative photo and how many are in. */
  const mosaic = useMemo(() => {
    const byFamily = new Map<string, { family: string; count: number; image?: string }>();
    for (const p of cave) {
      const fam = familyOf(kindName(p));
      const entry = byFamily.get(fam) ?? { family: fam, count: 0 };
      entry.count += 1;
      if (!entry.image && p.image) entry.image = p.image;
      byFamily.set(fam, entry);
    }
    return [...byFamily.values()].filter((e) => e.image).sort((a, b) => b.count - a.count).slice(0, MOSAIC_SIZE);
  }, [cave]);

  /** A hero tile filters the grid to its family and brings the grid into view. */
  const showFamily = (fam: string) => {
    setFamily(fam);
    setGrade('all');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('cave-grid')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="dk dk-cave">
      {/* HERO */}
      <NotchHero
        tone="light"
        notchHeight={100}
        notchLabel="Reserve"
        notch={
          <a className="dk-btn dk-btn-red" href={biz.generalHref} target={biz.generalHref.startsWith('http') ? '_blank' : undefined} rel="noopener">
            <ChatIcon />Message us to reserve
          </a>
        }
        aside={
          <div className="dk-cave-mosaic" aria-label="Browse by family">
            {mosaic.length > 0
              ? mosaic.map((m) => (
                  <button key={m.family} type="button" className="dk-cave-tile" onClick={() => showFamily(m.family)} aria-label={`Show ${m.family} (${m.count})`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- product photos are remote Convex storage URLs */}
                    <img src={m.image} alt="" loading="lazy" decoding="async" draggable={false} />
                    <span className="dk-cave-tile-label" aria-hidden="true">{m.family}<span>{m.count}</span></span>
                  </button>
                ))
              : Array.from({ length: MOSAIC_SIZE }, (_, i) => <Placeholder key={i} className="dk-cave-tile" />)}
          </div>
        }
      >
        <div className="dk-cave-copy">
          <p className="dk-eyebrow">The cave · Beyond the dragons</p>
          <h1>The wider<br />water.</h1>
          <p className="dk-lede">Beyond the dragons, the rest of the water monster-tank centrepieces, ancient oddballs, and quiet exotics. Each grown on in our own systems and released only when it is ready to keep.</p>
          <div className="dk-stats dk-cave-stats">
            <div className="dk-stat"><b>{loading ? '—' : cave.length}</b><span>In the cave now</span></div>
            <div className="dk-stat"><b>{loading ? '—' : familyCount}</b><span>Families</span></div>
            <div className="dk-stat"><b>21</b><span>Days in quarantine</span></div>
          </div>
          <a className="dk-btn dk-btn-outline-dark dk-cave-browse" href="#cave-grid">Browse the cave</a>
        </div>
      </NotchHero>

      {/* PROMISE */}
      <section className="dk-cave-promise" aria-labelledby="cave-promise-title">
        <div className="dk-wrap">
          <div className="dk-cp-grid">
            <div>
              <p className="dk-eyebrow">The cave · Our promise</p>
              <h2 id="cave-promise-title">Provenance,<br />then patience.</h2>
            </div>
            <div className="dk-cp-item"><span className="dk-promise-icon"><ChipIcon size={14} /></span><h3>Provenance</h3><p>Chipped where required, papered, and logged before it reaches the floor.</p></div>
            <div className="dk-cp-item"><span className="dk-promise-icon"><ClockIcon size={16} /></span><h3>Quarantine</h3><p>21 days observed in isolation. Nothing joins the tanks uncleared.</p></div>
            <div className="dk-cp-item"><span className="dk-promise-icon"><PhoneIcon size={16} /></span><h3>Continuity</h3><p>We answer the phone years after. Your fish has a long life to live.</p></div>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="dk-toolbar" id="cave-grid">
        <div className="dk-wrap">
          <CatalogSearchBar query={query} onQuery={setQuery} sort={sort} onSort={setSort} placeholder="Search by name, family, grade…" searchLabel="Search the cave" />
          <div className="dk-tb-row dk-tb-row-2">
            <div className="dk-tb-chips">
              <Chips label="Filter by family" visibleLabel="Family" options={familyChips} value={family} onChange={setFamily} renderLabel={(c) => (c === 'all' ? 'All' : c)} />
              {gradeChips.length > 1 && (
                <Chips label="Filter by grade" visibleLabel="Grade" options={gradeChips} value={grade} onChange={setGrade} renderLabel={(c) => (c === 'all' ? 'All' : c)} />
              )}
            </div>
            {!loading && <p className="dk-tb-count" aria-live="polite">Showing {items.length} of {cave.length}</p>}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="dk-catalog" aria-label="Cave catalog">
        <div className="dk-wrap">
          <div className="dk-cards">
            {items.map((item) => (
              <SpecimenCard
                key={item._id}
                href={`/specimen-detail?id=${item._id}`}
                image={item.image}
                name={item.name}
                category={familyOf(kindName(item))}
                price={fmtPeso(item.price)}
                priceStyle="cut"
                action={{ href: biz.enquireHref(item.name, item.tankNumber || String(item.sku || '')), label: 'Reserve' }}
                overlay={
                  <>
                    {item.videos?.length ? <VideoBadge count={item.videos.length} /> : null}
                    {isIncoming(item) ? <PreorderBadge label={incomingLabel(item)} /> : null}
                  </>
                }
              />
            ))}
          </div>

          {!loading && items.length === 0 && (
            <EmptyState
              title="Nothing in the cave matches those filters"
              actions={(query || family !== 'all' || grade !== 'all') ? (
                <button type="button" className="dk-btn dk-btn-outline-dark" onClick={() => { setQuery(''); setFamily('all'); setGrade('all'); }}>
                  Clear search &amp; filters
                </button>
              ) : undefined}
            >
              Message us — we often have unlisted fish in quarantine.
            </EmptyState>
          )}
          {loading && <div className="dk-empty" role="status">Loading the cave…</div>}
        </div>
      </section>

      <RehomedStrip arowana={false} />
    </div>
  );
}

