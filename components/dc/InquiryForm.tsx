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

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const ink = 'oklch(0.19 0.012 32)';
const muted = 'oklch(0.44 0.012 34)';
const soft = 'oklch(0.50 0.02 40)';
const line = 'oklch(0.87 0.012 68)';
const red = 'oklch(0.52 0.216 27)';

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
      <div style={{ border: `1px solid ${line}`, borderRadius: 12, padding: '22px 24px', background: 'oklch(0.99 0.005 80)', marginBottom: 26 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'oklch(0.52 0.13 150 / 0.14)', color: 'oklch(0.46 0.14 150)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✓</div>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: ink, marginBottom: 6 }}>Question sent</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted, margin: '0 0 10px' }}>
              Thanks, {form.name.split(' ')[0] || 'friend'} — we&rsquo;ll reply to {form.email} shortly. Your reference is{' '}
              <b style={{ fontFamily: mono, color: ink }}>{reference}</b>.
            </p>
            <Link href={`/track?code=${reference}`} style={{ fontSize: 13, fontWeight: 600, color: red }}>
              Check for a reply &rarr;
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
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          border: `1px dashed ${line}`,
          borderRadius: 12,
          background: 'transparent',
          padding: '15px 18px',
          marginBottom: 26,
          cursor: 'pointer',
          transition: 'border-color .18s, background .18s',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>Rather not use chat? Ask us here &rarr;</span>
        <span style={{ display: 'block', fontSize: 12.5, color: soft, marginTop: 3 }}>
          We&rsquo;ll reply by email, and you get a reference to follow it up.
        </span>
      </button>
    );
  }

  return (
    <div style={{ border: `1px solid ${line}`, borderRadius: 12, padding: '22px 24px 20px', background: 'oklch(0.99 0.005 80)', marginBottom: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)' }}>Ask about this fish</div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close the question form" style={{ border: 'none', background: 'transparent', color: soft, fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0 }}>
          &times;
        </button>
      </div>
      <p style={{ fontSize: 13, color: muted, margin: '0 0 16px', lineHeight: 1.55 }}>
        About <b style={{ color: ink }}>{productTitle}</b>. We read every one of these ourselves.
      </p>

      <div style={{ display: 'grid', gap: 14 }}>
        <div className="dc-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="dc-lbl" htmlFor="inq-name">Your name</label>
            <input id="inq-name" className="dc-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="dc-lbl" htmlFor="inq-email">Email</label>
            <input id="inq-email" className="dc-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
          </div>
        </div>
        <div>
          <label className="dc-lbl" htmlFor="inq-phone">
            Phone <span style={{ textTransform: 'none', letterSpacing: 0, color: soft }}>(optional, if you&rsquo;d rather we called)</span>
          </label>
          <input id="inq-phone" className="dc-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="dc-lbl" htmlFor="inq-message">Your question</label>
          <textarea
            id="inq-message"
            className="dc-input"
            rows={4}
            placeholder="Is this one still available? I have a 4ft tank and I'm looking for my first arowana."
            value={form.message}
            onChange={set('message')}
            style={{ resize: 'vertical', minHeight: 92 }}
          />
          {!form.message && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, message: p }))}
                  style={{ border: `1px solid ${line}`, borderRadius: 999, background: 'transparent', color: muted, fontSize: 11.5, padding: '6px 11px', cursor: 'pointer' }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div role="alert" style={{ marginTop: 13, fontSize: 12.5, color: 'oklch(0.50 0.20 27)', fontFamily: mono }}>{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={status === 'sending'}
        className="dc-btn-primary"
        style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '15px 24px', borderRadius: 999, border: 'none', cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, transition: '.2s' }}
      >
        {status === 'sending' ? 'Sending…' : 'Send my question'}
      </button>
      <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', color: soft, marginTop: 10 }}>
        No obligation &middot; we never pass your details on
      </div>
    </div>
  );
}
