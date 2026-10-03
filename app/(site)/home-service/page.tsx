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

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";
const ink = 'oklch(0.19 0.012 32)';
const muted = 'oklch(0.44 0.012 34)';
const soft = 'oklch(0.50 0.02 40)';
const line = 'oklch(0.87 0.012 68)';
const red = 'oklch(0.52 0.216 27)';

const pad = (n: number) => String(n).padStart(2, '0');
/** Today as YYYY-MM-DD in the visitor's local time (not UTC). */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const STEPS = [
  { n: '01', t: 'You tell us the job', b: 'Pick the service, your area and a day that suits you. You see the price before you send it.' },
  { n: '02', t: 'We confirm by phone', b: 'We check the slot and confirm the final figure. Nothing is charged until the work is agreed.' },
  { n: '03', t: 'We come to you', b: 'We bring our own equipment, treated water and test kit. Your floors stay dry.' },
  { n: '04', t: 'We leave you a plan', b: 'Water readings, what we changed, and what to watch before the next visit.' },
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

  return (
    <>
      {/* HERO */}
      <section style={{ background: 'oklch(0.972 0.008 78)', borderBottom: `1px solid oklch(0.86 0.012 68)` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 28px 56px' }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 20 }}>We come to you</div>
          <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(42px,6vw,84px)', lineHeight: 0.94, letterSpacing: '-0.02em', margin: '0 0 20px', color: ink }}>
            Home <span style={{ fontStyle: 'italic', fontWeight: 600, color: red }}>service.</span>
          </h1>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, maxWidth: 560, color: muted, margin: 0 }}>
            Cleaning, maintenance, a new tank set up properly, or a second opinion on a fish that isn&rsquo;t right. We bring our own equipment and
            treated water, and we tell you the price before we travel.
          </p>
        </div>
      </section>

      {/* SERVICES + FORM */}
      <section style={{ background: 'oklch(0.955 0.010 74)', padding: '64px 0 76px' }}>
        <div className="dc-split" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 0.95fr', gap: 40, alignItems: 'start' }}>

          {/* THE MENU */}
          <div>
            <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(26px,3.2vw,36px)', letterSpacing: '-0.015em', margin: '0 0 8px', color: ink }}>What we can do</h2>
            <p style={{ fontSize: 14.5, color: muted, margin: '0 0 24px' }}>
              {catalog?.note || 'Pick a service to see the price. Travel is added by area.'}
            </p>

            {catalog === undefined ? (
              <p style={{ fontSize: 14, color: soft, fontFamily: mono }}>Loading services…</p>
            ) : services.length === 0 ? (
              <div style={{ border: `1px solid ${line}`, borderRadius: 14, padding: 24, background: 'oklch(0.99 0.005 80)' }}>
                <p style={{ margin: 0, fontSize: 14.5, color: muted }}>
                  We&rsquo;re not taking home service bookings online just yet.{' '}
                  {enquiry ? <a href={enquiry} target="_blank" rel="noopener" style={{ color: red, fontWeight: 600 }}>Message us</a> : <Link href="/contact" style={{ color: red, fontWeight: 600 }}>Contact us</Link>}{' '}
                  and we&rsquo;ll sort it out directly.
                </p>
              </div>
            ) : (
              <div role="radiogroup" aria-label="Service" style={{ display: 'grid', gap: 12 }}>
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
                      style={{
                        textAlign: 'left',
                        background: active ? 'oklch(0.99 0.005 80)' : 'oklch(0.985 0.006 80)',
                        border: `1px solid ${active ? red : line}`,
                        boxShadow: active ? `0 0 0 1px ${red}, 0 18px 40px -34px oklch(0.30 0.03 40 / 0.6)` : 'none',
                        borderRadius: 12,
                        padding: '18px 20px',
                        cursor: 'pointer',
                        transition: 'border-color .18s, box-shadow .18s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
                        <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, color: ink }}>{s.name}</span>
                        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: s.price === undefined ? soft : red, whiteSpace: 'nowrap' }}>
                          {s.price === undefined ? 'Quoted' : formatPeso(s.price)}
                        </span>
                      </div>
                      {s.description && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted, margin: '8px 0 0' }}>{s.description}</p>}
                      {(duration || s.priceNote) && (
                        <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: soft, marginTop: 10 }}>
                          {[duration && `about ${duration}`, s.priceNote].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* THE FORM */}
          <div className="dc-sticky-md" style={{ position: 'sticky', top: 92, background: 'oklch(0.99 0.005 80)', border: `1px solid ${line}`, borderRadius: 14, padding: '30px 28px 26px', boxShadow: '0 30px 70px -50px oklch(0.30 0.03 40 / 0.5)' }}>
            {status === 'done' ? (
              <div style={{ textAlign: 'center', padding: '22px 4px 14px' }}>
                <div style={{ width: 54, height: 54, borderRadius: 999, margin: '0 auto 18px', background: 'oklch(0.52 0.13 150 / 0.14)', color: 'oklch(0.46 0.14 150)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>✓</div>
                <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, margin: '0 0 10px', color: ink }}>Booking received</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: muted, margin: '0 0 8px' }}>
                  Thank you, {form.name.split(' ')[0] || 'friend'}. We&rsquo;ll call to confirm your slot and the final price before anyone travels.
                </p>
                <p style={{ fontFamily: mono, fontSize: 13, color: ink, margin: '0 0 20px' }}>
                  Reference <b>{reference}</b>
                </p>
                <Link href={`/track?code=${reference}`} className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: red, color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '13px 22px', borderRadius: 999 }}>
                  Track this booking
                </Link>
              </div>
            ) : closed ? (
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 12 }}>Bookings paused</div>
                <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, lineHeight: 1.1, margin: '0 0 10px', color: ink }}>Let&rsquo;s arrange it directly</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: muted, margin: '0 0 22px' }}>
                  We&rsquo;re not taking online bookings at the moment, but we&rsquo;re still working. Send us a message with your tank size and where you
                  are, and we&rsquo;ll come back to you with a slot and a price.
                </p>
                {enquiry ? (
                  <a href={enquiry} target="_blank" rel="noopener" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', background: red, color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '15px 24px', borderRadius: 999 }}>
                    Message us about a visit
                  </a>
                ) : (
                  <Link href="/contact" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', background: red, color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '15px 24px', borderRadius: 999 }}>
                    Contact us
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 12 }}>Book a visit</div>
                <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 27, lineHeight: 1.08, letterSpacing: '-0.015em', margin: '0 0 22px', color: ink }}>
                  {service ? service.name : 'Tell us where to come'}
                </h2>

                <div className="dc-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="dc-lbl" htmlFor="hs-area">Your area</label>
                    <select id="hs-area" className="dc-input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                      <option value="">Choose your area…</option>
                      {areas.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}{a.travelFee > 0 ? ` — travel ${formatPeso(a.travelFee)}` : ' — no travel fee'}
                        </option>
                      ))}
                    </select>
                    {area?.note && <div style={{ fontSize: 11.5, marginTop: 6, color: soft }}>{area.note}</div>}
                  </div>
                  <div><label className="dc-lbl" htmlFor="hs-name">Your name</label><input id="hs-name" className="dc-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} /></div>
                  <div><label className="dc-lbl" htmlFor="hs-phone">Phone</label><input id="hs-phone" className="dc-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={form.phone} onChange={set('phone')} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="dc-lbl" htmlFor="hs-email">Email</label><input id="hs-email" className="dc-input" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} /></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="dc-lbl" htmlFor="hs-address">Address</label>
                    <textarea id="hs-address" className="dc-input" rows={2} autoComplete="street-address" placeholder="House no., street, barangay, city" value={form.address} onChange={set('address')} style={{ resize: 'vertical', minHeight: 62 }} />
                  </div>
                  <div>
                    <label className="dc-lbl" htmlFor="hs-date">Preferred date</label>
                    <input id="hs-date" className="dc-input" type="date" min={minDate || undefined} value={form.date} onChange={set('date')} />
                  </div>
                  <div>
                    <label className="dc-lbl" htmlFor="hs-time">Preferred time</label>
                    <select id="hs-time" className="dc-input" value={form.time} onChange={set('time')}>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="dc-lbl" htmlFor="hs-tank">Tank size <span style={{ textTransform: 'none', letterSpacing: 0, color: soft }}>(optional)</span></label>
                    <input id="hs-tank" className="dc-input" type="text" placeholder="e.g. 4ft × 2ft × 2ft, or 400 litres" value={form.tankSize} onChange={set('tankSize')} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="dc-lbl" htmlFor="hs-notes">Anything we should know? <span style={{ textTransform: 'none', letterSpacing: 0, color: soft }}>(optional)</span></label>
                    <textarea id="hs-notes" className="dc-input" rows={3} placeholder="Gate code, parking, the fish has been off its food for a week…" value={form.notes} onChange={set('notes')} style={{ resize: 'vertical', minHeight: 74 }} />
                  </div>
                </div>

                {/* Running total, computed with the same helper the server uses. */}
                <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 12, background: 'oklch(0.965 0.009 76)', border: `1px solid oklch(0.90 0.012 70)`, display: 'grid', gap: 7, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: muted }}>{service?.name ?? 'Service'}</span>
                    <span style={{ fontFamily: mono }}>{quote.servicePrice === undefined ? 'Quoted on inspection' : formatPeso(quote.servicePrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: muted }}>Travel{area ? ` · ${area.name}` : ''}</span>
                    <span style={{ fontFamily: mono }}>{!area ? '—' : quote.travelFee > 0 ? formatPeso(quote.travelFee) : 'Included'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid oklch(0.90 0.012 70)`, fontWeight: 700, color: ink }}>
                    <span>{quote.quoted ? 'Total' : 'Estimated total'}</span>
                    <span style={{ fontFamily: mono }}>{quote.estimatedTotal === undefined ? 'After we see the tank' : formatPeso(quote.estimatedTotal)}</span>
                  </div>
                </div>

                {error && <div role="alert" style={{ marginTop: 14, fontSize: 13, color: 'oklch(0.50 0.20 27)', fontFamily: mono }}>{error}</div>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={status === 'sending'}
                  className="dc-btn-primary"
                  style={{ marginTop: 18, width: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: red, color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '16px 24px', borderRadius: 999, border: 'none', cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, transition: '.2s', boxShadow: `0 16px 34px -16px oklch(0.52 0.216 27 / 0.7)` }}
                >
                  {status === 'sending' ? 'Sending…' : 'Request this visit'}
                </button>
                <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10.5, letterSpacing: '0.06em', color: soft, marginTop: 12 }}>
                  Nothing is charged now
                  {enquiry && <> &middot; or{' '}<a href={enquiry} target="_blank" rel="noopener" style={{ color: red, fontWeight: 600 }}>message us instead</a></>}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: 'oklch(0.972 0.008 78)', borderTop: `1px solid oklch(0.86 0.012 68)`, padding: '68px 0 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(26px,3.4vw,40px)', letterSpacing: '-0.015em', margin: '0 0 36px', color: ink }}>
            How a visit <span style={{ fontStyle: 'italic', color: red }}>works.</span>
          </h2>
          <div className="dc-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {STEPS.map((c) => (
              <div key={c.n} style={{ padding: '26px 24px', border: `1px solid oklch(0.86 0.012 68)`, borderTop: `2px solid oklch(0.70 0.12 80)`, borderRadius: 8, background: 'oklch(0.985 0.006 80)' }}>
                <div style={{ fontFamily: mono, fontSize: 12, color: red, marginBottom: 14 }}>{c.n}</div>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, color: ink, marginBottom: 9 }}>{c.t}</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: muted, margin: 0 }}>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
