'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { ArrowRight, Heart, Share2, ChevronLeft, Check } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { GradeBadge, SpecimenPlate, pickPalette } from '@/components/site/ArowanaSilhouette';
import { useSiteCart } from '@/store/siteCart';
import { useAuthStore } from '@/store/auth';

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

function SpecimenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || '';

  const productRaw = useQuery(
    api.services.products.getProduct,
    id ? { productId: id as Id<'products'> } : 'skip',
  );
  // getProduct returns a discriminated union over every table due to db.get typing.
  // Cast to a permissive shape since we know the productId targets the products table.
  const product = productRaw as unknown as {
    _id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    stock: number;
    image?: string;
    sku?: string | number;
    categoryId: string;
    categoryName?: string;
    tankNumber?: string;
    certificate?: string;
    productStatus?: string;
    lifespan?: string;
    batchCode?: string;
    grade?: 'S' | 'AAA' | 'AA' | 'A';
    createdAt: number;
  } | null | undefined;
  const allProducts = useQuery(api.services.admin.getAllProductsAdmin, {});

  const add = useSiteCart((s) => s.add);
  const setOpen = useSiteCart((s) => s.setOpen);
  const cartItems = useSiteCart((s) => s.items);

  const { user } = useAuthStore();
  const isWishlisted = useQuery(
    api.services.wishlist.isInWishlist,
    user && id
      ? { userId: user._id as Id<'users'>, productId: id as Id<'products'> }
      : 'skip',
  );
  const toggleWishlist = useMutation(api.services.wishlist.toggleWishlist);
  const handleWishlist = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    try {
      await toggleWishlist({
        userId: user._id as Id<'users'>,
        productId: id as Id<'products'>,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update wishlist');
    }
  };

  const [activePlate, setActivePlate] = useState(0);

  const isLive = isLiveCategoryName(product?.categoryName);
  const inCart = !!cartItems.find((l) => l.productId === product?._id);

  const related = useMemo(() => {
    if (!product || !allProducts) return [];
    return allProducts
      .filter(
        (p) =>
          p._id !== product._id &&
          p.isActive &&
          p.stock > 0 &&
          (p.categoryId as string) === (product.categoryId as string),
      )
      .slice(0, 3);
  }, [product, allProducts]);

  if (product === undefined) {
    return (
      <main className="py-20" style={{ padding: '80px 0' }}>
        <div className="site-container text-center" style={{ color: 'var(--ink-4)' }}>
          Loading specimen…
        </div>
      </main>
    );
  }

  if (product === null) {
    return (
      <main className="py-20" style={{ padding: '80px 0' }}>
        <div className="site-container text-center" style={{ color: 'var(--ink-4)' }}>
          Specimen not found.{' '}
          <Link href="/catalog" className="a-link" style={{ color: 'var(--red-hi)' }}>
            Back to catalog
          </Link>
        </div>
      </main>
    );
  }

  const palette = pickPalette(product.categoryName);
  const deposit = Math.round((product.price || 0) * 0.2);
  const balance = (product.price || 0) - deposit;

  const reserve = () => {
    if (inCart) {
      setOpen(true);
      return;
    }
    add({
      productId: product._id,
      name: product.name,
      sku: product.sku ? String(product.sku) : undefined,
      price: product.price,
      stock: product.stock,
      image: product.image,
      categoryId: product.categoryId as string,
      categoryName: product.categoryName,
      isLive,
    });
  };

  return (
    <main>
      {/* Breadcrumb */}
      <div className="site-container pt-6" style={{ padding: '24px 32px 0' }}>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: 'var(--ink-3)' }}
        >
          <ChevronLeft size={14} />
          All specimens
        </Link>
      </div>

      <section className="pt-8 pb-16">
        <div
          className="site-container grid gap-14"
          style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', padding: '32px 32px' }}
        >
          {/* Plate stack */}
          <div>
            <div className="mb-3">
              <SpecimenPlate
                product={{
                  _id: product._id,
                  sku: product.sku ? String(product.sku) : undefined,
                  name: product.name,
                  categoryName: product.categoryName,
                  tankNumber: product.tankNumber,
                  image: product.image,
                }}
                ratio="4 / 5"
                size={320}
                showMeta
                label="Front · primary plate"
              />
            </div>
            {/* Thumbnail row (placeholder angles) */}
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setActivePlate(i)}
                  className="rounded overflow-hidden"
                  style={{
                    aspectRatio: '1 / 1',
                    background: `radial-gradient(ellipse at 50% 40%, ${palette.from}, ${palette.to})`,
                    border: '1px solid var(--line)',
                    boxShadow:
                      activePlate === i
                        ? '0 0 0 2px var(--red) inset'
                        : '0 1px 0 oklch(1 0 0 / 0.04) inset',
                    cursor: 'pointer',
                  }}
                  aria-label={`Angle ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Spec column */}
          <div>
            <div className="placard mb-3" style={{ color: 'var(--red-hi)' }}>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                style={{ background: 'var(--red)' }}
              />
              {product.categoryName || 'Specimen'}
            </div>
            {product.grade && (
              <div className="mb-3">
                <GradeBadge grade={product.grade} />
              </div>
            )}
            <h1
              className="display-xl mb-4"
              style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}
            >
              {product.name}
            </h1>
            {product.description && (
              <p
                className="mb-6 max-w-[520px]"
                style={{
                  fontSize: 17,
                  color: 'var(--ink-2)',
                  lineHeight: 1.55,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontVariationSettings: '"opsz" 22, "wght" 500',
                  letterSpacing: '-0.015em',
                }}
              >
                {product.description}
              </p>
            )}

            {/* Price block */}
            <div className="flex items-baseline gap-4 mb-7 flex-wrap">
              <div
                className="display font-mono-tabular"
                style={{
                  fontSize: 36,
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  letterSpacing: '-0.02em',
                }}
              >
                {fmt(product.price)}
              </div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div
                  className="font-mono-tabular line-through text-[15px]"
                  style={{ color: 'var(--ink-4)' }}
                >
                  {fmt(product.originalPrice)}
                </div>
              )}
              {isLive && (
                <span
                  className="placard"
                  style={{
                    color: 'var(--red-hi)',
                    background: 'var(--red-wash)',
                    padding: '4px 10px',
                    borderRadius: 4,
                  }}
                >
                  Reserve with 20% deposit
                </span>
              )}
            </div>

            {/* CTA row */}
            <div className="flex gap-3 mb-8 flex-wrap">
              <button
                type="button"
                onClick={reserve}
                disabled={product.stock <= 0}
                className="b b-primary b-lg"
              >
                {product.stock <= 0
                  ? 'Sold'
                  : inCart
                  ? (
                    <>
                      In your case <Check size={14} />
                    </>
                  )
                  : (
                    <>
                      {isLive ? `Reserve · ${fmt(deposit)} deposit` : 'Add to case'}
                      <ArrowRight size={14} />
                    </>
                  )}
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                className="b b-icon"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                title={isWishlisted ? 'In your wishlist' : 'Add to wishlist'}
                style={{
                  background: isWishlisted ? 'var(--red-wash)' : undefined,
                  borderColor: isWishlisted ? 'var(--red)' : undefined,
                  color: isWishlisted ? 'var(--red-hi)' : undefined,
                }}
              >
                <Heart
                  size={15}
                  fill={isWishlisted ? 'currentColor' : 'none'}
                />
              </button>
              <button type="button" className="b b-icon" aria-label="Share">
                <Share2 size={15} />
              </button>
            </div>

            {isLive && (
              <div
                className="grid grid-cols-2 gap-0 rounded mb-8"
                style={{ border: '1px solid var(--line-soft)' }}
              >
                <div className="p-4" style={{ borderRight: '1px solid var(--line-soft)' }}>
                  <div className="placard">Due today (deposit, 20%)</div>
                  <div
                    className="font-mono-tabular font-bold mt-1 text-[18px]"
                    style={{ color: 'var(--ink)' }}
                  >
                    {fmt(deposit)}
                  </div>
                </div>
                <div className="p-4">
                  <div className="placard">Balance at pickup</div>
                  <div
                    className="font-mono-tabular font-bold mt-1 text-[18px]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {fmt(balance)}
                  </div>
                </div>
              </div>
            )}

            <hr className="hairline my-7" />

            {/* Specs grid */}
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
            >
              {[
                ['SKU', product.sku ? `#${product.sku}` : '—'],
                ['Grade', product.grade || '—'],
                ['Tank', product.tankNumber || '—'],
                ['CITES / cert', product.certificate || '—'],
                ['Status', product.productStatus || (product.stock > 0 ? 'Available' : 'Sold')],
                ['Lifespan', product.lifespan || '—'],
                ['Batch', product.batchCode || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="placard">{k}</div>
                  <div
                    className="font-mono-tabular mt-1.5 text-[14px]"
                    style={{ color: 'var(--ink)' }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>

            <hr className="hairline my-7" />

            {/* Care notes */}
            <div className="placard mb-3">Care &amp; husbandry</div>
            <ul className="list-none flex flex-col gap-3 text-[14px]" style={{ color: 'var(--ink-2)' }}>
              {[
                'Tank 400L+. pH 6.5–7.2. Temperature 28–30°C.',
                'Solitary in a planted display with no aggressive tankmates.',
                'Pellet-trained. Live feeds twice a week. We will share our diet sheet at handover.',
                'We follow up 30, 90, and 180 days after the sale. Any question, any time.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span
                    className="rounded-full mt-2"
                    style={{ background: 'var(--red)', width: 4, height: 4, flexShrink: 0 }}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Lineage strip */}
      <section className="py-15" style={{ padding: '60px 0', background: 'var(--bg-2)' }}>
        <div className="site-container">
          <div className="grid items-end gap-8 mb-10" style={{ gridTemplateColumns: '1fr auto' }}>
            <div>
              <div className="eyebrow mb-3">Bloodline</div>
              <h2
                className="display-xl"
                style={{ fontSize: 'clamp(28px, 4.4vw, 48px)' }}
              >
                Four generations.<br />
                <span className="italic-flourish">One vitrine.</span>
              </h2>
            </div>
            <div className="placard" style={{ color: 'var(--ink-3)' }}>
              Lineage card available at handover
            </div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {['G-IV · 2018', 'G-III · 2020', 'G-II · 2023', `G-I · ${new Date(product.createdAt).getFullYear()}`].map(
              (g, i) => (
                <div
                  key={g}
                  className="p-5 rounded"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line-soft)',
                  }}
                >
                  <div className="placard">Gen {i + 1}</div>
                  <div
                    className="display mt-2"
                    style={{
                      fontSize: 20,
                      fontVariationSettings: '"opsz" 28, "wght" 700',
                    }}
                  >
                    {g}
                  </div>
                  <div className="text-[11px] mt-2" style={{ color: 'var(--ink-4)' }}>
                    {i === 3 ? 'This specimen' : 'Verified bloodline'}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-15" style={{ padding: '80px 0' }}>
          <div className="site-container">
            <div className="grid items-end gap-8 mb-10" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <div className="eyebrow mb-3">From the same case</div>
                <h2
                  className="display-xl"
                  style={{ fontSize: 'clamp(28px, 4.4vw, 48px)' }}
                >
                  Related specimens
                </h2>
              </div>
              <Link href="/catalog" className="b">
                All specimens <ArrowRight size={12} />
              </Link>
            </div>
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {related.map((p) => (
                <Link
                  key={p._id}
                  href={`/specimen-detail?id=${p._id}`}
                  className="lift-card block"
                  style={{ color: 'var(--ink)' }}
                >
                  <SpecimenPlate
                    product={{
                      _id: p._id,
                      sku: p.sku ? String(p.sku) : undefined,
                      name: p.name,
                      categoryName: p.categoryName,
                      tankNumber: p.tankNumber,
                      image: p.image,
                    }}
                    ratio="3 / 4"
                    size={200}
                  />
                  <div style={{ padding: '18px 4px 8px' }}>
                    <div className="placard mb-1">{p.categoryName}</div>
                    <div
                      className="display"
                      style={{
                        fontSize: 17,
                        fontVariationSettings: '"opsz" 22, "wght" 600',
                      }}
                    >
                      {p.name}
                    </div>
                    <div className="font-mono-tabular text-[14px] font-semibold mt-2">
                      {fmt(p.price)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default function SpecimenPage() {
  return (
    <Suspense
      fallback={
        <main className="py-20" style={{ padding: '80px 0' }}>
          <div className="site-container text-center" style={{ color: 'var(--ink-4)' }}>
            Loading specimen…
          </div>
        </main>
      }
    >
      <SpecimenContent />
    </Suspense>
  );
}
