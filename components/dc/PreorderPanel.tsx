'use client';

/**
 * Pre-order panel on a specimen page: shown for a fish that hasn't arrived yet, with the
 * expected window, the deposit and how many of the shipment are left. The slot count and
 * deposit come from the server (`preorders.getPreorderOffer`), which re-checks both on submit,
 * so a stale page can't claim a slot that's already gone.
 */

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useQuery } from '@/components/dc/useQuery';
import { formatPeso } from '@/convex/lib/preorder';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const ink = 'oklch(0.19 0.012 32)';
const muted = 'oklch(0.44 0.012 34)';
const soft = 'oklch(0.50 0.02 40)';
const line = 'oklch(0.87 0.012 68)';
const red = 'oklch(0.52 0.216 27)';
const gold = 'oklch(0.70 0.12 80)';

export default function PreorderPanel({ productId }: { productId: string }) {
  const offer = useQuery(api.services.preorders.getPreorderOffer, { productId: productId as Id<'products'> });
  const createPreorder = useMutation(api.services.preorders.createPreorder);

  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<{ code: string; depositDue: number } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  // Nothing to show until we know there's an open pre-order, so the page stays quiet otherwise.
  if (!offer || !offer.open) return null;

  const maxQty = Math.min(5, offer.remaining);
  const deposit = offer.depositPerUnit * qty;
  const total = offer.price * qty;

  async function submit() {
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!/.+@.+\..+/.test(form.email)) return setError('Please enter a valid email — we email you when it lands.');
    if (form.phone.trim().length < 7) return setError('Please enter a phone number we can reach you on.');

    setStatus('sending');
    try {
      const res = await createPreorder({
        productId: productId as Id<'products'>,
        quantity: qty,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim() || undefined,
      });
      setPlaced({ code: res.reservationCode, depositDue: res.depositDue });
      setStatus('done');
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again, or message us.');
    }
  }

  if (status === 'done' && placed) {
    return (
      <div style={{ border: `1px solid ${gold}`, borderRadius: 12, padding: '24px 26px', background: 'oklch(0.985 0.012 86)', marginBottom: 26 }}>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 21, color: ink, marginBottom: 8 }}>You&rsquo;re on the list</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted, margin: '0 0 12px' }}>
          Thank you, {form.name.split(' ')[0] || 'friend'}. Your reference is <b style={{ fontFamily: mono, color: ink }}>{placed.code}</b> — we&rsquo;ve
          emailed you the details{placed.depositDue > 0 && <> and how to send the {formatPeso(placed.depositDue)} deposit</>}.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: soft, margin: '0 0 16px' }}>
          {placed.depositDue > 0
            ? 'Your place is held once the deposit reaches us. We’ll email you the moment the fish arrives, and hold it for 7 days from then.'
            : 'We’ll email you the moment the fish arrives, and hold it for 7 days from then.'}
        </p>
        <Link href={`/track?code=${placed.code}`} style={{ fontSize: 13, fontWeight: 600, color: red }}>
          Follow this pre-order &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${gold}`, borderRadius: 12, overflow: 'hidden', background: 'oklch(0.985 0.012 86)', marginBottom: 26 }}>
      <div style={{ padding: '18px 22px', borderBottom: open ? `1px solid ${line}` : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.48 0.12 60)' }}>
            Arriving {offer.expectedLabel || 'soon'}
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: soft }}>
            {offer.remaining} of {offer.incomingQty} left
          </div>
        </div>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, color: ink, margin: '8px 0 6px' }}>
          Pre-order this fish
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted, margin: 0 }}>
          {offer.note
            ? offer.note
            : `This one isn't with us yet. Reserve it now${offer.depositPerUnit > 0 ? ` with a ${formatPeso(offer.depositPerUnit)} deposit` : ''} and we'll set it aside the day it lands.`}
        </p>
        {offer.depositPerUnit > 0 && (
          <div style={{ fontFamily: mono, fontSize: 11.5, color: soft, marginTop: 10 }}>
            Deposit {formatPeso(offer.depositPerUnit)} &middot; balance {formatPeso(Math.max(0, offer.price - offer.depositPerUnit))} on collection &middot; fully refunded if the shipment falls through
          </div>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="dc-btn-primary"
            style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '15px 24px', borderRadius: 999, border: 'none', cursor: 'pointer', transition: '.2s' }}
          >
            Pre-order {offer.depositPerUnit > 0 ? `· ${formatPeso(offer.depositPerUnit)} deposit` : 'this fish'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: '20px 22px' }}>
          <div className="dc-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="dc-lbl" htmlFor="po-name">Your name</label>
              <input id="po-name" className="dc-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="dc-lbl" htmlFor="po-phone">Phone</label>
              <input id="po-phone" className="dc-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="dc-lbl" htmlFor="po-email">Email</label>
              <input id="po-email" className="dc-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
            </div>
            {maxQty > 1 && (
              <div>
                <label className="dc-lbl" htmlFor="po-qty">How many</label>
                <select id="po-qty" className="dc-input" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="dc-lbl" htmlFor="po-notes">
                Anything we should know? <span style={{ textTransform: 'none', letterSpacing: 0, color: soft }}>(optional)</span>
              </label>
              <textarea id="po-notes" className="dc-input" rows={2} placeholder="Looking for a particular grade, or happy to wait for the next shipment too." value={form.notes} onChange={set('notes')} style={{ resize: 'vertical', minHeight: 62 }} />
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'oklch(0.975 0.010 80)', border: `1px solid ${line}`, display: 'grid', gap: 6, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: muted }}>
              <span>{qty} × {formatPeso(offer.price)}</span>
              <span style={{ fontFamily: mono }}>{formatPeso(total)}</span>
            </div>
            {offer.depositPerUnit > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: ink }}>
                  <span>Deposit now</span>
                  <span style={{ fontFamily: mono }}>{formatPeso(deposit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: muted }}>
                  <span>On collection</span>
                  <span style={{ fontFamily: mono }}>{formatPeso(Math.max(0, total - deposit))}</span>
                </div>
              </>
            )}
          </div>

          {error && <div role="alert" style={{ marginTop: 13, fontSize: 12.5, color: 'oklch(0.50 0.20 27)', fontFamily: mono }}>{error}</div>}

          <button
            type="button"
            onClick={submit}
            disabled={status === 'sending'}
            className="dc-btn-primary"
            style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '15px 24px', borderRadius: 999, border: 'none', cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, transition: '.2s' }}
          >
            {status === 'sending' ? 'Sending…' : 'Confirm pre-order'}
          </button>
          <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', color: soft, marginTop: 10 }}>
            Nothing is charged online &middot; we&rsquo;ll send payment details by email
          </div>
        </div>
      )}
    </div>
  );
}
