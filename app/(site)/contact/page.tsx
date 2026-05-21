'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';

const FAQ = [
  {
    q: 'Do you ship arowanas?',
    a: 'No. Live specimens are pickup-only at our Quezon City gallery. Gear and food ship anywhere in the Philippines via Lalamove or LBC.',
  },
  {
    q: 'How does the deposit work?',
    a: '20% of the specimen price holds the fish in your name. We refund the deposit if you withdraw before quarantine ends; the balance settles when you collect the fish.',
  },
  {
    q: 'How long is quarantine?',
    a: 'Twenty-one days minimum from import. Some specimens stay longer if we are not satisfied with their condition. We will tell you the day they\'re ready.',
  },
  {
    q: 'Do you offer financing?',
    a: 'For specimens above ₱300,000 we offer split payments across three monthly installments after the deposit. Talk to us — every collector has a different budget cycle.',
  },
  {
    q: 'Can I sell a fish back to you?',
    a: 'For specimens we placed and which have been kept according to our care guide, yes. We will quote you a fair buy-back. We do not buy fish we did not source.',
  },
];

export default function ContactPage() {
  const { user } = useAuthStore();
  const createContactMessage = useMutation(api.services.contact.createContactMessage);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createContactMessage({
        name,
        email,
        phone: phone || undefined,
        subject,
        message,
        userId: user?._id as Id<'users'> | undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>Contact</div>
          <h1 className="display-xl mb-5" style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}>
            Write to <em className="italic-flourish">us.</em>
          </h1>
          <p
            className="max-w-[620px]"
            style={{
              fontSize: 18,
              color: 'var(--ink-2)',
              fontVariationSettings: '"opsz" 22, "wght" 500',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: '-0.015em',
              lineHeight: 1.45,
            }}
          >
            One inbox, one phone, one address. We read every letter, and we answer within
            twenty-four hours.
          </p>
        </div>
      </section>

      <section className="py-10" style={{ padding: '0 0 80px' }}>
        <div
          className="site-container grid gap-10"
          style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}
        >
          {/* Form */}
          <div
            className="p-7 rounded"
            style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
          >
            {submitted ? (
              <div className="text-center py-10">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                  style={{
                    background: 'var(--jade-wash)',
                    color: 'var(--jade)',
                    border: '1px solid var(--jade)',
                  }}
                >
                  ✓
                </div>
                <h2
                  className="display mb-3"
                  style={{ fontSize: 28, fontVariationSettings: '"opsz" 32, "wght" 700' }}
                >
                  Letter received.
                </h2>
                <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 440, margin: '0 auto' }}>
                  We&apos;ll reply to <strong style={{ color: 'var(--ink)' }}>{email}</strong> within a day.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="placard mb-1.5">Name</div>
                    <input
                      required
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="placard mb-1.5">Phone</div>
                    <input
                      className="input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <div className="placard mb-1.5">Email</div>
                  <input
                    required
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="placard mb-1.5">Subject</div>
                  <input
                    required
                    className="input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="I'd like to ask about…"
                  />
                </div>
                <div>
                  <div className="placard mb-1.5">Message</div>
                  <textarea
                    required
                    rows={6}
                    className="input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you're after, what you've kept before, and how soon you'd like to visit."
                  />
                </div>
                {error && (
                  <div
                    className="text-[12px] px-3 py-2 rounded"
                    style={{
                      background: 'var(--red-wash)',
                      border: '1px solid var(--red)',
                      color: 'var(--red-hi)',
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="b b-primary b-lg self-start mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending…' : 'Send letter'}
                  {!isSubmitting && <ArrowRight size={14} />}
                </button>
              </form>
            )}
          </div>

          {/* Direct lines */}
          <aside
            className="rounded sticky top-[100px]"
            style={{
              background: 'linear-gradient(135deg, var(--oxblood), oklch(0 0 0) 80%)',
              border: '1px solid var(--line)',
              color: 'oklch(0.99 0 0)',
              height: 'fit-content',
            }}
          >
            <div className="p-7">
              <div className="placard mb-3" style={{ color: 'oklch(0.99 0 0 / 0.55)' }}>
                Direct lines
              </div>
              <h3
                className="display mb-7"
                style={{ fontSize: 26, fontVariationSettings: '"opsz" 32, "wght" 700' }}
              >
                Skip the form.
              </h3>

              <div className="flex flex-col gap-5">
                {[
                  { icon: Phone, label: 'Phone', value: '(02) 8851 4928' },
                  { icon: MessageCircle, label: 'Mobile / Viber', value: '+63 917 234 5678' },
                  { icon: Mail, label: 'Email', value: 'mark@dragonscave.ph' },
                  { icon: MapPin, label: 'Studio', value: '34 Tomas Morato Ave\nQuezon City 1103' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                      style={{
                        background: 'oklch(1 0 0 / 0.08)',
                        color: 'oklch(0.99 0 0 / 0.7)',
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <div className="placard" style={{ color: 'oklch(0.99 0 0 / 0.5)' }}>
                        {label}
                      </div>
                      <div
                        className="font-mono-tabular text-[13px] mt-1 whitespace-pre-line"
                        style={{ color: 'oklch(0.99 0 0 / 0.92)' }}
                      >
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-15" style={{ padding: '80px 0', background: 'var(--bg-2)' }}>
        <div className="site-container max-w-[760px]">
          <div className="placard mb-3">Frequently asked</div>
          <h2 className="display-xl mb-10" style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            The usual questions.
          </h2>
          <div className="flex flex-col">
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                style={{
                  borderBottom: i === FAQ.length - 1 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center py-5 text-left"
                >
                  <span
                    className="text-[16px] font-semibold"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontVariationSettings: '"opsz" 22, "wght" 600',
                      color: 'var(--ink)',
                    }}
                  >
                    {f.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className="transition-transform flex-shrink-0"
                    style={{
                      color: 'var(--ink-3)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div
                    className="pb-5 pr-10 text-[15px]"
                    style={{
                      color: 'var(--ink-2)',
                      lineHeight: 1.55,
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontVariationSettings: '"opsz" 22, "wght" 400',
                      letterSpacing: '-0.012em',
                    }}
                  >
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
