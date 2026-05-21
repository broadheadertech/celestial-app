'use client';

import { useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';

const TIMES = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const INTERESTS = ['Asian Red', 'Crossback Gold', 'Red Tail Gold', 'Silver / Jardini', 'Browsing'];

export default function VisitPage() {
  const { user } = useAuthStore();
  const createViewing = useMutation(api.services.viewings.createViewing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('14:00');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('Browsing');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createViewing({
        name,
        email,
        phone,
        date,
        time,
        partySize,
        interest,
        notes: notes || undefined,
        userId: user?._id as Id<'users'> | undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book viewing. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-4" style={{ color: 'var(--red-hi)' }}>By appointment</div>
          <h1 className="display-xl mb-5" style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}>
            Visit the <em className="italic-flourish">gallery.</em>
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
            Bring a friend. We&apos;ll pour coffee. You can take as long as you need to find the
            right fish.
          </p>
        </div>
      </section>

      <section className="py-10" style={{ padding: '0 0 80px' }}>
        <div
          className="site-container grid gap-10"
          style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}
        >
          {/* Booking form */}
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
                  Held for you.
                </h2>
                <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 440, margin: '0 auto' }}>
                  We&apos;ll send a confirmation to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. See
                  you on <strong style={{ color: 'var(--ink)' }}>{date}</strong> at{' '}
                  <strong style={{ color: 'var(--ink)' }}>{time}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="placard">Pick your slot</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="placard mb-1.5">Date</div>
                    <div className="relative">
                      <Calendar
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--ink-4)' }}
                      />
                      <input
                        type="date"
                        className="input [color-scheme:dark]"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ paddingLeft: 36 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="placard mb-1.5">Time</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className="py-2 rounded text-[11px] font-semibold border"
                          style={{
                            borderColor: time === t ? 'var(--red)' : 'var(--line)',
                            background: time === t ? 'var(--red-wash)' : 'var(--bg-2)',
                            color: time === t ? 'var(--red-hi)' : 'var(--ink-2)',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="placard mb-1.5">Party size</div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPartySize(n)}
                        className="flex-1 py-2.5 rounded text-[13px] font-semibold border"
                        style={{
                          borderColor: partySize === n ? 'var(--red)' : 'var(--line)',
                          background: partySize === n ? 'var(--red-wash)' : 'var(--bg-2)',
                          color: partySize === n ? 'var(--red-hi)' : 'var(--ink-2)',
                        }}
                      >
                        {n}
                        {n === 5 && '+'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="placard mb-1.5">Interest</div>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERESTS.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInterest(i)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-semibold border"
                        style={{
                          borderColor: interest === i ? 'var(--red)' : 'var(--line)',
                          background: interest === i ? 'var(--red)' : 'transparent',
                          color: interest === i ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="hairline my-1" />

                <div className="placard">Your details</div>
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
                      required
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
                  <div className="placard mb-1.5">Notes (optional)</div>
                  <textarea
                    rows={3}
                    className="input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything we should know — tank size at home, budget band, time you have…"
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
                  className="b b-primary b-lg mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending…' : 'Confirm booking'}
                  {!isSubmitting && <ArrowRight size={14} />}
                </button>
              </form>
            )}
          </div>

          {/* Gallery card */}
          <aside
            className="rounded overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--oxblood), oklch(0 0 0) 80%)',
              border: '1px solid var(--line)',
              color: 'oklch(0.99 0 0)',
            }}
          >
            <div className="p-7">
              <div className="placard mb-3" style={{ color: 'oklch(0.99 0 0 / 0.55)' }}>
                The gallery
              </div>
              <h3
                className="display mb-4"
                style={{ fontSize: 24, fontVariationSettings: '"opsz" 28, "wght" 700' }}
              >
                34 Tomas Morato
              </h3>
              <p
                className="mb-7 text-[14px]"
                style={{ color: 'oklch(0.99 0 0 / 0.78)', lineHeight: 1.55 }}
              >
                Above the bookshop, second floor. Ring the brass bell on the door. We don&apos;t
                accept walk-ins so the fish get the room they need.
              </p>

              <div className="flex flex-col gap-5">
                {[
                  { icon: MapPin, label: 'Address', value: '34 Tomas Morato Ave\nQuezon City' },
                  { icon: Clock, label: 'Hours', value: 'Tue–Sat · 10:00 – 18:00' },
                  { icon: Users, label: 'Capacity', value: 'Up to 5 guests per booking' },
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
    </main>
  );
}
