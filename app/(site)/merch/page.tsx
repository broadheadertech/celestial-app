'use client';

/**
 * Dragon Merch — the lookbook for branded goods: shirts, mugs, stickers.
 *
 * Deliberately not a second shop. Buying still happens in /shop or on the product page; this
 * page exists to show the merch being worn and used, which a filtered product grid can't do.
 *
 * The model shots are a product's own photo gallery (products.images). Upload the lifestyle
 * photographs as extra photos on the merch product in Admin → Products and they appear here —
 * the display picture leads, the rest become the lookbook strip.
 *
 * Membership comes from a category named "Merch" (see merchList). Until that category exists
 * and has products in it, the page shows its empty state rather than guessing.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { merchList } from '@/components/dc/listings';
import { useSiteCart } from '@/store/siteCart';
import { useBusiness } from '@/components/dc/business';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { BrandMark } from '@/components/dc/kit/Brand';

type CatalogProduct = FunctionReturnType<typeof api.services.products.getCatalogProducts>[number];

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

/** Every photo on a product, cover first, with duplicates removed. */
const galleryOf = (p: CatalogProduct) => [...new Set([p.image, ...(p.images ?? [])].filter(Boolean))] as string[];

export default function MerchPage() {
  const products = useQuery(api.services.products.getCatalogProducts, {});
  const add = useSiteCart((s) => s.add);
  const biz = useBusiness();

  const merch = useMemo(() => merchList(products ?? []), [products]);
  const loading = products === undefined;

  // The lookbook strip: every photo across the range, so one well-shot item still fills it.
  const lookbook = useMemo(() => merch.flatMap(galleryOf).slice(0, 8), [merch]);

  return (
    <main className="dk dk-shop">
      {/* HERO */}
      <NotchHero
        tone="dark"
        notchWide
        notchHeight={110}
        notchLabel="Wear the cave"
        notch={
          <div className="dk-row wrap" style={{ gap: 20 }}>
            <div className="dk-stat">
              <b>{loading ? '—' : merch.length}</b>
              <span>{merch.length === 1 ? 'piece' : 'pieces'}</span>
            </div>
            {merch.length > 0 && (
              <Link href="/shop" className="dk-btn dk-btn-red">
                Shop the range
              </Link>
            )}
          </div>
        }
        aside={
          lookbook.length ? (
            <div className="dk-cave-mosaic" aria-label="The merch lookbook">
              {lookbook.slice(0, 4).map((src, i) => (
                <div key={`${src}-${i}`} className="dk-cave-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote Convex storage URLs */}
                  <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
                </div>
              ))}
            </div>
          ) : (
            <figure className="dk-specimen dk-dark">
              <BrandMark onDark />
              <Placeholder label="Lookbook coming soon" />
            </figure>
          )
        }
      >
        <div className="dk-shop-copy">
          <p className="dk-eyebrow">Dragon Merch</p>
          <h1>
            Wear the
            <br />
            cave.
          </h1>
          <p className="dk-lede">
            Shirts, mugs and decals for people who talk about water quality at parties. Made in
            small runs, worn by us first.
          </p>
        </div>
      </NotchHero>

      {/* THE RANGE */}
      <section className="dk-section" aria-labelledby="merch-range">
        <div className="dk-wrap">
          <div className="dk-sec-head">
            <div>
              <p className="dk-eyebrow">The range</p>
              <h2 id="merch-range" className="dk-h2">Everything we print.</h2>
            </div>
          </div>

          {loading ? (
            <div className="dk-empty" role="status">
              Loading the merch…
            </div>
          ) : merch.length === 0 ? (
            <div className="dk-panel" style={{ maxWidth: 620, margin: '0 auto' }}>
              <EmptyState
                title="The merch range is being set up"
                actions={
                  <Link href="/shop" className="dk-btn dk-btn-red">
                    Shop everything else
                  </Link>
                }
              >
                Shirts, mugs and decals are on the way. In the meantime, everything else we keep is
                in the Shop.
              </EmptyState>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 56 }}>
              {merch.map((p) => (
                <MerchItem
                  key={p._id}
                  product={p}
                  enquireHref={biz.enquireHref(p.name, String(p.sku || ''))}
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

      {/* CTA */}
      <section className="dk-section alt" aria-labelledby="merch-cta">
        <div className="dk-wrap narrow" style={{ textAlign: 'center' }}>
          <h2 id="merch-cta" className="dk-h2">Seen one you like?</h2>
          <p className="dk-lede dk-muted" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            Sizes and stock are in the Shop, or message us and we&rsquo;ll put one aside.
          </p>
          <div className="dk-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
            <Link href="/shop" className="dk-btn dk-btn-red">
              Shop the range
            </Link>
            <Link href="/ka-dragon" className="dk-btn dk-btn-outline-dark">
              See it worn
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/** One piece of merch: the display picture large, the rest of its gallery as the lookbook. */
function MerchItem({
  product,
  enquireHref,
  onAdd,
}: {
  product: CatalogProduct;
  enquireHref: string;
  onAdd: () => void;
}) {
  const href = `/specimen-detail?id=${product._id}`;
  const gallery = galleryOf(product);
  const [cover, ...rest] = gallery;
  const [shown, setShown] = useState<string | undefined>(cover);
  const soldOut = product.stock <= 0;
  const cartable = product.purchaseMode === 'cart';

  return (
    <article className="dk-split even" style={{ gap: 44, alignItems: 'center' }}>
      <div>
        <Placeholder
          src={shown}
          alt={product.name}
          label={product.name}
          style={{ aspectRatio: '4/5', borderRadius: 'var(--dk-r-card)' }}
        />
        {rest.length > 0 && (
          <div className="dk-cave-mosaic" style={{ marginTop: 12 }} aria-label={`More photos of ${product.name}`}>
            {gallery.slice(0, 4).map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className="dk-cave-tile"
                onClick={() => setShown(src)}
                aria-label={`Photo ${i + 1} of ${product.name}`}
                aria-current={shown === src || undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Convex storage URLs */}
                <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="dk-eyebrow">{product.categoryName || 'Merch'}</p>
        <h3 className="dk-h2" style={{ marginBottom: 16 }}>
          <Link href={href} className="dk-jtitle">
            {product.name}
          </Link>
        </h3>
        {product.description ? (
          <p className="dk-lede" style={{ marginBottom: 20 }}>
            {product.description}
          </p>
        ) : null}
        <p className="dk-p-price" style={{ fontSize: 22, marginBottom: 24 }}>
          {fmt(product.price)}
        </p>
        <div className="dk-actions">
          {soldOut ? (
            <span className="dk-btn dk-btn-outline-dark" aria-disabled="true">
              Sold out
            </span>
          ) : cartable ? (
            <button type="button" className="dk-btn dk-btn-red" onClick={onAdd}>
              Add to cart
            </button>
          ) : (
            <a
              className="dk-btn dk-btn-red"
              href={enquireHref}
              target={enquireHref.startsWith('http') ? '_blank' : undefined}
              rel="noopener"
            >
              Message to order
            </a>
          )}
          <Link href={href} className="dk-btn dk-btn-outline-dark">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
