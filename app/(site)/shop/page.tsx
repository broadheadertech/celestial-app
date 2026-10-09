'use client';

/**
 * Shop · Gear & food — design-reference/dragoncave-site.html (Shop), wired to the catalog query
 * and the site cart. Only products set to "Add to cart" in the admin are listed (live fish are enquiry-only).
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useSiteCart } from '@/store/siteCart';
import { useBusiness } from '@/components/dc/business';
import VideoBadge from '@/components/dc/VideoBadge';
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

export default function ShopPage() {
  const products = useQuery(api.services.products.getCatalogProducts, {});
  const add = useSiteCart((s) => s.add);
  const biz = useBusiness();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Only products set to "Add to cart" in the admin (live fish are enquiry-only).
  const gearProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive && p.stock > 0 && p.purchaseMode === 'cart'),
    [products],
  );

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const p of gearProducts) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Other';
      const ex = m.get(id);
      if (ex) ex.count += 1;
      else m.set(id, { id, name, count: 1 });
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [gearProducts]);

  const visible = useMemo(() => {
    let list = gearProducts;
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
  }, [gearProducts, selectedCategory, search]);

  const chipIds = useMemo(() => ['all', ...categories.map((c) => c.id)], [categories]);
  const chipLabel = (id: string) => {
    if (id === 'all') return `All gear · ${gearProducts.length}`;
    const c = categories.find((x) => x.id === id);
    return c ? `${c.name} · ${c.count}` : id;
  };
  /** Packing-slip rows jump to the list with that category selected. */
  const jumpTo = (id: string) => {
    setSelectedCategory(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('shop-list')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const subline = [biz.establishedYear && `Est. ${biz.establishedYear}`, biz.city].filter(Boolean).join(' · ');

  return (
    <main className="dk dk-shop">
      {/* HERO */}
      <NotchHero
        tone="dark"
        notchWide
        notchHeight={100}
        notchLabel="Search the shop"
        notch={<SearchField value={search} onChange={setSearch} placeholder="Search gear, food, brand…" label="Search the shop" />}
        aside={
          <div className="dk-slip" aria-label="Shop summary">
            <Brand name={biz.storeName} sub={subline} className="dk-brand dk-slip-brand" />
            <hr className="dk-slip-rule" />
            {categories.map((c) => (
              <button key={c.id} type="button" className="dk-slip-row" onClick={() => jumpTo(c.id)}>
                <span>{c.name}</span>
                <span className="dk-leader" aria-hidden="true" />
                <b>{c.count}</b>
                <NeIcon />
              </button>
            ))}
            <div className="dk-slip-total"><span>All gear</span><b>{products === undefined ? '—' : gearProducts.length}</b></div>
            <div className="dk-barcode" aria-hidden="true" />
            <p className="dk-slip-foot">Kept, not merely sold.</p>
          </div>
        }
      >
        <div className="dk-shop-copy">
          <p className="dk-eyebrow">Shop · Gear &amp; food</p>
          <h1>For the long<br />keep.</h1>
          <p className="dk-lede">What we use ourselves. Tanks, filtration, food, lighting, medicines. Curated, not catalogued.</p>
          <span className="dk-scroll-hint" aria-hidden="true">Scroll</span>
        </div>
      </NotchHero>

      {/* TOOLBAR */}
      <section className="dk-toolbar dk-shop-toolbar" id="shop-list" style={{ scrollMarginTop: 96 }}>
        <div className="dk-wrap">
          <div className="dk-tb-row dk-tb-row-2">
            <Chips label="Filter by category" options={chipIds} value={selectedCategory} onChange={setSelectedCategory} renderLabel={chipLabel} />
            {products !== undefined && <p className="dk-tb-count" aria-live="polite">Showing {visible.length} of {gearProducts.length}</p>}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="dk-shop-products" aria-label="Products">
        <div className="dk-wrap">
          {products === undefined ? (
            <div className="dk-empty" role="status">Loading the shop…</div>
          ) : visible.length === 0 ? (
            <EmptyState title={gearProducts.length === 0 ? 'Nothing in the shop right now — check back soon.' : 'No gear matches these filters.'} />
          ) : (
            <div className="dk-products">
              {visible.map((p) => (
                <GearTile
                  key={p._id}
                  product={p}
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

function GearTile({ product, onAdd }: { product: CatalogProduct; onAdd: () => void }) {
  const href = `/specimen-detail?id=${product._id}`;
  return (
    <article className="dk-product">
      <div className="dk-p-img">
        <Link href={href} aria-label={product.name} style={{ position: 'absolute', inset: 0 }}>
          <Placeholder src={product.image} alt={product.name} contain />
        </Link>
        {product.videos?.length ? <VideoBadge count={product.videos.length} /> : null}
        <div className="dk-cut">
          <button className="dk-pill" type="button" onClick={onAdd} aria-label={`Add ${product.name} to cart`}>+ Add</button>
        </div>
      </div>
      <p className="dk-p-cat">{product.categoryName || 'Gear'}</p>
      <h3><Link href={href} className="dk-p-name" title={product.name}>{product.name}</Link></h3>
      <p className="dk-p-price">{fmt(product.price)}</p>
    </article>
  );
}
