'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs; design assets in /public/img */

/**
 * Home — the design (`dragons-cave-home`), wired to real Convex data.
 * Hero vitrine + bloodline cards pull the top in-stock arowana; the brand
 * sections (trust ribbon, 陰陽, promise, visit, testimonials) stay static.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { WaIcon } from '@/components/dc/styles';
import { bloodlineOf, DcProduct, fmtPeso, gradeRank, isArowana, isFish } from '@/components/dc/fish';
import { hoursSummary, useBusiness } from '@/components/dc/business';

const PROMISE = [
  { n: '01', t: 'Provenance', b: 'Every fish carries a microchip, a CITES certificate, and our hand-written lineage card.' },
  { n: '02', t: 'Quarantine', b: '21 days of observation in isolated systems before any specimen joins the gallery.' },
  { n: '03', t: 'Husbandry', b: 'Tank parameters monitored daily. Diet planned per specimen. We sweat the small things.' },
  { n: '04', t: 'Continuity', b: 'We answer the phone five years after the sale. Your fish has a long life to live.' },
];
const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '龍';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

export default function HomePage() {
  const products = useQuery(api.services.products.getCatalogProducts, {}) as DcProduct[] | undefined;
  const testimonials = useQuery(api.services.testimonials.listPublished, {});
  const biz = useBusiness();
  const waVisit = biz.wa(`Hi ${biz.storeName} — I'd like to arrange a gallery visit.`);
  const [hoursDays, hoursTime] = hoursSummary(biz.hours);
  const visitFacts = [
    ['Address', biz.address, biz.city],
    ['Hours', hoursDays, hoursTime],
    ['Phone', biz.landline || biz.phone, biz.landline ? biz.phone : ''],
  ].filter(([, a]) => a);

  const arowana = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isFish(p) && p.stock > 0 && isArowana(p.name)).sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price),
    [products],
  );
  const featured = arowana[0];

  // Up to 3 bloodline cards across distinct bloodlines.
  const bloodlines = useMemo(() => {
    const seen = new Set<string>();
    const out: DcProduct[] = [];
    for (const p of arowana) {
      const b = bloodlineOf(p.name);
      if (seen.has(b)) continue;
      seen.add(b);
      out.push(p);
      if (out.length === 3) break;
    }
    return out;
  }, [arowana]);

  // Hero states: loading (empty vitrine), featured fish (real data), or nothing in stock
  // (brand artwork, no invented SKU/grade/price).
  const loadingProducts = products === undefined;
  const heroImg = featured?.image || (loadingProducts ? null : '/img/red.webp');
  const heroName = featured?.name || '';
  const heroSku = featured?.sku ? '#' + featured.sku : '';
  const heroGrade = featured?.grade || '';
  const holdHref = featured ? biz.enquireHref(featured.name, `please hold ${heroSku || 'this fish'} for me`) : null;

  return (
    <main>
      {/* ══════════ HERO ══════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 82% 30%, oklch(0.52 0.216 27 / 0.08), transparent 70%), radial-gradient(ellipse 50% 40% at 12% 85%, oklch(0.70 0.12 80 / 0.10), transparent 70%)' }} />
        <div style={{ position: 'absolute', left: -140, top: '52%', transform: 'translateY(-50%)', width: 640, opacity: 0.05, pointerEvents: 'none' }}>
          <img src="/img/highback-gold.webp" alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} draggable={false} />
        </div>

        <div className="dc-split dc-minh-auto" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 28px 84px', display: 'grid', gridTemplateColumns: '1.03fr 0.97fr', gap: 48, alignItems: 'center', minHeight: 'calc(100vh - 70px)' }}>
          {/* left */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 30 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'oklch(0.52 0.216 27)', boxShadow: '0 0 0 4px oklch(0.52 0.216 27 / 0.15)' }} />
              Featured this fortnight
            </div>
            <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(50px, 9.5vw, 150px)', lineHeight: 0.9, letterSpacing: '-0.02em', margin: '0 0 26px', color: 'oklch(0.19 0.012 32)' }}>
              Living<br /><span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>dragons.</span>
            </h1>
            <p style={{ fontSize: 'clamp(16px,1.35vw,19px)', lineHeight: 1.6, maxWidth: 452, color: 'oklch(0.40 0.012 34)', margin: '0 0 34px' }}>Museum-grade Asian arowana &mdash; the fish the old texts call a living dragon. Chosen for bloodline, raised for temperament, and kept in our gallery water until the right hands arrive.</p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {featured ? (
                <a href={biz.enquireHref(heroName)} target="_blank" rel="noopener" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '15px 24px', borderRadius: 999, transition: 'background .2s', boxShadow: '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' }}>
                  <WaIcon size={16} />
                  Enquire on WhatsApp
                </a>
              ) : (
                <Link href="/catalog" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '15px 24px', borderRadius: 999, transition: 'background .2s', boxShadow: '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' }}>
                  Browse the catalog &rarr;
                </Link>
              )}
              <Link href={featured ? '/catalog' : '/visit'} className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '15px 22px', borderRadius: 999, transition: '.2s' }}>{featured ? <>Enter the gallery &rarr;</> : 'Book a viewing'}</Link>
            </div>

            {featured && (
              <>
                <div style={{ height: 1, background: 'oklch(0.84 0.012 66)', maxWidth: 452, margin: '44px 0 24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 452 }}>
                  {[['Grade', heroGrade || '—'], ['Tank', featured.tankNumber || '—'], ['Price', fmtPeso(featured.price)]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.55 0.02 40)', marginBottom: 6 }}>{k}</div>
                      <div style={{ fontFamily: serif, fontWeight: 700, fontSize: k === 'Price' ? 22 : 26, color: 'oklch(0.19 0.012 32)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* right: moon-gate vitrine */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {featured && <div className="dc-hide-sm" style={{ position: 'absolute', writingMode: 'vertical-rl', textOrientation: 'mixed', left: -6, top: '50%', transform: 'translateY(-50%)', fontFamily: mono, fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'oklch(0.60 0.02 40)' }}>{heroName}{heroSku && <> &middot; No. {heroSku}</>}</div>}
            <Link href={featured ? `/specimen-detail?id=${featured._id}` : '/catalog'} style={{ position: 'relative', width: 'min(72%, 460px)', aspectRatio: '1/1', display: 'block' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'radial-gradient(circle at 50% 44%, oklch(0.42 0.16 30), oklch(0.26 0.11 26) 52%, oklch(0.17 0.07 25) 100%)', boxShadow: '0 50px 90px -40px oklch(0.22 0.10 24 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.35)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 50%, oklch(0.95 0.07 62 / 0.34), transparent 68%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 22%, oklch(1 0 0 / 0.18), transparent 64%)' }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.45, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 8px, oklch(1 0 0 / 0.05) 8px 9px, transparent 9px)', backgroundSize: '26px 13px' }} />
                {heroImg && (
                  <div style={{ position: 'absolute', inset: 0, animation: 'dcSwim 7s ease-in-out infinite' }}>
                    <img src={heroImg} alt={heroName || 'Asian arowana'} fetchPriority="high" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: '96%', height: '78%', objectFit: 'contain', filter: 'drop-shadow(0 20px 34px oklch(0 0 0 / 0.5))' }} draggable={false} />
                  </div>
                )}
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, border: '1px solid oklch(0.70 0.12 80 / 0.6)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: -14, borderRadius: 999, border: '1px solid oklch(0.80 0.04 60 / 0.35)', pointerEvents: 'none' }} />

              {heroSku && <div style={{ position: 'absolute', top: '10%', left: '11%', fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'oklch(0.90 0.02 60 / 0.75)' }}>{heroSku}</div>}
              {heroGrade && <div style={{ position: 'absolute', top: '9%', right: '11%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'oklch(0.70 0.14 82 / 0.16)', border: '1px solid oklch(0.72 0.13 82 / 0.5)', fontFamily: serif, fontWeight: 700, fontSize: 15, color: 'oklch(0.80 0.13 84)' }}>{heroGrade}</div>}
              <div style={{ position: 'absolute', bottom: '11%', left: 0, right: 0, textAlign: 'center', padding: '0 12%' }}>
                {featured ? (
                  <>
                    <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(14px, 3.6vw, 22px)', lineHeight: 1.15, color: 'oklch(0.97 0.01 82)', letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 2px 10px oklch(0 0 0 / 0.5)' }}>{heroName}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.88 0.02 60 / 0.7)', marginTop: 4 }}>{heroGrade ? 'Grade ' + heroGrade + ' · ' : ''}{featured.stock === 1 ? '1 of 1' : featured.stock + ' available'}</div>
                  </>
                ) : !loadingProducts ? (
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.88 0.02 60 / 0.8)' }}>New specimens arriving soon</div>
                ) : null}
              </div>
            </Link>

            <div className="dc-hide-sm" style={{ position: 'absolute', top: '3%', left: '2%', width: 56, height: 56, borderRadius: 12, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px -10px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-6deg)', animation: 'dcDrift 6s ease-in-out infinite' }}>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color: 'oklch(0.97 0.012 82)' }}>龍</span>
            </div>
            {holdHref && (
              <a href={holdHref} target={holdHref.startsWith('http') ? '_blank' : undefined} rel="noopener" style={{ position: 'absolute', bottom: '4%', left: '6%', transform: 'rotate(-3deg)', background: 'oklch(0.19 0.012 32)', color: 'oklch(0.97 0.01 82)', fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '7px 13px', borderRadius: 6, boxShadow: '0 10px 24px -12px oklch(0 0 0 / 0.6)' }}>Hold for me &rarr;</a>
            )}
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 22, display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.58 0.02 40)' }}>Scroll <span style={{ width: 34, height: 1, background: 'oklch(0.62 0.02 40)' }} /></div>
      </section>

      {/* ══════════ TRUST RIBBON ══════════ */}
      <section style={{ background: 'oklch(0.50 0.216 27)', color: 'oklch(0.97 0.012 82)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, flexWrap: 'wrap', fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {['Microchipped', 'CITES certificate', '21-day quarantine', 'Hand-written lineage card', 'Live-arrival guarantee'].map((t, i, a) => (
            <span key={t} style={{ display: 'inline-flex', gap: 26, alignItems: 'center' }}>{t}{i < a.length - 1 && <span style={{ opacity: 0.5 }}>&middot;</span>}</span>
          ))}
        </div>
      </section>

      {/* ══════════ YIN-YANG FEATURE ══════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)', padding: '110px 0 100px' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 'min(58vw,760px)', lineHeight: 1, color: 'oklch(0.52 0.216 27 / 0.035)', pointerEvents: 'none', userSelect: 'none' }}>龍</div>
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 18 }}>陰陽 &middot; Balance</div>
          <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,5vw,60px)', lineHeight: 1.02, letterSpacing: '-0.015em', margin: '0 auto 22px', maxWidth: 760, color: 'oklch(0.19 0.012 32)' }}>Fire and gold, held in <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>balance.</span></h2>
          <p style={{ fontSize: 17, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 60px', color: 'oklch(0.42 0.012 34)' }}>In feng shui the arowana carries luck through water &mdash; the red for fortune and vigour, the gold for wealth and standing. We pair the fish to the keeper, not the other way around.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            <div style={{ position: 'relative', width: 'min(38vw,320px)', aspectRatio: '1/1', borderRadius: 999, background: 'radial-gradient(circle at 50% 40%, oklch(0.975 0.015 80), oklch(0.895 0.03 68) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.4), inset 0 -24px 54px oklch(0.55 0.10 40 / 0.12), 0 40px 70px -38px oklch(0.30 0.08 40 / 0.45)', zIndex: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'dcSwim 8s ease-in-out infinite' }}>
                <img src="/img/red.webp" alt="Super Red arowana" style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%)', width: '112%', filter: 'drop-shadow(0 16px 26px oklch(0.40 0.10 30 / 0.32))' }} draggable={false} />
              </div>
              <div style={{ position: 'absolute', bottom: '13%', left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.42 0.11 32 / 0.75)' }}>陽 &middot; Fire</div>
            </div>
            <div style={{ position: 'relative', width: 'min(38vw,320px)', aspectRatio: '1/1', borderRadius: 999, background: 'radial-gradient(circle at 50% 40%, oklch(0.30 0.02 60), oklch(0.135 0.01 40) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.45), 0 40px 70px -36px oklch(0.16 0.02 40 / 0.6)', marginLeft: -52, zIndex: 1, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 64% 46% at 50% 46%, oklch(0.82 0.11 82 / 0.24), transparent 70%)' }} />
              <div style={{ position: 'absolute', inset: 0, animation: 'dcDrift 9s ease-in-out infinite' }}>
                <img src="/img/24k-gold.webp" alt="24K Gold arowana" style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%) scaleX(-1)', width: '114%', filter: 'drop-shadow(0 16px 28px oklch(0 0 0 / 0.5))' }} draggable={false} />
              </div>
              <div style={{ position: 'absolute', bottom: '13%', left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.85 0.11 84 / 0.82)' }}>陰 &middot; Gold</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ BLOODLINES ══════════ */}
      <section id="bloodlines" style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', borderBottom: '1px solid oklch(0.86 0.012 68)', padding: '96px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 52, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>The bloodlines</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,4.6vw,56px)', lineHeight: 1, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>Houses of <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>the dragon.</span></h2>
            </div>
            <Link href="/catalog" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '12px 20px', borderRadius: 999, transition: '.2s' }}>All specimens &rarr;</Link>
          </div>

          <div className="dc-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
            {bloodlines.map((b) => (
              <Link key={b._id} href={`/specimen-detail?id=${b._id}`} className="dc-species" style={{ display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 36%, oklch(0.30 0.14 27), oklch(0.14 0.06 25))', boxShadow: '0 20px 44px -26px oklch(0.20 0.10 24 / 0.6)' }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  {b.image && <img className="dc-species-img" src={b.image} alt={b.name} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '100%', height: '100%', objectFit: 'contain', padding: '10%', filter: 'drop-shadow(0 16px 24px oklch(0 0 0 / 0.5))' }} draggable={false} />}
                  {b.tankNumber && <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.7)' }}>{b.tankNumber}</div>}
                </div>
                <div style={{ padding: '16px 4px 0' }}>
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 5 }}>{bloodlineOf(b.name)}</div>
                  <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, color: 'oklch(0.19 0.012 32)' }}>{b.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: 'oklch(0.50 0.216 27)', fontWeight: 600 }}>{fmtPeso(b.price)}</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: 'oklch(0.56 0.02 40)' }}>{b.grade ? 'Grade ' + b.grade : 'Enquire →'}</span>
                  </div>
                </div>
              </Link>
            ))}

            <Link href="/catalog" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', aspectRatio: '3/4', borderRadius: 8, border: '1px dashed oklch(0.74 0.03 44)', background: 'oklch(0.972 0.008 78)', padding: 24, transition: '.25s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 12px 26px -12px oklch(0.52 0.216 27 / 0.7)' }}><span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 26, color: 'oklch(0.97 0.012 82)' }}>財</span></div>
              <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 20, color: 'oklch(0.19 0.012 32)', lineHeight: 1.2, marginBottom: 8 }}>The whole<br />gallery</div>
              <div style={{ fontSize: 13, color: 'oklch(0.46 0.012 34)', marginBottom: 16 }}>Every specimen in the water.</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>Browse all &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ PROMISE / STORY ══════════ */}
      <section id="story" style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)', padding: '104px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div className="dc-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 64, marginBottom: 56, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>The Cave &middot; our promise</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,4.8vw,58px)', lineHeight: 0.98, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>Provenance,<br />then <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>patience.</span></h2>
            </div>
            <p style={{ fontSize: 20, lineHeight: 1.5, color: 'oklch(0.36 0.012 34)', maxWidth: 600, margin: 0 }}>Every arowana that crosses our threshold is identified, isolated, and observed for twenty-one days before it joins the gallery. We do not sell a fish until we would keep it ourselves.</p>
          </div>
          <div className="dc-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {PROMISE.map((p) => (
              <div key={p.n} style={{ padding: '30px 26px', background: 'oklch(0.955 0.010 74)', border: '1px solid oklch(0.86 0.012 68)', borderTop: '2px solid oklch(0.70 0.12 80)', borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.216 27)', marginBottom: 16 }}>{p.n}</div>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 21, color: 'oklch(0.19 0.012 32)', marginBottom: 12 }}>{p.t}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: 0 }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ VISIT INVITE ══════════ */}
      <section style={{ background: 'oklch(0.972 0.008 78)', padding: '20px 0 100px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, background: 'radial-gradient(ellipse 80% 90% at 78% 20%, oklch(0.30 0.12 25), oklch(0.16 0.06 24) 62%, oklch(0.12 0.04 25) 100%)', border: '1px solid oklch(0.34 0.10 26)', boxShadow: '0 40px 90px -50px oklch(0.20 0.10 24 / 0.8)' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)', margin: 9, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: -70, top: '50%', transform: 'translateY(-50%)', width: 520, opacity: 0.5, pointerEvents: 'none' }}>
              <img src="/img/highback-gold.webp" alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 20px 40px oklch(0 0 0 / 0.5))', animation: 'dcDrift 10s ease-in-out infinite' }} draggable={false} />
            </div>
            <div style={{ position: 'relative', padding: 'clamp(40px,5.5vw,74px)', maxWidth: 620 }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.90 0.02 60 / 0.6)', marginBottom: 18 }}>By appointment</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(36px,5.2vw,60px)', lineHeight: 0.98, letterSpacing: '-0.02em', margin: '0 0 22px', color: 'oklch(0.97 0.01 82)' }}>Visit the <span style={{ fontStyle: 'italic', color: 'oklch(0.74 0.16 40)' }}>gallery.</span></h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'oklch(0.90 0.01 70 / 0.82)', maxWidth: 440, margin: '0 0 34px' }}>By appointment only. Bring a friend. We will pour tea. Take as long as you need with the fish.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44 }}>
                <Link href="/visit" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.55 0.22 28)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '15px 24px', borderRadius: 999, transition: '.2s' }}>Book a viewing &rarr;</Link>
                {waVisit && <a href={waVisit} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.70 0.06 60 / 0.4)', color: 'oklch(0.95 0.01 74)', fontSize: 14, fontWeight: 600, padding: '15px 22px', borderRadius: 999 }}>Message us</a>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, maxWidth: 520 }}>
                {visitFacts.map(([h, a, b]) => (
                  <div key={h}>
                    <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.85 0.02 60 / 0.5)', marginBottom: 8 }}>{h}</div>
                    <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.5, color: 'oklch(0.92 0.01 70 / 0.85)' }}>{a}<br />{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS (Admin → Testimonials; hidden until one is published) ══════════ */}
      {testimonials && testimonials.length > 0 && (
        <section style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', padding: '96px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>From our keepers</div>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1, letterSpacing: '-0.02em', margin: '0 0 48px', color: 'oklch(0.19 0.012 32)' }}>Dragons in <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>good hands.</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
              {testimonials.map((t) => (
                <figure key={t._id} style={{ margin: 0, background: 'oklch(0.985 0.006 80)', border: '1px solid oklch(0.86 0.012 68)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {t.photoUrl && (
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: 'oklch(0.90 0.02 66)' }}>
                      <img src={t.photoUrl} alt={`${t.clientName} with their fish`} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                    </div>
                  )}
                  <div style={{ position: 'relative', padding: '28px 26px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div aria-hidden="true" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 72, lineHeight: 0.6, color: 'oklch(0.52 0.216 27 / 0.28)', position: 'absolute', top: 18, left: 16 }}>&ldquo;</div>
                    {t.rating ? (() => {
                      const stars = Math.max(1, Math.min(5, Math.round(t.rating)));
                      return (
                        <div role="img" aria-label={`${stars} out of 5 stars`} style={{ color: 'oklch(0.70 0.14 75)', fontSize: 14, letterSpacing: 2, marginBottom: 10, textAlign: 'right' }}>
                          {'★'.repeat(stars)}<span style={{ color: 'oklch(0.85 0.02 60)' }}>{'★'.repeat(5 - stars)}</span>
                        </div>
                      );
                    })() : null}
                    <blockquote style={{ position: 'relative', fontFamily: serif, fontWeight: 500, fontSize: 19, lineHeight: 1.45, color: 'oklch(0.22 0.012 32)', margin: '0 0 22px', flex: 1 }}>{t.quote}</blockquote>
                    <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {!t.photoUrl && (
                        <span style={{ width: 36, height: 36, borderRadius: 99, background: 'oklch(0.52 0.216 27 / 0.12)', color: 'oklch(0.50 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: '0 0 auto' }}>{initialsOf(t.clientName)}</span>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.22 0.012 32)' }}>{t.clientName}</div>
                        {(t.clientLocation || t.productName) && (
                          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 2 }}>
                            {[t.clientLocation, t.productName].filter(Boolean).join(' · ')}
                          </div>
                        )}
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
