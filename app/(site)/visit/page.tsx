'use client';

/**
 * Visit — the design (`dragons-cave-visit`), wired to the real `createViewing`
 * Convex mutation (falls back to a WhatsApp message). The design form gained an
 * email field because the viewings table requires one.
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { groupHours, hoursSummary, useBusiness } from '@/components/dc/business';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

const GUEST_LABEL: Record<string, string> = { '1': 'Just me', '2': '2 of us', '3': '3 of us', '4+': '4 or more' };

function Slot({ label, ratio }: { label: string; ratio: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 92% 82% at 50% 40%, oklch(0.955 0.010 74), oklch(0.90 0.02 66) 100%)', aspectRatio: ratio }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.58 0.02 40)' }}>{label}</div>
    </div>
  );
}

export default function VisitPage() {
  const createViewing = useMutation(api.services.viewings.createViewing);
  const biz = useBusiness();
  const [hoursDays, hoursTime] = hoursSummary(biz.hours);
  const hourGroups = groupHours(biz.hours);
  const [s, setS] = useState({ name: '', email: '', contact: '', date: '', time: '10:00', guests: '1', interest: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setS((p) => ({ ...p, [k]: e.target.value }));

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
    <>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)', borderBottom: '1px solid oklch(0.86 0.012 68)' }}>
        <div className="dc-split" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '60px 28px 64px', display: 'grid', gridTemplateColumns: '1fr 0.92fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 22 }}>By appointment</div>
            <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(46px,6.6vw,92px)', lineHeight: 0.92, letterSpacing: '-0.02em', margin: '0 0 22px', color: 'oklch(0.19 0.012 32)' }}>Visit the <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>gallery.</span></h1>
            <p style={{ fontSize: 17.5, lineHeight: 1.6, maxWidth: 480, color: 'oklch(0.40 0.012 34)', margin: '0 0 34px' }}>By appointment only. Bring a friend. We&rsquo;ll pour tea and you can take as long as you need with the fish &mdash; there&rsquo;s never any pressure to buy.</p>
            <div className="dc-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: 34, justifyContent: 'start' }}>
              {heroFacts.map(([h, a, b]) => (
                <div key={h}>
                  <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', marginBottom: 8 }}>{h}</div>
                  <div style={{ fontFamily: mono, fontSize: 13, lineHeight: 1.5, color: 'oklch(0.26 0.012 32)' }}>{a}{b && <><br />{b}</>}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative', aspectRatio: '4/5', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.4), 0 40px 84px -46px oklch(0.30 0.08 40 / 0.5)' }}>
              <Slot label="The gallery" ratio="4/5" />
            </div>
            <div style={{ position: 'absolute', top: -14, left: -14, width: 56, height: 56, borderRadius: 12, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px -10px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-6deg)' }}><span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 30, color: 'oklch(0.97 0.012 82)' }}>龍</span></div>
            <div style={{ position: 'absolute', bottom: 14, left: 16, fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.98 0.01 82)', background: 'oklch(0.19 0.012 32 / 0.55)', backdropFilter: 'blur(6px)', padding: '6px 11px', borderRadius: 6, pointerEvents: 'none' }}>The gallery &middot; Quezon City</div>
          </div>
        </div>
      </section>

      {/* BOOKING + LOCATION */}
      <section style={{ background: 'oklch(0.955 0.010 74)', padding: '76px 0' }}>
        <div className="dc-split" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 40, alignItems: 'start' }}>

          {/* FORM */}
          <div style={{ background: 'oklch(0.99 0.005 80)', border: '1px solid oklch(0.87 0.012 68)', borderRadius: 14, padding: '36px 36px 32px', boxShadow: '0 30px 70px -50px oklch(0.30 0.03 40 / 0.5)' }}>
            {status === 'done' ? (
              <div style={{ textAlign: 'center', padding: '30px 10px 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 20px', background: 'oklch(0.52 0.13 150 / 0.14)', color: 'oklch(0.46 0.14 150)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✓</div>
                <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 28, margin: '0 0 10px', color: 'oklch(0.19 0.012 32)' }}>Request received</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', maxWidth: 380, margin: '0 auto 24px' }}>Thank you, {s.name.split(' ')[0] || 'friend'}. We&rsquo;ll confirm your {s.date || 'preferred'} slot within the day. Watch your phone &mdash; we usually reply on WhatsApp.</p>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '13px 22px', borderRadius: 999 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /></svg>
                    Message us to confirm faster
                  </a>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 12 }}>Request a viewing</div>
                <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.015em', margin: '0 0 8px', color: 'oklch(0.19 0.012 32)' }}>Tell us when to expect you</h2>
                <p style={{ fontSize: 14, color: 'oklch(0.46 0.012 34)', margin: '0 0 28px' }}>We log your request and confirm your slot within the day.</p>

                <div className="dc-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 18px' }}>
                  <div><label className="dc-lbl">Your name</label><input className="dc-input" type="text" placeholder="Juan dela Cruz" value={s.name} onChange={set('name')} /></div>
                  <div><label className="dc-lbl">Email</label><input className="dc-input" type="email" placeholder="you@email.com" value={s.email} onChange={set('email')} /></div>
                  <div><label className="dc-lbl">Phone / WhatsApp</label><input className="dc-input" type="tel" placeholder="+63 9__ ___ ____" value={s.contact} onChange={set('contact')} /></div>
                  <div><label className="dc-lbl">Preferred date</label><input className="dc-input" type="date" value={s.date} onChange={set('date')} /></div>
                  <div><label className="dc-lbl">Preferred time</label>
                    <select className="dc-input" value={s.time} onChange={set('time')}>
                      {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className="dc-lbl">Guests</label>
                    <select className="dc-input" value={s.guests} onChange={set('guests')}>
                      <option value="1">Just me</option><option value="2">2 of us</option><option value="3">3 of us</option><option value="4+">4 or more</option>
                    </select>
                  </div>
                  <div><label className="dc-lbl">Fish of interest <span style={{ textTransform: 'none', letterSpacing: 0, color: 'oklch(0.66 0.02 40)' }}>(optional)</span></label><input className="dc-input" type="text" placeholder="e.g. Chili Super Red" value={s.interest} onChange={set('interest')} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="dc-lbl">Anything else? <span style={{ textTransform: 'none', letterSpacing: 0, color: 'oklch(0.66 0.02 40)' }}>(optional)</span></label><textarea className="dc-input" rows={3} placeholder="First arowana, upgrading my display, bringing my kids…" style={{ resize: 'vertical', minHeight: 78 }} value={s.notes} onChange={set('notes')} /></div>
                </div>

                {error && <div style={{ marginTop: 16, fontSize: 13, color: 'oklch(0.52 0.20 27)', fontFamily: mono }}>{error}</div>}

                <button type="button" onClick={submit} disabled={status === 'sending'} className="dc-btn-primary" style={{ marginTop: 22, width: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 15, fontWeight: 600, padding: '16px 24px', borderRadius: 999, border: 'none', cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, transition: '.2s', boxShadow: '0 16px 34px -16px oklch(0.52 0.216 27 / 0.7)' }}>
                  {status === 'sending' ? 'Sending…' : 'Send viewing request'}
                </button>
                <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10.5, letterSpacing: '0.06em', color: 'oklch(0.56 0.02 40)', marginTop: 14 }}>
                  No deposit needed &middot; viewings are free
                  {waHref && <> &middot; or{' '}<a href={waHref} target="_blank" rel="noopener" style={{ color: 'oklch(0.50 0.216 27)', fontWeight: 600 }}>send on WhatsApp</a></>}
                </div>
              </>
            )}
          </div>

          {/* LOCATION SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ background: 'oklch(0.99 0.005 80)', border: '1px solid oklch(0.87 0.012 68)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '16/10' }}>
                <Slot label="Map" ratio="16/10" />
              </div>
              <div style={{ padding: '20px 22px' }}>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: 'oklch(0.19 0.012 32)', marginBottom: 4 }}>{biz.storeName} Gallery</div>
                {(biz.address || biz.city) && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'oklch(0.44 0.012 34)', marginBottom: 14 }}>{biz.address}{biz.address && biz.city && <br />}{biz.city}</div>}
                {biz.mapUrl && <a href={biz.mapUrl} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>Open in Maps &rarr;</a>}
              </div>
            </div>

            <div style={{ background: 'oklch(0.99 0.005 80)', border: '1px solid oklch(0.87 0.012 68)', borderRadius: 14, padding: '22px 22px' }}>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.55 0.05 40)', marginBottom: 16 }}>Opening hours</div>
              {hourGroups.map(({ days, hours, closed }, i) => (
                <div key={days} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < hourGroups.length - 1 ? '1px solid oklch(0.91 0.012 70)' : 'none', fontSize: 13.5 }}>
                  <span style={{ color: 'oklch(0.30 0.012 32)' }}>{days}</span>
                  <span style={{ fontFamily: mono, color: closed ? 'oklch(0.60 0.02 40)' : 'oklch(0.42 0.012 34)' }}>{hours}</span>
                </div>
              ))}
              {biz.hoursNote && <div style={{ marginTop: 12, fontSize: 12.5, color: 'oklch(0.50 0.02 40)' }}>{biz.hoursNote}</div>}
            </div>

            {waQuestion && (
              <a href={waQuestion} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, border: '1px solid oklch(0.52 0.216 27 / 0.5)', color: 'oklch(0.50 0.216 27)', fontSize: 13.5, fontWeight: 600, padding: 14, borderRadius: 999 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.50 0.216 27)" /></svg>
                Just have a question?
              </a>
            )}
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section style={{ background: 'oklch(0.972 0.008 78)', borderTop: '1px solid oklch(0.86 0.012 68)', padding: '72px 0 84px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(28px,3.6vw,42px)', letterSpacing: '-0.015em', margin: '0 0 40px', color: 'oklch(0.19 0.012 32)' }}>What a visit <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>looks like.</span></h2>
          <div className="dc-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {[
              { n: '01', t: 'You book a slot', b: 'Send the form and we confirm a private time — no overlapping viewings.' },
              { n: '02', t: 'We pour tea', b: 'Sit with the fish. We’ll talk bloodline, husbandry, and what suits your setup.' },
              { n: '03', t: 'Take your time', b: 'No pressure to buy. Ask us to hold a fish while you prepare a tank.' },
              { n: '04', t: 'We stay in touch', b: 'Bought or not, our line stays open for the life of your fish.' },
            ].map((c) => (
              <div key={c.n} style={{ padding: '26px 24px', border: '1px solid oklch(0.86 0.012 68)', borderTop: '2px solid oklch(0.70 0.12 80)', borderRadius: 8, background: 'oklch(0.985 0.006 80)' }}>
                <div style={{ fontFamily: mono, fontSize: 12, color: 'oklch(0.50 0.216 27)', marginBottom: 14 }}>{c.n}</div>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, color: 'oklch(0.19 0.012 32)', marginBottom: 9 }}>{c.t}</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: 0 }}>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
