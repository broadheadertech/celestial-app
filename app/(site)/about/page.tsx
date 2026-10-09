'use client';

import Link from 'next/link';
import NotchHero from '@/components/dc/kit/NotchHero';

const DISCIPLINES = [
  {
    title: 'Source',
    body: 'Direct relationships with Indonesian and Malaysian breeders going back twelve years. We see the parent fish before we bid on a fry.',
  },
  {
    title: 'Quarantine',
    body: 'Twenty-one days under isolated systems. Water tested daily. Treatment only if necessary, never prophylactically.',
  },
  {
    title: 'Husbandry',
    body: 'A diet plan per specimen. Tank parameters logged at 6am and 6pm. We sweat the small things so you don\'t have to.',
  },
  {
    title: 'Continuity',
    body: 'We answer the phone five years after the sale. Your fish has a long life to live, and we are still your second opinion.',
  },
];

const TIMELINE = [
  { year: '2008', label: 'First aquarium — a 240L planted tank in a Quezon City apartment.' },
  { year: '2013', label: 'First Asian Red specimen imported. Lost it. Learned everything.' },
  { year: '2018', label: 'Studio space in Tomas Morato. Quarantine room built first.' },
  { year: '2021', label: 'Dragon\'s Cave incorporated. CITES paperwork all in order.' },
  { year: '2026', label: 'Lineage tracking software live. Our 417th specimen finds a home.' },
];

export default function AboutPage() {
  return (
    <main className="dk">
      {/* Hero — the founder's line sits in the notch */}
      <NotchHero
        tone="dark"
        notchWide
        notchHeight={168}
        notchLabel="From the founder"
        notch={
          <figure style={{ display: 'grid', gap: 12 }}>
            <blockquote
              style={{
                fontFamily: 'var(--dk-f-display)',
                fontWeight: 800,
                fontSize: 20,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
              }}
            >
              We do not buy a fish for the catalog. We buy a fish for the collector who hasn&apos;t
              walked in yet.
            </blockquote>
            <figcaption className="dk-small dk-muted">— Mark Santos · Founder</figcaption>
          </figure>
        }
      >
        <p className="dk-eyebrow">About</p>
        <h1 className="dk-display">
          We sell fish<br />
          we would keep.
        </h1>
        <p className="dk-lede">
          Dragon&apos;s Cave is a one-room studio in Quezon City. We hold no more than thirty
          specimens at a time. Each one passes through our quarantine before it joins the
          gallery. We tell collectors no more often than yes.
        </p>
      </NotchHero>

      {/* Disciplines */}
      <section className="dk-section" aria-labelledby="about-disciplines">
        <div className="dk-wrap">
          <div className="dk-sec-head">
            <div>
              <p className="dk-eyebrow">Four disciplines</p>
              <h2 id="about-disciplines" className="dk-h2">How we work.</h2>
            </div>
          </div>
          <div className="dk-grid-4">
            {DISCIPLINES.map((d) => (
              <div key={d.title} className="dk-panel">
                <h3 className="dk-h4">{d.title}</h3>
                <p className="dk-small dk-muted" style={{ marginTop: 12 }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="dk-section alt" aria-labelledby="about-timeline">
        <div className="dk-wrap">
          <div className="dk-sec-head">
            <div>
              <p className="dk-eyebrow">2008 → 2026</p>
              <h2 id="about-timeline" className="dk-h2">A long bench.</h2>
            </div>
          </div>
          <ol className="dk-panel dk-list" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {TIMELINE.map((t) => (
              <li
                key={t.year}
                className="dk-list-row"
                style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', alignItems: 'baseline', gap: 20, padding: '20px 0' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--dk-f-display)',
                    fontWeight: 800,
                    fontSize: 26,
                    letterSpacing: '-0.02em',
                    color: 'var(--dk-red)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {t.year}
                </span>
                <span style={{ color: 'var(--dk-n-800)' }}>{t.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="dk-section" aria-labelledby="about-visit">
        <div className="dk-wrap narrow" style={{ textAlign: 'center' }}>
          <h2 id="about-visit" className="dk-h2">Come visit.</h2>
          <p className="dk-lede dk-muted" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            By appointment only. We&apos;ll pour tea and let the
            fish do the talking.
          </p>
          <div className="dk-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
            <Link href="/visit" className="dk-btn dk-btn-red">
              Book a slot
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
