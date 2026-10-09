'use client';

/**
 * Home Service — customers book our team to come to them. The menu, the areas and the travel
 * fees are all set in Admin → Home Service, so nothing here is hardcoded. Prices shown are
 * computed with the same helper the server uses (convex/lib/serviceQuote), and the server
 * recomputes them on submit, so the figure on screen is the figure that gets recorded.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useQuery } from '@/components/dc/useQuery';
import { useBusiness } from '@/components/dc/business';
import { formatDuration, formatPeso, quoteHomeService } from '@/convex/lib/serviceQuote';
import NotchHero from '@/components/dc/kit/NotchHero';
import Field from '@/components/dc/kit/Field';
import { CheckIcon } from '@/components/dc/kit/icons';
import { StepCalendarIcon, StepHouseIcon, StepPhoneIcon, StepPlanIcon } from '@/components/dc/kit/StepIcons';

const pad = (n: number) => String(n).padStart(2, '0');
/** Today as YYYY-MM-DD in the visitor's local time (not UTC). */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const STEPS = [
  { icon: <StepCalendarIcon />, t: 'You tell us the job', b: 'Pick the service, your area and a day that suits you. You see the price before you send it.' },
  { icon: <StepPhoneIcon />, t: 'We confirm by phone', b: 'We check the slot and confirm the final figure. Nothing is charged until the work is agreed.' },
  { icon: <StepHouseIcon />, t: 'We come to you', b: 'We bring our own equipment, treated water and test kit. Your floors stay dry.' },
  { icon: <StepPlanIcon />, t: 'We leave you a plan', b: 'Water readings, what we changed, and what to watch before the next visit.' },
];

/** What comes with every visit — shown beside the hero copy. */
const INCLUDED = [
  { t: 'Price agreed before we travel', b: 'You see the figure first. Nothing is charged until the work is agreed.' },
  { t: 'Our own equipment', b: 'Treated water, tools and a test kit. Your floors stay dry.' },
  { t: 'A care plan when we leave', b: 'Water readings, what we changed, and what to watch next.' },
];

export default function HomeServicePage() {
  const catalog = useQuery(api.services.homeService.getHomeServiceCatalog, {});
  const createBooking = useMutation(api.services.homeService.createHomeServiceBooking);
  const biz = useBusiness();

  const [serviceId, setServiceId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', date: '', time: '09:00', tankSize: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [minDate, setMinDate] = useState('');
  useEffect(() => setMinDate(todayLocal()), []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const services = catalog?.services ?? [];
  const areas = catalog?.areas ?? [];
  const service = services.find((s) => s._id === serviceId);
  const area = areas.find((a) => a._id === areaId);

  // Default to the first service once the menu loads, so the form is never empty.
  useEffect(() => {
    if (!serviceId && services.length) setServiceId(services[0]._id);
  }, [serviceId, services]);

  const quote = useMemo(() => quoteHomeService({ servicePrice: service?.price, area: area ?? null }), [service?.price, area]);

  const enquiry = biz.wa(
    [
      `Hi ${biz.storeName} — I'd like to book a home service.`,
      service && `Service: ${service.name}`,
      area && `Area: ${area.name}`,
      form.date && `Preferred date: ${form.date}`,
      form.address && `Address: ${form.address}`,
    ].filter(Boolean).join('\n'),
  );

  async function submit() {
    setError('');
    if (!service) return setError('Please choose a service.');
    if (!area) return setError('Please choose your area.');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!/.+@.+\..+/.test(form.email)) return setError('Please enter a valid email.');
    if (form.phone.trim().length < 7) return setError('Please enter a valid phone number.');
    if (form.address.trim().length < 10) return setError('Please give the full address, including the barangay and city.');
    if (!form.date) return setError('Please choose a preferred date.');
    if (form.date < todayLocal()) return setError('Please choose a date from today onwards.');

    setStatus('sending');
    try {
      const res = await createBooking({
        serviceId: service._id as Id<'homeServices'>,
        areaId: area._id as Id<'serviceAreas'>,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        date: form.date,
        time: form.time,
        tankSize: form.tankSize.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setReference(res.code);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again or message us.');
    }
  }

  const closed = catalog !== undefined && (!catalog.enabled || services.length === 0 || areas.length === 0);
  const noMenu = catalog !== undefined && services.length === 0;

  /** "Bookings paused" explanation + the one way to reach us. */
  const closedCard = (
    <div>
      <p className="dk-eyebrow">Bookings paused</p>
      <h2 className="dk-h3">Let&rsquo;s arrange it directly</h2>
      <p className="dk-hs-note">
        We&rsquo;re not taking online bookings at the moment, but we&rsquo;re still working. Send us a message with your tank size and where you
        are, and we&rsquo;ll come back to you with a slot and a price.
      </p>
      {enquiry ? (
        <a href={enquiry} target="_blank" rel="noopener" className="dk-btn dk-btn-red" style={{ marginTop: 20 }}>
          Message us about a visit
        </a>
      ) : (
        <Link href="/contact" className="dk-btn dk-btn-red" style={{ marginTop: 20 }}>
          Contact us
        </Link>
      )}
    </div>
  );

  return (
    <div className="dk">
      {/* HERO — the notch holds the booking call to action. With no service menu at all, it carries the whole
          "Bookings paused" message instead, and the empty menu/form section below is skipped, so the page says it once. */}
      <NotchHero
        tone="light"
        notchHeight={noMenu ? 250 : 150}
        notchWide={noMenu}
        notchLabel={closed ? 'Bookings paused' : 'Book a visit'}
        notch={
          noMenu ? (
            closedCard
          ) : closed ? (
            <>
              <p className="dk-eyebrow">Bookings paused</p>
              {enquiry ? (
                <a href={enquiry} target="_blank" rel="noopener" className="dk-btn dk-btn-red">
                  Message us about a visit
                </a>
              ) : (
                <Link href="/contact" className="dk-btn dk-btn-red">
                  Contact us
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="dk-eyebrow">Book a visit</p>
              <p className="dk-small dk-muted">Nothing is charged now</p>
              <a href="#hs-book" className="dk-btn dk-btn-red">
                Request this visit
              </a>
            </>
          )
        }
        aside={
          <div className="dk-hs-included">
            <p className="dk-eyebrow">Every visit includes</p>
            <ul>
              {INCLUDED.map((i) => (
                <li key={i.t}>
                  <span className="dk-hs-check" aria-hidden="true"><CheckIcon size={14} /></span>
                  <span><b>{i.t}</b>{i.b}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <p className="dk-eyebrow">We come to you</p>
        <h1 className="dk-h1">Home service.</h1>
        <p className="dk-lede">
          Cleaning, maintenance, a new tank set up properly, or a second opinion on a fish that isn&rsquo;t right. We bring our own equipment and
          treated water, and we tell you the price before we travel.
        </p>
      </NotchHero>

      {/* SERVICES + FORM */}
      {!noMenu && (
      <section className="dk-section">
        <div className="dk-wrap dk-split even">
          {/* THE MENU */}
          <div>
            <p className="dk-eyebrow">Services</p>
            <h2 className="dk-h2 dk-hs-title">What we can do</h2>
            <p className="dk-hs-note">{catalog?.note || 'Pick a service to see the price. Travel is added by area.'}</p>

            {catalog === undefined ? (
              <p role="status" className="dk-small dk-muted">Loading services…</p>
            ) : (
              <div role="radiogroup" aria-label="Service" className="dk-hs-menu">
                {services.map((s) => {
                  const active = s._id === serviceId;
                  const duration = formatDuration(s.durationMinutes);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setServiceId(s._id)}
                      className="dk-hs-option"
                    >
                      <span className="dk-hs-radio" aria-hidden="true" />
                      <span className="dk-hs-body">
                        <span className="dk-hs-head">
                          <span className="dk-hs-name">{s.name}</span>
                          <span className={`dk-hs-price${s.price === undefined ? ' quoted' : ''}`}>
                            {s.price === undefined ? 'Quoted' : formatPeso(s.price)}
                          </span>
                        </span>
                        {s.description && <span className="dk-hs-desc">{s.description}</span>}
                        {(duration || s.priceNote) && (
                          <span className="dk-hs-meta">{[duration && `About ${duration}`, s.priceNote].filter(Boolean).join(' · ')}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* THE FORM */}
          <div id="hs-book" className="dk-form-card dk-sticky" style={{ scrollMarginTop: 112 }}>
            {status === 'done' ? (
              <div className="dk-form-done" role="status">
                <span className="dk-empty-icon" aria-hidden="true"><CheckIcon size={22} /></span>
                <h2>Booking received</h2>
                <p>
                  Thank you, {form.name.split(' ')[0] || 'friend'}. We&rsquo;ll call to confirm your slot and the final price before anyone travels.
                </p>
                <p className="dk-mono" style={{ color: 'var(--dk-black)' }}>
                  Reference <b>{reference}</b>
                </p>
                <Link href={`/track?code=${reference}`} className="dk-btn dk-btn-red">
                  Track this booking
                </Link>
              </div>
            ) : closed ? (
              closedCard
            ) : (
              <>
                <p className="dk-eyebrow">Book a visit</p>
                <h2>{service ? service.name : 'Tell us where to come'}</h2>

                <div className="dk-fgrid">
                  <Field id="hs-area" label="Your area" required full hint={area?.note}>
                    <select id="hs-area" className="dk-input" value={areaId} onChange={(e) => setAreaId(e.target.value)} aria-describedby={area?.note ? 'hs-area-msg' : undefined}>
                      <option value="">Choose your area…</option>
                      {areas.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}{a.travelFee > 0 ? ` — travel ${formatPeso(a.travelFee)}` : ' — no travel fee'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="hs-name" label="Your name" required>
                    <input id="hs-name" className="dk-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
                  </Field>
                  <Field id="hs-phone" label="Phone" required>
                    <input id="hs-phone" className="dk-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} />
                  </Field>
                  <Field id="hs-email" label="Email" required full>
                    <input id="hs-email" className="dk-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
                  </Field>
                  <Field id="hs-address" label="Address" required full>
                    <textarea id="hs-address" className="dk-ta" rows={2} autoComplete="street-address" placeholder="House no., street, barangay, city" value={form.address} onChange={set('address')} style={{ height: 'auto', minHeight: 72 }} />
                  </Field>
                  <Field id="hs-date" label="Preferred date" required>
                    <input id="hs-date" className="dk-input" type="date" min={minDate || undefined} value={form.date} onChange={set('date')} />
                  </Field>
                  <Field id="hs-time" label="Preferred time">
                    <select id="hs-time" className="dk-input" value={form.time} onChange={set('time')}>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field id="hs-tank" label="Tank size" optional="(optional)" full>
                    <input id="hs-tank" className="dk-input" type="text" placeholder="e.g. 4ft × 2ft × 2ft, or 400 litres" value={form.tankSize} onChange={set('tankSize')} />
                  </Field>
                  <Field id="hs-notes" label="Anything we should know?" optional="(optional)" full>
                    <textarea id="hs-notes" className="dk-ta" rows={3} placeholder="Gate code, parking, the fish has been off its food for a week…" value={form.notes} onChange={set('notes')} />
                  </Field>
                </div>

                {/* Running total, computed with the same helper the server uses. */}
                <div className="dk-panel muted" style={{ marginTop: 24, padding: '18px 20px' }}>
                  <div className="dk-summary">
                    <div>
                      <span>{service?.name ?? 'Service'}</span>
                      <span className="dk-mono">{quote.servicePrice === undefined ? 'Quoted on inspection' : formatPeso(quote.servicePrice)}</span>
                    </div>
                    <div>
                      <span>Travel{area ? ` · ${area.name}` : ''}</span>
                      <span className="dk-mono">{!area ? '—' : quote.travelFee > 0 ? formatPeso(quote.travelFee) : 'Included'}</span>
                    </div>
                    <div className="total">
                      <span>{quote.quoted ? 'Total' : 'Estimated total'}</span>
                      <span className="dk-mono">{quote.estimatedTotal === undefined ? 'After we see the tank' : formatPeso(quote.estimatedTotal)}</span>
                    </div>
                  </div>
                </div>

                {error && <p role="alert" className="dk-err" style={{ marginTop: 16 }}>{error}</p>}

                <button type="button" onClick={submit} disabled={status === 'sending'} aria-busy={status === 'sending'} className="dk-btn dk-btn-red block" style={{ marginTop: 24 }}>
                  {status === 'sending' ? 'Sending…' : 'Request this visit'}
                </button>
                <p className="dk-form-note">
                  Nothing is charged now
                  {enquiry && <> &middot; or{' '}<a href={enquiry} target="_blank" rel="noopener">message us instead</a></>}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      )}

      {/* HOW IT WORKS — a genuine sequence, so it stays an ordered list. */}
      <section className="dk-section alt" aria-labelledby="hs-steps-title">
        <div className="dk-steps flush">
          <h2 id="hs-steps-title">How a visit works.</h2>
          <ol>
            {STEPS.map((c) => (
              <li key={c.t}>
                <span className="dk-step-icon" aria-hidden="true">{c.icon}</span>
                <h3>{c.t}</h3>
                <p>{c.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
