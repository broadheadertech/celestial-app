'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

/**
 * Specimen — the design, wired to a real Convex product.
 *  - /specimen-detail?id=<id>   in-app links (work on the web and inside the Capacitor app)
 *  - /specimen/<slug>           readable/shareable URL; prerendered per product at build time
 *                               (app/(site)/specimen/[slug]), vercel.json rewrite for newer products
 * Falls back to the top in-stock arowana when neither is given.
 *
 * Layout: a dark NotchHero holds the name, description and details on the left and the gallery on
 * the right; the carved notch holds the price and the call to action for the product's purchase
 * mode (add to cart, or WhatsApp / Messenger / viewing). Pre-order, the question form and the
 * papers / husbandry cards sit in the section below.
 */

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { bloodlineOf, DcProduct, familyOf, fmtPeso, gradeRank, isArowana, isFish, kindName, titleOf } from '@/components/dc/fish';
import { useBusiness } from '@/components/dc/business';
import { facebookEmbedUrl, formatDuration, videoThumb, youtubeEmbedUrl, type ProductVideo } from '@/components/dc/video';
import { useSiteCart } from '@/store/siteCart';
import { productUrl } from '@/components/dc/links';
import MessengerButton, { MessengerIcon } from '@/components/dc/MessengerButton';
import InquiryForm from '@/components/dc/InquiryForm';
import PreorderPanel from '@/components/dc/PreorderPanel';
import ShareButton from '@/components/dc/ShareButton';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { ChatIcon, WhatsAppIcon } from '@/components/dc/kit/icons';

/** The product form stores certificate image URLs comma-separated (or a "none" sentence). */
const certificateUrls = (certificate?: string) =>
  (certificate || '').split(/[,\s]+/).map((s) => s.trim()).filter((s) => /^https:\/\//i.test(s));

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
    const url = productUrl(product);
    const description = (product.description || `${titleOf(product)} — available at ${storeName}.`).slice(0, 300);
    document.title = `${titleOf(product)} · ${storeName}`;

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
      name: titleOf(product),
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
        name: `${titleOf(product)} — video`,
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

export default function SpecimenView() {
  return (
    <Suspense fallback={<div className="dk"><p className="dk-empty" role="status">Loading&hellip;</p></div>}>
      <SpecimenInner />
    </Suspense>
  );
}

/** Small play glyph for video thumbs / the "Watch video" button. */
const PlayGlyph = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
);

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
    () => (all ?? []).filter((p) => p.isActive && isFish(p) && isArowana(kindName(p))).sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price)[0],
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
    const aro = isArowana(kindName(product));
    return all
      .filter((p) => p.isActive && isFish(p) && p._id !== product._id && p.stock > 0 && isArowana(kindName(p)) === aro)
      .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price)
      .slice(0, 3);
  }, [all, product, isCartProduct]);

  const notice = (text: string, withLinks = false) =>
    withLinks ? (
      <div className="dk dk-page" style={{ background: 'var(--dk-white)' }}>
        <div className="dk-wrap">
          <EmptyState
            title={text}
            actions={
              <>
                <Link href="/catalog" className="dk-btn dk-btn-red">Browse the catalog</Link>
                <Link href="/shop" className="dk-btn dk-btn-outline-dark">Shop gear &amp; food</Link>
              </>
            }
          />
        </div>
      </div>
    ) : (
      <div className="dk">
        <p className="dk-empty" role="status">{text}</p>
      </div>
    );

  if (lookup && fetched === null) return notice('This item is no longer available', true);
  if (!lookup && all !== undefined && !fallback) return notice('No specimens on display right now', true);
  if (!product) return notice('Loading…');

  const label = isArowana(kindName(product)) ? bloodlineOf(kindName(product)) : isLiveFish ? familyOf(kindName(product)) : product.categoryName || 'Shop';
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
  // Only details that are filled in; empty ones are left out rather than shown as dashes.
  const specs = (
    isLiveFish
      ? [
          ['SKU', product.sku ? '#' + product.sku : ''],
          ['Tank', product.tankNumber || ''],
          ['Origin', fish?.origin || ''],
          ['Grade', product.grade || ''],
        ]
      : [
          ['SKU', product.sku ? '#' + product.sku : ''],
          ['Category', product.categoryName || ''],
          ['Stock', inStock ? String(product.stock) : 'Out of stock'],
        ]
  ).filter(([, v]) => v) as [string, string][];
  const husbandry: [string, string, boolean?][] = [
    ['Length · Age', [fish?.size ? fish.size + ' cm' : null, fish?.age ? fish.age + ' yr' : null].filter(Boolean).join(' · ') || '—'],
    ['Water', [fish?.temperature ? fish.temperature + '°C' : null, fish?.phLevel ? 'pH ' + fish.phLevel : null].filter(Boolean).join(' · ') || '—'],
    ['Diet', fish?.diet || '—'],
    ['Availability', inStock ? (product.stock === 1 ? 'Single specimen' : product.stock + ' available') : 'Not available', true],
  ];
  const papers: [string, string][] = [
    ['Bloodline', label],
    ['Scientific name', fish?.scientificName || '—'],
    ['Certificate', certs.length ? `${certs.length} on file` : 'Available on enquiry'],
    ['Lifespan', fish?.lifespan || '—'],
  ];
  const enquiryExtra = product.tankNumber || (product.sku ? String(product.sku) : '');
  const enquireHref = biz.enquireHref(titleOf(product), enquiryExtra);
  const shareUrl = productUrl(product);
  const external = enquireHref.startsWith('http');
  const maxQty = Math.max(1, product.stock);
  const listHref = isCartProduct ? '/shop' : isArowana(kindName(product)) ? '/catalog' : '/cave';
  const handleAdd = () =>
    addToCart(
      {
        productId: product._id,
        name: titleOf(product),
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

  /* ── Gallery (hero aside) ── */
  const gallery = (
    <div className="dk-stack">
      <div style={{ position: 'relative', aspectRatio: '5 / 4', borderRadius: 'var(--dk-r-card)', overflow: 'hidden', border: '1px solid var(--dk-line-dark)', background: 'var(--dk-black)' }}>
        {showingVideo && active.type === 'video' ? (
          active.video.kind === 'file' ? (
            <video key={active.video.url} src={active.video.url} poster={active.video.posterUrl} controls autoPlay playsInline preload="metadata" aria-label={`Video of ${titleOf(product)}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          ) : (
            <iframe
              key={active.video.url}
              title={`Video of ${titleOf(product)}`}
              src={active.video.kind === 'youtube' ? `${youtubeEmbedUrl(active.video.url)}&autoplay=1` : facebookEmbedUrl(active.video.url)}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          )
        ) : (
          <Placeholder
            src={active?.type === 'image' ? active.src : null}
            alt={titleOf(product)}
            contain
            onDark
            priority
            style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'transparent' }}
          />
        )}
        {!showingVideo && product.sku && (
          <span className="dk-small dk-mono" style={{ position: 'absolute', zIndex: 2, top: 14, left: 16, color: 'var(--dk-n-400)' }}>#{product.sku}</span>
        )}
        {!showingVideo && product.grade && (
          <span className="dk-status red" style={{ position: 'absolute', zIndex: 2, top: 12, right: 14 }}>{product.grade}</span>
        )}
      </div>

      {(media.length > 1 || firstVideoIndex >= 0 || isLiveFish) && (
        <div className="dk-row wrap" style={{ alignItems: 'center' }}>
          {media.length > 1 && (
            <div className="dk-thumbs">
              {media.slice(0, 8).map((m, i) => {
                const selected = m === active;
                const thumb = m.type === 'image' ? m.src : videoThumb(m.video);
                return (
                  <button
                    key={(m.type === 'image' ? m.src : m.video.url) + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={m.type === 'image' ? `Show photo ${i + 1}` : `Play video${m.video.durationSec ? ` (${formatDuration(m.video.durationSec)})` : ''}`}
                    aria-pressed={selected}
                    style={{ position: 'relative' }}
                  >
                    {thumb && <img src={thumb} alt="" loading="lazy" draggable={false} style={{ objectFit: m.type === 'image' ? 'contain' : 'cover', padding: m.type === 'image' ? 6 : 0 }} />}
                    {m.type === 'video' && (
                      <>
                        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: 'var(--dk-r-pill)', background: 'var(--dk-red)', color: 'var(--dk-white)', display: 'grid', placeItems: 'center' }}>
                          <PlayGlyph size={11} />
                        </span>
                        {m.video.durationSec ? (
                          <span className="dk-mono" style={{ position: 'absolute', right: 4, bottom: 4, fontSize: 10, fontWeight: 700, color: 'var(--dk-white)', background: 'var(--dk-black)', padding: '1px 5px', borderRadius: 4 }}>{formatDuration(m.video.durationSec)}</span>
                        ) : null}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {firstVideoIndex >= 0 ? (
            <button type="button" onClick={() => setActiveImage(firstVideoIndex)} className="dk-btn dk-btn-red xs" style={{ marginLeft: 'auto' }}>
              <PlayGlyph />
              Watch video{videos.length > 1 ? `s (${videos.length})` : ''}
            </button>
          ) : isLiveFish && (
            <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" className="dk-btn dk-btn-outline-light xs" style={{ marginLeft: 'auto' }}>
              Full video on request
            </a>
          )}
        </div>
      )}
    </div>
  );

  /* ── Notch: price + the call to action for this product's purchase mode ── */
  const notch = isCartProduct ? (
    <>
      <p className="dk-spec-price dk-mono" style={{ marginTop: 0 }}>{fmtPeso(product.price)}</p>
      <div className="dk-actions">
        <div className="dk-qty" style={{ height: 52, padding: '0 16px', border: '1px solid var(--dk-n-300)', borderRadius: 'var(--dk-r-pill)' }}>
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={!inStock || qty <= 1}>&minus;</button>
          <span aria-live="polite" className="dk-mono">{inStock ? Math.min(qty, maxQty) : 0}</span>
          <button type="button" className="plus" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!inStock || qty >= maxQty}>+</button>
        </div>
        <button type="button" onClick={handleAdd} disabled={!inStock} className="dk-btn dk-btn-red">
          {inStock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
      <p className="dk-small dk-muted">
        {inStock ? `${product.stock} in stock — pay on pickup or by transfer after we confirm your order.` : 'Out of stock — '}
        {!inStock && <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" className="dk-link">ask us when it&rsquo;s back</a>}
      </p>
    </>
  ) : (
    <>
      <p className="dk-spec-price dk-mono" style={{ marginTop: 0 }}>{fmtPeso(product.price)}</p>
      <div className="dk-actions">
        <a href={enquireHref} target={external ? '_blank' : undefined} rel="noopener" className="dk-btn dk-btn-red">
          {external ? <WhatsAppIcon size={18} /> : <ChatIcon size={18} />}
          {external ? 'Enquire on WhatsApp' : 'Enquire about this fish'}
        </a>
        {biz.messenger && (
          <MessengerButton href={biz.messenger} message={`${biz.enquiryText(titleOf(product), enquiryExtra)} ${shareUrl}`} className="dk-btn dk-btn-outline-dark">
            <MessengerIcon size={16} /> Messenger
          </MessengerButton>
        )}
        <Link href="/visit" className="dk-btn dk-btn-outline-dark">Book a viewing</Link>
      </div>
      <p className="dk-small dk-muted">{inStock ? 'Available now — ask us to hold it while you prepare your tank.' : 'Not available right now — message us to join the waitlist.'}</p>
    </>
  );

  const hasDetails = !isCartProduct || isLiveFish;

  return (
    <div className="dk dk-page" style={{ background: 'var(--dk-white)' }}>
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="dk-wrap dk-small dk-muted" style={{ paddingTop: 24 }}>
        <Link href={listHref} className="dk-link" style={{ fontWeight: 500 }}>{isCartProduct ? 'Shop' : isArowana(kindName(product)) ? 'Catalog' : 'The Cave'}</Link>
        <span aria-hidden="true" style={{ margin: '0 8px', color: 'var(--dk-n-300)' }}>/</span>
        <span aria-current="page" style={{ color: 'var(--dk-black)' }}>{titleOf(product)}</span>
      </nav>

      {/* MAIN: details + gallery, price and CTA in the notch */}
      <NotchHero
        tone="dark"
        behind="var(--dk-white)"
        notch={notch}
        notchWide
        notchHeight={isCartProduct ? 180 : biz.messenger ? 262 : 210}
        notchLabel={`Price and ${isCartProduct ? 'add to cart' : 'enquiry'}`}
        aside={gallery}
        className="dk-spec-hero"
      >
        <div className="dk-row between wrap" style={{ alignItems: 'center' }}>
          <p className="dk-eyebrow">{label}{product.grade ? ' · Grade ' + product.grade : ''}</p>
          <ShareButton url={shareUrl} title={titleOf(product)} text={`${titleOf(product)} at ${biz.storeName}`} className="dk-btn dk-btn-outline-light xs" />
        </div>
        <h1 className="dk-h1" style={{ marginTop: 14, overflowWrap: 'anywhere' }}>{titleOf(product)}</h1>
        {product.description && <p className="dk-lede">{product.description}</p>}

        {specs.length > 0 && (
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '16px 24px', marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.35)' }}>
            {specs.map(([k, v]) => (
              <div key={k} className="dk-kv">
                <dt>{k}</dt>
                <dd className="dk-mono">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </NotchHero>

      {/* Pre-order, questions, papers and care */}
      {hasDetails && (
        <section className="dk-section tight" aria-label="Details">
          <div className="dk-wrap">
            <div className={isLiveFish && !isCartProduct ? 'dk-split even dk-spec-details' : undefined} style={{ alignItems: 'start' }}>
              {!isCartProduct && (
                <div className="dk-stack lg">
                  <PreorderPanel productId={product._id} />
                  <InquiryForm productId={product._id} productTitle={titleOf(product)} />
                </div>
              )}

              {isLiveFish && (
                <div className="dk-stack lg dk-spec-facts">
                  {/* papers card */}
                  <div className="dk-panel">
                    <div className="dk-panel-head">
                      <h2 className="dk-panel-title">Papers &amp; identity</h2>
                    </div>
                    <div className="dk-summary">
                      {papers.map(([k, v]) => (
                        <div key={k}>
                          <span>{k}</span>
                          <span style={{ textAlign: 'right' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {certs.length > 0 && (
                      <div className="dk-actions" style={{ marginTop: 20 }}>
                        {certs.map((url, i) => (
                          <a key={url} href={url} target="_blank" rel="noopener" className="dk-btn dk-btn-outline-dark sm" style={{ paddingLeft: 4 }}>
                            <img src={url} alt="" loading="lazy" draggable={false} style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 'var(--dk-r-pill)' }} />
                            View certificate{certs.length > 1 ? ` ${i + 1}` : ''}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* husbandry */}
                  {/* Same label / value rows as the papers card, so the two read as one fact sheet. */}
                  <div className="dk-panel">
                    <dl className="dk-summary">
                      {husbandry.map(([k, v, isStatus]) => (
                        <div key={k}>
                          <dt style={{ color: 'var(--dk-n-600)' }}>{k}</dt>
                          <dd style={{ textAlign: 'right' }}>{isStatus ? <span className={`dk-status ${inStock ? 'black' : 'pale'}`}>{v}</span> : v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MORE */}
      {more.length > 0 && (
        <section className="dk-section alt">
          <div className="dk-wrap">
            <div className="dk-sec-head">
              <h3 className="dk-h2">More from the {isCartProduct ? 'shop.' : 'gallery.'}</h3>
              <Link href={listHref} className="dk-link-arrow">See all</Link>
            </div>
            <div className="dk-grid-3">
              {more.map((m) => (
                <article key={m._id} className="dk-card">
                  <Link href={`/specimen-detail?id=${m._id}`} onClick={() => { setActiveImage(0); setQty(1); }} className="dk-card-img" aria-label={m.name}>
                    <Placeholder src={m.image} alt={m.name} contain />
                  </Link>
                  <p className="dk-card-cat">{isCartProduct ? m.categoryName : isArowana(kindName(m)) ? bloodlineOf(kindName(m)) : familyOf(kindName(m))}{m.grade ? ' · ' + m.grade : ''}</p>
                  <h4>
                    <Link href={`/specimen-detail?id=${m._id}`} onClick={() => { setActiveImage(0); setQty(1); }} className="dk-card-name">{m.name}</Link>
                  </h4>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
