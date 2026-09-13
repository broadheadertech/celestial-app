'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Camera, Eye, ImageIcon, PenLine, RefreshCw, X, XCircle } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import JournalBody from '@/components/dc/JournalBody';

/** Keep in sync with the server-side limits in convex/services/journal.ts. */
export const JOURNAL_LIMITS = { title: 140, excerpt: 300, kicker: 40, body: 50_000, author: 80, slug: 80 } as const;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

/** Mirrors the server's slug generation, for the live preview of an auto slug. */
export function slugifyTitle(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(COMBINING_MARKS, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, JOURNAL_LIMITS.slug)
      .replace(/-+$/g, '')
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] placeholder:text-[var(--ink-4)] transition-colors';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)',
  borderColor: 'var(--line)',
  color: 'var(--ink)',
};

/** Full-screen editor. `postId` null = new post. */
export default function JournalEditor({ postId, onClose }: { postId: Id<'journalPosts'> | null; onClose: () => void }) {
  const post = useQuery(api.services.journal.getForEdit, postId ? { id: postId } : 'skip');

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
      role="dialog"
      aria-modal="true"
      aria-label={postId ? 'Edit journal post' : 'New journal post'}
    >
      {postId && post === undefined ? (
        <CenteredNote onClose={onClose}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Loading post…
        </CenteredNote>
      ) : postId && post === null ? (
        <CenteredNote onClose={onClose}>This post no longer exists — it may have been deleted.</CenteredNote>
      ) : (
        // Mount the form once the post has loaded so its initial state comes from the saved post.
        <JournalForm key={post?._id ?? 'new'} post={post ?? null} onClose={onClose} />
      )}
    </div>
  );
}

function CenteredNote({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
      <div>{children}</div>
      <button
        onClick={onClose}
        className="mt-5 px-4 py-2 rounded-lg border text-sm font-semibold"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
      >
        Back to journal
      </button>
    </div>
  );
}

function JournalForm({ post, onClose }: { post: Doc<'journalPosts'> | null; onClose: () => void }) {
  const createPost = useMutation(api.services.journal.create);
  const updatePost = useMutation(api.services.journal.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);

  const initial = {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    kicker: post?.kicker ?? '',
    excerpt: post?.excerpt ?? '',
    body: post?.body ?? '',
    coverImageUrl: post?.coverImageUrl ?? '',
    authorName: post?.authorName ?? '',
    isPublished: post?.isPublished ?? false,
  };
  const [f, setF] = useState(initial);
  // Existing posts keep their slug (links may already be shared); new posts follow the title until edited.
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const set = <K extends keyof typeof f>(k: K, value: (typeof f)[K]) => setF((p) => ({ ...p, [k]: value }));

  const slug = slugTouched ? f.slug : slugifyTitle(f.title);
  const slugError =
    slugTouched && f.slug && !SLUG_RE.test(f.slug) ? 'Use lowercase letters, numbers and single hyphens only' : null;
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  const problems: string[] = [];
  if (!f.title.trim()) problems.push('title');
  if (!f.excerpt.trim()) problems.push('excerpt');
  if (f.isPublished && !f.body.trim()) problems.push('body');
  const canSubmit = problems.length === 0 && !slugError && !uploading && !submitting;

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  const pickCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Please choose an image file');
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const { storageId } = await res.json();
        const url = await getFileUrl({ storageId });
        if (!url) throw new Error('Failed to get image URL');
        set('coverImageUrl', url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cover upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      // New posts without a hand-edited slug let the server pick a unique one from the title.
      slug: slugTouched ? f.slug.trim() || undefined : undefined,
      title: f.title.trim(),
      kicker: f.kicker.trim() || undefined,
      excerpt: f.excerpt.trim(),
      body: f.body,
      coverImageUrl: f.coverImageUrl || undefined,
      authorName: f.authorName.trim() || undefined,
      isPublished: f.isPublished,
    };
    try {
      if (post) await updatePost({ id: post._id, ...payload });
      else await createPost(payload);
      onClose();
    } catch (e) {
      // Show just the validation message, not Convex's request-id prefix and stack trace.
      const msg = e instanceof Error ? e.message : '';
      setError(msg.match(/Uncaught Error:\s*([^\n]+)/)?.[1] ?? (msg || 'Failed to save post'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full pb-10">
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-sm border-b safe-area-top"
        style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}
      >
        <div className="px-3 sm:px-6 py-3 max-w-6xl mx-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={requestClose}
            className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
            aria-label="Close editor"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">Journal · {post ? 'edit post' : 'new post'}</p>
            <h2 className="display text-base sm:text-xl truncate">{f.title.trim() || 'Untitled post'}</h2>
          </div>
          <button
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold flex-shrink-0"
            style={{
              background: preview ? 'var(--indigo-wash, var(--surface-hi))' : 'var(--surface-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            {preview ? <PenLine className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{preview ? 'Edit' : 'Preview'}</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
          >
            {submitting ? 'Saving…' : post ? 'Save' : f.isPublished ? 'Publish' : 'Save draft'}
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 mb-4 rounded-lg border text-sm"
            style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--ink)' }}
          >
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red-hi)' }} />
            <span className="break-words">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-6 items-start">
          {/* Main column */}
          <div className="space-y-4 min-w-0">
            {preview ? (
              <PreviewPane f={f} />
            ) : (
              <>
                <Field label="Title *" count={[f.title.length, JOURNAL_LIMITS.title]}>
                  <input
                    value={f.title}
                    onChange={(e) => set('title', e.target.value.slice(0, JOURNAL_LIMITS.title))}
                    maxLength={JOURNAL_LIMITS.title}
                    placeholder="On the patience required to keep a show arowana"
                    className={`${inputCls} text-base font-semibold`}
                    style={inputStyle}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-3">
                  <Field
                    label="Slug (web address)"
                    hint={
                      slugError ? (
                        <span style={{ color: 'var(--red-hi)' }}>{slugError}</span>
                      ) : (
                        <span className="break-all">
                          /journal/article?slug={slug || (post ? post.slug : 'generated-from-title')}
                          {!slugTouched && ' · follows the title (made unique if taken)'}
                          {slugTouched && !f.slug && post && ' · empty keeps the current slug'}
                          {slugTouched && !f.slug && !post && ' · empty generates one from the title'}
                        </span>
                      )
                    }
                  >
                    <input
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').slice(0, JOURNAL_LIMITS.slug));
                      }}
                      maxLength={JOURNAL_LIMITS.slug}
                      placeholder="caring-for-arowana"
                      className={`${inputCls} font-mono-tabular`}
                      style={{ ...inputStyle, borderColor: slugError ? 'var(--red)' : inputStyle.borderColor }}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                  </Field>
                  <Field label="Kicker" count={[f.kicker.length, JOURNAL_LIMITS.kicker]}>
                    <input
                      value={f.kicker}
                      onChange={(e) => set('kicker', e.target.value.slice(0, JOURNAL_LIMITS.kicker))}
                      maxLength={JOURNAL_LIMITS.kicker}
                      placeholder="Husbandry"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <Field
                  label="Excerpt *"
                  count={[f.excerpt.length, JOURNAL_LIMITS.excerpt]}
                  hint="Shown on the journal list and under the article title."
                >
                  <textarea
                    value={f.excerpt}
                    onChange={(e) => set('excerpt', e.target.value.slice(0, JOURNAL_LIMITS.excerpt))}
                    maxLength={JOURNAL_LIMITS.excerpt}
                    rows={3}
                    placeholder="A one- or two-sentence summary that makes people want to read on."
                    className={`${inputCls} resize-y`}
                    style={inputStyle}
                  />
                </Field>

                <Field
                  label={f.isPublished ? 'Body *' : 'Body'}
                  count={[f.body.length, JOURNAL_LIMITS.body]}
                  hint={
                    <>
                      Leave a <b>blank line</b> between paragraphs. Start a line with <code className="font-mono-tabular">## </code>
                      for a heading. Use Preview to check how it will look.
                    </>
                  }
                >
                  <textarea
                    value={f.body}
                    onChange={(e) => set('body', e.target.value.slice(0, JOURNAL_LIMITS.body))}
                    maxLength={JOURNAL_LIMITS.body}
                    placeholder={'Write the article here.\n\n## A heading\n\nAnother paragraph…'}
                    className={`${inputCls} resize-y leading-relaxed min-h-[50vh] sm:min-h-[480px]`}
                    style={inputStyle}
                  />
                </Field>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div
              className="flex items-start justify-between gap-3 p-3 rounded-[12px] border"
              style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">Published</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  {f.isPublished ? 'Visible at /journal' : 'Draft — hidden from the website'}
                </p>
              </div>
              <Switch checked={f.isPublished} onChange={(v) => set('isPublished', v)} label="Published" />
            </div>

            <div className="p-3 rounded-[12px] border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <span className="block text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
                Cover image
              </span>
              <div
                className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border flex items-center justify-center"
                style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
              >
                {f.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8" style={{ color: 'var(--ink-4)' }} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={pickCover}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                >
                  {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading…' : f.coverImageUrl ? 'Change cover' : 'Upload cover'}
                </button>
                {f.coverImageUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => set('coverImageUrl', '')}
                    className="text-[11px] font-medium hover:opacity-80"
                    style={{ color: 'var(--red-hi)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                Optional. A wide landscape photo (16:9) looks best.
              </p>
            </div>

            <div className="p-3 rounded-[12px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <Field label="Author name">
                <input
                  value={f.authorName}
                  onChange={(e) => set('authorName', e.target.value.slice(0, JOURNAL_LIMITS.author))}
                  maxLength={JOURNAL_LIMITS.author}
                  placeholder="e.g. Mark Santos"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
            </div>

            {problems.length > 0 && (
              <p className="text-[11px] leading-relaxed px-1" style={{ color: 'var(--ink-4)' }}>
                To save, add: {problems.join(', ')}.
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={onClose}
        title="Discard changes?"
        message="You have unsaved changes to this post. Close the editor without saving?"
        type="warning"
        confirmText="Discard"
        showCancel
      />
    </div>
  );
}

/** Renders the post the way /journal/article shows it, on the storefront's cream palette. */
function PreviewPane({ f }: { f: { title: string; kicker: string; excerpt: string; body: string; coverImageUrl: string; authorName: string } }) {
  return (
    <div
      className="rounded-[14px] border overflow-hidden"
      style={{ background: 'oklch(0.972 0.008 78)', borderColor: 'var(--line)', color: 'oklch(0.19 0.012 32)' }}
    >
      <div
        className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-mono-tabular border-b"
        style={{ borderColor: 'oklch(0.86 0.012 68)', color: 'oklch(0.50 0.02 40)' }}
      >
        Preview · as shown on the website
      </div>
      <div className="px-5 sm:px-10 py-8 sm:py-10 max-w-[760px] mx-auto">
        {f.kicker.trim() && (
          <div
            style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}
          >
            {f.kicker}
          </div>
        )}
        <h1
          style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.02, letterSpacing: '-0.02em', margin: '0 0 16px', overflowWrap: 'break-word' }}
        >
          {f.title.trim() || 'Untitled post'}
        </h1>
        {f.excerpt.trim() && (
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'oklch(0.40 0.012 34)', margin: '0 0 16px' }}>{f.excerpt}</p>
        )}
        {f.authorName.trim() && (
          <div
            style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.30 0.012 32)', marginBottom: 24 }}
          >
            By {f.authorName}
          </div>
        )}
        {f.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={f.coverImageUrl}
            alt=""
            style={{ display: 'block', width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, margin: '8px 0 36px' }}
          />
        )}
        {f.body.trim() ? (
          <JournalBody body={f.body} />
        ) : (
          <p style={{ fontSize: 15, color: 'oklch(0.50 0.02 40)', fontStyle: 'italic' }}>Nothing written yet.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  count,
  hint,
  children,
}: {
  label: string;
  count?: [number, number];
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  const near = count ? count[0] > count[1] * 0.9 : false;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
        <span>{label}</span>
        {count && (
          <span className="font-mono-tabular" style={{ color: near ? 'var(--red-hi)' : 'var(--ink-4)' }}>
            {count[0].toLocaleString()} / {count[1].toLocaleString()}
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="block text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--red)' : 'var(--surface-hi)' }}
    >
      <span
        className={`absolute top-0.5 ${checked ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full transition-all`}
        style={{ background: 'oklch(0.99 0 0)', boxShadow: '0 1px 2px oklch(0 0 0 / 0.3)' }}
      />
    </button>
  );
}
