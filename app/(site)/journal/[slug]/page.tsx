'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { JOURNAL_POSTS } from '../page';

export default function JournalArticlePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const post = JOURNAL_POSTS.find((p) => p.slug === slug) || JOURNAL_POSTS[0];

  return (
    <main>
      <div className="site-container pt-6 pb-3" style={{ padding: '24px 32px 12px' }}>
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: 'var(--ink-3)' }}
        >
          <ChevronLeft size={14} />
          All articles
        </Link>
      </div>

      <article>
        <section className="pt-8 pb-10" style={{ padding: '40px 0 60px' }}>
          <div className="site-container max-w-[760px]">
            <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>
              {post.kicker} · {post.volume}
            </div>
            <h1
              className="display-xl mb-5"
              style={{ fontSize: 'clamp(36px, 6vw, 64px)', letterSpacing: '-0.03em' }}
            >
              {post.title}
            </h1>
            <div className="placard" style={{ color: 'var(--ink-3)' }}>
              {post.date} · {post.read} read
            </div>
          </div>
        </section>

        <section className="py-10" style={{ padding: '0 0 80px' }}>
          <div className="site-container max-w-[720px]">
            <div
              className="flex flex-col gap-5 mb-8"
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontVariationSettings: '"opsz" 22, "wght" 400',
                letterSpacing: '-0.012em',
              }}
            >
              <p>
                {post.excerpt} The patient collector knows that a great arowana is built across
                seasons. Not bought in a hurry.
              </p>

              <p>
                When we first imported an Asian Red in 2013, we lost it within a month. Wrong tank
                size, wrong water chemistry, wrong everything. That fish taught us more than the
                next twenty did.
              </p>

              <blockquote
                className="my-7 pl-7"
                style={{
                  borderLeft: '3px solid var(--red)',
                  fontSize: 24,
                  lineHeight: 1.4,
                  color: 'var(--ink)',
                  fontVariationSettings: '"opsz" 32, "wght" 600',
                  letterSpacing: '-0.018em',
                }}
              >
                A fish you will keep for fifteen years is not a fish you acquire in fifteen minutes.
              </blockquote>

              <p>
                Provenance, husbandry, patience. Three habits that mean more than any fancy filter
                or imported pellet. The fish has its own timeline. You learn to keep yours from
                clashing with it.
              </p>

              <h2
                className="display mt-10 mb-3"
                style={{ fontSize: 26, fontVariationSettings: '"opsz" 32, "wght" 700' }}
              >
                What we look for in a specimen
              </h2>

              <ol className="list-decimal pl-6 flex flex-col gap-3 text-[16px]">
                <li>
                  Symmetry. The kind that survives a side-on inspection at three angles.
                </li>
                <li>
                  Posture in the water column. A good arowana hovers; a great one glides.
                </li>
                <li>
                  Pedigree. Two generations of verified bloodline minimum. Four is preferred.
                </li>
                <li>
                  Temperament. The fish that lets you observe it is the fish that keeps you.
                </li>
              </ol>

              <p className="mt-7">
                We hold a fish for as long as it needs. Sometimes that is three weeks. Sometimes
                that is three months. The collector who wants the right fish will wait. The fish,
                we have learned, knows.
              </p>
            </div>

            {/* Sidebar tip */}
            <aside
              className="p-7 rounded mb-8"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
              }}
            >
              <div className="placard mb-3" style={{ color: 'var(--red-hi)' }}>
                Tip from the floor
              </div>
              <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Before you buy, ask to see the parent fish. If the dealer can&apos;t show you, ask
                for the breeder&apos;s name and a photograph. Most can. Most won&apos;t.
              </p>
            </aside>
          </div>
        </section>
      </article>
    </main>
  );
}
