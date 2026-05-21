'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ArowanaSilhouette from '@/components/site/ArowanaSilhouette';

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
    <main>
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>About</div>
          <h1
            className="display-xxl mb-6 max-w-[900px]"
            style={{ fontSize: 'clamp(48px, 10vw, 132px)' }}
          >
            We sell fish<br />
            <em className="italic-flourish">we would keep.</em>
          </h1>
          <p
            className="max-w-[640px]"
            style={{
              fontSize: 19,
              color: 'var(--ink-2)',
              fontVariationSettings: '"opsz" 22, "wght" 500',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: '-0.015em',
              lineHeight: 1.5,
            }}
          >
            Dragon&apos;s Cave is a one-room studio in Quezon City. We hold no more than thirty
            specimens at a time. Each one passes through our quarantine before it joins the
            gallery. We tell collectors no more often than yes.
          </p>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20" style={{ padding: '60px 0', background: 'var(--bg-2)' }}>
        <div className="site-container">
          <p
            className="max-w-[800px] mx-auto text-center"
            style={{
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              lineHeight: 1.25,
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontVariationSettings: '"opsz" 48, "wght" 600',
              letterSpacing: '-0.025em',
              color: 'var(--ink)',
            }}
          >
            We do not buy a fish for the catalog. We buy a fish for the collector who hasn&apos;t
            walked in yet.
          </p>
          <p
            className="placard mt-6 text-center"
            style={{ color: 'var(--ink-3)' }}
          >
            — Mark Santos · Founder
          </p>
        </div>
      </section>

      {/* Disciplines */}
      <section className="py-20" style={{ padding: '80px 0' }}>
        <div className="site-container">
          <div className="placard mb-3">Four disciplines</div>
          <h2 className="display-xl mb-12" style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            How we work.
          </h2>
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
          >
            {DISCIPLINES.map((d, i) => (
              <div
                key={d.title}
                className="p-7 rounded"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line-soft)',
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
                  className="display mb-3"
                  style={{ fontSize: 22, fontVariationSettings: '"opsz" 28, "wght" 700' }}
                >
                  {d.title}
                </div>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 relative overflow-hidden" style={{ padding: '80px 0', background: 'var(--bg-2)' }}>
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        >
          <ArowanaSilhouette size={680} color="var(--red)" mirror />
        </div>
        <div className="site-container relative">
          <div className="placard mb-3">2008 → 2026</div>
          <h2 className="display-xl mb-10" style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            A long bench.
          </h2>
          <div className="flex flex-col">
            {TIMELINE.map((t, i) => (
              <div
                key={t.year}
                className="grid items-baseline gap-6 py-6"
                style={{
                  gridTemplateColumns: '120px 1fr',
                  borderBottom: i === TIMELINE.length - 1 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <div
                  className="display font-mono-tabular"
                  style={{
                    fontSize: 30,
                    color: 'var(--red)',
                    fontVariationSettings: '"opsz" 36, "wght" 700',
                  }}
                >
                  {t.year}
                </div>
                <div
                  className="text-[16px]"
                  style={{
                    color: 'var(--ink-2)',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontVariationSettings: '"opsz" 22, "wght" 500',
                    letterSpacing: '-0.012em',
                  }}
                >
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-15" style={{ padding: '80px 0' }}>
        <div className="site-container text-center">
          <h2
            className="display-xl mb-5"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            Come <em className="italic-flourish">visit.</em>
          </h2>
          <p
            className="max-w-[520px] mx-auto mb-7"
            style={{ color: 'var(--ink-3)', fontSize: 16 }}
          >
            Tuesday through Saturday, by appointment only. We&apos;ll pour coffee and let the
            fish do the talking.
          </p>
          <Link href="/visit" className="b b-primary b-lg">
            Book a slot <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
