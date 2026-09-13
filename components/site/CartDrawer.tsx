'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteCart, siteCartSubtotal } from '@/store/siteCart';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

/**
 * Slide-over cart for shop products (gear, food, lights…). Live fish are enquiry-only and
 * never enter the cart. Styled with the storefront's own palette so it doesn't follow the
 * admin light/dark theme.
 */
export default function CartDrawer() {
  const router = useRouter();
  const items = useSiteCart((s) => s.items);
  const isOpen = useSiteCart((s) => s.isOpen);
  const setOpen = useSiteCart((s) => s.setOpen);
  const remove = useSiteCart((s) => s.remove);
  const setQty = useSiteCart((s) => s.setQty);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const subtotal = siteCartSubtotal(items);
  const count = items.reduce((n, l) => n + l.qty, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, fontFamily: "'Geist', system-ui, sans-serif" }} role="dialog" aria-modal="true" aria-label="Your cart">
      <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'oklch(0.19 0.012 32 / 0.45)', backdropFilter: 'blur(6px)' }} />
      <aside style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(440px, 100vw)', display: 'flex', flexDirection: 'column', background: 'oklch(0.972 0.008 78)', borderLeft: '1px solid oklch(0.84 0.012 66)', color: 'oklch(0.19 0.012 32)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22 }}>Your cart</div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 3 }}>
              {count} item{count === 1 ? '' : 's'}
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close cart" style={{ width: 38, height: 38, borderRadius: 999, border: '1px solid oklch(0.84 0.012 66)', background: 'oklch(0.985 0.006 80)', fontSize: 18, cursor: 'pointer', color: 'oklch(0.30 0.012 34)' }}>
            &times;
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ fontFamily: serif, fontSize: 19, marginBottom: 8 }}>Your cart is empty</div>
              <p style={{ fontSize: 13.5, color: 'oklch(0.48 0.012 34)', margin: '0 auto 20px', maxWidth: 280, lineHeight: 1.5 }}>
                Add food, lights and gear from the shop. Live fish are reserved by enquiry.
              </p>
              <button type="button" onClick={() => { setOpen(false); router.push('/shop'); }} style={{ border: '1px solid oklch(0.78 0.02 40)', background: 'transparent', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 999, cursor: 'pointer' }}>
                Browse the shop &rarr;
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((l) => (
                <div key={l.productId} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid oklch(0.90 0.012 70)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'oklch(0.93 0.012 70)' }}>
                    {l.image && <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.54 0.02 40)', marginTop: 2 }}>{fmt(l.price)} each</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid oklch(0.82 0.02 50)', borderRadius: 999, marginTop: 8 }}>
                      <button type="button" onClick={() => setQty(l.productId, l.qty - 1)} aria-label={`Decrease quantity of ${l.name}`} style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15 }}>&minus;</button>
                      <span style={{ minWidth: 26, textAlign: 'center', fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>{l.qty}</span>
                      <button type="button" onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.stock > 0 && l.qty >= l.stock} aria-label={`Increase quantity of ${l.name}`} style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15 }}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: mono, fontSize: 13.5, fontWeight: 700 }}>{fmt(l.price * l.qty)}</div>
                    <button type="button" onClick={() => remove(l.productId)} style={{ marginTop: 6, border: 'none', background: 'transparent', fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: 22, borderTop: '1px solid oklch(0.86 0.012 68)', background: 'oklch(0.955 0.010 74)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'oklch(0.42 0.012 34)' }}>Subtotal</span>
              <span style={{ fontFamily: mono, fontWeight: 700 }}>{fmt(subtotal)}</span>
            </div>
            <button type="button" onClick={() => { setOpen(false); router.push('/checkout'); }} className="dc-btn-primary" style={{ marginTop: 16, width: '100%', border: 'none', background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '15px 24px', borderRadius: 999, cursor: 'pointer' }}>
              Continue to checkout &rarr;
            </button>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11.5, color: 'oklch(0.54 0.02 40)' }}>
              No payment is taken online — we confirm your order first.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
