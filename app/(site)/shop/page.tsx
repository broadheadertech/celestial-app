'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Search, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { GearPlate } from '@/components/site/ArowanaSilhouette';
import { useSiteCart } from '@/store/siteCart';

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

export default function ShopPage() {
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const add = useSiteCart((s) => s.add);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const gearProducts = useMemo(
    () =>
      (products ?? []).filter(
        (p) => p.isActive && p.stock > 0 && !isLiveCategoryName(p.categoryName),
      ),
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

  return (
    <main>
      {/* Hero */}
      <section className="py-15" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>
            Shop · gear &amp; food
          </div>
          <h1
            className="display-xl mb-5"
            style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}
          >
            For the long <em className="italic-flourish">keep.</em>
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
            What we use ourselves. Tanks, filtration, food, lighting, medicines. Curated, not catalogued.
          </p>
        </div>
      </section>

      {/* Filter strip */}
      <section
        className="sticky top-[76px] z-30"
        style={{
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
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              size={15}
              style={{ color: 'var(--ink-4)' }}
            />
            <input
              type="text"
              placeholder="Search gear, food, brand…"
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
        </div>

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
            All gear · {gearProducts.length}
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

      {/* Grid */}
      <section className="py-15" style={{ padding: '40px 0 80px' }}>
        <div className="site-container">
          {visible.length === 0 ? (
            <div className="py-20 text-center" style={{ color: 'var(--ink-4)' }}>
              No gear matches these filters.
            </div>
          ) : (
            <div
              className="grid gap-7"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
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

function GearTile({ product, onAdd }: { product: any; onAdd: () => void }) {
  return (
    <div
      className="lift-card relative"
      style={{ background: 'transparent', color: 'var(--ink)' }}
    >
      <Link href={`/specimen-detail?id=${product._id}`}>
        <GearPlate product={{ sku: product.sku ? String(product.sku) : undefined, name: product.name, image: product.image }} ratio="1 / 1" />
      </Link>
      <div style={{ padding: '18px 4px 8px' }}>
        <Link href={`/specimen-detail?id=${product._id}`} className="block">
          <div className="placard mb-1 truncate">{product.categoryName || 'Gear'}</div>
          <div
            className="display truncate"
            style={{
              fontSize: 17,
              fontVariationSettings: '"opsz" 22, "wght" 600',
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
            }}
          >
            {product.name}
          </div>
        </Link>
        <div className="flex justify-between items-baseline mt-3.5">
          <div className="font-mono-tabular text-[15px] font-semibold">{fmt(product.price)}</div>
          <button
            type="button"
            onClick={onAdd}
            className="b b-sm"
            style={{ padding: '6px 12px' }}
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
