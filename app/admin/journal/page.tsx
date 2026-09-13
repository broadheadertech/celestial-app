'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ArrowLeft, Edit3, ExternalLink, ImageIcon, Info, Newspaper, Plus, RefreshCw, Trash2 } from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import JournalEditor, { Switch } from '@/components/admin/journal/JournalEditor';
import { formatJournalDate } from '@/components/dc/JournalBody';

type PostRow = FunctionReturnType<typeof api.services.journal.listAll>[number];

function errorText(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : '';
  return msg.match(/Uncaught Error:\s*([^\n]+)/)?.[1] ?? (msg || fallback);
}

function JournalAdminContent() {
  const router = useRouter();
  const posts = useQuery(api.services.journal.listAll);
  const setPublished = useMutation(api.services.journal.setPublished);
  const removePost = useMutation(api.services.journal.remove);

  const [editTarget, setEditTarget] = useState<Id<'journalPosts'> | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostRow | null>(null);
  const [busyId, setBusyId] = useState<Id<'journalPosts'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = posts === undefined;
  const publishedCount = posts?.filter((p) => p.isPublished).length ?? 0;

  const run = async (id: Id<'journalPosts'>, action: () => Promise<unknown>, fallback: string) => {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      setError(errorText(e, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const addButton = (
    <button
      onClick={() => setEditTarget('new')}
      className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all active:scale-95 flex-shrink-0"
      style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">New post</span>
      <span className="sm:hidden">New</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top"
        style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">
                Settings · storefront
                {posts && posts.length > 0 && ` · ${publishedCount} of ${posts.length} published`}
              </p>
              <h1 className="display text-lg sm:text-2xl truncate">Journal</h1>
            </div>
          </div>
          {addButton}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-4">
        <div
          className="flex items-start gap-2.5 p-3 rounded-[12px] border text-xs sm:text-sm leading-relaxed"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--indigo)' }} />
          <p>
            Published posts appear on the website at <span className="font-mono-tabular">/journal</span>, newest first.
            Drafts stay hidden until you publish them.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading posts…
          </div>
        ) : posts.length === 0 ? (
          <div
            className="text-center py-12 px-4 rounded-[14px] border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <Newspaper className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <h3 className="text-base sm:text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>
              No journal posts yet
            </h3>
            <p className="text-sm max-w-md mx-auto mb-4" style={{ color: 'var(--ink-3)' }}>
              Write care guides, bloodline notes and stories from the gallery. Published posts appear on the website at
              /journal; until then the page shows a &ldquo;coming soon&rdquo; message.
            </p>
            <div className="inline-flex">{addButton}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {posts.map((p) => (
              <PostCard
                key={p._id}
                post={p}
                busy={busyId === p._id}
                onEdit={() => setEditTarget(p._id)}
                onDelete={() => setDeleteTarget(p)}
                onTogglePublished={(v) =>
                  run(p._id, () => setPublished({ id: p._id, isPublished: v }), 'Failed to update post')
                }
              />
            ))}
          </div>
        )}
      </div>

      {editTarget && (
        <JournalEditor postId={editTarget === 'new' ? null : editTarget} onClose={() => setEditTarget(null)} />
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          if (target) void run(target._id, () => removePost({ id: target._id }), 'Failed to delete post');
        }}
        title="Delete post?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently deleted${
                deleteTarget.isPublished ? ' and removed from the website' : ''
              }. This can't be undone.`
            : ''
        }
        type="error"
        confirmText="Delete"
        showCancel
      />

      <ConfirmationModal
        isOpen={!!error}
        onClose={() => setError(null)}
        title="Something went wrong"
        message={error ?? ''}
        type="error"
      />

      <BottomNavbar />
    </div>
  );
}

function PostCard({
  post: p,
  busy,
  onEdit,
  onDelete,
  onTogglePublished,
}: {
  post: PostRow;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: (published: boolean) => void;
}) {
  const dateLine = p.isPublished
    ? `Published ${formatJournalDate(p.publishedAt)}`
    : p.publishedAt
      ? `Unpublished · first published ${formatJournalDate(p.publishedAt)}`
      : `Draft · updated ${formatJournalDate(p.updatedAt)}`;

  return (
    <div
      className={`rounded-[14px] border p-3 sm:p-4 transition-opacity ${busy ? 'opacity-60' : ''}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-20 h-14 sm:w-28 sm:h-[72px] rounded-lg overflow-hidden border flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
        >
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5" style={{ color: 'var(--ink-4)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {p.kicker && (
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider" style={{ color: 'var(--red-hi)' }}>
                {p.kicker}
              </span>
            )}
            <span
              className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
              style={
                p.isPublished
                  ? { background: 'var(--jade-wash)', color: 'var(--jade)' }
                  : { background: 'var(--surface-hi)', color: 'var(--ink-3)' }
              }
            >
              {p.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold mt-1 break-words" style={{ color: 'var(--ink)' }}>
            {p.title}
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            {dateLine} · {p.readingMinutes} min read
          </p>
          <p className="text-[13px] leading-relaxed mt-1.5 break-words line-clamp-2" style={{ color: 'var(--ink-2)' }}>
            {p.excerpt}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <label className="inline-flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--ink-2)' }}>
              <Switch
                checked={p.isPublished}
                onChange={(v) => !busy && onTogglePublished(v)}
                label={p.isPublished ? 'Unpublish post' : 'Publish post'}
              />
              {p.isPublished ? 'Live' : 'Publish'}
            </label>
            <span className="flex-1" />
            {p.isPublished && (
              <a
                href={`/journal/article?slug=${encodeURIComponent(p.slug)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
              >
                <ExternalLink className="w-3 h-3" />
                View
              </a>
            )}
            <button
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
              style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
              style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalAdminPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <JournalAdminContent />
    </SafeAreaProvider>
  );
}
