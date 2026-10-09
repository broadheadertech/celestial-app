'use client';

/**
 * The Catalog — in-stock arowana ("the dragons") from the Fish category, wired to real Convex data.
 * No page of its own in design-reference/dragoncave-site.html, so it reuses The Cave's toolbar,
 * chips and specimen cards under a compact page head.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { bloodlineOf, buildChips, DcProduct, fmtPeso, isArowana, isFish, kindName } from '@/components/dc/fish';
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

export default function CatalogPage() {
  const products = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const biz = useBusiness();
  const [bloodline, setBloodline] = useState('all');
  const [grade, setGrade] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CatalogSort>('featured');

  const arowana = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isFish(p) && isListable(p) && isArowana(kindName(p))),
    [products],
  );
  const bloodlineChips = useMemo(() => buildChips(arowana, (p) => bloodlineOf(kindName(p))), [arowana]);
  const gradeChips = useMemo(() => ['all', ...Array.from(new Set(arowana.filter((p) => p.grade).map((p) => p.grade!)))], [arowana]);

  const items = useMemo(
    () =>
      sortProducts(
        arowana.filter(
          (p) =>
            (bloodline === 'all' || bloodlineOf(kindName(p)) === bloodline) &&
            (grade === 'all' || p.grade === grade) &&
            matchesSearch(p, query, bloodlineOf(kindName(p))),
        ),
        sort,
      ),
    [arowana, bloodline, grade, query, sort],
  );

  const loading = products === undefined;

  return (
    <div className="dk dk-cave">
      {/* HERO */}
      <NotchHero
        tone="light"
        notchHeight={96}
        notchLabel="On display"
        notch={
          <div className="dk-stat">
            <b>{loading ? '—' : items.length}</b>
            <span>On display</span>
          </div>
        }
      >
        <p className="dk-eyebrow">The catalog</p>
        <h1 className="dk-h1">The living gallery.</h1>
        <p className="dk-lede">Each fish is held in our gallery water until the right collector takes it home. Message us for a full video and lineage card.</p>
      </NotchHero>

      {/* TOOLBAR */}
      <section className="dk-toolbar">
        <div className="dk-wrap">
          <CatalogSearchBar query={query} onQuery={setQuery} sort={sort} onSort={setSort} placeholder="Search by name, bloodline, grade…" searchLabel="Search the catalog" />
          <div className="dk-tb-row dk-tb-row-2">
            <div className="dk-tb-chips">
              <Chips label="Filter by bloodline" visibleLabel="Bloodline" options={bloodlineChips} value={bloodline} onChange={setBloodline} renderLabel={(c) => (c === 'all' ? 'All' : c)} />
              {gradeChips.length > 1 && (
                <Chips label="Filter by grade" visibleLabel="Grade" options={gradeChips} value={grade} onChange={setGrade} renderLabel={(c) => (c === 'all' ? 'All' : c)} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="dk-catalog" aria-label="Catalog">
        <div className="dk-wrap">
          <div className="dk-cards">
            {items.map((item) => (
              <SpecimenCard
                key={item._id}
                href={`/specimen-detail?id=${item._id}`}
                image={item.image}
                name={item.name}
                category={bloodlineOf(kindName(item))}
                price={fmtPeso(item.price)}
                priceStyle="cut"
                action={{ href: biz.enquireHref(item.name, item.tankNumber || String(item.sku || '')), label: 'Enquire' }}
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
              title="No specimens match those filters"
              actions={(query || bloodline !== 'all' || grade !== 'all') ? (
                <button type="button" className="dk-btn dk-btn-outline-dark" onClick={() => { setQuery(''); setBloodline('all'); setGrade('all'); }}>
                  Clear search &amp; filters
                </button>
              ) : undefined}
            >
              Message us — we often have unlisted fish in quarantine.
            </EmptyState>
          )}
          {loading && <div className="dk-empty" role="status">Loading the gallery…</div>}
        </div>
      </section>

      <RehomedStrip arowana={true} />
    </div>
  );
}
