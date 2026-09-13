'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

/**
 * Checkout for shop products (food, lights, gear). Live fish are enquiry-only and never
 * reach the cart. No payment is taken online: the order is created pending/unpaid via
 * orders.placeWebOrder and staff confirm payment and pickup/delivery.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useSiteCart, siteCartSubtotal } from '@/store/siteCart';
import { useBusiness } from '@/components/dc/business';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const ink = 'oklch(0.19 0.012 32)';
const muted = 'oklch(0.46 0.012 34)';
const line = 'oklch(0.86 0.012 68)';
const red = 'oklch(0.52 0.216 27)';

type Fulfilment = 'pickup' | 'delivery';

export default function CheckoutPage() {
  const { user } = useAuthStore();
  const biz = useBusiness();
  const items = useSiteCart((s) => s.items);
  const clear = useSiteCart((s) => s.clear);
  const setOpen = useSiteCart((s) => s.setOpen);
  const placeWebOrder = useMutation(api.services.orders.placeWebOrder);

  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<{ code: string; total: number; count: number } | null>(null);

  // Any leftover live items from older versions of the cart can't be checked out.
  const cartItems = useMemo(() => items.filter((l) => !l.isLive), [items]);
  const subtotal = siteCartSubtotal(cartItems);
  const count = cartItems.reduce((n, l) => n + l.qty, 0);

  const paymentOptions = [
    { id: 'cash', label: fulfilment === 'pickup' ? 'Cash on pickup' : 'Cash on delivery', hint: 'Pay when you receive your order' },
    { id: 'gcash', label: 'GCash', hint: biz.gcashNumber ? `Send to ${biz.gcashNumber}${biz.gcashName ? ` (${biz.gcashName})` : ''} after we confirm` : 'We send GCash details when we confirm' },
    { id: 'bank_transfer', label: 'Bank transfer', hint: biz.bankDetails ? 'Details below — transfer after we confirm' : 'We send bank details when we confirm' },
  ];

  const validationError = () => {
    if (name.trim().length < 2) return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email.';
    if (phone.replace(/\D/g, '').length < 10) return 'Please enter a mobile number we can reach you on.';
    if (fulfilment === 'delivery' && address.trim().length < 10) return 'Please enter your full delivery address.';
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
    <main style={{ background: 'oklch(0.972 0.008 78)', color: ink }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 28px 96px' }}>{children}</div>
    </main>
  );

  // ── Confirmation ──
  if (placed) {
    const wa = biz.wa(`Hi ${biz.storeName} — I just placed order ${placed.code} on the website.`);
    return wrap(
      <div style={{ maxWidth: 620, margin: '40px auto 0', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 999, margin: '0 auto 22px', background: 'oklch(0.52 0.13 150 / 0.14)', color: 'oklch(0.46 0.14 150)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
        <h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(30px,4vw,44px)', margin: '0 0 12px' }}>Order received</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: muted, margin: '0 0 24px' }}>
          Thank you. We&rsquo;ll contact you shortly to confirm availability, payment and {fulfilment === 'pickup' ? 'your pickup time' : 'delivery'}. Nothing has been charged yet.
        </p>
        <div style={{ display: 'inline-block', fontFamily: mono, fontSize: 18, fontWeight: 700, padding: '12px 18px', borderRadius: 8, border: `1px solid ${line}`, background: 'oklch(0.985 0.006 80)', marginBottom: 12 }}>{placed.code}</div>
        <div style={{ fontFamily: mono, fontSize: 12, color: muted, marginBottom: 30 }}>
          {placed.count} item{placed.count === 1 ? '' : 's'} · {fmt(placed.total)}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {wa && <a href={wa} target="_blank" rel="noopener" className="dc-btn-primary" style={{ background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '14px 22px', borderRadius: 999 }}>Message us about this order</a>}
          <Link href="/shop" className="dc-btn-ghost" style={{ border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '14px 22px', borderRadius: 999 }}>Back to the shop</Link>
          {user && <Link href="/account" className="dc-btn-ghost" style={{ border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '14px 22px', borderRadius: 999 }}>View in my account</Link>}
        </div>
      </div>,
    );
  }

  // ── Empty cart ──
  if (cartItems.length === 0) {
    return wrap(
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: 32, margin: '0 0 10px' }}>Your cart is empty</h1>
        <p style={{ color: muted, fontSize: 15, margin: '0 0 24px' }}>Add food, lights or gear from the shop. Live fish are reserved by enquiry.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" className="dc-btn-primary" style={{ background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '14px 22px', borderRadius: 999 }}>Browse the shop</Link>
          <Link href="/catalog" className="dc-btn-ghost" style={{ border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '14px 22px', borderRadius: 999 }}>See our fish</Link>
        </div>
      </div>,
    );
  }

  const label = (text: string, htmlFor: string, optional = false) => (
    <label htmlFor={htmlFor} className="dc-lbl">
      {text}
      {optional && <span style={{ textTransform: 'none', letterSpacing: 0, color: 'oklch(0.66 0.02 40)' }}> (optional)</span>}
    </label>
  );
  const choice = (selected: boolean): React.CSSProperties => ({
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    background: selected ? 'oklch(0.52 0.216 27 / 0.07)' : 'oklch(0.99 0.005 80)',
    border: `1px solid ${selected ? red : 'oklch(0.84 0.012 66)'}`,
    color: ink,
    fontFamily: 'inherit',
  });

  // ── Form ──
  return wrap(
    <>
      <Link href="/shop" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: 'oklch(0.54 0.02 40)' }}>&larr; Continue shopping</Link>
      <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(36px,5vw,60px)', letterSpacing: '-0.02em', margin: '14px 0 8px' }}>Checkout</h1>
      <p style={{ color: muted, fontSize: 15, margin: '0 0 36px', maxWidth: 560 }}>
        Place your order and we&rsquo;ll get in touch to confirm. No payment is taken on this website.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {/* Contact */}
          <section>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, margin: '0 0 16px' }}>Your details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>{label('Full name', 'co-name')}<input id="co-name" className="dc-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>{label('Mobile number', 'co-phone')}<input id="co-phone" className="dc-input" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}>{label('Email', 'co-email')}<input id="co-email" className="dc-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
          </section>

          {/* Fulfilment */}
          <section>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, margin: '0 0 16px' }}>How you&rsquo;ll receive it</h2>
            <div role="radiogroup" aria-label="Fulfilment" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <button type="button" role="radio" aria-checked={fulfilment === 'pickup'} onClick={() => setFulfilment('pickup')} style={choice(fulfilment === 'pickup')}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Pick up at the gallery</div>
                <div style={{ fontSize: 12.5, color: muted, marginTop: 3 }}>{[biz.address, biz.city].filter(Boolean).join(', ') || 'We’ll send the address when we confirm'}</div>
              </button>
              <button type="button" role="radio" aria-checked={fulfilment === 'delivery'} onClick={() => setFulfilment('delivery')} style={choice(fulfilment === 'delivery')}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Delivery</div>
                <div style={{ fontSize: 12.5, color: muted, marginTop: 3 }}>We&rsquo;ll quote the delivery fee when we confirm</div>
              </button>
            </div>
            {fulfilment === 'delivery' && (
              <div style={{ marginTop: 16 }}>{label('Delivery address', 'co-address')}<textarea id="co-address" className="dc-input" rows={3} autoComplete="street-address" placeholder="House no., street, barangay, city, province" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            )}
          </section>

          {/* Payment */}
          <section>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, margin: '0 0 6px' }}>Preferred payment</h2>
            <p style={{ fontSize: 13, color: muted, margin: '0 0 16px' }}>You&rsquo;ll pay after we confirm your order.</p>
            <div role="radiogroup" aria-label="Payment method" style={{ display: 'grid', gap: 10 }}>
              {paymentOptions.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={paymentMethod === m.id} onClick={() => setPaymentMethod(m.id)} style={choice(paymentMethod === m.id)}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.label}</div>
                  <div style={{ fontSize: 12.5, color: muted, marginTop: 3 }}>{m.hint}</div>
                </button>
              ))}
            </div>
            {paymentMethod === 'bank_transfer' && biz.bankDetails && (
              <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: 'oklch(0.955 0.010 74)', border: `1px solid ${line}`, fontFamily: mono, fontSize: 12.5, whiteSpace: 'pre-line' }}>{biz.bankDetails}</div>
            )}
          </section>

          <section>{label('Notes', 'co-notes', true)}<textarea id="co-notes" className="dc-input" rows={3} placeholder="Preferred pickup day, tank size, anything we should know" value={notes} onChange={(e) => setNotes(e.target.value)} /></section>
        </div>

        {/* Summary */}
        <aside style={{ position: 'sticky', top: 96, background: 'oklch(0.985 0.006 80)', border: `1px solid ${line}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, margin: 0 }}>Your order</h2>
            <button type="button" onClick={() => setOpen(true)} style={{ border: 'none', background: 'transparent', color: red, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit cart</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {cartItems.map((l) => (
              <div key={l.productId} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: 'oklch(0.93 0.012 70)' }}>
                  {l.image && <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.54 0.02 40)' }}>{l.qty} × {fmt(l.price)}</div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 13.5, fontWeight: 600 }}>{fmt(l.price * l.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${line}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: muted }}><span>Subtotal ({count} item{count === 1 ? '' : 's'})</span><span style={{ fontFamily: mono }}>{fmt(subtotal)}</span></div>
            {fulfilment === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', color: muted }}><span>Delivery</span><span>Quoted on confirmation</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 24 }}>{fmt(subtotal)}</span>
            </div>
          </div>

          {error && <div role="alert" style={{ marginTop: 14, fontSize: 13, color: 'oklch(0.50 0.20 27)' }}>{error}</div>}

          <button type="button" onClick={submit} disabled={submitting} className="dc-btn-primary" style={{ marginTop: 18, width: '100%', border: 'none', background: red, color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '16px 24px', borderRadius: 999, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <p style={{ fontSize: 11.5, color: 'oklch(0.54 0.02 40)', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
            Nothing is charged now. We&rsquo;ll confirm stock, payment and {fulfilment === 'pickup' ? 'pickup' : 'delivery'} with you.
          </p>
        </aside>
      </div>
    </>,
  );
}
