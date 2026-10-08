'use client';
/* eslint-disable @next/next/no-img-element -- product photos are remote Convex storage URLs */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { ImageFrameIcon } from './icons';

/**
 * Image area. With no `src` it is the brand placeholder: a dashed box with a frame icon and
 * "Image placeholder" (dashed #D4D4D4 on light, #333 on dark — add `onDark` or sit inside `.dk-dark`).
 * Pass `src` (a real photo staff uploaded) and it frames the photo instead, so the layout doesn't change.
 * If the photo fails to load, it falls back to the placeholder box.
 */
export default function Placeholder({
  src,
  alt = '',
  label = 'Image placeholder',
  contain = false,
  onDark = false,
  className = '',
  style,
  priority = false,
  children,
}: {
  src?: string | null;
  alt?: string;
  /** Accessible name for the empty box (the visible text stays "Image placeholder"). */
  label?: string;
  /** Show the whole photo (cut-out fish on a plain background) instead of cropping to fill. */
  contain?: boolean;
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  children?: ReactNode;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const showImg = !!src && broken !== src;
  const cls = ['dk-ph', contain && 'contain', showImg && 'has-img', onDark && 'on-dark', className].filter(Boolean).join(' ');
  if (showImg) {
    return (
      <div className={cls} style={style}>
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          draggable={false}
          onError={() => setBroken(src)}
        />
        {children}
      </div>
    );
  }
  return (
    <div className={cls} style={style} role="img" aria-label={alt || label}>
      <ImageFrameIcon />
      <span>Image placeholder</span>
      {children}
    </div>
  );
}
