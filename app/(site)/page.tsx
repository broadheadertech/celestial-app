'use client';

/**
 * Home — design-reference/dragoncave-site.html (Home), wired to real Convex data.
 * The hero notch + bloodline cards pull the top in-stock arowana; the brand
 * sections (trust strip, 陰陽, provenance, visit, testimonials) stay static.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { bloodlineOf, buildChips, DcProduct, fmtPeso, gradeRank, isArowana, isFish, kindName } from '@/components/dc/fish';
import { hoursSummary, useBusiness } from '@/components/dc/business';
import { HeroNav } from '@/components/dc/DcHeader';
import Aquarium from '@/components/dc/Aquarium';
import Placeholder from '@/components/dc/kit/Placeholder';
import { BrandMark } from '@/components/dc/kit/Brand';
import SpecimenCard from '@/components/dc/kit/SpecimenCard';
import Chips from '@/components/dc/kit/Chips';
import BalanceSection from '@/components/dc/home/BalanceSection';
import PromiseSection from '@/components/dc/home/PromiseSection';
import { ChipIcon, ClockIcon, WhatsAppIcon } from '@/components/dc/kit/icons';

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '龍';

export default function HomePage() {
  const products = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const testimonials = useQuery(api.services.testimonials.listPublished, {});
  const biz = useBusiness();
  const [hoursDays] = hoursSummary(biz.hours);
  const [bloodline, setBloodline] = useState('all');

  const arowana = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isFish(p) && p.stock > 0 && isArowana(kindName(p))).sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price),
    [products],
  );
  const featured = arowana[0];

  // "All": up to 3 cards across distinct bloodlines. A bloodline chip: up to 3 of that bloodline.
  const bloodlineChips = useMemo(() => buildChips(arowana, (p) => bloodlineOf(kindName(p))), [arowana]);
  const bloodlines = useMemo(() => {
    if (bloodline !== 'all') return arowana.filter((p) => bloodlineOf(kindName(p)) === bloodline).slice(0, 3);
    const seen = new Set<string>();
    const out: DcProduct[] = [];
    for (const p of arowana) {
      const b = bloodlineOf(kindName(p));
      if (seen.has(b)) continue;
      seen.add(b);
      out.push(p);
      if (out.length === 3) break;
    }
    return out;
  }, [arowana, bloodline]);

  // "The whole gallery" card: a few photos of fish not already shown as cards, plus how many more are in.
  const gallery = useMemo(() => (products ?? []).filter((p) => p.isActive && isFish(p) && p.stock > 0), [products]);
  const galleryPreview = useMemo(() => {
    const shown = new Set(bloodlines.map((b) => b._id));
    const seen = new Set<string>(); // several listings can share one photo — show each photo once
    const withPhoto = gallery.filter((p) => p.image && !seen.has(p.image) && seen.add(p.image));
    const fresh = withPhoto.filter((p) => !shown.has(p._id));
    return (fresh.length >= 3 ? fresh : withPhoto).slice(0, 3);
  }, [gallery, bloodlines]);
  const galleryMore = Math.max(0, gallery.length - galleryPreview.length);

  // Hero notch states: loading (empty), featured fish (real data), or nothing in stock (no invented SKU/price).
  const loadingProducts = products === undefined;
  const heroName = featured?.name || '';
  const heroSku = featured?.sku ? '#' + featured.sku : '';
  const holdHref = featured ? biz.enquireHref(featured.name, `please hold ${heroSku || 'this fish'} for me`) : '/visit';
  const enquireHero = featured ? biz.enquireHref(heroName) : null;

  return (
    <main className="dk dk-home">
      {/* ══════════ HERO ══════════ */}
      <section className="dk-hero" id="top">
        <div className="dk-hero-card">
          <Aquarium />
          <HeroNav />

          {/* Featured seal: a black stamp whose centre ("Featured / this fortnight") never moves, so it reads at a
              glance; only the rim text turns. Links to the featured specimen once it has loaded. */}
          {(() => {
            const seal = (
              <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                <defs>
                  <path id="dk-seal-path" d="M 60,14 a 46,46 0 1,1 0,92 a 46,46 0 1,1 0,-92" />
                </defs>
                <circle cx="60" cy="60" r="59" className="dk-seal-disc" />
                <circle cx="60" cy="60" r="56" className="dk-seal-rim" />
                <g className="dk-seal-spin">
                  <text className="dk-seal-ring-text">
                    <textPath href="#dk-seal-path" textLength="284" lengthAdjust="spacing">
                      Hand-picked · {biz.storeName || 'Dragon’s Cave'} · Hand-picked · {biz.storeName || 'Dragon’s Cave'} ·
                    </textPath>
                  </text>
                </g>
                <circle cx="60" cy="60" r="35" className="dk-seal-inner" />
                <circle cx="60" cy="41" r="3" className="dk-seal-dot" />
                <text x="60" y="64" textAnchor="middle" className="dk-seal-title">Featured</text>
                <text x="60" y="77" textAnchor="middle" className="dk-seal-sub">this fortnight</text>
              </svg>
            );
            return featured ? (
              <Link href={`/specimen-detail?id=${featured._id}`} className="dk-seal" aria-label={`Featured this fortnight: ${heroName}`}>
                {seal}
              </Link>
            ) : (
              <div className="dk-seal" role="img" aria-label="Featured this fortnight">{seal}</div>
            );
          })()}

          {/* With a featured fish, the fish image lives inside the notch beside its name (below). The free-floating
              hero fish only appears when nothing is in stock. */}
          {!featured && !loadingProducts && (
            <div className="dk-hero-fish">
              <Placeholder src="/img/arowana-red.png" alt="Super Red Arowana" contain priority />
            </div>
          )}

          <div className="dk-hero-copy">
            <h1><span>Living</span><span>dragons.</span></h1>
            <p className="dk-hero-lede">Museum-grade Asian arowana, the fish the old texts call a living dragon. Chosen for bloodline, raised for temperament, and kept in our gallery water until the right hands arrive.</p>
          </div>

          {/* Phones/tablets: the featured fish fills the space between the intro and the product card (the in-notch
              fish is hidden there). Decorative — the notch already links to the specimen. */}
          {featured && (
            <div className="dk-hero-fish-m" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- static transparent sprite, sized by CSS */}
              <img src="/img/arowana-red.png" alt="" decoding="async" draggable={false} />
            </div>
          )}

          <aside className="dk-notch dk-hero-notch" aria-label="Featured specimen">
            <div>
              {featured ? (
                <>
                  <h2 className="dk-spec-title"><Link href={`/specimen-detail?id=${featured._id}`}>{heroName}</Link></h2>
                  <p className="dk-spec-sku">
                    {heroSku && <>No. {heroSku} &middot; </>}
                    {featured.stock === 1 ? '1 of 1' : `${featured.stock} available`}
                  </p>
                  <p className="dk-spec-label">Price</p>
                  <p className="dk-spec-price">{fmtPeso(featured.price)}</p>
                  {enquireHero && (
                    <a className="dk-btn dk-btn-red dk-spec-cta" href={enquireHero} target={enquireHero.startsWith('http') ? '_blank' : undefined} rel="noopener">
                      <WhatsAppIcon />
                      Inquire on WhatsApp
                    </a>
                  )}
                </>
              ) : !loadingProducts ? (
                <h2 className="dk-spec-title">New specimens arriving soon</h2>
              ) : null}
            </div>
            {featured && (
              <Link href={`/specimen-detail?id=${featured._id}`} className="dk-notch-fish" aria-label={`${heroName}: view this specimen`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static transparent sprite, sized by CSS */}
                <img src="/img/arowana-red.png" alt="" decoding="async" draggable={false} />
              </Link>
            )}
            <nav className="dk-spec-links" aria-label="Specimen shortcuts">
              <Link className="dk-link-arrow" href="/catalog">All specimens</Link>
              <Link className="dk-link-arrow" href="/cave">Enter the gallery</Link>
              <a className="dk-link-arrow" href={holdHref} target={holdHref.startsWith('http') ? '_blank' : undefined} rel="noopener">Hold for me</a>
            </nav>
          </aside>
        </div>

        <div className="dk-trust" aria-label="Every specimen includes">
          <div className="dk-wrap">
            <ul>
              <li><ChipIcon />Microchipped</li>
              <li><svg width="16" height="22" viewBox="0 0 16 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="1" y="1" width="14" height="20" rx="3" /><path d="M4 8h8M4 13h8" /></svg>CITES certificate</li>
              <li><ClockIcon />21-day quarantine</li>
              <li><svg width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3 1h9l5 5v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" /><path d="M12 1v5h5M6 12l3 3 5-6" /></svg>Hand-written lineage card</li>
              <li><svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6.5l4.5 4.5L15 1" /></svg>Live-arrival guarantee</li>
            </ul>
          </div>
        </div>
      </section>


      {/* ══════════ BALANCE ══════════ */}
      <BalanceSection />

      {/* ══════════ BLOODLINES ══════════ */}
      <section className="dk-bloodlines" id="bloodlines" aria-labelledby="bl-title">
        <div className="dk-wrap">
          <div className="dk-bl-head">
            <div><p className="dk-eyebrow">The bloodlines</p><h2 className="dk-h2" id="bl-title">Houses of the dragon.</h2></div>
            <Link className="dk-btn dk-btn-outline-dark dk-bl-all" href="/catalog">All specimens</Link>
          </div>
          {bloodlineChips.length > 2 && (
            <Chips
              label="Filter by bloodline"
              options={bloodlineChips}
              value={bloodline}
              onChange={setBloodline}
              renderLabel={(c) => (c === 'all' ? 'All' : c)}
            />
          )}
          <div className="dk-cards">
            {bloodlines.map((b) => (
              <SpecimenCard
                key={b._id}
                href={`/specimen-detail?id=${b._id}`}
                image={b.image}
                name={b.name}
                category={bloodlineOf(kindName(b))}
                price={fmtPeso(b.price)}
                action={{ href: biz.enquireHref(b.name, b.tankNumber || String(b.sku || '')), label: 'Enquire' }}
              />
            ))}
            <Link className="dk-card-gallery" href="/catalog">
              <BrandMark onDark className="dk-gal-logo" />
              <span className="dk-gal-preview" aria-hidden="true">
                {loadingProducts
                  ? Array.from({ length: 4 }, (_, i) => <span key={i} />)
                  : galleryPreview.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element -- product photos are remote Convex storage URLs
                      <img key={p._id} src={p.image} alt="" loading="lazy" decoding="async" draggable={false} />
                    ))}
                {!loadingProducts && galleryMore > 0 && <span className="dk-gal-more">+{galleryMore}</span>}
              </span>
              <span className="dk-gal-title">The whole gallery</span>
              <span className="dk-gal-sub">Every specimen in the water.</span>
              <span className="dk-gal-link dk-link-arrow">Browse all</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ PROVENANCE ══════════ */}
      <PromiseSection />

      {/* ══════════ VISIT ══════════ */}
      <section className="dk-visit-band" aria-labelledby="visit-band-title">
        <div className="dk-wrap">
          <div className="dk-visit-card">
            <div className="dk-visit-glow" aria-hidden="true" />
            <Placeholder className="dk-visit-photo" onDark src="/img/aquarium/arowana-gold.webp" alt="Gold arowana" contain />
            <p className="dk-eyebrow">By appointment</p>
            <h2 className="dk-h2" id="visit-band-title">Visit the gallery.</h2>
            <p className="dk-body">By appointment only. Bring a friend. We will pour tea. Take as long as you need with the fish.</p>
            <Link className="dk-btn dk-btn-red dk-visit-cta" href="/visit">Book a viewing</Link>
            <div className="dk-notch dk-visit-notch">
              <div>
                {(biz.address || biz.city) && (
                  <>
                    <p className="dk-meta-label">Address</p>
                    <p className="dk-meta-val">{biz.address}{biz.address && biz.city && <br />}{biz.city}</p>
                  </>
                )}
              </div>
              <div>
                <p className="dk-meta-label">Hours</p>
                <p className="dk-meta-val">{biz.loaded && <>{hoursDays}<br /></>}<Link href="/visit#hours">See hours</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS (Admin → Testimonials; hidden until one is published) ══════════ */}
      {testimonials && testimonials.length > 0 && (
        <section className="dk-testimonials" aria-labelledby="tm-title">
          <div className="dk-wrap">
            <p className="dk-eyebrow">From our keepers</p>
            <h2 className="dk-h2" id="tm-title">Dragons in good hands.</h2>
            <div className="dk-tm-grid">
              {testimonials.map((t) => (
                <figure key={t._id} className="dk-tm">
                  {t.photoUrl && <Placeholder src={t.photoUrl} alt={`${t.clientName} with their fish`} />}
                  <div className="dk-tm-body">
                    {t.rating ? (() => {
                      const stars = Math.max(1, Math.min(5, Math.round(t.rating)));
                      return (
                        <div className="dk-tm-stars" role="img" aria-label={`${stars} out of 5 stars`}>
                          {'★'.repeat(stars)}<span>{'★'.repeat(5 - stars)}</span>
                        </div>
                      );
                    })() : null}
                    <blockquote>{t.quote}</blockquote>
                    <figcaption>
                      {!t.photoUrl && <span className="dk-avatar">{initialsOf(t.clientName)}</span>}
                      <div>
                        <b>{t.clientName}</b>
                        {(t.clientLocation || t.productName) && <small>{[t.clientLocation, t.productName].filter(Boolean).join(' · ')}</small>}
                      </div>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
