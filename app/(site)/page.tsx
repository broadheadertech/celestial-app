'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useMemo } from 'react';
import ArowanaSilhouette, {
  GradeBadge,
  SpecimenPlate,
  pickPalette,
} from '@/components/site/ArowanaSilhouette';

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

const STORY_PILLARS = [
  {
    title: 'Provenance',
    body: 'Every fish carries a microchip, a CITES certificate, and our hand-written lineage card.',
  },
  {
    title: 'Quarantine',
    body: '21 days of observation in isolated systems before any specimen joins the gallery.',
  },
  {
    title: 'Husbandry',
    body: 'Tank parameters monitored daily. Diet planned per specimen. We sweat the small things.',
  },
  {
    title: 'Continuity',
    body: 'We answer the phone five years after the sale. Your fish has a long life to live.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Mark put a fish on hold for me for three weeks while I finished my display tank. That kind of patience is rare.',
    name: 'Karlo Reyes',
    title: 'Collector · Makati',
  },
  {
    quote:
      'The lineage card on my Chili Red traces back four generations. I have never seen that kind of documentation from any other dealer.',
    name: 'Daniel Lim',
    title: 'Aquarist · Cebu',
  },
];

export default function SiteHome() {
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  const liveProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive && isLiveCategoryName(p.categoryName)),
    [products],
  );

  // Hero specimen = newest live product
  const hero = useMemo(() => {
    return liveProducts
      .filter((p) => p.stock > 0)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [liveProducts]);

  // "Now showing" — top 4 by price
  const featured = useMemo(
    () =>
      liveProducts
        .filter((p) => p.stock > 0)
        .sort((a, b) => b.price - a.price)
        .slice(0, 4),
    [liveProducts],
  );

  // New arrivals — newest 6
  const newArrivals = useMemo(
    () =>
      liveProducts
        .filter((p) => p.stock > 0)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6),
    [liveProducts],
  );

  return (
    <main>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        <div
          className="site-container grid items-center gap-16"
          style={{
            gridTemplateColumns: '1.05fr 1fr',
            padding: '60px 32px 80px',
            minHeight: 'calc(100vh - 100px)',
          }}
        >
          <div className="relative">
            <div
              className="placard mb-7"
              style={{ color: 'var(--red-hi)' }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-2.5"
                style={{ background: 'var(--red)' }}
              />
              Featured specimen · this fortnight
            </div>
            <h1
              className="display-xxl fade-up mb-6"
              style={{
                fontSize: 'clamp(64px, 11vw, 168px)',
                color: 'var(--ink)',
              }}
            >
              <span style={{ display: 'block' }}>Liquid</span>
              <span
                className="italic-flourish"
                style={{
                  display: 'block',
                  fontSize: 'clamp(64px, 11vw, 168px)',
                  lineHeight: 0.84,
                }}
              >
                fire.
              </span>
            </h1>
            <p
              style={{
                fontSize: 'clamp(16px, 1.4vw, 19px)',
                color: 'var(--ink-2)',
                maxWidth: 460,
                lineHeight: 1.55,
                marginBottom: 36,
                fontVariationSettings: '"opsz" 22, "wght" 400',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                letterSpacing: '-0.012em',
              }}
            >
              An obsession with bloodline, husbandry, and patience.{' '}
              {hero
                ? `Today's centerpiece — ${hero.name}.`
                : 'Browse the gallery to see what is in the vitrine this week.'}
            </p>

            <div className="flex gap-3 items-center flex-wrap">
              {hero ? (
                <Link href={`/specimen/${hero._id}`} className="b b-primary b-lg">
                  Hold this specimen <ArrowRight size={14} />
                </Link>
              ) : null}
              <Link href="/catalog" className="b b-lg">
                Browse catalog
              </Link>
            </div>

            <hr className="hairline" style={{ margin: '56px 0 24px', maxWidth: 460 }} />

            {hero && (
              <div className="grid gap-6 max-w-[480px]" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  ['SKU', hero.sku ? `#${hero.sku}` : '—'],
                  ['Tank', hero.tankNumber || '—'],
                  ['Stock', String(hero.stock)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="placard">{k}</div>
                    <div
                      className="display"
                      style={{ fontSize: 28, marginTop: 4, fontVariationSettings: '"opsz" 32, "wght" 700' }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vitrine */}
          {hero ? (
            <div className="relative">
              <div
                style={{
                  aspectRatio: '4 / 5',
                  maxHeight: '78vh',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: `radial-gradient(ellipse at 50% 35%, var(--oxblood), var(--oxblood-2) 60%, oklch(0 0 0) 100%)`,
                  position: 'relative',
                  boxShadow:
                    '0 60px 120px -60px oklch(0 0 0 / 0.6), 0 1px 0 oklch(1 0 0 / 0.06) inset',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(ellipse 50% 40% at 50% 22%, oklch(1 0 0 / 0.15), transparent 70%)',
                  }}
                />
                <div className="scales" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
                <div
                  className="absolute top-7 left-7 right-7 flex justify-between items-start"
                >
                  <div>
                    <div
                      className="placard mb-2"
                      style={{ color: 'oklch(0.95 0 0 / 0.55)' }}
                    >
                      {hero.sku ? `#${hero.sku}` : ''}{hero.certificate ? ` · ${hero.certificate}` : ''}
                    </div>
                    <div
                      className="placard"
                      style={{ color: 'oklch(0.95 0 0 / 0.55)' }}
                    >
                      {hero.categoryName}
                    </div>
                  </div>
                  {hero.grade && <GradeBadge grade={hero.grade} />}
                </div>

                <div
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {hero.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hero.image}
                      alt={hero.name}
                      style={{
                        maxHeight: '60%',
                        maxWidth: '80%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 30px 50px oklch(0 0 0 / 0.5))',
                      }}
                    />
                  ) : (
                    <span
                      className="swim-x"
                      style={{
                        color: pickPalette(hero.categoryName).fish,
                        filter: 'drop-shadow(0 30px 50px oklch(0 0 0 / 0.5))',
                        transform: 'scale(1.6)',
                      }}
                    >
                      <ArowanaSilhouette
                        size={420}
                        color={pickPalette(hero.categoryName).fish}
                      />
                    </span>
                  )}
                </div>

                <div
                  className="absolute bottom-7 left-7 right-7 flex justify-between items-end"
                >
                  <div>
                    <div
                      className="placard mb-1.5"
                      style={{ color: 'oklch(0.95 0 0 / 0.5)' }}
                    >
                      Studio plate · Vitrine VII
                    </div>
                    <div
                      style={{
                        color: 'oklch(0.99 0 0)',
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontVariationSettings: '"opsz" 48, "wght" 700',
                        fontSize: 36,
                        lineHeight: 1,
                        letterSpacing: '-0.025em',
                      }}
                    >
                      {hero.name}
                    </div>
                  </div>
                  <div
                    className="font-mono-tabular font-semibold text-[13px]"
                    style={{ color: 'oklch(0.99 0 0)' }}
                  >
                    {fmt(hero.price)}
                  </div>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 6,
                    boxShadow: 'inset 0 0 0 1px oklch(1 0 0 / 0.06)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              <div
                className="absolute uppercase font-bold tracking-[0.18em] text-[10px]"
                style={{
                  top: -20,
                  right: -8,
                  transform: 'rotate(2deg)',
                  background: 'var(--red)',
                  color: 'oklch(0.99 0 0)',
                  padding: '6px 12px',
                  borderRadius: 4,
                  boxShadow: '0 6px 18px -6px var(--red-glow)',
                }}
              >
                Hold for me
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                style={{
                  aspectRatio: '4 / 5',
                  maxHeight: '78vh',
                  borderRadius: 6,
                  background: 'radial-gradient(ellipse, var(--bg-3), var(--bg-2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArowanaSilhouette size={320} color="var(--ink-5)" />
              </div>
            </div>
          )}
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: 'var(--ink-4)' }}
        >
          Scroll <span className="w-8 h-px" style={{ background: 'var(--ink-4)' }} />
        </div>
      </section>

      {/* ───────── METRICS RIBBON ───────── */}
      <section
        style={{
          borderTop: '1px solid var(--line-soft)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div
          className="site-container grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}
        >
          {[
            ['Specimens placed', String(products?.filter((p) => !p.isActive).length || '—')],
            ['Live in gallery', String(liveProducts.filter((p) => p.stock > 0).length)],
            ['Bloodlines tracked', '38'],
            ['Years of breeding', '14'],
            ['Quarantine days', '21'],
          ].map(([k, v], i, arr) => (
            <div
              key={k}
              style={{
                padding: '32px 24px',
                borderRight: i === arr.length - 1 ? 0 : '1px solid var(--line-soft)',
              }}
            >
              <div className="placard">{k}</div>
              <div
                className="display"
                style={{
                  fontSize: 'clamp(36px, 4vw, 56px)',
                  marginTop: 10,
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── NOW SHOWING ───────── */}
      <SiteSection
        eyebrow="Now showing"
        title={
          <>
            The current
            <br />
            <em className="italic-flourish">collection.</em>
          </>
        }
        subtitle="Each fish is held in our gallery water until the right collector takes it home."
        cta={
          <Link href="/catalog" className="b">
            All specimens <ArrowRight size={12} />
          </Link>
        }
      >
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {featured.length === 0 ? (
            <div
              className="col-span-full py-16 text-center"
              style={{ color: 'var(--ink-4)' }}
            >
              No specimens currently on display.
            </div>
          ) : (
            featured.map((p) => <SiteCatalogTile key={p._id} product={p} />)
          )}
        </div>
      </SiteSection>

      {/* ───────── PROMISE / STORY ───────── */}
      <section style={{ background: 'var(--bg-2)', padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: '50%',
            transform: 'translateY(-50%) rotate(-8deg)',
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        >
          <ArowanaSilhouette size={780} color="var(--red)" />
        </div>

        <div className="site-container relative">
          <div
            className="grid gap-20 mb-14"
            style={{ gridTemplateColumns: '1fr 1.6fr' }}
          >
            <div>
              <div className="eyebrow mb-4">Our promise</div>
              <h2
                className="display-xl"
                style={{ fontSize: 'clamp(36px, 5.6vw, 64px)' }}
              >
                Provenance,
                <br />
                then patience.
              </h2>
            </div>
            <p
              style={{
                fontSize: 20,
                color: 'var(--ink-2)',
                maxWidth: 620,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontVariationSettings: '"opsz" 28, "wght" 500',
                letterSpacing: '-0.018em',
                lineHeight: 1.45,
                alignSelf: 'flex-end',
              }}
            >
              Every arowana that crosses our threshold is identified, isolated, and observed for
              twenty-one days before it joins the gallery. We do not sell a fish until we would
              keep it ourselves.
            </p>
          </div>

          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
          >
            {STORY_PILLARS.map((s, i) => (
              <div
                key={s.title}
                style={{
                  padding: '32px 28px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 4,
                }}
              >
                <div
                  className="display font-mono-tabular mb-4"
                  style={{
                    fontSize: 14,
                    color: 'var(--red)',
                    fontVariationSettings: '"opsz" 16, "wght" 700',
                  }}
                >
                  0{i + 1}
                </div>
                <div
                  className="display mb-3.5"
                  style={{ fontSize: 22, fontVariationSettings: '"opsz" 28, "wght" 700' }}
                >
                  {s.title}
                </div>
                <p
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── NEW ARRIVALS ───────── */}
      <SiteSection
        eyebrow="New this fortnight"
        title="Fresh from the importer"
        subtitle="Always under quarantine before they meet our gallery water. Reserve early — collectors travel for these."
        cta={
          <Link href="/catalog" className="b">
            See all <ArrowRight size={12} />
          </Link>
        }
      >
        <div
          className="grid overflow-x-auto pb-5 pt-2 gap-4"
          style={{
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(220px, 1fr)',
            scrollSnapType: 'x mandatory',
          }}
        >
          {newArrivals.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--ink-4)' }}>
              No new arrivals.
            </div>
          ) : (
            newArrivals.map((p) => (
              <div key={p._id} style={{ scrollSnapAlign: 'start' }}>
                <SiteCatalogTile product={p} />
              </div>
            ))
          )}
        </div>
      </SiteSection>

      {/* ───────── VISIT INVITE ───────── */}
      <section className="py-15" style={{ padding: '60px 0' }}>
        <div className="site-container">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--oxblood), oklch(0 0 0) 80%)',
              borderRadius: 6,
              padding: 'clamp(40px, 6vw, 80px)',
              border: '1px solid var(--line)',
              color: 'oklch(0.99 0 0)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -60,
                top: -20,
                opacity: 0.25,
                transform: 'rotate(-12deg)',
                pointerEvents: 'none',
              }}
            >
              <ArowanaSilhouette size={520} color="var(--red)" mirror />
            </div>

            <div className="relative max-w-[640px]">
              <div className="placard mb-4" style={{ color: 'oklch(0.99 0 0 / 0.55)' }}>
                By appointment
              </div>
              <h2
                className="display-xl mb-5"
                style={{ fontSize: 'clamp(36px, 5.6vw, 64px)' }}
              >
                Visit the
                <br />
                <span className="italic-flourish">gallery.</span>
              </h2>
              <p
                className="mb-8"
                style={{
                  fontSize: 17,
                  color: 'oklch(0.99 0 0 / 0.78)',
                  maxWidth: 480,
                  lineHeight: 1.5,
                }}
              >
                Tuesday through Saturday, by appointment only. Bring a friend. We will pour coffee.
                You can take as long as you need.
              </p>

              <div className="flex gap-3 flex-wrap">
                <Link href="/visit" className="b b-primary b-lg">
                  Book a slot <ArrowRight size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="b b-lg"
                  style={{ color: 'oklch(0.99 0 0)', borderColor: 'oklch(1 0 0 / 0.2)' }}
                >
                  Or just write to us
                </Link>
              </div>

              <hr
                className="hairline mt-10 mb-6"
                style={{ maxWidth: 480, background: 'oklch(1 0 0 / 0.12)' }}
              />

              <div
                className="grid gap-4.5 max-w-[540px]"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                {[
                  ['Address', '34 Tomas Morato Ave\nQuezon City'],
                  ['Hours', 'Tue–Sat\n10:00 – 18:00'],
                  ['Phone', '(02) 8851 4928\n+63 917 234 5678'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="placard mb-1.5" style={{ color: 'oklch(0.99 0 0 / 0.45)' }}>
                      {k}
                    </div>
                    <div
                      className="font-mono-tabular text-[12px] leading-relaxed whitespace-pre-line"
                      style={{ color: 'oklch(0.99 0 0 / 0.85)' }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="py-25" style={{ padding: '100px 0', background: 'var(--bg-2)' }}>
        <div className="site-container">
          <div
            className="grid gap-10"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}
          >
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="relative">
                <div
                  className="display absolute italic"
                  style={{
                    top: -32,
                    left: -8,
                    fontSize: 96,
                    color: 'var(--red)',
                    fontVariationSettings: '"opsz" 96, "wght" 700',
                    lineHeight: 1,
                    opacity: 0.3,
                  }}
                >
                  &ldquo;
                </div>
                <p
                  className="relative mb-6"
                  style={{
                    fontSize: 22,
                    lineHeight: 1.4,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontVariationSettings: '"opsz" 28, "wght" 500',
                    letterSpacing: '-0.018em',
                    color: 'var(--ink)',
                  }}
                >
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
                  >
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold">{t.name}</div>
                    <div className="placard mt-0.5">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SiteSection({
  children,
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: React.ReactNode;
  subtitle?: string;
  cta?: React.ReactNode;
}) {
  return (
    <section className="py-20" style={{ padding: '80px 0' }}>
      <div className="site-container">
        {(eyebrow || title || subtitle) && (
          <div
            className="grid items-end mb-12"
            style={{ gridTemplateColumns: cta ? '1fr auto' : '1fr', gap: 24 }}
          >
            <div style={{ maxWidth: 720 }}>
              {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
              {title && (
                <h2
                  className="display-xl"
                  style={{ fontSize: 'clamp(36px, 5.6vw, 64px)', color: 'var(--ink)' }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className="mt-3.5 text-[18px] leading-relaxed"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {cta}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

function SiteCatalogTile({ product }: { product: any }) {
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
      <div className="px-1 pt-4.5 pb-2" style={{ padding: '18px 4px 8px' }}>
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
