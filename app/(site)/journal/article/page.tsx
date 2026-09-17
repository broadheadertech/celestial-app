'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import JournalBody, { formatJournalDate } from '@/components/dc/JournalBody';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

function BackLink() {
  return (
    <Link
      href="/journal"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.44 0.012 34)' }}
    >
      &larr; All articles
    </Link>
  );
}

function Loading() {
  return (
    <section style={{ background: 'oklch(0.972 0.008 78)', padding: '48px 0 96px' }} aria-busy="true">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ height: 12, width: 140, borderRadius: 4, background: 'oklch(0.91 0.012 70)', marginBottom: 22 }} />
        <div style={{ height: 46, width: '90%', borderRadius: 6, background: 'oklch(0.91 0.012 70)', marginBottom: 12 }} />
        <div style={{ height: 46, width: '60%', borderRadius: 6, background: 'oklch(0.91 0.012 70)', marginBottom: 28 }} />
        <div style={{ height: 14, width: '100%', borderRadius: 4, background: 'oklch(0.93 0.010 72)', marginBottom: 10 }} />
        <div style={{ height: 14, width: '80%', borderRadius: 4, background: 'oklch(0.93 0.010 72)' }} />
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Loading article…</span>
      </div>
    </section>
  );
}

function NotFound() {
  return (
    <section style={{ background: 'oklch(0.955 0.010 74)', padding: '80px 0 110px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>Journal</div>
        <h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1.05, margin: '0 0 14px', color: 'oklch(0.19 0.012 32)' }}>Article not found</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: '0 0 28px' }}>
          This article may have been moved or taken down. Have a look through the rest of the journal instead.
        </p>
        <Link href="/journal" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '13px 22px', borderRadius: 999 }}>
          Back to the journal
        </Link>
      </div>
    </section>
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
    <article>
      <header style={{ background: 'oklch(0.972 0.008 78)', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 28px 48px' }}>
          <div style={{ marginBottom: 40 }}>
            <BackLink />
          </div>
          {post.kicker && (
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 18 }}>
              {post.kicker}
            </div>
          )}
          <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(36px,5.6vw,64px)', lineHeight: 1.0, letterSpacing: '-0.02em', margin: '0 0 20px', color: 'oklch(0.19 0.012 32)', overflowWrap: 'break-word' }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: 'oklch(0.40 0.012 34)', margin: '0 0 24px' }}>{post.excerpt}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)' }}>
            {post.authorName && <span style={{ color: 'oklch(0.30 0.012 32)' }}>By {post.authorName}</span>}
            <span>{meta}</span>
          </div>
        </div>
      </header>

      <section style={{ background: 'oklch(0.972 0.008 78)', padding: post.coverImageUrl ? '40px 0 96px' : '48px 0 96px' }}>
        {post.coverImageUrl && (
          <div style={{ maxWidth: 1040, margin: '0 auto 48px', padding: '0 28px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt=""
              style={{ display: 'block', width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, background: 'oklch(0.91 0.012 70)' }}
            />
          </div>
        )}
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 28px' }}>
          <JournalBody body={post.body} />
          <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid oklch(0.86 0.012 68)' }}>
            <BackLink />
          </div>
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
