'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, LayoutGrid, List as ListIcon, Search, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { GradeBadge, SpecimenPlate } from '@/components/site/ArowanaSilhouette';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const isLiveCategoryName = (name?: string) => {
  const n = (name || '').toLowerCase();
  return (
    n.includes('fish') ||
    n.includes('arowana') ||
    n.includes('crossback') ||
    n.includes('red') ||
    n.includes('silver') ||
    n.includes('jardini') ||
    n.includes('pearl')
  );
};

const PRICE_BANDS = [
  { id: 'all', label: 'Any price', min: 0, max: Infinity },
  { id: 'sub50', label: 'Under ₱50,000', min: 0, max: 50000 },
  { id: 's-mid', label: '₱50,000 – ₱150,000', min: 50000, max: 150000 },
  { id: 'mid', label: '₱150,000 – ₱300,000', min: 150000, max: 300000 },
  { id: 'hi', label: '₱300,000 +', min: 300000, max: Infinity },
];

const SORT_OPTIONS = [
  { value: 'curated', label: 'Curated order' },
  { value: 'price-up', label: 'Price · low to high' },
  { value: 'price-dn', label: 'Price · high to low' },
  { value: 'newest', label: 'Newest arrivals' },
];

export default function CatalogPage() {
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [band, setBand] = useState('all');
  const [sort, setSort] = useState('curated');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const liveProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isLiveCategoryName(p.categoryName)),
    [products],
  );

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const p of liveProducts) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Specimen';
      const ex = m.get(id);
      if (ex) ex.count += 1;
      else m.set(id, { id, name, count: 1 });
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [liveProducts]);

  const visible = useMemo(() => {
    let list = liveProducts;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => (p.categoryId as string) === selectedCategory);
    }
    const b = PRICE_BANDS.find((x) => x.id === band) || PRICE_BANDS[0];
    list = list.filter((p) => (p.price || 0) >= b.min && (p.price || 0) < b.max);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          String(p.sku || '').toLowerCase().includes(t) ||
          (p.categoryName || '').toLowerCase().includes(t),
      );
    }
    switch (sort) {
      case 'price-up':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price-dn':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
        break;
    }
    return list;
  }, [liveProducts, selectedCategory, band, search, sort]);

  return (
    <main>
      {/* Hero header */}
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>
            Catalog · {visible.length} specimens in view
          </div>
          <h1
            className="display-xl mb-5"
            style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}
          >
            The <em className="italic-flourish">gallery.</em>
          </h1>
          <p
            className="max-w-[620px]"
            style={{
              fontSize: 18,
              color: 'var(--ink-2)',
              fontVariationSettings: '"opsz" 22, "wght" 500',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: '-0.015em',
              lineHeight: 1.45,
            }}
          >
            Each specimen is held in our gallery water until the right collector takes it home.
            Filter by species, grade, or price band. Click into any plate for full lineage.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section
        style={{
          position: 'sticky',
          top: 76,
          zIndex: 30,
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--line-soft)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div
          className="site-container py-4 flex items-center gap-3 flex-wrap"
          style={{ padding: '16px 32px' }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              size={15}
              style={{ color: 'var(--ink-4)' }}
            />
            <input
              type="text"
              placeholder="Name, SKU, microchip ID, CITES…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              style={{
                paddingLeft: 38,
                paddingRight: 36,
                paddingTop: 10,
                paddingBottom: 10,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--ink)',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-4)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Price band */}
          <select
            value={band}
            onChange={(e) => setBand(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-[13px] cursor-pointer"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            {PRICE_BANDS.map((p) => (
              <option key={p.id} value={p.id} style={{ color: 'black' }}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-[13px] cursor-pointer"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} style={{ color: 'black' }}>
                {s.label}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div
            className="inline-flex p-1 gap-0.5 rounded-lg border"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
          >
            <button
              onClick={() => setView('grid')}
              className="px-3 py-1.5 rounded text-[12px] font-semibold inline-flex items-center gap-1.5"
              style={{
                background: view === 'grid' ? 'var(--surface-hi)' : 'transparent',
                color: view === 'grid' ? 'var(--ink)' : 'var(--ink-3)',
              }}
            >
              <LayoutGrid size={13} />
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className="px-3 py-1.5 rounded text-[12px] font-semibold inline-flex items-center gap-1.5"
              style={{
                background: view === 'list' ? 'var(--surface-hi)' : 'transparent',
                color: view === 'list' ? 'var(--ink)' : 'var(--ink-3)',
              }}
            >
              <ListIcon size={13} />
              List
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div
          className="site-container flex gap-2 overflow-x-auto scrollbar-hide pb-3"
          style={{ padding: '0 32px 12px' }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border whitespace-nowrap"
            style={{
              borderColor: selectedCategory === 'all' ? 'var(--red)' : 'var(--line)',
              background: selectedCategory === 'all' ? 'var(--red)' : 'transparent',
              color: selectedCategory === 'all' ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
            }}
          >
            All · {liveProducts.length}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border whitespace-nowrap"
              style={{
                borderColor: selectedCategory === c.id ? 'var(--red)' : 'var(--line)',
                background: selectedCategory === c.id ? 'var(--red)' : 'transparent',
                color: selectedCategory === c.id ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
              }}
            >
              {c.name} · {c.count}
            </button>
          ))}
        </div>
      </section>

      {/* Grid / List */}
      <section className="py-10" style={{ padding: '40px 0 80px' }}>
        <div className="site-container">
          {visible.length === 0 ? (
            <div className="py-20 text-center" style={{ color: 'var(--ink-4)' }}>
              No specimens match these filters.
            </div>
          ) : view === 'grid' ? (
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {visible.map((p) => (
                <CatalogTile key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {visible.map((p) => (
                <CatalogRow key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function CatalogTile({ product }: { product: any }) {
  return (
    <Link
      href={`/specimen/${product._id}`}
      className="lift-card block"
      style={{ background: 'transparent', color: 'var(--ink)' }}
    >
      <SpecimenPlate
        product={{
          _id: product._id,
          sku: product.sku,
          name: product.name,
          categoryName: product.categoryName,
          tankNumber: product.tankNumber,
          image: product.image,
        }}
        ratio="3 / 4"
        size={220}
      />
      <div style={{ padding: '18px 4px 8px' }}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="placard mb-1 truncate">{product.categoryName || 'Specimen'}</div>
            <div
              className="display truncate"
              style={{
                fontSize: 18,
                fontVariationSettings: '"opsz" 22, "wght" 600',
                letterSpacing: '-0.015em',
                lineHeight: 1.15,
              }}
            >
              {product.name}
            </div>
          </div>
          {product.grade && <GradeBadge grade={product.grade} />}
        </div>
        <div className="flex justify-between items-baseline mt-3.5">
          <div className="font-mono-tabular text-[15px] font-semibold">{fmt(product.price)}</div>
          <span className="placard" style={{ color: 'var(--ink-3)' }}>
            {product.stock === 1 ? 'Single specimen' : `${product.stock} on hold`}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CatalogRow({ product }: { product: any }) {
  return (
    <Link
      href={`/specimen/${product._id}`}
      className="grid items-center gap-6 py-5 px-3 transition-colors hover:bg-[var(--surface)]"
      style={{
        gridTemplateColumns: '120px 1fr auto auto',
        borderBottom: '1px solid var(--line-soft)',
        color: 'var(--ink)',
      }}
    >
      <div className="w-[120px]">
        <SpecimenPlate
          product={{
            _id: product._id,
            sku: product.sku,
            name: product.name,
            categoryName: product.categoryName,
            tankNumber: product.tankNumber,
            image: product.image,
          }}
          ratio="4 / 5"
          size={120}
          showMeta={false}
        />
      </div>
      <div className="min-w-0">
        <div className="placard mb-1">{product.categoryName || 'Specimen'}</div>
        <div
          className="display"
          style={{ fontSize: 22, fontVariationSettings: '"opsz" 24, "wght" 700' }}
        >
          {product.name}
        </div>
        {product.sku && (
          <div className="font-mono-tabular text-[11px] mt-1.5" style={{ color: 'var(--ink-4)' }}>
            #{product.sku}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono-tabular font-bold text-[16px]">{fmt(product.price)}</div>
        <div className="placard mt-1" style={{ color: 'var(--ink-3)' }}>
          {product.stock === 1 ? 'Single specimen' : `${product.stock} on hold`}
        </div>
      </div>
      <ArrowRight size={16} style={{ color: 'var(--ink-4)' }} />
    </Link>
  );
}
