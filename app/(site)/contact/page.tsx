'use client';

import { useEffect, useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useBusiness } from '@/components/dc/business';
import NotchHero from '@/components/dc/kit/NotchHero';
import Field from '@/components/dc/kit/Field';
import { CheckIcon } from '@/components/dc/kit/icons';

export default function ContactPage() {
  const { user } = useAuthStore();
  const createContactMessage = useMutation(api.services.contact.createContactMessage);
  const biz = useBusiness();
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`;
  // WhatsApp chat when a number is set in Business Details, otherwise a plain call.
  const mobileHref = biz.generalHref.startsWith('http') ? biz.generalHref : biz.phone ? tel(biz.phone) : undefined;
  // Every direct line is something you can tap: call, WhatsApp, Messenger, email, map.
  const directLines: { icon: typeof Phone; label: string; value: string; href?: string }[] = [
    { icon: Phone, label: 'Phone', value: biz.landline, href: biz.landline ? tel(biz.landline) : undefined },
    { icon: MessageCircle, label: 'Mobile / WhatsApp', value: biz.phone, href: mobileHref },
    // The raw page link means nothing to people, so the row says what it does (same wording as the footer button).
    { icon: MessageCircle, label: 'Messenger', value: biz.messenger ? 'Message us on Messenger' : '', href: biz.messenger ?? undefined },
    { icon: Mail, label: 'Email', value: biz.email, href: biz.email ? `mailto:${biz.email}` : undefined },
    { icon: MapPin, label: 'Gallery', value: [biz.address, biz.city].filter(Boolean).join('\n'), href: biz.mapUrl ?? undefined },
  ].filter((l) => l.value);
  // The hero notch carries the quickest ways to reach us (phone, mobile, email).
  const heroFacts = directLines.filter((l) => l.label === 'Phone' || l.label === 'Mobile / WhatsApp' || l.label === 'Email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Admin → FAQs; the section is hidden when nothing is published.
  const faqs = useQuery(api.services.faqs.listPublished, {});

  // FAQPage structured data so search engines can show the answers.
  useEffect(() => {
    if (!faqs?.length) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [faqs]);
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

  const renderValue = (value: string, href?: string) =>
    href ? (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener">{value}</a>
    ) : (
      value
    );

  return (
    <main className="dk">
      {/* HERO */}
      <NotchHero
        tone="dark"
        notchWide
        notchHeight={110}
        notchLabel="Direct lines"
        notch={
          heroFacts.length > 0 ? (
            <div className="dk-stats">
              {heroFacts.map(({ label, value, href }) => (
                <div key={label}>
                  <p className="dk-meta-label">{label}</p>
                  <p className="dk-meta-val dk-mono">{renderValue(value, href)}</p>
                </div>
              ))}
            </div>
          ) : undefined
        }
      >
        <p className="dk-eyebrow">Contact</p>
        <h1 className="dk-h1">Write to us.</h1>
        <p className="dk-lede">
          One inbox, one phone, one address. We read every letter, and we answer within
          twenty-four hours.
        </p>
      </NotchHero>

      {/* FORM + DIRECT LINES */}
      <section className="dk-section">
        <div className="dk-wrap dk-split dk-contact-split">
          {/* Form */}
          <div className="dk-form-card">
            {submitted ? (
              <div className="dk-form-done" role="status">
                <span className="dk-empty-icon" aria-hidden="true"><CheckIcon size={22} /></span>
                <h2>Letter received.</h2>
                <p>
                  We&apos;ll reply to <strong style={{ color: 'var(--dk-black)' }}>{email}</strong> within a day.
                </p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="dk-fgrid" style={{ marginTop: 0 }}>
                  <Field id="ct-name" label="Name" required>
                    <input
                      id="ct-name"
                      autoComplete="name"
                      required
                      className="dk-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field id="ct-email" label="Email" required>
                    <input
                      id="ct-email"
                      autoComplete="email"
                      required
                      type="email"
                      className="dk-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field id="ct-phone" label="Phone" optional="(optional)">
                    <input
                      id="ct-phone"
                      type="tel"
                      autoComplete="tel"
                      className="dk-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field id="ct-subject" label="Subject" required>
                    <input
                      id="ct-subject"
                      required
                      className="dk-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="I'd like to ask about…"
                    />
                  </Field>
                  <Field id="ct-message" label="Message" required full>
                    <textarea
                      id="ct-message"
                      required
                      rows={6}
                      className="dk-ta"
                      style={{ height: 'auto', minHeight: 160 }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what you're after, what you've kept before, and how soon you'd like to visit."
                    />
                  </Field>
                </div>
                {error && (
                  <div role="alert" className="dk-alert err" style={{ marginTop: 20 }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="dk-btn dk-btn-red" disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send letter'}
                </button>
              </form>
            )}
          </div>

          {/* Direct lines */}
          <aside className="dk-panel dark dk-dark dk-sticky" aria-labelledby="ct-direct-title">
            <p className="dk-eyebrow">Direct lines</p>
            <h3 id="ct-direct-title" className="dk-h3" style={{ marginTop: 6 }}>Skip the form.</h3>

            <ul className="dk-cl-list">
              {directLines.map(({ icon: Icon, label, value, href }) => {
                const body = (
                  <>
                    <span className="dk-cl-icon" aria-hidden="true"><Icon size={16} /></span>
                    <span className="dk-cl-text">
                      <span className="dk-cl-label">{label}</span>
                      <span className="dk-cl-value">{value}</span>
                    </span>
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a className="dk-cl" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener">{body}</a>
                    ) : (
                      <div className="dk-cl">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section className="dk-section alt" aria-labelledby="ct-faq-title">
          {/* Same container as the form above, heading left / questions right, so the left edges line up. */}
          <div className="dk-wrap dk-faq">
            <div>
              <p className="dk-eyebrow">Frequently asked</p>
              <h2 id="ct-faq-title" className="dk-h2" style={{ marginTop: 8 }}>
                The usual questions.
              </h2>
            </div>
            <div className="dk-acc">
              {faqs.map((f, i) => (
                // One answer open at a time, as before (exclusive accordion via the shared `name`).
                <details key={f._id} name="contact-faq">
                  <summary>{f.question}</summary>
                  <div id={`faq-${i}`} style={{ whiteSpace: 'pre-line' }}>
                    {f.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
