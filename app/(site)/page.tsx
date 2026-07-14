/* eslint-disable @next/next/no-img-element -- verbatim design port uses the design's <img> assets */

/**
 * Home — verbatim port of the imported Claude Design file
 * `dragons-cave-home.dc.html`. Header/footer come from the (site) layout.
 * Assets map to /public/img (red.png, 24k-gold.png, highback-gold.png).
 */

import Link from 'next/link';
import { WaIcon } from '@/components/dc/styles';

const WA_FEATURED =
  'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20I%27m%20interested%20in%20the%20featured%20Chili%20Super%20Red.%20Is%20it%20still%20available%3F';
const WA_VISIT =
  'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20I%27d%20like%20to%20arrange%20a%20gallery%20visit.';

const BLOODLINES = [
  { href: '/specimen-detail', img: '/img/red.png', alt: 'Super Red', tank: 'TANK III', kind: 'Asian Red', name: 'Chili Super Red', grade: 'Grade S', bg: 'radial-gradient(ellipse at 50% 36%, oklch(0.30 0.14 27), oklch(0.14 0.06 25))', shadow: '0 20px 44px -26px oklch(0.20 0.10 24 / 0.6)', w: '118%' },
  { href: '/specimen-detail', img: '/img/highback-gold.png', alt: 'Highback Gold', tank: 'TANK V', kind: 'Crossback Gold', name: 'Highback Golden', grade: 'Grade AAA', bg: 'radial-gradient(ellipse at 50% 36%, oklch(0.34 0.10 80), oklch(0.16 0.05 62))', shadow: '0 20px 44px -26px oklch(0.28 0.09 60 / 0.55)', w: '118%' },
  { href: '/specimen-detail', img: '/img/24k-gold.png', alt: '24K Gold', tank: 'TANK VIII', kind: '24K Golden', name: 'Emperor 24K', grade: 'Grade S', bg: 'radial-gradient(ellipse at 50% 36%, oklch(0.36 0.10 84), oklch(0.17 0.05 66))', shadow: '0 20px 44px -26px oklch(0.30 0.09 66 / 0.55)', w: '120%' },
];

const PROMISE = [
  { n: '01', t: 'Provenance', b: 'Every fish carries a microchip, a CITES certificate, and our hand-written lineage card.' },
  { n: '02', t: 'Quarantine', b: '21 days of observation in isolated systems before any specimen joins the gallery.' },
  { n: '03', t: 'Husbandry', b: 'Tank parameters monitored daily. Diet planned per specimen. We sweat the small things.' },
  { n: '04', t: 'Continuity', b: 'We answer the phone five years after the sale. Your fish has a long life to live.' },
];

const TESTIMONIALS = [
  { q: 'Mark put a fish on hold for me for three weeks while I finished my display tank. That kind of patience is rare.', in: 'KR', name: 'Karlo Reyes', role: 'Collector · Makati' },
  { q: 'The lineage card on my Chili Red traces back four generations. I have never seen that kind of documentation from any other dealer.', in: 'DL', name: 'Daniel Lim', role: 'Aquarist · Cebu' },
];

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

export default function HomePage() {
  return (
    <main>
      {/* ══════════ HERO ══════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 82% 30%, oklch(0.52 0.216 27 / 0.08), transparent 70%), radial-gradient(ellipse 50% 40% at 12% 85%, oklch(0.70 0.12 80 / 0.10), transparent 70%)' }} />
        <div style={{ position: 'absolute', left: -140, top: '52%', transform: 'translateY(-50%)', width: 640, opacity: 0.05, pointerEvents: 'none' }}>
          <img src="/img/highback-gold.png" alt="" style={{ width: '100%', display: 'block' }} draggable={false} />
        </div>

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 28px 84px', display: 'grid', gridTemplateColumns: '1.03fr 0.97fr', gap: 48, alignItems: 'center', minHeight: 'calc(100vh - 70px)' }}>
          {/* left */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 30 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'oklch(0.52 0.216 27)', boxShadow: '0 0 0 4px oklch(0.52 0.216 27 / 0.15)' }} />
              Featured this fortnight
            </div>
            <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(66px, 9.5vw, 150px)', lineHeight: 0.9, letterSpacing: '-0.02em', margin: '0 0 26px', color: 'oklch(0.19 0.012 32)' }}>
              Living<br /><span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>dragons.</span>
            </h1>
            <p style={{ fontSize: 'clamp(16px,1.35vw,19px)', lineHeight: 1.6, maxWidth: 452, color: 'oklch(0.40 0.012 34)', margin: '0 0 34px' }}>Museum-grade Asian arowana &mdash; the fish the old texts call a living dragon. Chosen for bloodline, raised for temperament, and kept in our gallery water until the right hands arrive.</p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href={WA_FEATURED} target="_blank" rel="noopener" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '15px 24px', borderRadius: 999, transition: 'background .2s', boxShadow: '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' }}>
                <WaIcon size={16} />
                Enquire on WhatsApp
              </a>
              <Link href="/catalog" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14, fontWeight: 600, padding: '15px 22px', borderRadius: 999, transition: '.2s' }}>Enter the gallery &rarr;</Link>
            </div>

            <div style={{ height: 1, background: 'oklch(0.84 0.012 66)', maxWidth: 452, margin: '44px 0 24px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 452 }}>
              {[['Grade', 'S'], ['Tank', 'VII'], ['Origin', 'Kapuas']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.55 0.02 40)', marginBottom: 6 }}>{k}</div>
                  <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, color: 'oklch(0.19 0.012 32)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right: moon-gate vitrine */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', writingMode: 'vertical-rl', textOrientation: 'mixed', left: -6, top: '50%', transform: 'translateY(-50%)', fontFamily: mono, fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'oklch(0.60 0.02 40)' }}>Chili Super Red &middot; No. SR&mdash;118</div>
            <div style={{ position: 'relative', width: 'min(72%, 460px)', aspectRatio: '1/1' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'radial-gradient(circle at 50% 44%, oklch(0.42 0.16 30), oklch(0.26 0.11 26) 52%, oklch(0.17 0.07 25) 100%)', boxShadow: '0 50px 90px -40px oklch(0.22 0.10 24 / 0.7), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.35)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 66% 46% at 50% 50%, oklch(0.95 0.07 62 / 0.34), transparent 68%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 22%, oklch(1 0 0 / 0.18), transparent 64%)' }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.45, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 8px, oklch(1 0 0 / 0.05) 8px 9px, transparent 9px)', backgroundSize: '26px 13px' }} />
                <div style={{ position: 'absolute', inset: 0, animation: 'dcSwim 7s ease-in-out infinite' }}>
                  <img src="/img/red.png" alt="Chili Super Red arowana" style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: '120%', maxWidth: 'none', filter: 'drop-shadow(0 20px 34px oklch(0 0 0 / 0.5))' }} draggable={false} />
                </div>
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, border: '1px solid oklch(0.70 0.12 80 / 0.6)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: -14, borderRadius: 999, border: '1px solid oklch(0.80 0.04 60 / 0.35)', pointerEvents: 'none' }} />

              <div style={{ position: 'absolute', top: '10%', left: '11%', fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'oklch(0.90 0.02 60 / 0.75)' }}>#SR&mdash;118 &middot; CITES</div>
              <div style={{ position: 'absolute', top: '9%', right: '11%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'oklch(0.70 0.14 82 / 0.16)', border: '1px solid oklch(0.72 0.13 82 / 0.5)', fontFamily: serif, fontWeight: 700, fontSize: 15, color: 'oklch(0.80 0.13 84)' }}>S</div>
              <div style={{ position: 'absolute', bottom: '11%', left: 0, right: 0, textAlign: 'center' }}>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: 'oklch(0.97 0.01 82)', letterSpacing: '-0.01em' }}>Chili Super Red</div>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.88 0.02 60 / 0.7)', marginTop: 4 }}>Grade S &middot; 1 of 1</div>
              </div>
            </div>

            <div style={{ position: 'absolute', top: '3%', left: '2%', width: 56, height: 56, borderRadius: 12, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px -10px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-6deg)', animation: 'dcDrift 6s ease-in-out infinite' }}>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color: 'oklch(0.97 0.012 82)' }}>龍</span>
            </div>
            <div style={{ position: 'absolute', bottom: '4%', left: '6%', transform: 'rotate(-3deg)', background: 'oklch(0.19 0.012 32)', color: 'oklch(0.97 0.01 82)', fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '7px 13px', borderRadius: 6, boxShadow: '0 10px 24px -12px oklch(0 0 0 / 0.6)' }}>Hold for me</div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 22, display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.58 0.02 40)' }}>Scroll <span style={{ width: 34, height: 1, background: 'oklch(0.62 0.02 40)' }} /></div>
      </section>

      {/* ══════════ TRUST RIBBON ══════════ */}
      <section style={{ background: 'oklch(0.50 0.216 27)', color: 'oklch(0.97 0.012 82)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, flexWrap: 'wrap', fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {['Microchipped', 'CITES certificate', '21-day quarantine', 'Hand-written lineage card', 'Live-arrival guarantee'].map((t, i, a) => (
            <span key={t} style={{ display: 'inline-flex', gap: 26, alignItems: 'center' }}>
              {t}
              {i < a.length - 1 && <span style={{ opacity: 0.5 }}>&middot;</span>}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════ YIN-YANG FEATURE ══════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)', padding: '110px 0 100px' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 'min(58vw,760px)', lineHeight: 1, color: 'oklch(0.52 0.216 27 / 0.035)', pointerEvents: 'none', userSelect: 'none' }}>龍</div>
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 18 }}>陰陽 &middot; Balance</div>
          <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,5vw,60px)', lineHeight: 1.02, letterSpacing: '-0.015em', margin: '0 auto 22px', maxWidth: 760, color: 'oklch(0.19 0.012 32)' }}>Fire and gold, held in <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>balance.</span></h2>
          <p style={{ fontSize: 17, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 60px', color: 'oklch(0.42 0.012 34)' }}>In feng shui the arowana carries luck through water &mdash; the red for fortune and vigour, the gold for wealth and standing. We pair the fish to the keeper, not the other way around.</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            <div style={{ position: 'relative', width: 'min(38vw,320px)', aspectRatio: '1/1', borderRadius: 999, background: 'radial-gradient(circle at 50% 40%, oklch(0.975 0.015 80), oklch(0.895 0.03 68) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.4), inset 0 -24px 54px oklch(0.55 0.10 40 / 0.12), 0 40px 70px -38px oklch(0.30 0.08 40 / 0.45)', zIndex: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'dcSwim 8s ease-in-out infinite' }}>
                <img src="/img/red.png" alt="Super Red arowana" style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%)', width: '112%', filter: 'drop-shadow(0 16px 26px oklch(0.40 0.10 30 / 0.32))' }} draggable={false} />
              </div>
              <div style={{ position: 'absolute', bottom: '13%', left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.42 0.11 32 / 0.75)' }}>陽 &middot; Fire</div>
            </div>
            <div style={{ position: 'relative', width: 'min(38vw,320px)', aspectRatio: '1/1', borderRadius: 999, background: 'radial-gradient(circle at 50% 40%, oklch(0.30 0.02 60), oklch(0.135 0.01 40) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.45), 0 40px 70px -36px oklch(0.16 0.02 40 / 0.6)', marginLeft: -52, zIndex: 1, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 64% 46% at 50% 46%, oklch(0.82 0.11 82 / 0.24), transparent 70%)' }} />
              <div style={{ position: 'absolute', inset: 0, animation: 'dcDrift 9s ease-in-out infinite' }}>
                <img src="/img/24k-gold.png" alt="24K Gold arowana" style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%) scaleX(-1)', width: '114%', filter: 'drop-shadow(0 16px 28px oklch(0 0 0 / 0.5))' }} draggable={false} />
              </div>
              <div style={{ position: 'absolute', bottom: '13%', left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.85 0.11 84 / 0.82)' }}>陰 &middot; Gold</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ BLOODLINES ══════════ */}
      <section id="bloodlines" style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', borderBottom: '1px solid oklch(0.86 0.012 68)', padding: '96px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 52, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>The bloodlines</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,4.6vw,56px)', lineHeight: 1, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>Five houses of <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>the dragon.</span></h2>
            </div>
            <Link href="/catalog" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '12px 20px', borderRadius: 999, transition: '.2s' }}>All specimens &rarr;</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
            {BLOODLINES.map((b) => (
              <Link key={b.name} href={b.href} className="dc-species" style={{ display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', background: b.bg, boxShadow: b.shadow }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 7px, oklch(1 0 0 / 0.05) 7px 8px, transparent 8px)', backgroundSize: '24px 12px' }} />
                  <img className="dc-species-img" src={b.img} alt={b.alt} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: b.w, filter: 'drop-shadow(0 16px 24px oklch(0 0 0 / 0.5))' }} draggable={false} />
                  <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'oklch(0.9 0.02 60 / 0.7)' }}>{b.tank}</div>
                </div>
                <div style={{ padding: '16px 4px 0' }}>
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 5 }}>{b.kind}</div>
                  <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, color: 'oklch(0.19 0.012 32)' }}>{b.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: 'oklch(0.50 0.216 27)', fontWeight: 600 }}>Enquire &rarr;</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: 'oklch(0.56 0.02 40)' }}>{b.grade}</span>
                  </div>
                </div>
              </Link>
            ))}

            <Link href="/catalog" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', aspectRatio: '3/4', borderRadius: 8, border: '1px dashed oklch(0.74 0.03 44)', background: 'oklch(0.972 0.008 78)', padding: 24, transition: '.25s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 12px 26px -12px oklch(0.52 0.216 27 / 0.7)' }}><span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 26, color: 'oklch(0.97 0.012 82)' }}>財</span></div>
              <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 20, color: 'oklch(0.19 0.012 32)', lineHeight: 1.2, marginBottom: 8 }}>Red Tail, Silver<br />&amp; Jardini</div>
              <div style={{ fontSize: 13, color: 'oklch(0.46 0.012 34)', marginBottom: 16 }}>The full gallery awaits.</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>Browse all &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ PROMISE / STORY ══════════ */}
      <section id="story" style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.972 0.008 78)', padding: '104px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 64, marginBottom: 56, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>The Cave &middot; our promise</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(34px,4.8vw,58px)', lineHeight: 0.98, letterSpacing: '-0.02em', margin: 0, color: 'oklch(0.19 0.012 32)' }}>Provenance,<br />then <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>patience.</span></h2>
            </div>
            <p style={{ fontSize: 20, lineHeight: 1.5, color: 'oklch(0.36 0.012 34)', maxWidth: 600, margin: 0 }}>Every arowana that crosses our threshold is identified, isolated, and observed for twenty-one days before it joins the gallery. We do not sell a fish until we would keep it ourselves.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {PROMISE.map((p) => (
              <div key={p.n} style={{ padding: '30px 26px', background: 'oklch(0.955 0.010 74)', border: '1px solid oklch(0.86 0.012 68)', borderTop: '2px solid oklch(0.70 0.12 80)', borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.216 27)', marginBottom: 16 }}>{p.n}</div>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 21, color: 'oklch(0.19 0.012 32)', marginBottom: 12 }}>{p.t}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'oklch(0.44 0.012 34)', margin: 0 }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ VISIT INVITE ══════════ */}
      <section style={{ background: 'oklch(0.972 0.008 78)', padding: '20px 0 100px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, background: 'radial-gradient(ellipse 80% 90% at 78% 20%, oklch(0.30 0.12 25), oklch(0.16 0.06 24) 62%, oklch(0.12 0.04 25) 100%)', border: '1px solid oklch(0.34 0.10 26)', boxShadow: '0 40px 90px -50px oklch(0.20 0.10 24 / 0.8)' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.28)', margin: 9, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: -70, top: '50%', transform: 'translateY(-50%)', width: 520, opacity: 0.5, pointerEvents: 'none' }}>
              <img src="/img/highback-gold.png" alt="" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 20px 40px oklch(0 0 0 / 0.5))', animation: 'dcDrift 10s ease-in-out infinite' }} draggable={false} />
            </div>
            <div style={{ position: 'relative', padding: 'clamp(40px,5.5vw,74px)', maxWidth: 620 }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.90 0.02 60 / 0.6)', marginBottom: 18 }}>By appointment</div>
              <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(36px,5.2vw,60px)', lineHeight: 0.98, letterSpacing: '-0.02em', margin: '0 0 22px', color: 'oklch(0.97 0.01 82)' }}>Visit the <span style={{ fontStyle: 'italic', color: 'oklch(0.74 0.16 40)' }}>gallery.</span></h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'oklch(0.90 0.01 70 / 0.82)', maxWidth: 440, margin: '0 0 34px' }}>Tuesday through Saturday, by appointment only. Bring a friend. We will pour tea. Take as long as you need with the fish.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44 }}>
                <Link href="/visit" className="dc-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.55 0.22 28)', color: 'oklch(0.98 0.012 82)', fontSize: 14, fontWeight: 600, padding: '15px 24px', borderRadius: 999, transition: '.2s' }}>Book a viewing &rarr;</Link>
                <a href={WA_VISIT} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.70 0.06 60 / 0.4)', color: 'oklch(0.95 0.01 74)', fontSize: 14, fontWeight: 600, padding: '15px 22px', borderRadius: 999 }}>Message us</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 520 }}>
                {[['Address', '34 Tomas Morato Ave', 'Quezon City'], ['Hours', 'Tue–Sat', '10:00–18:00'], ['Phone', '(02) 8851 4928', '+63 917 234 5678']].map(([h, a, b]) => (
                  <div key={h}>
                    <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.85 0.02 60 / 0.5)', marginBottom: 8 }}>{h}</div>
                    <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.5, color: 'oklch(0.92 0.01 70 / 0.85)' }}>{a}<br />{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', padding: '96px 0' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{ position: 'relative' }}>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 90, lineHeight: 0.6, color: 'oklch(0.52 0.216 27 / 0.28)', position: 'absolute', top: -14, left: -6 }}>&ldquo;</div>
                <p style={{ position: 'relative', fontFamily: serif, fontWeight: 500, fontSize: 23, lineHeight: 1.42, color: 'oklch(0.22 0.012 32)', margin: '0 0 24px' }}>{t.q}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 99, background: 'oklch(0.52 0.216 27 / 0.12)', color: 'oklch(0.50 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{t.in}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.22 0.012 32)' }}>{t.name}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(0.54 0.02 40)', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
