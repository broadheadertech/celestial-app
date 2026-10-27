'use client';

/**
 * Shop — the one place every product lives: live fish and hard goods together, separated by
 * filters rather than by page. (The Cave used to list the non-arowana fish; it is now the
 * venue/about page, and /catalog stays as the arowana showcase.)
 *
 * Two things the single grid has to keep straight:
 *  - A live fish is enquiry-only. It must never reach the cart — orders.placeWebOrder rejects
 *    anything that isn't cart-mode, so an "Add" button on a fish would be a dead end at checkout.
 *  - Over half the public catalog is at zero stock, so the page opens on what is actually
 *    available and offers everything else behind a filter.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { allProductsList, availableOnly } from '@/components/dc/listings';
import type { FunctionReturnType } from 'convex/server';
import { useSiteCart } from '@/store/siteCart';
import { useBusiness } from '@/components/dc/business';
import VideoBadge from '@/components/dc/VideoBadge';
import PreorderBadge from '@/components/dc/PreorderBadge';
import { incomingLabel, isIncoming } from '@/components/dc/preorder';
import Brand from '@/components/dc/kit/Brand';
import Chips from '@/components/dc/kit/Chips';
import Placeholder from '@/components/dc/kit/Placeholder';
import SearchField from '@/components/dc/kit/SearchField';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import { NeIcon } from '@/components/dc/kit/icons';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type CatalogProduct = FunctionReturnType<typeof api.services.products.getCatalogProducts>[number];

/** Live fish are the enquiry-only half of the shop; everything else goes through the cart. */
const isLiveFish = (p: CatalogProduct) => p.purchaseMode !== 'cart';

export default function ShopPage() {
  const products = useQuery(api.services.products.getCatalogProducts, {});
  const add = useSiteCart((s) => s.add);
  const biz = useBusiness();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availability, setAvailability] = useState<'available' | 'all'>('available');
  const [search, setSearch] = useState('');

  const everything = useMemo(() => allProductsList(products ?? []), [products]);
  const inScope = useMemo(
    () => (availability === 'available' ? availableOnly(everything) : everything),
    [everything, availability],
  );

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const p of inScope) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Other';
      const ex = m.get(id);
      if (ex) ex.count += 1;
      else m.set(id, { id, name, count: 1 });
    }
    // Fish first — it is the reason most people are here — then the rest alphabetically.
    return Array.from(m.values()).sort((a, b) => {
      if (a.name === 'Fish') return -1;
      if (b.name === 'Fish') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [inScope]);

  const visible = useMemo(() => {
    let list = inScope;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => (p.categoryId as string) === selectedCategory);
    }
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          String(p.sku || '').toLowerCase().includes(t) ||
          (p.categoryName || '').toLowerCase().includes(t),
      );
    }
    return list;
  }, [inScope, selectedCategory, search]);

  const chipIds = useMemo(() => ['all', ...categories.map((c) => c.id)], [categories]);
  const chipLabel = (id: string) => {
    if (id === 'all') return `Everything · ${inScope.length}`;
    const c = categories.find((x) => x.id === id);
    if (!c) return id;
    return `${c.name === 'Fish' ? 'Live fish' : c.name} · ${c.count}`;
  };

  /** Packing-slip rows jump to the list with that category selected. */
  const jumpTo = (id: string) => {
    setSelectedCategory(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('shop-list')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const subline = [biz.establishedYear && `Est. ${biz.establishedYear}`, biz.city].filter(Boolean).join(' · ');
  const loading = products === undefined;

  return (
    <main className="dk dk-shop">
      {/* HERO */}
      <NotchHero
        tone="dark"
        notchWide
        notchHeight={100}
        notchLabel="Search the shop"
        notch={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search fish, gear, food…"
            label="Search the shop"
          />
        }
        aside={
          <div className="dk-slip" aria-label="Shop summary">
            <Brand name={biz.storeName} sub={subline} className="dk-brand dk-slip-brand" />
            <hr className="dk-slip-rule" />
            {categories.map((c) => (
              <button key={c.id} type="button" className="dk-slip-row" onClick={() => jumpTo(c.id)}>
                <span>{c.name === 'Fish' ? 'Live fish' : c.name}</span>
                <span className="dk-leader" aria-hidden="true" />
                <b>{c.count}</b>
                <NeIcon />
              </button>
            ))}
            <div className="dk-slip-total">
              <span>Everything</span>
              <b>{loading ? '—' : inScope.length}</b>
            </div>
            <div className="dk-barcode" aria-hidden="true" />
            <p className="dk-slip-foot">Kept, not merely sold.</p>
          </div>
        }
      >
        <div className="dk-shop-copy">
          <p className="dk-eyebrow">Shop · Everything we keep</p>
          <h1>
            For the long
            <br />
            keep.
          </h1>
          <p className="dk-lede">
            Live fish, tanks, filtration, food, lighting and medicines — all of it in one place.
            Fish are reserved by message and seen in person; everything else you can order online.
          </p>
          <span className="dk-scroll-hint" aria-hidden="true">
            Scroll
          </span>
        </div>
      </NotchHero>

      {/* TOOLBAR */}
      <section className="dk-toolbar dk-shop-toolbar" id="shop-list" style={{ scrollMarginTop: 96 }}>
        <div className="dk-wrap">
          <div className="dk-tb-row dk-tb-row-2">
            <div className="dk-tb-chips">
              <Chips
                label="Filter by category"
                visibleLabel="Category"
                options={chipIds}
                value={selectedCategory}
                onChange={setSelectedCategory}
                renderLabel={chipLabel}
              />
              <Chips
                label="Filter by availability"
                visibleLabel="Show"
                options={['available', 'all']}
                value={availability}
                onChange={(v) => setAvailability(v as 'available' | 'all')}
                renderLabel={(v) => (v === 'available' ? 'Available now' : 'Include sold out')}
              />
            </div>
            {!loading && (
              <p className="dk-tb-count" aria-live="polite">
                Showing {visible.length} of {inScope.length}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="dk-shop-products" aria-label="Products">
        <div className="dk-wrap">
          {loading ? (
            <div className="dk-empty" role="status">
              Loading the shop…
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              title={
                inScope.length === 0
                  ? 'Nothing in the shop right now — check back soon.'
                  : 'Nothing matches these filters.'
              }
              actions={
                search || selectedCategory !== 'all' || availability !== 'available' ? (
                  <button
                    type="button"
                    className="dk-btn dk-btn-outline-dark"
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory('all');
                      setAvailability('available');
                    }}
                  >
                    Clear search &amp; filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="dk-products">
              {visible.map((p) => (
                <ProductTile
                  key={p._id}
                  product={p}
                  enquireHref={biz.enquireHref(p.name, p.tankNumber || String(p.sku || ''))}
                  onAdd={() =>
                    add({
                      productId: p._id,
                      name: p.name,
                      sku: p.sku ? String(p.sku) : undefined,
                      price: p.price,
                      stock: p.stock,
                      image: p.image,
                      categoryId: p.categoryId as string,
                      categoryName: p.categoryName,
                      isLive: false,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ProductTile({
  product,
  enquireHref,
  onAdd,
}: {
  product: CatalogProduct;
  enquireHref: string;
  onAdd: () => void;
}) {
  const href = `/specimen-detail?id=${product._id}`;
  const live = isLiveFish(product);
  const soldOut = product.stock <= 0 && !isIncoming(product);

  return (
    <article className="dk-product">
      <div className="dk-p-img">
        <Link href={href} aria-label={product.name} style={{ position: 'absolute', inset: 0 }}>
          <Placeholder src={product.image} alt={product.name} contain />
        </Link>
        {product.videos?.length ? <VideoBadge count={product.videos.length} /> : null}
        {isIncoming(product) ? <PreorderBadge label={incomingLabel(product)} /> : null}
        <div className="dk-cut">
          {soldOut ? (
            // Still reachable and still linked, but there is nothing to action.
            <span className="dk-pill" aria-disabled="true">
              Sold
            </span>
          ) : live ? (
            // Enquiry-only: a fish in the cart would be rejected at checkout.
            <a
              className="dk-pill"
              href={enquireHref}
              target={enquireHref.startsWith('http') ? '_blank' : undefined}
              rel="noopener"
              aria-label={`Enquire about ${product.name}`}
            >
              Reserve
            </a>
          ) : (
            <button className="dk-pill" type="button" onClick={onAdd} aria-label={`Add ${product.name} to cart`}>
              + Add
            </button>
          )}
        </div>
      </div>
      <p className="dk-p-cat">{product.categoryName === 'Fish' ? 'Live fish' : product.categoryName || 'Gear'}</p>
      <h3>
        <Link href={href} className="dk-p-name" title={product.name}>
          {product.name}
        </Link>
      </h3>
      <p className="dk-p-price">{fmt(product.price)}</p>
    </article>
  );
}
