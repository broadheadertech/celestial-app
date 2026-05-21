'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const JOURNAL_POSTS = [
  {
    slug: 'patience-with-arowanas',
    kicker: 'Husbandry',
    title: 'On the patience required to keep a show arowana.',
    excerpt:
      'A fish you will keep for fifteen years is not a fish you acquire in fifteen minutes. Notes on the long game.',
    date: 'May 2026',
    read: '8 min',
    volume: 'Vol. 04',
  },
  {
    slug: 'cites-and-the-paper-trail',
    kicker: 'Provenance',
    title: 'CITES paperwork is not a formality.',
    excerpt:
      'Why every fish in our gallery comes with a microchip and a folder of paperwork older than most aquarium magazines.',
    date: 'April 2026',
    read: '12 min',
    volume: 'Vol. 04',
  },
  {
    slug: 'tank-of-one',
    kicker: 'Display',
    title: 'In praise of the tank of one.',
    excerpt:
      'A solitary arowana in a planted display does what a community tank can never do. Build the room around the fish.',
    date: 'March 2026',
    read: '6 min',
    volume: 'Vol. 03',
  },
  {
    slug: 'quarantine-twenty-one',
    kicker: 'Quarantine',
    title: 'Twenty-one days.',
    excerpt:
      'Why we won\'t hand over a fish before the quarantine clock runs out. The math of patience.',
    date: 'February 2026',
    read: '5 min',
    volume: 'Vol. 03',
  },
  {
    slug: 'feeding-the-bloodline',
    kicker: 'Diet',
    title: 'Feeding the bloodline, not the fish.',
    excerpt:
      'A diet sheet built for the next generation, not the next dose. What we feed our breeders.',
    date: 'January 2026',
    read: '10 min',
    volume: 'Vol. 03',
  },
  {
    slug: 'red-vs-gold',
    kicker: 'Comparison',
    title: 'Asian Red vs. Crossback Gold — for the same buyer.',
    excerpt:
      'Two great fish, two very different commitments. How to choose between them at the table.',
    date: 'December 2025',
    read: '9 min',
    volume: 'Vol. 02',
  },
];

export default function JournalIndexPage() {
  return (
    <main>
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>Journal</div>
          <h1 className="display-xl mb-5" style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}>
            Field <em className="italic-flourish">notes.</em>
          </h1>
          <p
            className="max-w-[640px]"
            style={{
              fontSize: 18,
              color: 'var(--ink-2)',
              fontVariationSettings: '"opsz" 22, "wght" 500',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: '-0.015em',
              lineHeight: 1.45,
            }}
          >
            Slow reading for the patient collector. Husbandry, provenance, and the long art of
            building a single show fish.
          </p>
        </div>
      </section>

      <section className="py-15" style={{ padding: '40px 0 80px' }}>
        <div className="site-container">
          <div
            className="grid gap-7"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
          >
            {JOURNAL_POSTS.map((a) => (
              <Link
                key={a.slug}
                href={`/journal/${a.slug}`}
                className="lift-card block relative overflow-hidden"
                style={{
                  padding: 32,
                  background: 'var(--surface)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 4,
                  minHeight: 320,
                  color: 'var(--ink)',
                }}
              >
                <div className="placard mb-6">
                  <span
                    className="inline-block w-2 h-px align-middle mr-2.5"
                    style={{ background: 'var(--red)' }}
                  />
                  {a.kicker}
                </div>
                <h3
                  className="display mb-3.5"
                  style={{
                    fontSize: 26,
                    fontVariationSettings: '"opsz" 32, "wght" 700',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {a.title}
                </h3>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--ink-3)' }}>
                  {a.excerpt.length > 140 ? a.excerpt.slice(0, 140) + '…' : a.excerpt}
                </p>
                <div
                  className="absolute left-8 right-8 bottom-7 flex justify-between items-center text-[11px]"
                  style={{ color: 'var(--ink-4)' }}
                >
                  <span>
                    {a.date} · {a.read}
                  </span>
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--red)' }}>
                    Read <ArrowRight size={10} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
