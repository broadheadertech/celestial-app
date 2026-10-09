'use client';

/**
 * Visit — design-reference/dragoncave-site.html (Visit), wired to the real `createViewing`
 * Convex mutation (falls back to a WhatsApp message). The design form gained an
 * email field because the viewings table requires one.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { groupHours, hoursSummary, useBusiness, type BusinessHours } from '@/components/dc/business';
import { BrandMark } from '@/components/dc/kit/Brand';
import Placeholder from '@/components/dc/kit/Placeholder';
import NotchHero from '@/components/dc/kit/NotchHero';
import { CheckIcon, WhatsAppIcon } from '@/components/dc/kit/icons';
import { StepCalendarIcon, StepChatIcon, StepClockIcon, StepPhoneIcon } from '@/components/dc/kit/StepIcons';


const GUEST_LABEL: Record<string, string> = { '1': 'Just me', '2': '2 of us', '3': '3 of us', '4+': '4 or more' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FALLBACK_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const pad = (n: number) => String(n).padStart(2, '0');
/** Today as YYYY-MM-DD in the visitor's local time (not UTC). */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayNameOf = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
/** Hourly start times that fit fully inside a day's opening hours. */
function slotsFor(day: BusinessHours | undefined): string[] {
  if (!day || day.closed) return [];
  const out: string[] = [];
  for (let t = Math.ceil(toMinutes(day.open) / 60) * 60; t + 60 <= toMinutes(day.close); t += 60) {
    out.push(`${pad(Math.floor(t / 60))}:00`);
  }
  return out;
}

export default function VisitPage() {
  const createViewing = useMutation(api.services.viewings.createViewing);
  const biz = useBusiness();
  const [hoursDays, hoursTime] = hoursSummary(biz.hours);
  const hourGroups = groupHours(biz.hours);
  const [s, setS] = useState({ name: '', email: '', contact: '', date: '', time: '10:00', guests: '1', interest: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [minDate, setMinDate] = useState('');
  useEffect(() => setMinDate(todayLocal()), []);
  const set = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setS((p) => ({ ...p, [k]: e.target.value }));

  // Time slots follow Business Details → opening hours for the chosen date.
  const selectedDay = s.date && biz.hours.length ? biz.hours.find((h) => h.day === dayNameOf(s.date)) : undefined;
  const closedOnDate = !!selectedDay?.closed;
  const timeSlots = useMemo(
    () => (biz.hours.length === 0 ? FALLBACK_SLOTS : s.date ? slotsFor(selectedDay) : FALLBACK_SLOTS),
    [biz.hours.length, s.date, selectedDay],
  );
  useEffect(() => {
    if (timeSlots.length && !timeSlots.includes(s.time)) setS((p) => ({ ...p, time: timeSlots[0] }));
  }, [timeSlots, s.time]);
  const closedDays = biz.hours.filter((h) => h.closed).map((h) => h.day);
  const mapEmbed = biz.address ? `https://www.google.com/maps?q=${encodeURIComponent(`${biz.address} ${biz.city}`)}&output=embed` : null;

  const lines = [
    "Hi Dragon's Cave — I'd like to book a viewing.",
    s.name ? 'Name: ' + s.name : null,
    s.contact ? 'Contact: ' + s.contact : null,
    s.date ? 'Preferred date: ' + s.date : null,
    'Preferred time: ' + s.time,
    'Guests: ' + (GUEST_LABEL[s.guests] || s.guests),
    s.interest ? 'Interested in: ' + s.interest : null,
    s.notes ? 'Note: ' + s.notes : null,
  ].filter(Boolean);
  const waHref = biz.wa(lines.join('\n'));
  const waQuestion = biz.wa(`Hi ${biz.storeName} — I'd like to ask a question before visiting.`);
  const heroFacts = [
    ['Address', biz.address, biz.city],
    ['Hours', hoursDays, hoursTime],
    ['Phone', biz.phone, biz.landline],
  ].filter(([, a]) => a);

  async function submit() {
    setError('');
    if (!s.name.trim()) return setError('Please enter your name.');
    if (!/.+@.+\..+/.test(s.email)) return setError('Please enter a valid email.');
    if (s.contact.trim().length < 7) return setError('Please enter a valid phone number.');
    if (!s.date || !s.time) return setError('Please choose a date and time.');
    if (s.date < todayLocal()) return setError('Please choose a date from today onwards.');
    if (closedOnDate || timeSlots.length === 0) return setError(`We're closed on ${dayNameOf(s.date)}s — please pick another day.`);
    const partySize = s.guests === '4+' ? 4 : parseInt(s.guests, 10) || 1;
    setStatus('sending');
    try {
      await createViewing({
        name: s.name.trim(),
        email: s.email.trim(),
        phone: s.contact.trim(),
        date: s.date,
        time: s.time,
        partySize,
        interest: s.interest.trim() || undefined,
        notes: s.notes.trim() || undefined,
      });
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again or message us on WhatsApp.');
    }
  }

  return (
    <div className="dk dk-visit">
      {/* HERO */}
      <NotchHero
        tone="white"
        behind="var(--dk-n-100)"
        className="dk-visit-hero"
        notchWide
        notchHeight={110}
        notchLabel="Address and hours"
        notch={
          <div className="dk-stats">
            {heroFacts.map(([h, a, b]) => (
              <div key={h}>
                <p className="dk-meta-label">{h}</p>
                <p className="dk-meta-val">
                  {a}
                  {h === 'Hours' ? (
                    <><br /><a href="#hours">See hours</a></>
                  ) : (
                    b && <><br />{b}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        }
        aside={
          <figure className="dk-specimen dk-dark">
            <BrandMark onDark />
            <Placeholder src="/img/arowana-red.png" alt="Super Red arowana" contain />
            <figcaption className="dk-specimen-cap">The gallery{biz.city && <> &middot; {biz.city}</>}</figcaption>
          </figure>
        }
      >
        <p className="dk-eyebrow">By appointment</p>
        <h1>Visit the gallery.</h1>
        <p className="dk-lede">By appointment only. Bring a friend. We&rsquo;ll pour tea and you can take as long as you need with the fish &mdash; there&rsquo;s never any pressure to buy.</p>
      </NotchHero>

      {/* BOOKING + LOCATION */}
      <section className="dk-booking" aria-labelledby="book-title">
        <div>
          <div className="dk-form-card">
            {status === 'done' ? (
              <div className="dk-form-done" role="status">
                <span className="dk-empty-icon" aria-hidden="true"><CheckIcon size={22} /></span>
                <h2 id="book-title">Request received</h2>
                <p>Thank you, {s.name.split(' ')[0] || 'friend'}. We&rsquo;ll confirm your {s.date || 'preferred'} slot within the day. Watch your phone &mdash; we usually reply on WhatsApp.</p>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener" className="dk-btn dk-btn-red">
                    <WhatsAppIcon size={18} />
                    Message us to confirm faster
                  </a>
                )}
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <p className="dk-eyebrow">Request a viewing</p>
                <h2 id="book-title">Tell us when to expect you</h2>
                <p className="dk-sub">We log your request and confirm your slot within the day.</p>

                <div className="dk-fgrid">
                  <div className="dk-field"><label htmlFor="vw-name">YOUR NAME</label><input id="vw-name" className="dk-input" type="text" autoComplete="name" placeholder="Juan dela Cruz" value={s.name} onChange={set('name')} /></div>
                  <div className="dk-field"><label htmlFor="vw-email">EMAIL</label><input id="vw-email" className="dk-input" type="email" autoComplete="email" placeholder="you@email.com" value={s.email} onChange={set('email')} /></div>
                  <div className="dk-field"><label htmlFor="vw-phone">PHONE / WHATSAPP</label><input id="vw-phone" className="dk-input" type="tel" autoComplete="tel" placeholder="+63 9__ ___ ____" value={s.contact} onChange={set('contact')} /></div>
                  <div className="dk-field">
                    <label htmlFor="vw-date">PREFERRED DATE</label>
                    <input id="vw-date" className="dk-input" type="date" min={minDate || undefined} value={s.date} onChange={set('date')} aria-describedby="vw-date-hint" aria-invalid={closedOnDate || undefined} />
                    <p id="vw-date-hint" className={`dk-hint${closedOnDate ? ' err' : ''}`}>
                      {closedOnDate ? `Closed on ${dayNameOf(s.date)}s — pick another day.` : closedDays.length ? `Closed ${closedDays.join(', ')}` : ' '}
                    </p>
                  </div>
                  <div className="dk-field"><label htmlFor="vw-time">PREFERRED TIME</label>
                    <select id="vw-time" className="dk-input" value={s.time} onChange={set('time')} disabled={timeSlots.length === 0}>
                      {timeSlots.length === 0 ? <option value="">No slots this day</option> : timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="dk-field"><label htmlFor="vw-guests">GUESTS</label>
                    <select id="vw-guests" className="dk-input" value={s.guests} onChange={set('guests')}>
                      <option value="1">Just me</option><option value="2">2 people</option><option value="3">3 people</option><option value="4+">4+ people</option>
                    </select>
                  </div>
                  <div className="dk-field"><label htmlFor="vw-interest">FISH OF INTEREST (optional)</label><input id="vw-interest" className="dk-input" type="text" placeholder="e.g. Chili Super Red" value={s.interest} onChange={set('interest')} /></div>
                  <div className="dk-field full"><label htmlFor="vw-notes">ANYTHING ELSE? (optional)</label><textarea id="vw-notes" className="dk-ta" placeholder="First arowana, upgrading my display, bringing my kids…" value={s.notes} onChange={set('notes')} /></div>
                </div>

                {error && <p role="alert" className="dk-err" style={{ marginTop: 16 }}>{error}</p>}

                <button type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'} className="dk-btn dk-btn-red">
                  {status === 'sending' ? 'Sending…' : 'Send viewing request'}
                </button>
              </form>
            )}
          </div>
          {status !== 'done' && (
            <p className="dk-form-note">
              No deposit needed &middot; viewings are free
              {waHref && <> &middot; or{' '}<a href={waHref} target="_blank" rel="noopener">send on WhatsApp</a></>}
            </p>
          )}
        </div>

        <aside>
          <div className="dk-map-card">
            <div className="dk-map">
              {mapEmbed ? (
                <iframe title={`Map to ${biz.storeName}`} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              ) : (
                <>
                  <svg className="dk-map-art" viewBox="0 0 362 248" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 160 C 70 140, 120 175, 200 158 S 320 140, 362 152 L362 182 C 310 172, 250 192, 190 188 S 70 170, 0 190 Z" fill="#d4d4d4" />
                    <path d="M0 95 H362" stroke="#fff" strokeWidth="7" />
                    <path d="M200 0 V248" stroke="#fff" strokeWidth="7" />
                  </svg>
                  <svg className="dk-map-pin" width="48" height="58" viewBox="0 0 48 58" aria-hidden="true"><path d="M24 57S2 34 2 22a22 22 0 0 1 44 0c0 12-22 35-22 35z" fill="#e10600" /><circle cx="24" cy="21" r="8" fill="#fff" /></svg>
                </>
              )}
              {biz.mapUrl && <a className="dk-map-open" href={biz.mapUrl} target="_blank" rel="noopener">Open in Maps ↗</a>}
            </div>
            <div className="dk-map-info">
              <h3>{biz.storeName} Gallery</h3>
              {(biz.address || biz.city) && <p>{biz.address}{biz.address && biz.city && <br />}{biz.city}</p>}
            </div>
          </div>

          <div className="dk-hours-card" id="hours">
            <p className="dk-eyebrow">Opening hours</p>
            {hourGroups.map(({ days, hours, closed }) => (
              <div key={days} className={`dk-hours-row${closed ? ' closed' : ''}`}>
                <span>{days}</span>
                <span>{hours}</span>
              </div>
            ))}
            {biz.hoursNote && <p className="dk-hours-note">{biz.hoursNote}</p>}
          </div>

          {waQuestion && (
            <a href={waQuestion} target="_blank" rel="noopener" className="dk-btn dk-btn-outline-dark dk-ask">
              <WhatsAppIcon size={18} />
              Just have a question?
            </a>
          )}
        </aside>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="dk-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">What a visit looks like.</h2>
        <ol>
          <li><span className="dk-step-icon" aria-hidden="true"><StepCalendarIcon /></span><h3>You book a slot</h3><p>Send the form and we confirm a private time — no overlapping viewings.</p></li>
          <li><span className="dk-step-icon" aria-hidden="true"><StepChatIcon /></span><h3>We pour tea</h3><p>Sit with the fish. We&rsquo;ll talk bloodline, husbandry, and what suits your setup.</p></li>
          <li><span className="dk-step-icon" aria-hidden="true"><StepClockIcon /></span><h3>Take your time</h3><p>No pressure to buy. Ask us to hold a fish while you prepare a tank.</p></li>
          <li><span className="dk-step-icon" aria-hidden="true"><StepPhoneIcon /></span><h3>We stay in touch</h3><p>Bought or not, our line stays open for the life of your fish.</p></li>
        </ol>
      </section>
    </div>
  );
}
