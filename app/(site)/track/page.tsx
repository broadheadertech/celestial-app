'use client';

/**
 * Track an order (ORD-…), reservation (RES-…), home service booking (HSV-…) or enquiry (INQ-…)
 * with the code + the email used at the time. Live: the status updates on screen as staff
 * progress it, so a reply to an enquiry appears here as soon as it's sent.
 */

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { useBusiness } from '@/components/dc/business';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Field from '@/components/dc/kit/Field';
import Placeholder from '@/components/dc/kit/Placeholder';

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
const BOOKING_STEPS: Step[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'On the way' },
  { key: 'completed', label: 'Done' },
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
  requested: 'We have your request and will call to confirm the schedule.',
  in_progress: 'Our team is on the way, or already working on your tank.',
  new: 'We have your question and will reply by email shortly.',
  replied: 'We’ve replied — check your email, or read it below.',
  negotiating: 'We’re in the middle of sorting this out with you.',
  won: 'All agreed. Thank you!',
  lost: 'Closed off. Message us any time if you’d like to pick it back up.',
  closed: 'Closed. Message us any time if there’s more we can help with.',
};

const DELIVERY_NOTE: Record<string, string> = {
  unscheduled: 'We’ll confirm a delivery date with you shortly.',
  scheduled: 'Booked in for delivery.',
  dispatched: 'Out for delivery today.',
  delivered: 'Delivered. Thank you!',
  failed: 'We couldn’t complete the delivery — we’ll be in touch to rearrange.',
};

const PAYMENT_LABEL: Record<string, string> = { unpaid: 'Not yet paid', partial: 'Partly paid', paid: 'Paid', refunded: 'Refunded' };

/** Status pill tone: red when it ended badly, black once it's done, pale while it's in progress. */
const tone = (ended: boolean, done: boolean) => (ended ? 'red' : done ? 'black' : 'pale');

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
    if (!/^(ORD|RES|HSV|INQ)-[A-Z0-9]+$/.test(c)) return setFormError('Enter the code we sent you, e.g. ORD-4F9K2Q, HSV-7T2M8P or INQ-3B8L5D.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setFormError('Enter the email you used when ordering.');
    setFormError('');
    setSubmitted({ code: c, email: em });
  };

  const help = biz.wa(`Hi ${biz.storeName} — I need help finding my order${code ? ` (${code.trim().toUpperCase()})` : ''}.`);

  return (
    <main className="dk dk-page" style={{ background: 'var(--dk-white)' }}>
      <NotchHero
        tone="dark"
        behind="var(--dk-white)"
        notchWide
        notchHeight={232}
        notchLabel="Track your order"
        notch={
          <form onSubmit={submit} noValidate className="dk-fgrid" style={{ alignItems: 'end' }}>
            <Field id="tr-code" label="Order, booking or enquiry code">
              <input id="tr-code" className="dk-input dk-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ORD-XXXXXX" autoComplete="off" spellCheck={false} aria-invalid={formError ? true : undefined} style={{ letterSpacing: '0.04em' }} />
            </Field>
            <Field id="tr-email" label="Email">
              <input id="tr-email" className="dk-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" aria-invalid={formError ? true : undefined} />
            </Field>
            {formError && <p role="alert" className="dk-err full">{formError}</p>}
            <div className="full">
              <button type="submit" className="dk-btn dk-btn-red">
                Find order
              </button>
            </div>
          </form>
        }
      >
        <p className="dk-eyebrow">Order status</p>
        <h1 className="dk-h1">Track your order</h1>
        <p className="dk-lede">
          Enter the code from your confirmation and the email you used. No account needed.
        </p>
      </NotchHero>

      <section className="dk-section tight" aria-live="polite">
        <div className="dk-wrap narrow">
          {submitted && result === undefined && <p className="dk-empty" style={{ padding: '24px 0' }}>Looking it up…</p>}

          {submitted && result === null && (
            <EmptyState title={<>We couldn&rsquo;t find that order</>}>
              Check the code and use the same email you ordered with.{' '}
              {help ? <a href={help} target="_blank" rel="noopener" className="dk-link">Message us</a> : <Link href="/contact" className="dk-link">Contact us</Link>} if you still can&rsquo;t find it.
            </EmptyState>
          )}

          {result && (
            result.kind === 'homeService' ? <BookingResult result={result} />
              : result.kind === 'inquiry' ? <InquiryResult result={result} />
                : <TrackResult result={result} />
          )}
        </div>
      </section>
    </main>
  );
}

type TrackResultData = NonNullable<ReturnType<typeof useQuery<typeof api.services.tracking.trackByCode>>>;
type BookingData = Extract<TrackResultData, { kind: 'homeService' }>;
type InquiryData = Extract<TrackResultData, { kind: 'inquiry' }>;
type OrderOrReservation = Exclude<TrackResultData, { kind: 'homeService' | 'inquiry' }>;

const pad = { padding: '22px 28px' };
const foot = { padding: '18px 28px 22px', borderTop: '1px solid var(--dk-line)', background: 'var(--dk-n-100)' };

/** Card header: the code, what it is, and the status pill. */
function ResultHead({ code, sub, status, statusTone }: { code: string; sub: React.ReactNode; status: string; statusTone: string }) {
  return (
    <div className="dk-row between wrap" style={{ ...pad, alignItems: 'flex-start', borderBottom: '1px solid var(--dk-line)' }}>
      <div style={{ minWidth: 0 }}>
        <p className="dk-panel-title dk-mono">{code}</p>
        <p className="dk-small dk-muted" style={{ marginTop: 4 }}>{sub}</p>
      </div>
      <span className={`dk-status ${statusTone}`}>{status}</span>
    </div>
  );
}

/** Progress bar of steps: red up to the current step, grey after it. */
function Progress({ steps, currentIndex }: { steps: Step[]; currentIndex: number }) {
  return (
    <ol aria-label="Progress" style={{ margin: '0 0 18px', display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 6 }}>
      {steps.map((s, i) => {
        const done = i <= currentIndex;
        return (
          <li key={s.key} aria-current={i === currentIndex ? 'step' : undefined}>
            <div style={{ height: 4, borderRadius: 'var(--dk-r-pill)', background: done ? 'var(--dk-red)' : 'var(--dk-n-200)' }} />
            <div style={{ fontSize: 12, marginTop: 8, color: done ? 'var(--dk-black)' : 'var(--dk-n-500)', fontWeight: i === currentIndex ? 700 : 400, lineHeight: 1.25 }}>{s.label}</div>
          </li>
        );
      })}
    </ol>
  );
}

function TrackResult({ result }: { result: OrderOrReservation }) {
  const steps = result.kind === 'order' ? ORDER_STEPS(result.fulfilment === 'delivery') : RESERVATION_STEPS;
  const ended = result.status === 'cancelled' || result.status === 'expired';
  const currentIndex = steps.findIndex((s) => s.key === result.status);
  const balance = Math.max(0, result.total - result.amountPaid);

  return (
    <section className="dk-panel flush">
      <ResultHead
        code={result.code}
        sub={<>{result.kind === 'order' ? 'Shop order' : 'Reservation'} · placed {new Date(result.createdAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</>}
        status={ended ? result.status : steps[currentIndex]?.label ?? result.status}
        statusTone={tone(ended, currentIndex === steps.length - 1)}
      />

      <div style={{ ...pad, paddingBottom: 8 }}>
        {!ended && <Progress steps={steps} currentIndex={currentIndex} />}
        <p style={{ fontSize: 15, color: 'var(--dk-n-800)', margin: '0 0 18px' }}>{STATUS_NOTE[result.status] ?? ''}</p>
        {result.pickup && (
          <p className="dk-muted" style={{ fontSize: 14, margin: '-8px 0 18px' }}>Pickup: {result.pickup.date} at {result.pickup.time}</p>
        )}
        {result.kind === 'order' && result.deliveryStatus && (
          <p className="dk-muted" style={{ fontSize: 14, margin: '-8px 0 18px' }}>
            {DELIVERY_NOTE[result.deliveryStatus] ?? ''}
            {result.deliveryDate && <> Scheduled for {new Date(`${result.deliveryDate}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'full' })}.</>}
            {result.deliveryArea && <> Delivering to {result.deliveryArea}.</>}
          </p>
        )}
      </div>

      <ul className="dk-list" style={{ padding: '0 28px 8px' }}>
        {result.items.map((item, i) => (
          <li key={i} className="dk-list-row" style={{ padding: '12px 0', borderTop: i === 0 ? '1px solid var(--dk-line)' : undefined }}>
            <div className="dk-thumb" style={{ width: 48, height: 48 }}>
              <Placeholder src={item.image} alt="" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
              <div className="dk-small dk-muted dk-mono">Qty {item.quantity}</div>
            </div>
            {item.price > 0 && <div className="dk-mono" style={{ fontSize: 15 }}>{fmt(item.price * item.quantity)}</div>}
          </li>
        ))}
      </ul>

      <div className="dk-summary" style={foot}>
        {result.kind === 'order' && !!result.deliveryFee && (
          <div><span>Delivery{result.deliveryArea ? ` · ${result.deliveryArea}` : ''}</span><span className="dk-mono">{fmt(result.deliveryFee)}</span></div>
        )}
        <div><span>Total</span><span className="dk-mono" style={{ fontWeight: 700 }}>{fmt(result.total)}</span></div>
        <div><span>Payment</span><span>{PAYMENT_LABEL[result.paymentStatus] ?? result.paymentStatus}</span></div>
        {result.amountPaid > 0 && balance > 0 && (
          <div><span>Balance due</span><span className="dk-mono">{fmt(balance)}</span></div>
        )}
      </div>
    </section>
  );
}

/** A home service visit (HSV-…): the schedule, the agreed price and where we're going. */
function BookingResult({ result }: { result: BookingData }) {
  const ended = result.status === 'cancelled';
  const currentIndex = BOOKING_STEPS.findIndex((s) => s.key === result.status);

  return (
    <section className="dk-panel flush">
      <ResultHead
        code={result.code}
        sub={<>Home service · booked {new Date(result.createdAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</>}
        status={ended ? 'cancelled' : BOOKING_STEPS[currentIndex]?.label ?? result.status}
        statusTone={tone(ended, currentIndex === BOOKING_STEPS.length - 1)}
      />

      <div style={{ ...pad, paddingBottom: 8 }}>
        {!ended && <Progress steps={BOOKING_STEPS} currentIndex={currentIndex} />}
        <p style={{ fontSize: 15, color: 'var(--dk-n-800)', margin: '0 0 18px' }}>{STATUS_NOTE[result.status] ?? ''}</p>
      </div>

      <div style={{ padding: '0 28px 8px', fontSize: 15 }}>
        <Row label="Service" value={result.serviceName} />
        <Row label="When" value={`${result.dateLabel} at ${result.timeLabel}`} />
        <Row label="Where" value={result.address} />
        <Row label="Area" value={result.areaName} />
      </div>

      <div className="dk-summary" style={{ ...foot, marginTop: 14 }}>
        {result.servicePrice !== undefined && (
          <div><span>Service</span><span className="dk-mono">{fmt(result.servicePrice)}</span></div>
        )}
        {result.travelFee > 0 && (
          <div><span>Travel</span><span className="dk-mono">{fmt(result.travelFee)}</span></div>
        )}
        {result.total === undefined ? (
          <p className="dk-muted" style={{ fontSize: 14 }}>We&rsquo;ll give you a firm price once we&rsquo;ve seen the tank. Nothing is charged yet.</p>
        ) : (
          <div>
            <span>{result.quoted ? 'Agreed price' : 'Estimated total'}</span>
            <span className="dk-mono" style={{ fontWeight: 700 }}>{fmt(result.total)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 12, padding: '10px 0', borderTop: '1px solid var(--dk-line)' }}>
      <span className="dk-meta-label" style={{ paddingTop: 2 }}>{label}</span>
      <span style={{ lineHeight: 1.5, minWidth: 0, overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

/** An enquiry (INQ-…): the question asked, and any reply we emailed back. */
function InquiryResult({ result }: { result: InquiryData }) {
  const ended = result.status === 'lost' || result.status === 'closed';
  const when = (t: number) => new Date(t).toLocaleDateString('en-PH', { dateStyle: 'medium' });

  return (
    <section className="dk-panel flush">
      <ResultHead
        code={result.code}
        sub={<>{result.productName ? `Enquiry · ${result.productName}` : 'Enquiry'} {'·'} sent {when(result.createdAt)}</>}
        status={result.replies.length > 0 ? 'replied' : result.status}
        statusTone={tone(ended, result.replies.length > 0 || result.status === 'won')}
      />

      <div style={{ ...pad, paddingBottom: 10 }}>
        <p style={{ fontSize: 15, color: 'var(--dk-n-800)', margin: '0 0 20px' }}>{STATUS_NOTE[result.status] ?? ''}</p>

        <p className="dk-meta-label" style={{ marginBottom: 8 }}>You asked</p>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', whiteSpace: 'pre-line' }}>{result.message}</p>

        {result.replies.length > 0 && (
          <>
            <p className="dk-meta-label" style={{ marginBottom: 8 }}>Our reply</p>
            <div className="dk-stack" style={{ gap: 10, marginBottom: 10 }}>
              {result.replies.map((reply, i) => (
                <div key={i} className="dk-panel muted" style={{ padding: '14px 16px' }}>
                  <div className="dk-small dk-muted dk-mono" style={{ marginBottom: 6 }}>{when(reply.sentAt)}</div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{reply.body}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="dk-small dk-muted" style={foot}>
        {result.replies.length > 0
          ? 'Reply to our email to carry on the conversation.'
          : 'We reply by email, usually within the day. Check your spam folder if you don’t see it.'}
      </p>
    </section>
  );
}
