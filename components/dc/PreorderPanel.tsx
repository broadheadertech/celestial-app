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
import Field from '@/components/dc/kit/Field';
import { CheckIcon } from '@/components/dc/kit/icons';

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
      <div className="dk-panel" role="status">
        <div className="dk-row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <span className="dk-empty-icon" aria-hidden="true" style={{ width: 40, height: 40, margin: 0, flex: 'none' }}><CheckIcon size={18} /></span>
          <div>
            <h3 className="dk-h3">You&rsquo;re on the list</h3>
            <p className="dk-muted" style={{ fontSize: 15, lineHeight: '24px', marginTop: 8 }}>
              Thank you, {form.name.split(' ')[0] || 'friend'}. Your reference is <b className="dk-mono" style={{ color: 'var(--dk-black)' }}>{placed.code}</b> — we&rsquo;ve
              emailed you the details{placed.depositDue > 0 && <> and how to send the {formatPeso(placed.depositDue)} deposit</>}.
            </p>
            <p className="dk-small dk-muted" style={{ marginTop: 10 }}>
              {placed.depositDue > 0
                ? 'Your place is held once the deposit reaches us. We’ll email you the moment the fish arrives, and hold it for 7 days from then.'
                : 'We’ll email you the moment the fish arrives, and hold it for 7 days from then.'}
            </p>
            <Link href={`/track?code=${placed.code}`} className="dk-link-arrow" style={{ marginTop: 16, color: 'var(--dk-red)' }}>
              Follow this pre-order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dk-panel flush">
      <div style={{ padding: 28, borderBottom: open ? '1px solid var(--dk-line)' : undefined }}>
        <div className="dk-row between wrap" style={{ alignItems: 'baseline' }}>
          <p className="dk-eyebrow">
            Arriving {offer.expectedLabel || 'soon'}
          </p>
          <span className="dk-status pale">
            {offer.remaining} of {offer.incomingQty} left
          </span>
        </div>
        <h3 className="dk-h3" style={{ marginTop: 10 }}>
          Pre-order this fish
        </h3>
        <p className="dk-muted" style={{ fontSize: 15, lineHeight: '24px', marginTop: 8 }}>
          {offer.note
            ? offer.note
            : `This one isn't with us yet. Reserve it now${offer.depositPerUnit > 0 ? ` with a ${formatPeso(offer.depositPerUnit)} deposit` : ''} and we'll set it aside the day it lands.`}
        </p>
        {offer.depositPerUnit > 0 && (
          <p className="dk-small dk-muted dk-mono" style={{ marginTop: 10 }}>
            Deposit {formatPeso(offer.depositPerUnit)} &middot; balance {formatPeso(Math.max(0, offer.price - offer.depositPerUnit))} on collection &middot; fully refunded if the shipment falls through
          </p>
        )}
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="dk-btn dk-btn-red block" style={{ marginTop: 20 }}>
            Pre-order {offer.depositPerUnit > 0 ? `· ${formatPeso(offer.depositPerUnit)} deposit` : 'this fish'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: 28 }}>
          <div className="dk-fgrid">
            <Field id="po-name" label="Your name">
              <input id="po-name" className="dk-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
            </Field>
            <Field id="po-phone" label="Phone">
              <input id="po-phone" className="dk-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field id="po-email" label="Email" full>
              <input id="po-email" className="dk-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
            </Field>
            {maxQty > 1 && (
              <Field id="po-qty" label="How many">
                <select id="po-qty" className="dk-input" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field id="po-notes" label="Anything we should know?" optional="(optional)" full>
              <textarea id="po-notes" className="dk-ta" rows={2} placeholder="Looking for a particular grade, or happy to wait for the next shipment too." value={form.notes} onChange={set('notes')} />
            </Field>
          </div>

          <div className="dk-panel muted" style={{ marginTop: 20, padding: '16px 18px' }}>
            <div className="dk-summary">
              <div>
                <span>{qty} × {formatPeso(offer.price)}</span>
                <span className="dk-mono">{formatPeso(total)}</span>
              </div>
              {offer.depositPerUnit > 0 && (
                <>
                  <div style={{ fontWeight: 700 }}>
                    <span style={{ color: 'var(--dk-black)' }}>Deposit now</span>
                    <span className="dk-mono">{formatPeso(deposit)}</span>
                  </div>
                  <div>
                    <span>On collection</span>
                    <span className="dk-mono">{formatPeso(Math.max(0, total - deposit))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {error && <p role="alert" className="dk-alert err" style={{ marginTop: 16 }}>{error}</p>}

          <button type="button" onClick={submit} disabled={status === 'sending'} aria-busy={status === 'sending'} className="dk-btn dk-btn-red block" style={{ marginTop: 20 }}>
            {status === 'sending' ? 'Sending…' : 'Confirm pre-order'}
          </button>
          <p className="dk-small dk-muted" style={{ textAlign: 'center', marginTop: 12 }}>
            Nothing is charged online &middot; we&rsquo;ll send payment details by email
          </p>
        </div>
      )}
    </div>
  );
}
