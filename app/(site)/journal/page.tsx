'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { formatJournalDate } from '@/components/dc/JournalBody';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

const CSS = `
.dc-jcard { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.dc-jcard:hover { transform: translateY(-4px); }
.dc-jcard img { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.dc-jcard:hover img { transform: scale(1.04); }
.dc-jcard:hover .dc-jtitle { color: oklch(0.50 0.216 27); }
`;

type Post = FunctionReturnType<typeof api.services.journal.listPublished>[number];

function Cover({ post, ratio }: { post: Post; ratio: string }) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: ratio,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 80% at 50% 40%, oklch(0.30 0.12 25), oklch(0.14 0.05 24) 100%)',
      }}
    >
      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Noto Serif TC', serif",
            fontWeight: 900,
            fontSize: 56,
            color: 'oklch(0.86 0.10 70 / 0.35)',
          }}
        >
          龍
        </span>
      )}
    </div>
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)' }}>
      {formatJournalDate(post.publishedAt)} &middot; {post.readingMinutes} min read
    </div>
  );
}

function Kicker({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 10 }}>
      {text}
    </div>
  );
}

export default function JournalIndexPage() {
  const posts = useQuery(api.services.journal.listPublished, {});
  const [lead, ...rest] = posts ?? [];

  return (
    <>
      <style>{CSS}</style>

      {/* HERO */}
      <section style={{ background: 'oklch(0.972 0.008 78)', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 28px 52px' }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 22 }}>
            Journal
          </div>
          <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(46px,6.6vw,92px)', lineHeight: 0.92, letterSpacing: '-0.02em', margin: '0 0 22px', color: 'oklch(0.19 0.012 32)' }}>
            Field <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>notes.</span>
          </h1>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, maxWidth: 560, color: 'oklch(0.40 0.012 34)', margin: 0 }}>
            Slow reading for the patient collector &mdash; husbandry, provenance, and the long art of keeping a single show fish.
          </p>
        </div>
      </section>

      <section style={{ background: 'oklch(0.955 0.010 74)', padding: '64px 0 88px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          {posts === undefined ? (
            <div className="dc-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 28 }} aria-busy="true" aria-label="Loading articles">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div style={{ aspectRatio: '16/10', borderRadius: 10, background: 'oklch(0.91 0.012 70)' }} />
                  <div style={{ height: 12, width: '30%', marginTop: 18, borderRadius: 4, background: 'oklch(0.91 0.012 70)' }} />
                  <div style={{ height: 22, width: '85%', marginTop: 12, borderRadius: 4, background: 'oklch(0.91 0.012 70)' }} />
                  <div style={{ height: 14, width: '70%', marginTop: 10, borderRadius: 4, background: 'oklch(0.93 0.010 72)' }} />
                </div>
              ))}
            </div>
          ) : !lead ? (
            <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto', padding: '48px 28px', background: 'oklch(0.99 0.005 80)', border: '1px solid oklch(0.87 0.012 68)', borderRadius: 14 }}>
              <div aria-hidden="true" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 40, color: 'oklch(0.52 0.216 27)', marginBottom: 14 }}>龍</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 30, lineHeight: 1.1, margin: '0 0 10px', color: 'oklch(0.19 0.012 32)' }}>Journal coming soon</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: '0 0 24px' }}>
                We&rsquo;re writing up notes from the gallery floor &mdash; care guides, bloodlines and what we&rsquo;ve learned keeping arowana. Check back soon.
              </p>
              <Link href="/catalog" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 999 }}>
                Browse the gallery
              </Link>
            </div>
          ) : (
            <>
              {/* Lead article */}
              <Link href={`/journal/article?slug=${encodeURIComponent(lead.slug)}`} className="dc-jcard dc-split" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 44, alignItems: 'center', color: 'oklch(0.19 0.012 32)' }}>
                <Cover post={lead} ratio="16/10" />
                <div>
                  <Kicker text={lead.kicker} />
                  <h2 className="dc-jtitle" style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(30px,3.8vw,46px)', lineHeight: 1.04, letterSpacing: '-0.015em', margin: '0 0 16px', transition: 'color .2s' }}>
                    {lead.title}
                  </h2>
                  <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'oklch(0.40 0.012 34)', margin: '0 0 20px' }}>{lead.excerpt}</p>
                  <Meta post={lead} />
                  <div style={{ marginTop: 20, fontSize: 14, fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>Read the article &rarr;</div>
                </div>
              </Link>

              {rest.length > 0 && (
                <div className="dc-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '44px 28px', marginTop: 64, paddingTop: 56, borderTop: '1px solid oklch(0.86 0.012 68)' }}>
                  {rest.map((p) => (
                    <Link key={p._id} href={`/journal/article?slug=${encodeURIComponent(p.slug)}`} className="dc-jcard" style={{ display: 'block', color: 'oklch(0.19 0.012 32)' }}>
                      <Cover post={p} ratio="16/10" />
                      <div style={{ marginTop: 18 }}>
                        <Kicker text={p.kicker} />
                        <h3 className="dc-jtitle" style={{ fontFamily: serif, fontWeight: 700, fontSize: 24, lineHeight: 1.12, letterSpacing: '-0.01em', margin: '0 0 10px', transition: 'color .2s' }}>
                          {p.title}
                        </h3>
                        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: '0 0 14px' }}>
                          {p.excerpt.length > 160 ? `${p.excerpt.slice(0, 160).trimEnd()}…` : p.excerpt}
                        </p>
                        <Meta post={p} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
