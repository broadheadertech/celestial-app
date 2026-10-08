'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import JournalBody, { formatJournalDate } from '@/components/dc/JournalBody';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';

const skel = { background: 'var(--dk-n-100)', borderRadius: 6 } as const;

function BackLink() {
  return (
    <Link href="/journal" className="dk-btn-text">
      &larr; All articles
    </Link>
  );
}

function Loading() {
  return (
    <div className="dk">
      <section className="dk-section" aria-busy="true">
        <div className="dk-wrap" style={{ maxWidth: 'calc(700px + var(--dk-gutter) * 2)' }}>
          <div style={{ ...skel, height: 12, width: 140, marginBottom: 22 }} />
          <div style={{ ...skel, height: 46, width: '90%', marginBottom: 12 }} />
          <div style={{ ...skel, height: 46, width: '60%', marginBottom: 28 }} />
          <div style={{ ...skel, height: 14, width: '100%', marginBottom: 10 }} />
          <div style={{ ...skel, height: 14, width: '80%' }} />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Loading article…</span>
        </div>
      </section>
    </div>
  );
}

function NotFound() {
  return (
    <div className="dk">
      <section className="dk-section alt">
        <div className="dk-wrap" style={{ maxWidth: 'calc(560px + var(--dk-gutter) * 2)' }}>
          <p className="dk-eyebrow" style={{ textAlign: 'center', marginBottom: 16 }}>Journal</p>
          <div className="dk-panel">
            <EmptyState
              as="h1"
              title="Article not found"
              actions={
                <Link href="/journal" className="dk-btn dk-btn-red">
                  Back to the journal
                </Link>
              }
            >
              This article may have been moved or taken down. Have a look through the rest of the journal instead.
            </EmptyState>
          </div>
        </div>
      </section>
    </div>
  );
}

function JournalArticleContent() {
  const searchParams = useSearchParams();
  const slug = searchParams?.get('slug')?.trim() || '';
  const post = useQuery(api.services.journal.getBySlug, slug ? { slug } : 'skip');

  useEffect(() => {
    if (post) document.title = `${post.title} · Dragon's Cave`;
    else if (post === null || !slug) document.title = "Article not found · Dragon's Cave";
  }, [post, slug]);

  if (!slug || post === null) return <NotFound />;
  if (post === undefined) return <Loading />;

  const meta = [formatJournalDate(post.publishedAt), `${post.readingMinutes} min read`].filter(Boolean).join(' · ');

  return (
    <article className="dk">
      {/* Article header — byline and date sit in the notch */}
      <NotchHero
        tone="light"
        notchHeight={96}
        notchLabel="Article details"
        notch={
          <div className="dk-kv">
            {post.authorName && <p className="dk-meta-val" style={{ fontWeight: 700 }}>By {post.authorName}</p>}
            <p className="dk-meta-label">{meta}</p>
          </div>
        }
      >
        <div style={{ marginBottom: 32 }}>
          <BackLink />
        </div>
        {post.kicker && <p className="dk-eyebrow">{post.kicker}</p>}
        <h1 className="dk-h1" style={{ overflowWrap: 'break-word' }}>{post.title}</h1>
        <p className="dk-lede">{post.excerpt}</p>
      </NotchHero>

      <section className="dk-section" style={post.coverImageUrl ? { paddingTop: 40 } : undefined}>
        {post.coverImageUrl && (
          <div className="dk-wrap" style={{ maxWidth: 'calc(1040px + var(--dk-gutter) * 2)', marginBottom: 48 }}>
            <Placeholder
              src={post.coverImageUrl}
              alt=""
              priority
              style={{ aspectRatio: '16/9', borderRadius: 'var(--dk-r-card)' }}
            />
          </div>
        )}
        <div className="dk-wrap" style={{ maxWidth: 'calc(700px + var(--dk-gutter) * 2)' }}>
          <JournalBody body={post.body} />
          <hr className="dk-divider" style={{ margin: '56px 0 28px' }} />
          <BackLink />
        </div>
      </section>
    </article>
  );
}

export default function JournalArticlePage() {
  return (
    <Suspense fallback={<Loading />}>
      <JournalArticleContent />
    </Suspense>
  );
}
