'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

/**
 * Specimen — the design, wired to a real Convex product.
 *  - /specimen-detail?id=<id>   in-app links (work on the web and inside the Capacitor app)
 *  - /specimen/<slug>           readable/shareable URL; vercel.json rewrites it to this page
 * Falls back to the top in-stock arowana when neither is given.
 */

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { bloodlineOf, DcProduct, familyOf, fmtPeso, gradeRank, isArowana, isFish, tintFor } from '@/components/dc/fish';
import { useBusiness } from '@/components/dc/business';
import { facebookEmbedUrl, formatDuration, videoThumb, youtubeEmbedUrl, type ProductVideo } from '@/components/dc/video';
import { useSiteCart } from '@/store/siteCart';

/** The product form stores certificate image URLs comma-separated (or a "none" sentence). */
const certificateUrls = (certificate?: string) =>
  (certificate || '').split(/[,\s]+/).map((s) => s.trim()).filter((s) => /^https:\/\//i.test(s));

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const SITE_URL = 'https://dc.broadheader.com';

/** Slug from a rewritten /specimen/<slug> URL (read from the real browser location). */
function slugFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const m = /^\/specimen\/([^/?#]+)\/?$/.exec(window.location.pathname);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

/** Title, description, canonical URL and Product structured data for search engines. */
function useProductSeo(product: DcProduct | null | undefined, storeName: string) {
  useEffect(() => {
    if (!product) return;
    const url = product.slug ? `${SITE_URL}/specimen/${product.slug}` : `${SITE_URL}/specimen-detail?id=${product._id}`;
    const description = (product.description || `${product.name} — available at ${storeName}.`).slice(0, 300);
    document.title = `${product.name} · ${storeName}`;

    const upsert = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector<HTMLElement>(selector);
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };
    upsert('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' })).setAttribute('content', description);
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' })).setAttribute('href', url);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: (product.images?.length ? product.images : product.image ? [product.image] : []).slice(0, 5),
      sku: product.sku ? String(product.sku) : undefined,
      category: product.categoryName,
      brand: { '@type': 'Brand', name: storeName },
      url,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'PHP',
        price: product.price,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: storeName },
      },
      subjectOf: (product.videos ?? []).map((video) => ({
        '@type': 'VideoObject',
        name: `${product.name} — video`,
        description,
        thumbnailUrl: videoThumb(video) ?? (product.image ? [product.image] : undefined),
        uploadDate: new Date(product.updatedAt ?? Date.now()).toISOString(),
        ...(video.kind === 'file'
          ? { contentUrl: video.url }
          : { embedUrl: video.kind === 'youtube' ? youtubeEmbedUrl(video.url) ?? video.url : facebookEmbedUrl(video.url) }),
        ...(video.durationSec ? { duration: `PT${Math.floor(video.durationSec / 60)}M${video.durationSec % 60}S` } : {}),
      })),
    };
    const script = upsert('script#product-jsonld', () => Object.assign(document.createElement('script'), { id: 'product-jsonld', type: 'application/ld+json' }));
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.getElementById('product-jsonld')?.remove();
    };
  }, [product, storeName]);
}

export default function SpecimenPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 28px', fontFamily: mono, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)' }}>Loading&hellip;</div>}>
      <SpecimenInner />
    </Suspense>
  );
}

function SpecimenInner() {
  const params = useSearchParams();
  const idParam = params.get('id');
  // Read once: the slug lives in the real URL (/specimen/<slug>), not in this page's route.
  const [pathSlug] = useState(slugFromLocation);
  const slugParam = idParam ? null : params.get('p') || pathSlug;
  const biz = useBusiness();
  const addToCart = useSiteCart((s) => s.add);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const all = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const byId = useQuery(api.services.products.getProduct, idParam ? { productId: idParam } : 'skip') as DcProduct | null | undefined;
  const bySlug = useQuery(api.services.products.getProductBySlug, slugParam ? { slug: slugParam } : 'skip') as DcProduct | null | undefined;
  const lookup = idParam || slugParam;
  const fetched = idParam ? byId : bySlug;

  const fallback = useMemo(
    () => (all ?? []).filter((p) => p.isActive && isFish(p) && isArowana(p.name)).sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price)[0],
    [all],
  );
  const product = lookup ? fetched : fallback;
  useProductSeo(lookup ? fetched : null, biz.storeName);

  const fish = useQuery(
    api.services.products.getFishByProductId,
    product?._id ? { productId: product._id as Id<'products'> } : 'skip',
  ) as { scientificName?: string; size?: number; age?: number; temperature?: number; phLevel?: string; diet?: string; origin?: string; lifespan?: string } | null | undefined;

  const isCartProduct = product?.purchaseMode === 'cart';
  const isLiveFish = !!product && (isFish(product) || !!fish);

  const more = useMemo(() => {
    if (!all || !product) return [];
    if (isCartProduct) {
      return all
        .filter((p) => p._id !== product._id && p.stock > 0 && p.purchaseMode === 'cart' && p.categoryName === product.categoryName)
        .slice(0, 3);
    }
    const aro = isArowana(product.name);
    return all
      .filter((p) => p.isActive && isFish(p) && p._id !== product._id && p.stock > 0 && isArowana(p.name) === aro)
      .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price)
      .slice(0, 3);
  }, [all, product, isCartProduct]);

  const notice = (text: string, withLinks = false) => (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 28px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: mono, fontWeight: 400, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)', margin: 0, marginBottom: withLinks ? 22 : 0 }}>{text}</h1>
      {withLinks && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/catalog" className="dc-btn-ghost" style={{ border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 999 }}>Browse the catalog</Link>
          <Link href="/shop" className="dc-btn-ghost" style={{ border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 999 }}>Shop gear &amp; food</Link>
        </div>
      )}
    </div>
  );

  if (lookup && fetched === null) return notice('This item is no longer available', true);
  if (!lookup && all !== undefined && !fallback) return notice('No specimens on display right now', true);
  if (!product) return notice('Loading…');

  const label = isArowana(product.name) ? bloodlineOf(product.name) : isLiveFish ? familyOf(product.name) : product.categoryName || 'Shop';
  const images = (product.images && product.images.length ? product.images : product.image ? [product.image] : []).filter(Boolean) as string[];
  const videos = product.videos ?? [];
  // Gallery order: cover photo, then videos, then the remaining photos.
  type Media = { type: 'image'; src: string } | { type: 'video'; video: ProductVideo };
  const media: Media[] = [
    ...images.slice(0, 1).map((src) => ({ type: 'image' as const, src })),
    ...videos.map((video) => ({ type: 'video' as const, video })),
    ...images.slice(1).map((src) => ({ type: 'image' as const, src })),
  ];
  const active = media[Math.min(activeImage, Math.max(media.length - 1, 0))];
  const firstVideoIndex = media.findIndex((m) => m.type === 'video');
  const showingVideo = active?.type === 'video';
  const certs = certificateUrls(product.certificate);
  const inStock = product.stock > 0;
  const specs: [string, string][] = isLiveFish
    ? [
        ['SKU', product.sku ? '#' + product.sku : '—'],
        ['Tank', product.tankNumber || '—'],
        ['Origin', fish?.origin || '—'],
        ['Grade', product.grade || '—'],
      ]
    : [
        ['SKU', product.sku ? '#' + product.sku : '—'],
        ['Category', product.categoryName || '—'],
        ['Stock', inStock ? String(product.stock) : 'Out of stock'],
      ];
  const husbandry: [string, string, string?][] = [
    ['Length · Age', [fish?.size ? fish.size + ' cm' : null, fish?.age ? fish.age + ' yr' : null].filter(Boolean).join(' · ') || '—'],
    ['Water', [fish?.temperature ? fish.temperature + '°C' : null, fish?.phLevel ? 'pH ' + fish.phLevel : null].filter(Boolean).join(' · ') || '—'],
    ['Diet', fish?.diet || '—'],
    ['Availability', inStock ? `✓ ${product.stock === 1 ? 'Single specimen' : product.stock + ' available'}` : 'Not available', inStock ? 'oklch(0.42 0.14 150)' : 'oklch(0.55 0.10 30)'],
  ];
  const papers: [string, string][] = [
    ['Bloodline', label],
    ['Scientific name', fish?.scientificName || '—'],
    ['Certificate', certs.length ? `${certs.length} on file` : 'Available on enquiry'],
    ['Lifespan', fish?.lifespan || '—'],
  ];
  const enquireHref = biz.enquireHref(product.name, product.tankNumber || (product.sku ? String(product.sku) : ''));
  const external = enquireHref.startsWith('http');
  const maxQty = Math.max(1, product.stock);
  const handleAdd = () =>
    addToCart(
      {
        productId: product._id,
        name: product.name,
        sku: product.sku ? String(product.sku) : undefined,
        price: product.price,
        stock: product.stock,
        image: product.image,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        isLive: false,
      },
      Math.min(qty, maxQty),
    );

  return (
    <>
      {/* breadcrumb */}
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '22px 28px 0', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: 'oklch(0.50 0.02 40)' }}>
          <Link href={isCartProduct ? '/shop' : isArowana(product.name) ? '/catalog' : '/cave'} style={{ color: 'oklch(0.50 0.02 40)' }}>{isCartProduct ? 'Shop' : isArowana(product.name) ? 'Catalog' : 'The Cave'}</Link>
          <span style={{ margin: '0 8px', color: 'oklch(0.72 0.02 50)' }}>/</span>
          <span style={{ color: 'oklch(0.30 0.012 32)' }}>{product.name}</span>
        </div>
      </div>

      {/* MAIN */}
      <section style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '28px 28px 80px', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 56, alignItems: 'start' }}>
          {/* LEFT: vitrine */}
          <div className="dc-sticky-md" style={{ position: 'sticky', top: 96 }}>
            <div style={{ position: 'relative', aspectRatio: '5/4', borderRadius: 12, overflow: 'hidden', background: 'radial-gradient(ellipse 92% 82% at 50% 42%, oklch(0.30 0.015 50), oklch(0.145 0.01 40) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.4), 0 44px 90px -48px oklch(0.16 0.02 40 / 0.6)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.16), transparent 70%)' }} />
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 9px, oklch(1 0 0 / 0.05) 9px 10px, transparent 10px)', backgroundSize: '30px 15px' }} />
              {showingVideo && active.type === 'video' ? (
                <div style={{ position: 'absolute', inset: 0, background: 'black' }}>
                  {active.video.kind === 'file' ? (
                    <video key={active.video.url} src={active.video.url} poster={active.video.posterUrl} controls autoPlay playsInline preload="metadata" aria-label={`Video of ${product.name}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <iframe
                      key={active.video.url}
                      title={`Video of ${product.name}`}
                      src={active.video.kind === 'youtube' ? `${youtubeEmbedUrl(active.video.url)}&autoplay=1` : facebookEmbedUrl(active.video.url)}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                    />
                  )}
                </div>
              ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6%' }}>
                {active?.type === 'image' ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', animation: isLiveFish ? 'dcSwim 8s ease-in-out infinite' : undefined }}>
                    <img src={active.src} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 24px 40px oklch(0 0 0 / 0.5))' }} draggable={false} />
                  </div>
                ) : (
                  <span className="dc-sil" style={{ color: tintFor(product._id) }}>
                    <svg width="260" height="130" viewBox="0 0 240 120" style={{ display: 'block', filter: 'drop-shadow(0 12px 20px oklch(0 0 0 / 0.4))' }} aria-hidden="true"><path d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z" fill="currentColor" opacity="0.9" /></svg>
                  </span>
                )}
              </div>
              )}
              {!showingVideo && product.sku && <div style={{ position: 'absolute', top: 18, left: 20, fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.7)' }}>#{product.sku}</div>}
              {!showingVideo && product.grade && <div style={{ position: 'absolute', top: 16, right: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 30, borderRadius: 7, background: 'oklch(0.50 0.216 27)', fontFamily: serif, fontWeight: 700, fontSize: 16, color: 'oklch(0.98 0.012 82)', boxShadow: '0 8px 20px -8px oklch(0.52 0.216 27 / 0.6)' }}>{product.grade}</div>}
              <div style={{ display: showingVideo ? 'none' : 'flex', position: 'absolute', bottom: 16, right: 18, width: 44, height: 44, borderRadius: 9, background: 'oklch(0.52 0.216 27)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px -10px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-5deg)' }}>
                <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 24, color: 'oklch(0.97 0.012 82)' }}>龍</span>
              </div>
            </div>
            {/* thumbs */}
            <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              {media.length > 1 && media.slice(0, 8).map((m, i) => {
                const selected = m === active;
                const thumb = m.type === 'image' ? m.src : videoThumb(m.video);
                return (
                  <button key={(m.type === 'image' ? m.src : m.video.url) + i} type="button" onClick={() => setActiveImage(i)} aria-label={m.type === 'image' ? `Show photo ${i + 1}` : `Play video${m.video.durationSec ? ` (${formatDuration(m.video.durationSec)})` : ''}`} aria-pressed={selected} className="dc-thumb" style={{ position: 'relative', width: 76, aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', border: selected ? '2px solid oklch(0.52 0.216 27)' : '1px solid oklch(0.82 0.02 50)' }}>
                    {thumb && <img src={thumb} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: m.type === 'image' ? 'contain' : 'cover', padding: m.type === 'image' ? 6 : 0 }} draggable={false} />}
                    {m.type === 'video' && (
                      <>
                        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: 99, background: 'oklch(0.52 0.216 27 / 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px oklch(0 0 0 / 0.4)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="white" /></svg>
                        </span>
                        {m.video.durationSec ? <span style={{ position: 'absolute', right: 4, bottom: 4, fontFamily: mono, fontSize: 9, color: 'white', background: 'oklch(0 0 0 / 0.6)', padding: '1px 4px', borderRadius: 3 }}>{formatDuration(m.video.durationSec)}</span> : null}
                      </>
                    )}
                  </button>
                );
              })}
              {firstVideoIndex >= 0 ? (
                <button type="button" onClick={() => setActiveImage(firstVideoIndex)} className="dc-btn-primary" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.98 0.012 82)', background: 'oklch(0.52 0.216 27)', border: 'none', borderRadius: 999, padding: '10px 15px', cursor: 'pointer' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                  Watch video{videos.length > 1 ? `s (${videos.length})` : ''}
                </button>
              ) : isLiveFish && (
                <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.50 0.216 27)', border: '1px solid oklch(0.52 0.216 27 / 0.4)', borderRadius: 999, padding: '9px 13px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(0.52 0.216 27)' }} /> Full video on request
                </a>
              )}
            </div>
          </div>

          {/* RIGHT: details */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>{label}{product.grade ? ' · Grade ' + product.grade : ''}</div>
            <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(38px,4.6vw,60px)', lineHeight: 0.98, letterSpacing: '-0.02em', margin: '0 0 20px', color: 'oklch(0.19 0.012 32)' }}>{product.name}</h1>
            {product.description && <p style={{ fontSize: 17, lineHeight: 1.62, color: 'oklch(0.40 0.012 34)', maxWidth: 520, margin: '0 0 24px' }}>{product.description}</p>}
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 30, color: 'oklch(0.50 0.216 27)', margin: '0 0 26px' }}>{fmtPeso(product.price)}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '14px 20px', padding: '24px 0', borderTop: '1px solid oklch(0.86 0.012 68)', borderBottom: '1px solid oklch(0.86 0.012 68)', marginBottom: 30 }}>
              {specs.map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)', marginBottom: 6 }}>{k}</div>
                  <div style={{ fontFamily: mono, fontSize: 14, color: 'oklch(0.24 0.012 32)' }}>{v}</div>
                </div>
              ))}
            </div>

            {isCartProduct ? (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid oklch(0.78 0.02 40)', borderRadius: 999, padding: 4 }}>
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={!inStock || qty <= 1} style={{ width: 40, height: 40, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'oklch(0.30 0.012 34)' }}>&minus;</button>
                    <span aria-live="polite" style={{ minWidth: 34, textAlign: 'center', fontFamily: mono, fontSize: 15, fontWeight: 600 }}>{inStock ? Math.min(qty, maxQty) : 0}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!inStock || qty >= maxQty} style={{ width: 40, height: 40, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'oklch(0.30 0.012 34)' }}>+</button>
                  </div>
                  <button type="button" onClick={handleAdd} disabled={!inStock} className="dc-btn-primary" style={{ flex: 1, minWidth: 200, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: inStock ? 'oklch(0.52 0.216 27)' : 'oklch(0.70 0.02 40)', color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '16px 24px', borderRadius: 999, border: 'none', cursor: inStock ? 'pointer' : 'not-allowed', transition: '.2s', boxShadow: inStock ? '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' : 'none' }}>
                    {inStock ? 'Add to cart' : 'Out of stock'}
                  </button>
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.50 0.02 40)', marginBottom: 34 }}>
                  &#9679; {inStock ? `${product.stock} in stock — pay on pickup or by transfer after we confirm your order.` : 'Out of stock — '}
                  {!inStock && <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" style={{ color: 'oklch(0.50 0.216 27)', fontWeight: 600 }}>ask us when it&rsquo;s back</a>}
                </div>
              </>
            ) : (
            <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" className="dc-btn-primary" style={{ flex: 1, minWidth: 220, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '16px 24px', borderRadius: 999, transition: '.2s', boxShadow: '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /><circle cx="9" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /><circle cx="12.5" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /><circle cx="16" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /></svg>
                {external ? 'Enquire on WhatsApp' : 'Enquire about this fish'}
              </a>
              <Link href="/visit" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14.5, fontWeight: 600, padding: '16px 22px', borderRadius: 999, transition: '.2s' }}>Book a viewing</Link>
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.50 0.02 40)', marginBottom: 34 }}>&#9679; {inStock ? 'Available now — ask us to hold it while you prepare your tank.' : 'Not available right now — message us to join the waitlist.'}</div>
            </>
            )}

            {isLiveFish && (<>
            {/* papers card */}
            <div style={{ position: 'relative', border: '1px solid oklch(0.82 0.03 46)', borderRadius: 10, overflow: 'hidden', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'oklch(0.50 0.216 27)', color: 'oklch(0.98 0.012 82)' }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Papers &amp; identity</span>
                <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 16 }}>龍</span>
              </div>
              <div style={{ padding: '6px 20px 16px', background: 'oklch(0.985 0.006 80)' }}>
                {papers.map(([k, v], i) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < papers.length - 1 ? '1px solid oklch(0.90 0.012 70)' : 'none' }}>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)' }}>{k}</span>
                    <span style={{ fontSize: 13.5, color: 'oklch(0.24 0.012 32)', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                {certs.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 12 }}>
                    {certs.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.82 0.03 46)', borderRadius: 8, padding: 4, paddingRight: 12, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>
                        <img src={url} alt="" loading="lazy" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5 }} draggable={false} />
                        View certificate{certs.length > 1 ? ` ${i + 1}` : ''}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* husbandry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 2, background: 'oklch(0.88 0.012 68)', border: '1px solid oklch(0.88 0.012 68)', borderRadius: 10, overflow: 'hidden' }}>
              {husbandry.map(([k, v, color]) => (
                <div key={k} style={{ background: 'oklch(0.985 0.006 80)', padding: '16px 18px' }}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)', marginBottom: 6 }}>{k}</div>
                  <div style={{ fontSize: 14, color: color || 'oklch(0.24 0.012 32)' }}>{v}</div>
                </div>
              ))}
            </div>
            </>)}
          </div>
        </div>
      </section>

      {/* MORE */}
      {more.length > 0 && (
        <section style={{ background: 'oklch(0.972 0.008 78)', padding: '40px 0 96px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 34, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(26px,3.4vw,40px)', margin: 0, color: 'oklch(0.19 0.012 32)', letterSpacing: '-0.015em' }}>More from the <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>{isCartProduct ? 'shop.' : 'gallery.'}</span></h3>
              <Link href={isCartProduct ? '/shop' : isArowana(product.name) ? '/catalog' : '/cave'} className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999, transition: '.2s' }}>See all &rarr;</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
              {more.map((m) => (
                <Link key={m._id} href={`/specimen-detail?id=${m._id}`} onClick={() => { setActiveImage(0); setQty(1); }} className="dc-more" style={{ display: 'block' }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', boxShadow: '0 20px 44px -26px oklch(0.16 0.02 40 / 0.6), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.25)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 47%, oklch(0.86 0.08 68 / 0.18), transparent 70%)' }} />
                    {m.image && <img className="dc-more-img" src={m.image} alt={m.name} style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%)', width: '100%', height: '100%', objectFit: 'contain', padding: '10%' }} draggable={false} />}
                  </div>
                  <div style={{ padding: '14px 4px 0' }}>
                    <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.50 0.03 34)', marginBottom: 5 }}>{isCartProduct ? m.categoryName : isArowana(m.name) ? bloodlineOf(m.name) : familyOf(m.name)}{m.grade ? ' · ' + m.grade : ''}</div>
                    <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 18, color: 'oklch(0.19 0.012 32)' }}>{m.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
