'use client';
/* eslint-disable @next/next/no-img-element -- previews of freshly uploaded storage files */

import { useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { ArrowDown, ArrowUp, Film, Link2, Loader2, Play, Trash2, Upload } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { formatDuration, videoThumb, type ProductVideo } from '@/components/dc/video';
import { youtubeId } from '@/convex/lib/video';

const MAX_VIDEOS = 5;
const MAX_BYTES = 80 * 1024 * 1024; // 80 MB
const MAX_SECONDS = 180;

type Props = {
  value: ProductVideo[];
  onChange: (videos: ProductVideo[]) => void;
};

type Probe = { duration: number; poster: Blob | null; playable: boolean };

/** Reads duration and grabs a still frame (~1s in) from a local video file in the browser. */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const done = (probe: Probe) => {
      URL.revokeObjectURL(url);
      resolve(probe);
    };
    const timer = setTimeout(() => done({ duration: 0, poster: null, playable: false }), 15000);
    video.onerror = () => {
      clearTimeout(timer);
      done({ duration: 0, poster: null, playable: false });
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(1, duration / 3 || 0);
    };
    video.onseeked = () => {
      clearTimeout(timer);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      const g = canvas.getContext('2d');
      if (!g || !video.videoWidth) return done({ duration: video.duration || 0, poster: null, playable: video.videoWidth > 0 });
      g.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done({ duration: video.duration || 0, poster: blob, playable: true }), 'image/jpeg', 0.82);
    };
  });
}

/** POSTs a blob to a Convex upload URL with progress callbacks. */
function uploadWithProgress(uploadUrl: string, blob: Blob, onProgress: (pct: number) => void): Promise<Id<'_storage'>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).storageId);
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
    xhr.send(blob);
  });
}

export default function ProductVideosField({ value, onChange }: Props) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'warn'; text: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const full = value.length >= MAX_VIDEOS;

  const handleFile = async (file: File) => {
    setMessage(null);
    if (!file.type.startsWith('video/')) return setMessage({ tone: 'error', text: 'Please choose a video file.' });
    if (file.size > MAX_BYTES) {
      return setMessage({ tone: 'error', text: `That video is ${(file.size / 1048576).toFixed(0)} MB. Keep clips under 80 MB — record at 1080p, 30–60 seconds.` });
    }
    const probe = await probeVideo(file);
    if (probe.duration > MAX_SECONDS) {
      return setMessage({ tone: 'error', text: `That clip is ${formatDuration(probe.duration)} long. Keep showcase videos under 3 minutes.` });
    }
    const warning = !probe.playable
      ? 'This browser can’t play that file, so many customers won’t be able to either. On iPhone use Settings → Camera → Formats → “Most Compatible”, or export as MP4 (H.264).'
      : file.type === 'video/quicktime'
        ? 'iPhone .mov files may not play on Android or Chrome. If customers report issues, re-record with Camera → Formats → “Most Compatible”.'
        : null;

    try {
      setProgress(0);
      const videoStorageId = await uploadWithProgress(await generateUploadUrl(), file, (pct) => setProgress(Math.min(pct, 95)));
      const url = await getFileUrl({ storageId: videoStorageId });
      let posterUrl: string | undefined;
      if (probe.poster) {
        const posterId = await uploadWithProgress(await generateUploadUrl(), probe.poster, () => {});
        posterUrl = (await getFileUrl({ storageId: posterId })) ?? undefined;
      }
      if (!url) throw new Error('Upload finished but the file URL is missing');
      onChange([...value, { kind: 'file', url, posterUrl, durationSec: probe.duration ? Math.round(probe.duration) : undefined, storageId: videoStorageId }]);
      setMessage(warning ? { tone: 'warn', text: warning } : null);
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const addLink = () => {
    setMessage(null);
    const url = link.trim();
    if (!url) return;
    let kind: ProductVideo['kind'] | null = null;
    if (youtubeId(url)) kind = 'youtube';
    else if (/^https:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i.test(url)) kind = 'facebook';
    if (!kind) return setMessage({ tone: 'error', text: 'Paste a YouTube or Facebook video link.' });
    onChange([...value, { kind, url }]);
    setLink('');
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-foreground mb-1">
        Videos <span className="text-xs font-normal" style={{ color: 'var(--ink-3)' }}>({value.length}/{MAX_VIDEOS})</span>
      </label>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        A 15–60 second clip of the fish swimming sells better than any photo. Film in landscape, steady, against a plain backdrop. The first video is shown first on the website.
      </p>

      {value.length > 0 && (
        <ul className="space-y-2 mb-3">
          {value.map((video, i) => {
            const thumb = videoThumb(video);
            return (
              <li key={`${video.url}-${i}`} className="rounded-lg border p-2" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(previewIndex === i ? null : i)}
                    className="relative w-20 h-12 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'var(--bg-2)' }}
                    aria-label={previewIndex === i ? 'Hide preview' : 'Preview video'}
                  >
                    {thumb ? <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Film className="w-5 h-5" style={{ color: 'var(--ink-3)' }} />}
                    <Play className="relative w-4 h-4 drop-shadow" style={{ color: 'white' }} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {video.kind === 'file' ? 'Uploaded clip' : video.kind === 'youtube' ? 'YouTube' : 'Facebook'}
                      {video.durationSec ? <span className="ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>{formatDuration(video.durationSec)}</span> : null}
                      {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}>First</span>}
                    </div>
                    {video.kind !== 'file' && <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{video.url}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded disabled:opacity-30" aria-label="Move up" style={{ color: 'var(--ink-3)' }}><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="p-1.5 rounded disabled:opacity-30" aria-label="Move down" style={{ color: 'var(--ink-3)' }}><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="p-1.5 rounded" aria-label="Remove video" style={{ color: 'var(--red-hi)' }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {previewIndex === i && video.kind === 'file' && (
                  <video src={video.url} poster={video.posterUrl} controls playsInline className="mt-2 w-full rounded-md" style={{ maxHeight: 280, background: 'black' }} />
                )}
                {previewIndex === i && video.kind !== 'file' && (
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline" style={{ color: 'var(--red-hi)' }}>Open link in a new tab</a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {progress !== null && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--ink-3)' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading video… {progress}%
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
            <div className="h-full" style={{ width: `${progress}%`, background: 'var(--red)' }} />
          </div>
        </div>
      )}

      {!full && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={progress !== null}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--surface)' }}
          >
            <Upload className="w-4 h-4" /> Upload or record video
          </button>
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-3)' }} />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="or paste a YouTube / Facebook link"
                className="w-full pl-8 pr-2 py-2.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
            </div>
            <button type="button" onClick={addLink} className="px-3 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--red)', color: 'white' }}>
              Add
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="alert" className="mt-2 text-xs leading-relaxed" style={{ color: message.tone === 'error' ? 'var(--red-hi)' : 'var(--gold-deep)' }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
