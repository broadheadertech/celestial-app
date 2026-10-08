'use client';

import Link from 'next/link';
import { useQuery } from '@/components/dc/useQuery';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { formatJournalDate } from '@/components/dc/JournalBody';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';

const CSS = `
.dk .dk-jcard { display: block; }
.dk .dk-jcard .dk-ph.has-img > img { transition: transform .5s var(--dk-ease); }
.dk .dk-jcard:hover .dk-ph.has-img > img { transform: scale(1.03); }
.dk .dk-jtitle { transition: color .2s; }
.dk .dk-jcard:hover .dk-jtitle { color: var(--dk-red); }
.dk .dk-jskel { background: var(--dk-n-100); border-radius: 6px; }
`;

type Post = FunctionReturnType<typeof api.services.journal.listPublished>[number];

function Cover({ post }: { post: Post }) {
  return (
    <Placeholder
      src={post.coverImageUrl}
      alt=""
      label={post.title}
      style={{ aspectRatio: '16/10', borderRadius: 'var(--dk-r-card)' }}
    />
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <p className="dk-small dk-muted">
      {formatJournalDate(post.publishedAt)} &middot; {post.readingMinutes} min read
    </p>
  );
}

function Kicker({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="dk-eyebrow" style={{ marginBottom: 10 }}>{text}</p>;
}

export default function JournalIndexPage() {
  const posts = useQuery(api.services.journal.listPublished, {});
  const [lead, ...rest] = posts ?? [];

  return (
    <div className="dk">
      <style>{CSS}</style>

      {/* HERO — the latest article sits in the notch */}
      <NotchHero
        tone="light"
        notchHeight={110}
        notchLabel="Latest article"
        notch={
          lead ? (
            <div className="dk-row wrap" style={{ gap: 20 }}>
              <div className="dk-stat">
                <b>{posts?.length ?? 0}</b>
                <span>{posts?.length === 1 ? 'article' : 'articles'}</span>
              </div>
              <Link href={`/journal/article?slug=${encodeURIComponent(lead.slug)}`} className="dk-btn dk-btn-red">
                Read the article
              </Link>
            </div>
          ) : undefined
        }
      >
        <p className="dk-eyebrow">Journal</p>
        <h1 className="dk-display">Field notes.</h1>
        <p className="dk-lede">
          Slow reading for the patient collector &mdash; husbandry, provenance, and the long art of keeping a single show fish.
        </p>
      </NotchHero>

      <section className="dk-section">
        <div className="dk-wrap">
          {posts === undefined ? (
            <div className="dk-grid-3" aria-busy="true" aria-label="Loading articles">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="dk-jskel" style={{ aspectRatio: '16/10', borderRadius: 'var(--dk-r-card)' }} />
                  <div className="dk-jskel" style={{ height: 12, width: '30%', marginTop: 18 }} />
                  <div className="dk-jskel" style={{ height: 22, width: '85%', marginTop: 12 }} />
                  <div className="dk-jskel" style={{ height: 14, width: '70%', marginTop: 10 }} />
                </div>
              ))}
            </div>
          ) : !lead ? (
            <div className="dk-panel" style={{ maxWidth: 560, margin: '0 auto' }}>
              <EmptyState
                title="Journal coming soon"
                actions={
                  <Link href="/catalog" className="dk-btn dk-btn-red">
                    Browse the gallery
                  </Link>
                }
              >
                We&rsquo;re writing up notes from the gallery floor &mdash; care guides, bloodlines and what we&rsquo;ve learned keeping arowana. Check back soon.
              </EmptyState>
            </div>
          ) : (
            <>
              {/* Lead article */}
              <Link href={`/journal/article?slug=${encodeURIComponent(lead.slug)}`} className="dk-jcard">
                <div className="dk-split even" style={{ gap: 44, alignItems: 'center' }}>
                  <Cover post={lead} />
                  <div>
                    <Kicker text={lead.kicker} />
                    <h2 className="dk-h2 dk-jtitle" style={{ marginBottom: 16 }}>{lead.title}</h2>
                    <p className="dk-lede" style={{ marginBottom: 20 }}>{lead.excerpt}</p>
                    <Meta post={lead} />
                    <span className="dk-link-arrow" style={{ marginTop: 20, color: 'var(--dk-red)' }}>Read the article</span>
                  </div>
                </div>
              </Link>

              {rest.length > 0 && (
                <>
                  <hr className="dk-divider" style={{ margin: '64px 0 56px' }} />
                  <div className="dk-grid-3" style={{ rowGap: 44 }}>
                    {rest.map((p) => (
                      <Link key={p._id} href={`/journal/article?slug=${encodeURIComponent(p.slug)}`} className="dk-jcard">
                        <Cover post={p} />
                        <div style={{ marginTop: 18 }}>
                          <Kicker text={p.kicker} />
                          <h3 className="dk-h4 dk-jtitle" style={{ marginBottom: 10 }}>{p.title}</h3>
                          <p className="dk-small dk-muted" style={{ marginBottom: 14 }}>
                            {p.excerpt.length > 160 ? `${p.excerpt.slice(0, 160).trimEnd()}…` : p.excerpt}
                          </p>
                          <Meta post={p} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
