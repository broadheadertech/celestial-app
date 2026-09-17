'use client';
/* eslint-disable @next/next/no-img-element -- product images are remote Convex storage URLs */

/**
 * Track an order (ORD-…) or reservation (RES-…) with the code + the email used when
 * ordering. Live: the status updates on screen as staff progress the order.
 */

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { useBusiness } from '@/components/dc/business';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const ink = 'oklch(0.19 0.012 32)';
const muted = 'oklch(0.46 0.012 34)';
const line = 'oklch(0.86 0.012 68)';
const red = 'oklch(0.52 0.216 27)';
const green = 'oklch(0.46 0.14 150)';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type Step = { key: string; label: string };

const ORDER_STEPS = (delivery: boolean): Step[] => [
  { key: 'pending', label: 'Received' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Preparing' },
  { key: 'shipped', label: delivery ? 'Out for delivery' : 'Ready for pickup' },
  { key: 'delivered', label: delivery ? 'Delivered' : 'Collected' },
];
const RESERVATION_STEPS: Step[] = [
  { key: 'pending', label: 'Received' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'completed', label: 'Collected' },
];

const STATUS_NOTE: Record<string, string> = {
  pending: 'We have your request and will contact you to confirm.',
  confirmed: 'Confirmed — we’ll let you know when it’s ready.',
  processing: 'We’re preparing your order.',
  shipped: 'On its way to you, or ready to collect at the gallery.',
  ready_for_pickup: 'Ready for pickup at the gallery.',
  delivered: 'Completed. Thank you!',
  completed: 'Collected. Thank you!',
  cancelled: 'This was cancelled. Message us if that’s unexpected.',
  expired: 'This reservation has expired. Message us to arrange a new one.',
};

const PAYMENT_LABEL: Record<string, string> = { unpaid: 'Not yet paid', partial: 'Partly paid', paid: 'Paid', refunded: 'Refunded' };

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackInner />
    </Suspense>
  );
}

function TrackInner() {
  const params = useSearchParams();
  const biz = useBusiness();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState<{ code: string; email: string } | null>(null);
  const [formError, setFormError] = useState('');

  // Prefill from links like /track?code=ORD-ABC123 (e.g. the checkout confirmation).
  useEffect(() => {
    const c = params.get('code');
    if (c) setCode(c.toUpperCase());
  }, [params]);

  const result = useQuery(api.services.tracking.trackByCode, submitted ?? 'skip');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const em = email.trim();
    if (!/^(ORD|RES)-[A-Z0-9]+$/.test(c)) return setFormError('Enter the code from your confirmation, e.g. ORD-4F9K2Q.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setFormError('Enter the email you used when ordering.');
    setFormError('');
    setSubmitted({ code: c, email: em });
  };

  const help = biz.wa(`Hi ${biz.storeName} — I need help finding my order${code ? ` (${code.trim().toUpperCase()})` : ''}.`);

  return (
    <main style={{ background: 'oklch(0.972 0.008 78)', color: ink }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 28px 96px' }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>Order status</div>
        <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(36px,5vw,58px)', letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 12px' }}>Track your order</h1>
        <p style={{ color: muted, fontSize: 15.5, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 520 }}>
          Enter the code from your confirmation and the email you used. No account needed.
        </p>

        <form onSubmit={submit} style={{ background: 'oklch(0.99 0.005 80)', border: `1px solid ${line}`, borderRadius: 14, padding: 22, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end' }}>
          <div>
            <label htmlFor="tr-code" className="dc-lbl">Order or reservation code</label>
            <input id="tr-code" className="dc-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ORD-XXXXXX" autoComplete="off" spellCheck={false} style={{ fontFamily: mono, letterSpacing: '0.04em' }} />
          </div>
          <div>
            <label htmlFor="tr-email" className="dc-lbl">Email</label>
            <input id="tr-email" className="dc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
          </div>
          <button type="submit" className="dc-btn-primary" style={{ border: 'none', background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '13px 22px', borderRadius: 999, cursor: 'pointer', height: 46 }}>
            Find order
          </button>
          {formError && <div role="alert" style={{ gridColumn: '1 / -1', fontSize: 13, color: 'oklch(0.50 0.20 27)' }}>{formError}</div>}
        </form>

        <div aria-live="polite" style={{ marginTop: 28 }}>
          {submitted && result === undefined && <p style={{ color: muted, fontSize: 14 }}>Looking it up…</p>}

          {submitted && result === null && (
            <div style={{ border: `1px solid ${line}`, borderRadius: 14, padding: 22, background: 'oklch(0.985 0.006 80)' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>We couldn&rsquo;t find that order</div>
              <p style={{ color: muted, fontSize: 14, lineHeight: 1.55, margin: 0 }}>
                Check the code and use the same email you ordered with.{' '}
                {help ? <a href={help} target="_blank" rel="noopener" style={{ color: red, fontWeight: 600 }}>Message us</a> : <Link href="/contact" style={{ color: red, fontWeight: 600 }}>Contact us</Link>} if you still can&rsquo;t find it.
              </p>
            </div>
          )}

          {result && <TrackResult result={result} />}
        </div>
      </div>
    </main>
  );
}

type TrackResultData = NonNullable<ReturnType<typeof useQuery<typeof api.services.tracking.trackByCode>>>;

function TrackResult({ result }: { result: TrackResultData }) {
  const steps = result.kind === 'order' ? ORDER_STEPS(result.fulfilment === 'delivery') : RESERVATION_STEPS;
  const ended = result.status === 'cancelled' || result.status === 'expired';
  const currentIndex = steps.findIndex((s) => s.key === result.status);
  const balance = Math.max(0, result.total - result.amountPaid);

  return (
    <section style={{ border: `1px solid ${line}`, borderRadius: 14, overflow: 'hidden', background: 'oklch(0.99 0.005 80)' }}>
      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${line}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700 }}>{result.code}</div>
          <div style={{ fontSize: 12.5, color: muted, marginTop: 3 }}>
            {result.kind === 'order' ? 'Shop order' : 'Reservation'} · placed {new Date(result.createdAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </div>
        </div>
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 999, background: ended ? 'oklch(0.52 0.216 27 / 0.1)' : 'oklch(0.52 0.13 150 / 0.12)', color: ended ? 'oklch(0.48 0.20 27)' : green }}>
          {ended ? result.status : steps[currentIndex]?.label ?? result.status}
        </span>
      </div>

      <div style={{ padding: '22px 22px 8px' }}>
        {!ended && (
          <ol aria-label="Progress" style={{ listStyle: 'none', margin: '0 0 18px', padding: 0, display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 6 }}>
            {steps.map((s, i) => {
              const done = i <= currentIndex;
              return (
                <li key={s.key} aria-current={i === currentIndex ? 'step' : undefined}>
                  <div style={{ height: 4, borderRadius: 99, background: done ? green : 'oklch(0.88 0.012 70)' }} />
                  <div style={{ fontSize: 11.5, marginTop: 7, color: done ? ink : 'oklch(0.50 0.02 40)', fontWeight: i === currentIndex ? 600 : 400, lineHeight: 1.25 }}>{s.label}</div>
                </li>
              );
            })}
          </ol>
        )}
        <p style={{ fontSize: 14.5, color: 'oklch(0.34 0.012 34)', margin: '0 0 18px' }}>{STATUS_NOTE[result.status] ?? ''}</p>
        {result.pickup && (
          <p style={{ fontSize: 13.5, color: muted, margin: '-8px 0 18px' }}>Pickup: {result.pickup.date} at {result.pickup.time}</p>
        )}
      </div>

      <div style={{ padding: '0 22px 8px' }}>
        {result.items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: `1px solid oklch(0.91 0.012 70)` }}>
            <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: 'oklch(0.93 0.012 70)' }}>
              {item.image && <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.50 0.02 40)' }}>Qty {item.quantity}</div>
            </div>
            {item.price > 0 && <div style={{ fontFamily: mono, fontSize: 13.5 }}>{fmt(item.price * item.quantity)}</div>}
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 22px 20px', borderTop: `1px solid ${line}`, background: 'oklch(0.965 0.009 76)', display: 'grid', gap: 6, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: muted }}>Total</span><span style={{ fontFamily: mono, fontWeight: 700 }}>{fmt(result.total)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: muted }}>Payment</span><span>{PAYMENT_LABEL[result.paymentStatus] ?? result.paymentStatus}</span></div>
        {result.amountPaid > 0 && balance > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: muted }}>Balance due</span><span style={{ fontFamily: mono }}>{fmt(balance)}</span></div>
        )}
      </div>
    </section>
  );
}
