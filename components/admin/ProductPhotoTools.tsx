'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ImageDown, RefreshCw, Globe } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { optimizeImage } from '@/lib/optimizeImage';

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Banner on Admin → Products when product photos are over 1 MB. "Shrink" downloads each one,
 * re-encodes it in the browser (lib/optimizeImage.ts) and swaps it in on the product.
 */
export function OversizedPhotosBanner({ onDone }: { onDone: (message: string) => void }) {
  const oversized = useQuery(api.services.productPhotos.getOversizedPhotos, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const replacePhoto = useMutation(api.services.productPhotos.replaceProductPhoto);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!oversized || (oversized.length === 0 && !progress)) return null;

  const shrinkAll = async () => {
    const queue = [...oversized];
    let shrunk = 0;
    let saved = 0;
    const failures: string[] = [];
    setError(null);
    setProgress({ done: 0, total: queue.length });
    for (const [i, item] of queue.entries()) {
      try {
        const res = await fetch(item.url);
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const blob = await res.blob();
        const file = new File([blob], 'photo', { type: blob.type || 'image/jpeg' });
        const smaller = await optimizeImage(file);
        if (smaller !== file && smaller.size < file.size) {
          const upload = await fetch(await generateUploadUrl(), { method: 'POST', headers: { 'Content-Type': smaller.type }, body: smaller });
          if (!upload.ok) throw new Error(`upload failed (${upload.status})`);
          const { storageId } = (await upload.json()) as { storageId: Id<'_storage'> };
          await replacePhoto({ productId: item.productId as Id<'products'>, oldUrl: item.url, newStorageId: storageId });
          shrunk++;
          saved += file.size - smaller.size;
        }
      } catch (e) {
        failures.push(e instanceof Error ? e.message : 'failed');
      }
      setProgress({ done: i + 1, total: queue.length });
    }
    setProgress(null);
    if (failures.length) setError(`${failures.length} photo(s) couldn't be shrunk (${failures[0]}). Try again, or re-upload them from the product form.`);
    onDone(shrunk ? `Shrunk ${shrunk} photo${shrunk === 1 ? '' : 's'}, saving ${mb(saved)}.` : 'No photos could be made smaller.');
  };

  const total = oversized.reduce((sum, p) => sum + p.size, 0);

  return (
    <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl border border-warning/30 bg-warning/10 flex flex-col sm:flex-row sm:items-center gap-3">
      <ImageDown className="w-5 h-5 text-warning flex-shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0 text-xs sm:text-sm text-white/80">
        {progress ? (
          <>Shrinking photos… {progress.done} of {progress.total}. Keep this page open.</>
        ) : (
          <>
            <span className="font-semibold text-white">
              {oversized.length} product photo{oversized.length === 1 ? ' is' : 's are'} over 1 MB
            </span>{' '}
            ({mb(total)} in total). Large photos load slowly on mobile data.
          </>
        )}
        {error && <div className="mt-1 text-error">{error}</div>}
      </div>
      <button
        onClick={shrinkAll}
        disabled={!!progress}
        className="px-3 py-2 rounded-lg bg-warning text-black text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-95 transition-all flex-shrink-0"
      >
        {progress ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
        {progress ? 'Working…' : 'Shrink them'}
      </button>
    </div>
  );
}

/**
 * Header button: rebuilds the website so new or edited products get their own link preview
 * (convex/services/siteBuild.ts). A daily job also does this automatically when products change.
 */
export function SiteRebuildButton({ onMessage }: { onMessage: (message: string, isError?: boolean) => void }) {
  const status = useQuery(api.services.siteBuild.getStatus, {});
  const requestRebuild = useMutation(api.services.siteBuild.requestRebuild);
  const [busy, setBusy] = useState(false);

  if (!status) return null;

  const title = !status.configured
    ? 'Automatic website updates are not set up yet'
    : status.last
      ? `Last update ${new Date(status.last.requestedAt).toLocaleString()} — ${status.last.status}${status.last.detail ? ` (${status.last.detail})` : ''}`
      : 'Rebuild the website so product link previews are up to date';

  const run = async () => {
    setBusy(true);
    try {
      await requestRebuild({});
      onMessage('Website update started. New product pages and link previews will be live in about 5 minutes.');
    } catch (e) {
      onMessage(e instanceof Error ? (e.message.split('Uncaught Error: ').pop() ?? e.message).split('\n')[0] : 'Could not start the update', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={busy}
      title={title}
      className="px-2 sm:px-3 py-2 rounded-lg bg-secondary border border-white/10 text-white flex items-center gap-1 sm:gap-1.5 hover:bg-white/10 active:scale-95 transition-all touch-manipulation disabled:opacity-60 relative"
    >
      {busy ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      <span className="text-xs sm:text-sm font-medium hidden md:inline">Update website</span>
      {status.configured && status.changedSinceLastBuild && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning" aria-label="Products changed since the last website update" />
      )}
    </button>
  );
}
