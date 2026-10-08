'use client';

/**
 * Home — design-reference/dragoncave-site.html (Home), wired to real Convex data.
 * The hero notch + bloodline cards pull the top in-stock arowana; the brand
 * sections (trust strip, 陰陽, provenance, visit, testimonials) stay static.
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { bloodlineOf, buildChips, DcProduct, fmtPeso, gradeRank, isArowana, isFish, kindName } from '@/components/dc/fish';
import { hoursSummary, useBusiness } from '@/components/dc/business';
import { HeroNav } from '@/components/dc/DcHeader';
import Aquarium from '@/components/dc/Aquarium';
import Placeholder from '@/components/dc/kit/Placeholder';
import SpecimenCard from '@/components/dc/kit/SpecimenCard';
import Chips from '@/components/dc/kit/Chips';
import { ChipIcon, ClockIcon, HouseIcon, PhoneIcon, WaveIcon, WhatsAppIcon } from '@/components/dc/kit/icons';

const PROMISE = [
  { t: 'Provenance', b: 'Every fish carries a microchip, a CITES certificate, and our hand-written lineage card.', icon: <ChipIcon size={16} /> },
  { t: 'Quarantine', b: '21 days of observation in isolated systems before any specimen joins the gallery.', icon: <HouseIcon size={18} /> },
  { t: 'Husbandry', b: 'Tank parameters monitored daily. Diet planned per specimen. We sweat the small things.', icon: <WaveIcon /> },
  { t: 'Continuity', b: 'We answer the phone five years after the sale. Your fish has a long life to live.', icon: <PhoneIcon size={18} /> },
];
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

  // Hero notch states: loading (empty), featured fish (real data), or nothing in stock (no invented SKU/price).
  const loadingProducts = products === undefined;
  const heroName = featured?.name || '';
  const heroSku = featured?.sku ? '#' + featured.sku : '';
  const holdHref = featured ? biz.enquireHref(featured.name, `please hold ${heroSku || 'this fish'} for me`) : '/visit';
  const enquireHero = featured ? biz.enquireHref(heroName) : null;

  // Phones: a compact sticky bar repeats the primary action once the product card has scrolled out of view.
  const notchRef = useRef<HTMLElement>(null);
  const [notchOnScreen, setNotchOnScreen] = useState(true);
  useEffect(() => {
    const el = notchRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNotchOnScreen(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <main className="dk dk-home">
      {/* ══════════ HERO ══════════ */}
      <section className="dk-hero" id="top">
        <div className="dk-hero-card">
          <Aquarium />
          <HeroNav />

          {/* Rotating seal: the ring text circles once (textLength fits a 2πr ≈ 232 path with a small gap). */}
          <div className="dk-seal" role="img" aria-label="Featured this fortnight">
            <svg className="dk-seal-ring" viewBox="0 0 104 104" aria-hidden="true" focusable="false">
              <defs>
                <path id="dk-seal-path" d="M 52,15 a 37,37 0 1,1 0,74 a 37,37 0 1,1 0,-74" />
              </defs>
              <text>
                <textPath href="#dk-seal-path" textLength="226" lengthAdjust="spacing">Featured this fortnight •</textPath>
              </text>
            </svg>
            <span className="dk-seal-core" aria-hidden="true"><span className="dk-seal-dot" /></span>
          </div>

          <div className="dk-hero-fish">
            <Placeholder src="/img/arowana-red.png" alt="Super Red Arowana" contain priority />
          </div>

          <div className="dk-hero-copy">
            <h1><span>Living</span><span>dragons.</span></h1>
            <p className="dk-hero-lede">Museum-grade Asian arowana, the fish the old texts call a living dragon. Chosen for bloodline, raised for temperament, and kept in our gallery water until the right hands arrive.</p>
          </div>

          <aside ref={notchRef} className="dk-notch dk-hero-notch" aria-label="Featured specimen">
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

      {featured && enquireHero && (
        <div className={`dk-hero-bar${notchOnScreen ? '' : ' show'}`} inert={notchOnScreen} aria-hidden={notchOnScreen}>
          <div className="dk-hero-bar-info">
            <b>{heroName}</b>
            <span>{fmtPeso(featured.price)}</span>
          </div>
          <a className="dk-btn dk-btn-red sm" href={enquireHero} target={enquireHero.startsWith('http') ? '_blank' : undefined} rel="noopener">
            Inquire on WhatsApp
          </a>
        </div>
      )}

      {/* ══════════ BALANCE ══════════ */}
      <section className="dk-balance" aria-labelledby="balance-title">
        <div className="dk-wrap">
          <div>
            <p className="dk-eyebrow">陰陽 · Balance</p>
            <h2 className="dk-h2" id="balance-title">Fire and gold,<br />held in balance.</h2>
            <p className="dk-body">In feng shui the arowana carries luck through water — the red for fortune and vigour, the gold for wealth and standing. We pair the fish to the keeper, not the other way around.</p>
          </div>
          <div className="dk-yin-yang">
            <figure className="dk-yy-item">
              <Placeholder className="dk-yy-circle dk-yy-fire" src="/img/red.webp" alt="Super Red arowana" />
              <figcaption className="dk-yy-cap">陽 · Fire</figcaption>
            </figure>
            <figure className="dk-yy-item">
              <Placeholder className="dk-yy-circle dk-yy-gold" src="/img/24k-gold.webp" alt="24K Gold arowana" />
              <figcaption className="dk-yy-cap">陰 · Gold</figcaption>
            </figure>
          </div>
        </div>
      </section>

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
              <span className="dk-gal-mark" aria-hidden="true">財</span>
              <span className="dk-gal-title">The whole gallery</span>
              <span className="dk-gal-sub">Every specimen in the water.</span>
              <span className="dk-gal-link dk-link-arrow">Browse all</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ PROVENANCE ══════════ */}
      <section className="dk-provenance" id="story" aria-labelledby="prov-title">
        <div className="dk-wrap">
          <div>
            <p className="dk-eyebrow">The Cave · Our promise</p>
            <h2 className="dk-h2" id="prov-title">Provenance,<br />then patience.</h2>
            <p className="dk-body">Every arowana that crosses our threshold is identified, isolated, and observed for twenty-one days before it joins the gallery. We do not sell a fish until we would keep it ourselves.</p>
          </div>
          <div className="dk-promises">
            {PROMISE.map((p) => (
              <div key={p.t} className="dk-promise">
                <span className="dk-promise-icon">{p.icon}</span>
                <h3>{p.t}</h3>
                <p>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ VISIT ══════════ */}
      <section className="dk-visit-band" aria-labelledby="visit-band-title">
        <div className="dk-wrap">
          <div className="dk-visit-card">
            <div className="dk-visit-glow" aria-hidden="true" />
            <Placeholder className="dk-visit-photo" onDark />
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
