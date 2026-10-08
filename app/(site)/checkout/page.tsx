'use client';

/**
 * Checkout for shop products (food, lights, gear). Live fish are enquiry-only and never
 * reach the cart. No payment is taken online: the order is created pending/unpaid via
 * orders.placeWebOrder and staff confirm payment and pickup/delivery.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useSiteCart, siteCartSubtotal } from '@/store/siteCart';
import { useBusiness } from '@/components/dc/business';
import { useQuery } from '@/components/dc/useQuery';
import { quoteDelivery } from '@/convex/lib/serviceQuote';
import EmptyState from '@/components/dc/kit/EmptyState';
import Field from '@/components/dc/kit/Field';
import Placeholder from '@/components/dc/kit/Placeholder';
import { CartIcon, CheckIcon } from '@/components/dc/kit/icons';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type Fulfilment = 'pickup' | 'delivery';

export default function CheckoutPage() {
  const { user } = useAuthStore();
  const biz = useBusiness();
  const items = useSiteCart((s) => s.items);
  const clear = useSiteCart((s) => s.clear);
  const setOpen = useSiteCart((s) => s.setOpen);
  const placeWebOrder = useMutation(api.services.orders.placeWebOrder);
  // Delivery areas and rules come from Admin -> Home Service -> Areas & fees / Settings.
  const serviceOptions = useQuery(api.services.serviceAreas.getServiceOptions, {});

  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<{ code: string; total: number; count: number } | null>(null);

  // Any leftover live items from older versions of the cart can't be checked out.
  const cartItems = useMemo(() => items.filter((l) => !l.isLive), [items]);
  const subtotal = siteCartSubtotal(cartItems);
  const count = cartItems.reduce((n, l) => n + l.qty, 0);

  const deliveryAreas = serviceOptions?.deliveryAreas ?? [];
  const deliveryOffered = !!serviceOptions?.settings.deliveryEnabled && deliveryAreas.length > 0;
  const cheapestFee = deliveryAreas.length ? Math.min(...deliveryAreas.map((a) => a.deliveryFee)) : 0;
  const area = deliveryAreas.find((a) => a._id === areaId);
  // The same helper the server prices with, so the total on screen is the total recorded.
  const quote = useMemo(
    () => quoteDelivery({
      subtotal,
      area: area ?? null,
      settings: serviceOptions?.settings ?? { deliveryEnabled: false, homeServiceEnabled: false },
    }),
    [subtotal, area, serviceOptions?.settings],
  );
  const deliveryFee = fulfilment === 'delivery' && quote.ok ? quote.fee : 0;
  const total = subtotal + deliveryFee;

  // If delivery is switched off while someone is on the page, fall back to pickup.
  useEffect(() => {
    if (serviceOptions && !deliveryOffered && fulfilment === 'delivery') setFulfilment('pickup');
  }, [serviceOptions, deliveryOffered, fulfilment]);

  const paymentOptions = [
    { id: 'cash', label: fulfilment === 'pickup' ? 'Cash on pickup' : 'Cash on delivery', hint: 'Pay when you receive your order' },
    { id: 'gcash', label: 'GCash', hint: biz.gcashNumber ? `Send to ${biz.gcashNumber}${biz.gcashName ? ` (${biz.gcashName})` : ''} after we confirm` : 'We send GCash details when we confirm' },
    { id: 'bank_transfer', label: 'Bank transfer', hint: biz.bankDetails ? 'Details below — transfer after we confirm' : 'We send bank details when we confirm' },
  ];

  const validationError = () => {
    if (name.trim().length < 2) return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email.';
    if (phone.replace(/\D/g, '').length < 10) return 'Please enter a mobile number we can reach you on.';
    if (fulfilment === 'delivery') {
      if (!areaId) return 'Please choose your delivery area.';
      if (address.trim().length < 10) return 'Please enter your full delivery address.';
      if (!quote.ok) return quote.reason;
    }
    return '';
  };

  const submit = async () => {
    const problem = validationError();
    if (problem) return setError(problem);
    setError('');
    setSubmitting(true);
    try {
      const result = await placeWebOrder({
        items: cartItems.map((l) => ({ productId: l.productId as Id<'products'>, quantity: l.qty })),
        paymentMethod,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        address: fulfilment === 'delivery' ? address.trim() : undefined,
        fulfilment,
        ...(fulfilment === 'delivery' && areaId ? { deliveryAreaId: areaId as Id<'serviceAreas'> } : {}),
        notes: [`Fulfilment: ${fulfilment === 'pickup' ? 'pickup at the gallery' : 'delivery'}`, notes.trim()].filter(Boolean).join('\n'),
      });
      setPlaced({ code: result.orderCode, total: result.totalAmount, count });
      clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t place your order. Please try again or message us.');
    } finally {
      setSubmitting(false);
    }
  };

  const wrap = (children: React.ReactNode) => (
    <main className="dk">
      <section className="dk-section tight">
        <div className="dk-wrap">{children}</div>
      </section>
    </main>
  );

  // ── Confirmation ──
  if (placed) {
    const wa = biz.wa(`Hi ${biz.storeName} — I just placed order ${placed.code} on the website.`);
    return wrap(
      <div className="dk-empty-state" role="status">
        <span className="dk-empty-icon" aria-hidden="true"><CheckIcon size={24} /></span>
        <h1 className="dk-h2">Order received</h1>
        <p style={{ maxWidth: 560 }}>
          Thank you. We&rsquo;ll contact you shortly to confirm availability, payment and {fulfilment === 'pickup' ? 'your pickup time' : 'delivery'}. Nothing has been charged yet.
        </p>
        <div className="dk-panel muted dk-mono" style={{ padding: '12px 20px', marginTop: 24, fontSize: 20, fontWeight: 800, letterSpacing: '0.02em' }}>
          {placed.code}
        </div>
        <p className="dk-small dk-muted dk-mono" style={{ marginTop: 10 }}>
          {placed.count} item{placed.count === 1 ? '' : 's'} · {fmt(placed.total)}
        </p>
        <div className="dk-actions">
          {wa && <a href={wa} target="_blank" rel="noopener" className="dk-btn dk-btn-red">Message us about this order</a>}
          <Link href={`/track?code=${placed.code}`} className="dk-btn dk-btn-outline-dark">Track this order</Link>
          <Link href="/shop" className="dk-btn dk-btn-outline-dark">Back to the shop</Link>
          {user && <Link href="/account" className="dk-btn dk-btn-outline-dark">View in my account</Link>}
        </div>
      </div>,
    );
  }

  // ── Empty cart ──
  if (cartItems.length === 0) {
    return wrap(
      <EmptyState
        as="h1"
        icon={<CartIcon />}
        title="Your cart is empty"
        actions={
          <>
            <Link href="/shop" className="dk-btn dk-btn-red">Browse the shop</Link>
            <Link href="/catalog" className="dk-btn dk-btn-outline-dark">See our fish</Link>
          </>
        }
      >
        Add food, lights or gear from the shop. Live fish are reserved by enquiry.
      </EmptyState>,
    );
  }

  const choiceStyle: React.CSSProperties = { width: '100%', flexDirection: 'column', gap: 4, textAlign: 'left' };

  // ── Form ──
  return wrap(
    <>
      <Link href="/shop" className="dk-btn dk-btn-text" style={{ fontSize: 14 }}>&larr; Continue shopping</Link>
      <h1 className="dk-h1" style={{ marginTop: 16 }}>Checkout</h1>
      <p className="dk-lede" style={{ marginTop: 12, maxWidth: 560 }}>
        Place your order and we&rsquo;ll get in touch to confirm. No payment is taken on this website.
      </p>

      <div className="dk-split" style={{ marginTop: 40 }}>
        <div className="dk-stack lg">
          {/* Contact */}
          <section className="dk-panel" aria-labelledby="co-details">
            <h2 id="co-details" className="dk-panel-title" style={{ marginBottom: 20 }}>Your details</h2>
            <div className="dk-fgrid">
              <Field id="co-name" label="Full name">
                <input id="co-name" className="dk-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field id="co-phone" label="Mobile number">
                <input id="co-phone" className="dk-input" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field id="co-email" label="Email" full>
                <input id="co-email" className="dk-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Fulfilment */}
          <section className="dk-panel" aria-labelledby="co-fulfil">
            <h2 id="co-fulfil" className="dk-panel-title" style={{ marginBottom: 20 }}>How you&rsquo;ll receive it</h2>
            <div role="radiogroup" aria-label="Fulfilment" className="dk-grid-2" style={{ display: 'grid', gap: 12 }}>
              <button type="button" role="radio" aria-checked={fulfilment === 'pickup'} onClick={() => setFulfilment('pickup')} className="dk-choice" style={choiceStyle}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Pick up at the gallery</span>
                <span className="dk-small dk-muted">{[biz.address, biz.city].filter(Boolean).join(', ') || 'We’ll send the address when we confirm'}</span>
              </button>
              {deliveryOffered && (
                <button type="button" role="radio" aria-checked={fulfilment === 'delivery'} onClick={() => setFulfilment('delivery')} className="dk-choice" style={choiceStyle}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Delivery</span>
                  <span className="dk-small dk-muted">
                    {serviceOptions?.settings.freeDeliveryThreshold
                      ? <>From {fmt(cheapestFee)} &middot; free over {fmt(serviceOptions.settings.freeDeliveryThreshold)}</>
                      : <>From {fmt(cheapestFee)}, by area</>}
                  </span>
                </button>
              )}
            </div>
            {fulfilment === 'delivery' && (
              <div className="dk-fgrid" style={{ marginTop: 20 }}>
                <Field id="co-area" label="Delivery area" full hint={area?.note || undefined}>
                  <select
                    id="co-area"
                    className="dk-input"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    aria-describedby={area?.note ? 'co-area-msg' : undefined}
                  >
                    <option value="">Choose your area&hellip;</option>
                    {deliveryAreas.map((a) => (
                      <option key={a._id} value={a._id}>{a.name} &mdash; {a.deliveryFee > 0 ? fmt(a.deliveryFee) : 'free'}</option>
                    ))}
                  </select>
                </Field>
                <Field id="co-address" label="Delivery address" full>
                  <textarea id="co-address" className="dk-ta" rows={3} autoComplete="street-address" placeholder="House no., street, barangay, city, province" value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                {!quote.ok && areaId && <p className="dk-err full">{quote.reason}</p>}
              </div>
            )}
            {serviceOptions?.settings.deliveryNote && (
              <p className="dk-small dk-muted" style={{ marginTop: 16 }}>{serviceOptions.settings.deliveryNote}</p>
            )}
          </section>

          {/* Payment */}
          <section className="dk-panel" aria-labelledby="co-pay">
            <h2 id="co-pay" className="dk-panel-title">Preferred payment</h2>
            <p className="dk-small dk-muted" style={{ marginTop: 4, marginBottom: 20 }}>You&rsquo;ll pay after we confirm your order.</p>
            <div role="radiogroup" aria-label="Payment method" className="dk-stack" style={{ gap: 10 }}>
              {paymentOptions.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={paymentMethod === m.id} onClick={() => setPaymentMethod(m.id)} className="dk-choice" style={choiceStyle}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{m.label}</span>
                  <span className="dk-small dk-muted">{m.hint}</span>
                </button>
              ))}
            </div>
            {paymentMethod === 'bank_transfer' && biz.bankDetails && (
              <div className="dk-alert dk-mono" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{biz.bankDetails}</div>
            )}
          </section>

          <section className="dk-panel">
            <Field id="co-notes" label="Notes" optional="(optional)">
              <textarea id="co-notes" className="dk-ta" rows={3} placeholder="Preferred pickup day, tank size, anything we should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </section>
        </div>

        {/* Summary */}
        <aside className="dk-panel dk-sticky" aria-labelledby="co-order">
          <div className="dk-panel-head" style={{ marginBottom: 8 }}>
            <h2 id="co-order" className="dk-panel-title">Your order</h2>
            <button type="button" onClick={() => setOpen(true)} className="dk-btn dk-btn-text" style={{ fontSize: 14 }}>Edit cart</button>
          </div>
          <ul className="dk-list">
            {cartItems.map((l) => (
              <li key={l.productId} className="dk-list-row" style={{ gap: 12, padding: '12px 0' }}>
                <div className="dk-thumb" style={{ width: 48, height: 48 }}>
                  <Placeholder src={l.image || null} style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div className="dk-small dk-muted dk-mono">{l.qty} × {fmt(l.price)}</div>
                </div>
                <div className="dk-mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(l.price * l.qty)}</div>
              </li>
            ))}
          </ul>
          <div className="dk-summary" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--dk-line)' }}>
            <div><span>Subtotal ({count} item{count === 1 ? '' : 's'})</span><span className="dk-mono">{fmt(subtotal)}</span></div>
            {fulfilment === 'delivery' && (
              <div>
                <span>Delivery{area ? ` · ${area.name}` : ''}</span>
                <span className="dk-mono">
                  {!area ? 'Choose an area' : quote.ok ? (quote.free ? 'Free' : fmt(quote.fee)) : '—'}
                </span>
              </div>
            )}
            {fulfilment === 'delivery' && quote.ok && quote.free && (
              <div><span className="dk-status black">Free delivery on this order.</span></div>
            )}
            <div className="total">
              <span>Total</span>
              <span className="dk-mono">{fmt(total)}</span>
            </div>
          </div>

          {error && <div role="alert" className="dk-alert err" style={{ marginTop: 16 }}>{error}</div>}

          <button type="button" onClick={submit} disabled={submitting} aria-busy={submitting} className="dk-btn dk-btn-red block" style={{ marginTop: 20 }}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <p className="dk-small dk-muted" style={{ textAlign: 'center', marginTop: 12 }}>
            Nothing is charged now. We&rsquo;ll confirm stock, payment and {fulfilment === 'pickup' ? 'pickup' : 'delivery'} with you.
          </p>
        </aside>
      </div>
    </>,
  );
}
