'use client';

import { useEffect, useRef, useState } from 'react';
import { shareLinks } from './links';

const mono = "'Geist Mono', monospace";

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 14px',
  fontSize: 13.5,
  fontWeight: 500,
  color: 'oklch(0.26 0.012 32)',
  background: 'transparent',
  border: 'none',
  textAlign: 'left' as const,
  cursor: 'pointer',
  borderRadius: 8,
};

/**
 * Share a product. Uses the phone's share sheet (Messenger, Facebook, Viber…) when the
 * browser has one; otherwise shows Facebook, WhatsApp and Copy link.
 */
export default function ShareButton({ url, title, text }: { url: string; title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Share sheet unavailable here (e.g. blocked in a frame) — fall back to the menu.
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setOpen(false), 900);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const links = shareLinks(url, text);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={share}
        aria-haspopup="menu"
        aria-expanded={open}
        className="dc-btn-ghost"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', background: 'transparent', color: 'oklch(0.34 0.012 34)', fontFamily: mono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 15px', borderRadius: 999, cursor: 'pointer' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 40, minWidth: 200, padding: 6, background: 'oklch(0.995 0.004 80)', border: '1px solid oklch(0.86 0.012 68)', borderRadius: 12, boxShadow: '0 24px 50px -24px oklch(0.16 0.02 40 / 0.45)' }}>
          <a role="menuitem" href={links.facebook} target="_blank" rel="noopener" onClick={() => setOpen(false)} className="dc-share-item" style={itemStyle}>Share on Facebook</a>
          <a role="menuitem" href={links.whatsapp} target="_blank" rel="noopener" onClick={() => setOpen(false)} className="dc-share-item" style={itemStyle}>Send on WhatsApp</a>
          <button role="menuitem" type="button" onClick={copy} className="dc-share-item" style={itemStyle}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
        </div>
      )}
    </div>
  );
}
