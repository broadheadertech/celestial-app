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
import { ChatIcon, ChipIcon, ClockIcon, ImageFrameIcon, PhoneIcon } from '@/components/dc/kit/icons';

/** The tank rack in the hero: one tank per family, showing a fish from that family when there is one. */
const RACK_TOP = ['Exotic', 'Stingray'];
const RACK_MID = ['Cichlid', 'Oddball', 'Predator'];

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
  const tankImage = (fam: string) => cave.find((p) => p.image && familyOf(kindName(p)) === fam)?.image;
  const wideImage = cave.find((p) => p.image && !RACK_TOP.includes(familyOf(kindName(p))) && !RACK_MID.includes(familyOf(kindName(p))))?.image;

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
          <div className="dk-rack" aria-label="Tanks in the cave">
            <div className="dk-shelf dk-shelf-2">
              {RACK_TOP.map((f) => <Tank key={f} family={f} src={tankImage(f)} />)}
            </div>
            <div className="dk-shelf dk-shelf-3">
              {RACK_MID.map((f) => <Tank key={f} family={f} src={tankImage(f)} />)}
            </div>
            <div className="dk-shelf">
              <div className="dk-tank-slot">
                <TankBox src={wideImage} wide />
                <span className="dk-cave-count"><b>{loading ? '—' : cave.length}</b> In the cave</span>
              </div>
            </div>
          </div>
        }
      >
        <div className="dk-cave-copy">
          <p className="dk-eyebrow">The cave · Beyond the dragons</p>
          <h1>The wider<br />water.</h1>
          <p className="dk-lede">Beyond the dragons, the rest of the water monster-tank centrepieces, ancient oddballs, and quiet exotics. Each grown on in our own systems and released only when it is ready to keep.</p>
          <span className="dk-scroll-hint" aria-hidden="true">Scroll</span>
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
      <section className="dk-toolbar">
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

function TankBox({ src, wide = false }: { src?: string; wide?: boolean }) {
  return (
    <div className={`dk-tank${wide ? ' dk-tank-wide' : ''}${src ? ' has-img' : ''}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- product photos are remote Convex storage URLs
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
      ) : (
        <><ImageFrameIcon /><span>Image placeholder</span></>
      )}
    </div>
  );
}

function Tank({ family, src }: { family: string; src?: string }) {
  return (
    <div className="dk-tank-slot">
      <TankBox src={src} />
      <span className="dk-tank-tag">{family}</span>
    </div>
  );
}
