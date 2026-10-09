'use client';

/**
 * "Ask about this fish" — the inquiry form on a specimen page, shown next to the WhatsApp and
 * Messenger buttons for people who'd rather not hand over a chat account. It records a real lead
 * (convex/services/inquiries.ts) with the fish attached, so nothing is lost in a chat thread.
 *
 * Lives on prerendered pages, so it holds no Convex query — only a mutation on submit.
 */

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Field from '@/components/dc/kit/Field';
import { CheckIcon, CloseIcon } from '@/components/dc/kit/icons';


const PROMPTS = [
  'Is this one still available?',
  'What does it eat, and how often?',
  'Can you hold it while I cycle my tank?',
  'What size tank does it need?',
];

export default function InquiryForm({
  productId,
  productTitle,
  defaultOpen = false,
}: {
  productId: string;
  productTitle: string;
  defaultOpen?: boolean;
}) {
  const createInquiry = useMutation(api.services.inquiries.createProductInquiry);
  const [open, setOpen] = useState(defaultOpen);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!/.+@.+\..+/.test(form.email)) return setError('Please enter a valid email so we can reply.');
    if (form.message.trim().length < 5) return setError('Tell us a little more about what you want to know.');

    setStatus('sending');
    try {
      const res = await createInquiry({
        productId: productId as Id<'products'>,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim(),
      });
      setReference(res.code);
      setStatus('done');
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again, or message us instead.');
    }
  }

  if (status === 'done') {
    return (
      <div className="dk-panel" role="status">
        <div className="dk-row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <span className="dk-empty-icon" aria-hidden="true" style={{ width: 40, height: 40, margin: 0, flex: 'none' }}><CheckIcon size={18} /></span>
          <div>
            <h3 className="dk-h3">Question sent</h3>
            <p className="dk-muted" style={{ fontSize: 15, lineHeight: '24px', marginTop: 8 }}>
              Thanks, {form.name.split(' ')[0] || 'friend'} — we&rsquo;ll reply to {form.email} shortly. Your reference is{' '}
              <b className="dk-mono" style={{ color: 'var(--dk-black)' }}>{reference}</b>.
            </p>
            <Link href={`/track?code=${reference}`} className="dk-link-arrow" style={{ marginTop: 14, color: 'var(--dk-red)' }}>
              Check for a reply
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dk-panel lift"
        style={{ display: 'block', width: '100%', textAlign: 'left', borderStyle: 'dashed', borderColor: 'var(--dk-n-300)', padding: '18px 22px' }}
      >
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Rather not use chat? Ask us here &rarr;</span>
        <span className="dk-small dk-muted" style={{ display: 'block', marginTop: 4 }}>
          We&rsquo;ll reply by email, and you get a reference to follow it up.
        </span>
      </button>
    );
  }

  return (
    <div className="dk-panel">
      <div className="dk-row between" style={{ alignItems: 'center' }}>
        <p className="dk-eyebrow">Ask about this fish</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close the question form" className="dk-icon-btn" style={{ width: 32, height: 32, borderColor: 'var(--dk-n-300)', color: 'var(--dk-n-600)' }}>
          <CloseIcon size={14} />
        </button>
      </div>
      <p className="dk-small dk-muted" style={{ margin: '6px 0 20px' }}>
        About <b style={{ color: 'var(--dk-black)' }}>{productTitle}</b>. We read every one of these ourselves.
      </p>

      <div className="dk-fgrid">
        <Field id="inq-name" label="Your name">
          <input id="inq-name" className="dk-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
        </Field>
        <Field id="inq-email" label="Email">
          <input id="inq-email" className="dk-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
        </Field>
        <Field id="inq-phone" label="Phone" optional={<>(optional, if you&rsquo;d rather we called)</>} full>
          <input id="inq-phone" className="dk-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field id="inq-message" label="Your question" full>
          <textarea
            id="inq-message"
            className="dk-ta"
            rows={4}
            placeholder="Is this one still available? I have a 4ft tank and I'm looking for my first arowana."
            value={form.message}
            onChange={set('message')}
          />
          {!form.message && (
            <div className="dk-row wrap" style={{ gap: 8 }}>
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="dk-chip"
                  onClick={() => setForm((prev) => ({ ...prev, message: p }))}
                  style={{ height: 32, padding: '0 14px', fontSize: 13 }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>

      {error && <p role="alert" className="dk-alert err" style={{ marginTop: 16 }}>{error}</p>}

      <button type="button" onClick={submit} disabled={status === 'sending'} aria-busy={status === 'sending'} className="dk-btn dk-btn-red block" style={{ marginTop: 20 }}>
        {status === 'sending' ? 'Sending…' : 'Send my question'}
      </button>
      <p className="dk-small dk-muted" style={{ textAlign: 'center', marginTop: 12 }}>
        No obligation &middot; we never pass your details on
      </p>
    </div>
  );
}
