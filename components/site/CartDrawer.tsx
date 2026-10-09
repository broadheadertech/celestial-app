'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteCart, siteCartSubtotal } from '@/store/siteCart';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { CartIcon, CloseIcon } from '@/components/dc/kit/icons';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Slide-over cart for shop products (gear, food, lights…). Live fish are enquiry-only and
 * never enter the cart. Styled with the Dragon's Cave kit (`.dk` root) so it doesn't follow
 * the admin light/dark theme.
 */
export default function CartDrawer() {
  const router = useRouter();
  const items = useSiteCart((s) => s.items);
  const isOpen = useSiteCart((s) => s.isOpen);
  const setOpen = useSiteCart((s) => s.setOpen);
  const remove = useSiteCart((s) => s.remove);
  const setQty = useSiteCart((s) => s.setQty);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The cart is persisted in localStorage; render only after mount to match the static HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setOpen]);

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (mounted && isOpen) closeRef.current?.focus();
  }, [mounted, isOpen]);

  if (!mounted || !isOpen) return null;

  const subtotal = siteCartSubtotal(items);
  const count = items.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="dk">
      <div className="dk-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <aside className="dk-drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="dk-drawer-head">
          <div>
            <h2 className="dk-h3">Your cart</h2>
            <div className="dk-small dk-muted" style={{ marginTop: 2 }}>
              {count} item{count === 1 ? '' : 's'}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="dk-view-btn"
            onClick={() => setOpen(false)}
            aria-label="Close cart"
            style={{ borderRadius: 999, width: 40, height: 40 }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="dk-drawer-body">
          {items.length === 0 ? (
            <EmptyState
              icon={<CartIcon />}
              title="Your cart is empty"
              actions={
                <button
                  type="button"
                  className="dk-btn dk-btn-outline-dark sm"
                  onClick={() => { setOpen(false); router.push('/shop'); }}
                >
                  Browse the shop
                </button>
              }
            >
              Add food, lights and gear from the shop. Live fish are reserved by enquiry.
            </EmptyState>
          ) : (
            <ul className="dk-list">
              {items.map((l) => (
                <li key={l.productId} className="dk-list-row" style={{ alignItems: 'flex-start' }}>
                  <div className="dk-thumb">
                    <Placeholder src={l.image || null} style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="dk-h4"
                      style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {l.name}
                    </div>
                    <div className="dk-small dk-muted dk-mono" style={{ marginTop: 2 }}>{fmt(l.price)} each</div>
                    <div className="dk-qty" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setQty(l.productId, l.qty - 1)}
                        aria-label={`Decrease quantity of ${l.name}`}
                      >
                        &minus;
                      </button>
                      <span className="dk-mono">{l.qty}</span>
                      <button
                        type="button"
                        className="plus"
                        onClick={() => setQty(l.productId, l.qty + 1)}
                        disabled={l.stock > 0 && l.qty >= l.stock}
                        aria-label={`Increase quantity of ${l.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div className="dk-mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(l.price * l.qty)}</div>
                    <button
                      type="button"
                      className="dk-btn dk-btn-text"
                      onClick={() => remove(l.productId)}
                      style={{ marginTop: 8, fontSize: 13 }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="dk-drawer-foot">
            <div className="dk-summary">
              <div className="total">
                <span>Subtotal</span>
                <span className="dk-mono">{fmt(subtotal)}</span>
              </div>
            </div>
            <button
              type="button"
              className="dk-btn dk-btn-red block"
              onClick={() => { setOpen(false); router.push('/checkout'); }}
            >
              Continue to checkout
            </button>
            <p className="dk-small dk-muted" style={{ textAlign: 'center' }}>
              No payment is taken online — we confirm your order first.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
