'use client';
/* eslint-disable @next/next/no-img-element -- previews of remote Convex storage files */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ArrowLeft, ArrowRight, Camera, Loader2, Star, Trash2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { uploadOptimizedImage } from '@/lib/optimizeImage';
import { addPhotos, movePhoto, removePhoto, setCover } from '@/lib/photoOrder';

/**
 * The product photo gallery. One ordered list whose **first photo is the display picture** — the
 * cover on the product page and the photo on every tile. Drag a photo, use the arrows, or hit the
 * star to promote one; `lib/photoOrder.ts` holds the rules.
 *
 * Uploads go through `uploadOptimizedImage()` (resized to 1600px, WebP, EXIF/GPS stripped).
 */

const MAX_PHOTOS = 12;

type Props = {
  value: string[];
  onChange: (photos: string[]) => void;
  /** Surfaced to the user; the form shows it in its own confirmation dialog. */
  onError?: (message: string) => void;
};

export default function ProductPhotosField({ value, onChange, onError }: Props) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const [pending, setPending] = useState<{ id: string; preview: string }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const room = Math.max(0, MAX_PHOTOS - value.length);

  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      if (files.length > room) {
        onError?.(`You can have up to ${MAX_PHOTOS} photos — ${room === 0 ? 'remove one first' : `only ${room} more will fit`}.`);
      }
      await upload(files.slice(0, room));
    };
    input.click();
  };

  const upload = async (files: File[]) => {
    // Each file gets its own placeholder tile so progress is visible per photo.
    const jobs = files.map((file) => ({ file, id: `${file.name}-${Math.random()}`, preview: URL.createObjectURL(file) }));
    setPending((p) => [...p, ...jobs.map(({ id, preview }) => ({ id, preview }))]);

    const uploaded: string[] = [];
    for (const job of jobs) {
      try {
        const storageId = await uploadOptimizedImage(await generateUploadUrl(), job.file);
        const url = await getFileUrl({ storageId: storageId as Id<'_storage'> });
        if (!url) throw new Error('Could not get a URL for that photo.');
        uploaded.push(url);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        // HEIC gets its own instructions from optimizeImage; pass them through unchanged.
        onError?.(message.startsWith('HEIC') ? message : `Couldn't upload ${job.file.name}. ${message}`);
      } finally {
        setPending((p) => p.filter((x) => x.id !== job.id));
        URL.revokeObjectURL(job.preview);
      }
    }
    if (uploaded.length) onChange(addPhotos(value, uploaded));
  };

  const onDrop = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    const next = [...value];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-foreground mb-1">
        Photos <span className="text-xs font-normal" style={{ color: 'var(--ink-3)' }}>({value.length}/{MAX_PHOTOS})</span>
      </label>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        The first photo is the <b>display picture</b> — the one customers see on the shop tiles and at the top of the
        product page. Drag to reorder, or use the star to promote a photo. Big photos are shrunk automatically.
      </p>

      {(value.length > 0 || pending.length > 0) && (
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))' }}>
          {value.map((url, i) => {
            const isCover = i === 0;
            const isOver = overIndex === i && dragIndex !== null && dragIndex !== i;
            return (
              <div
                key={`${url}-${i}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
                onDrop={(e) => { e.preventDefault(); onDrop(i); }}
                className="relative rounded-[10px] overflow-hidden border group"
                style={{
                  aspectRatio: '1 / 1',
                  background: 'var(--bg-2)',
                  borderColor: isOver ? 'var(--red)' : isCover ? 'var(--gold)' : 'var(--line)',
                  boxShadow: isOver ? '0 0 0 2px var(--red)' : undefined,
                  opacity: dragIndex === i ? 0.4 : 1,
                  cursor: 'grab',
                }}
              >
                <img src={url} alt={isCover ? 'Display picture' : `Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />

                {isCover && (
                  <span
                    className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--gold)', color: 'oklch(0.18 0.01 60)' }}
                  >
                    Display
                  </span>
                )}

                {/* Controls sit over the photo; always visible on touch, since there's no hover. */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1" style={{ background: 'linear-gradient(to top, oklch(0 0 0 / 0.72), transparent)' }}>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onChange(movePhoto(value, i, -1))}
                      disabled={i === 0}
                      aria-label={`Move photo ${i + 1} earlier`}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'oklch(0.99 0 0)' }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(movePhoto(value, i, 1))}
                      disabled={i === value.length - 1}
                      aria-label={`Move photo ${i + 1} later`}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'oklch(0.99 0 0)' }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => onChange(setCover(value, i))}
                        aria-label={`Use photo ${i + 1} as the display picture`}
                        title="Use as display picture"
                        className="p-1 rounded"
                        style={{ color: 'var(--gold)' }}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(removePhoto(value, i))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="p-1 rounded"
                      style={{ color: 'oklch(0.82 0.16 25)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pending.map((job) => (
            <div key={job.id} className="relative rounded-[10px] overflow-hidden border" style={{ aspectRatio: '1 / 1', background: 'var(--bg-2)', borderColor: 'var(--line)' }}>
              <img src={job.preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={pick}
        disabled={room === 0 || pending.length > 0}
        className="w-full border-2 border-dashed rounded-lg py-6 flex flex-col items-center justify-center transition-colors disabled:opacity-50"
        style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
      >
        <Camera className="w-6 h-6 mb-1.5" style={{ color: room === 0 ? 'var(--ink-4)' : 'var(--red)' }} />
        <span className="text-sm font-medium">
          {pending.length > 0
            ? `Uploading ${pending.length} photo${pending.length === 1 ? '' : 's'}…`
            : room === 0
              ? `Maximum ${MAX_PHOTOS} photos`
              : value.length === 0
                ? 'Add photos'
                : `Add more (${room} left)`}
        </span>
        {value.length === 0 && pending.length === 0 && (
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>You can pick several at once</span>
        )}
      </button>
    </div>
  );
}
