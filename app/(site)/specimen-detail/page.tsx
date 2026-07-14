/* eslint-disable @next/next/no-img-element -- verbatim design port uses the design's <img> assets */

/**
 * Specimen — verbatim port of `dragons-cave-specimen.dc.html` (content only).
 * Static "Chili Super Red" detail (the design's single specimen).
 * Header / footer / styles come from the (site) layout.
 */

import Link from 'next/link';

const mono = "'Geist Mono', monospace";
const serif = "'Noto Serif Display', serif";

const WA_ENQUIRE = 'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20I%27d%20like%20to%20enquire%20about%20the%20Chili%20Super%20Red%20%28%23SR-118%2C%20Tank%20VII%29.%20Is%20it%20still%20available%3F';
const WA_VIDEO = 'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20could%20you%20send%20the%20full%20video%20of%20the%20Chili%20Super%20Red%20%28%23SR-118%29%3F';

const SPECS: [string, string][] = [['SKU', '#SR—118'], ['Tank', 'VII'], ['Origin', 'Kapuas Hulu'], ['Sex', 'Male']];
const LINEAGE: [string, string][] = [
  ['Sire', 'Kapuas Chili “Inferno” · Grade S'],
  ['Dam', 'Pontianak Red “Vermillion” · AAA'],
  ['Generation', 'F3 · captive-bred'],
  ['Microchip', '991 0023 5567 118'],
];
const HUSBANDRY: [string, string, string?][] = [
  ['Length · Age', '34 cm · 2 years'],
  ['Water', '28–30°C · pH 6.8'],
  ['Temperament', 'Dominant · keep solo'],
  ['Quarantine', '✓ Cleared · 21 days', 'oklch(0.42 0.14 150)'],
];
const MORE = [
  { img: '/img/red.png', flip: false, bg: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', aura: 'oklch(0.86 0.08 68 / 0.18)', kind: 'Asian Red · AAA', name: 'Blood Red — “Ember”' },
  { img: '/img/red.png', flip: true, bg: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', aura: 'oklch(0.86 0.08 68 / 0.18)', kind: 'Asian Red · AA', name: 'Ultra Red, 2yr' },
  { img: '/img/highback-gold.png', flip: false, bg: 'radial-gradient(circle at 50% 42%, oklch(0.34 0.10 80), oklch(0.16 0.05 62))', aura: 'oklch(0.86 0.10 82 / 0.2)', kind: 'Crossback Gold · AAA', name: 'Highback Golden' },
];

export default function SpecimenPage() {
  return (
    <>
      {/* breadcrumb */}
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '22px 28px 0', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: 'oklch(0.54 0.02 40)' }}>
          <Link href="/catalog" style={{ color: 'oklch(0.54 0.02 40)' }}>Catalog</Link>
          <span style={{ margin: '0 8px', color: 'oklch(0.72 0.02 50)' }}>/</span>
          <span style={{ color: 'oklch(0.30 0.012 32)' }}>Chili Super Red</span>
        </div>
      </div>

      {/* MAIN */}
      <section style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '28px 28px 80px', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'start' }}>
          {/* LEFT: vitrine */}
          <div style={{ position: 'sticky', top: 96 }}>
            <div style={{ position: 'relative', aspectRatio: '5/4', borderRadius: 12, overflow: 'hidden', background: 'radial-gradient(ellipse 92% 82% at 50% 42%, oklch(0.975 0.015 80), oklch(0.898 0.03 66) 100%)', boxShadow: 'inset 0 0 0 1px oklch(0.70 0.12 80 / 0.4), inset 0 -30px 64px oklch(0.55 0.10 40 / 0.10), 0 44px 90px -48px oklch(0.30 0.08 40 / 0.45)' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 9px, oklch(0.55 0.10 40 / 0.05) 9px 10px, transparent 10px)', backgroundSize: '30px 15px' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6%' }}>
                <div style={{ position: 'relative', width: '100%', animation: 'dcSwim 8s ease-in-out infinite' }}>
                  <img src="/img/red.png" alt="Chili Super Red arowana" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 24px 40px oklch(0.35 0.10 30 / 0.35))' }} draggable={false} />
                </div>
              </div>
              <div style={{ position: 'absolute', top: 18, left: 20, fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'oklch(0.40 0.06 34 / 0.7)' }}>#SR&mdash;118 &middot; CITES A-PH-2021-00842</div>
              <div style={{ position: 'absolute', top: 16, right: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 30, borderRadius: 7, background: 'oklch(0.50 0.216 27)', fontFamily: serif, fontWeight: 700, fontSize: 16, color: 'oklch(0.98 0.012 82)', boxShadow: '0 8px 20px -8px oklch(0.52 0.216 27 / 0.6)' }}>S</div>
              <div style={{ position: 'absolute', bottom: 18, left: 20 }}>
                <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 24, color: 'oklch(0.19 0.012 32)', letterSpacing: '-0.01em' }}>Chili Super Red</div>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.46 0.06 34 / 0.8)', marginTop: 4 }}>Single specimen &middot; 1 of 1</div>
              </div>
              <div style={{ position: 'absolute', bottom: 16, right: 18, width: 44, height: 44, borderRadius: 9, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px -10px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-5deg)' }}>
                <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 24, color: 'oklch(0.97 0.012 82)' }}>龍</span>
              </div>
            </div>
            {/* thumbs */}
            <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center' }}>
              <div className="dc-thumb" style={{ position: 'relative', width: 76, aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', border: '1px solid oklch(0.52 0.216 27 / 0.5)' }}><img src="/img/red.png" alt="" style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%)', width: '120%' }} draggable={false} /></div>
              <div className="dc-thumb" style={{ position: 'relative', width: 76, aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', border: '1px solid oklch(0.82 0.02 50)' }}><img src="/img/red.png" alt="" style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%) scaleX(-1)', width: '120%' }} draggable={false} /></div>
              <div className="dc-thumb" style={{ position: 'relative', width: 76, aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, oklch(0.30 0.015 50), oklch(0.15 0.01 40))', border: '1px solid oklch(0.82 0.02 50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', textAlign: 'center', color: 'oklch(0.80 0.02 60)', lineHeight: 1.4 }}>+4<br />ANGLES</span></div>
              <a href={WA_VIDEO} target="_blank" rel="noopener" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.50 0.216 27)', border: '1px solid oklch(0.52 0.216 27 / 0.4)', borderRadius: 999, padding: '9px 13px' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(0.52 0.216 27)' }} /> Full video on request
              </a>
            </div>
          </div>

          {/* RIGHT: details */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 14 }}>Asian Red &middot; Grade S</div>
            <h1 style={{ fontFamily: serif, fontWeight: 800, fontSize: 'clamp(40px,5vw,66px)', lineHeight: 0.96, letterSpacing: '-0.02em', margin: '0 0 20px', color: 'oklch(0.19 0.012 32)' }}>Chili Super <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'oklch(0.50 0.216 27)' }}>Red</span></h1>
            <p style={{ fontSize: 17, lineHeight: 1.62, color: 'oklch(0.40 0.012 34)', maxWidth: 520, margin: '0 0 30px' }}>A deep-bodied Kapuas chili with high-coverage scales and a temperament we&rsquo;ve watched settle over two years. The kind of fish you build a room around.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px 20px', padding: '24px 0', borderTop: '1px solid oklch(0.86 0.012 68)', borderBottom: '1px solid oklch(0.86 0.012 68)', marginBottom: 30 }}>
              {SPECS.map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', marginBottom: 6 }}>{k}</div>
                  <div style={{ fontFamily: mono, fontSize: 14, color: 'oklch(0.24 0.012 32)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <a href={WA_ENQUIRE} target="_blank" rel="noopener" className="dc-btn-primary" style={{ flex: 1, minWidth: 220, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 14.5, fontWeight: 600, padding: '16px 24px', borderRadius: 999, transition: '.2s', boxShadow: '0 14px 32px -14px oklch(0.52 0.216 27 / 0.7)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /><circle cx="9" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /><circle cx="12.5" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /><circle cx="16" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" /></svg>
                Enquire on WhatsApp
              </a>
              <Link href="/visit" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 14.5, fontWeight: 600, padding: '16px 22px', borderRadius: 999, transition: '.2s' }}>Book a viewing</Link>
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: 'oklch(0.54 0.02 40)', marginBottom: 34 }}>&#9679; Available now &mdash; ask us to hold for up to 21 days while you prepare your tank.</div>

            {/* lineage card */}
            <div style={{ position: 'relative', border: '1px solid oklch(0.82 0.03 46)', borderRadius: 10, overflow: 'hidden', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'oklch(0.50 0.216 27)', color: 'oklch(0.98 0.012 82)' }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Lineage card</span>
                <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 16 }}>龍</span>
              </div>
              <div style={{ padding: '6px 20px 16px', background: 'oklch(0.985 0.006 80)' }}>
                {LINEAGE.map(([k, v], i) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < LINEAGE.length - 1 ? '1px solid oklch(0.90 0.012 70)' : 'none' }}>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)' }}>{k}</span>
                    <span style={{ fontFamily: k === 'Microchip' ? mono : undefined, fontSize: k === 'Microchip' ? 13 : 13.5, color: 'oklch(0.24 0.012 32)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* husbandry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 2, background: 'oklch(0.88 0.012 68)', border: '1px solid oklch(0.88 0.012 68)', borderRadius: 10, overflow: 'hidden' }}>
              {HUSBANDRY.map(([k, v, color]) => (
                <div key={k} style={{ background: 'oklch(0.985 0.006 80)', padding: '16px 18px' }}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.56 0.02 40)', marginBottom: 6 }}>{k}</div>
                  <div style={{ fontSize: 14, color: color || 'oklch(0.24 0.012 32)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROVENANCE / CARE */}
      <section style={{ background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.86 0.012 68)', borderBottom: '1px solid oklch(0.86 0.012 68)', padding: '76px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>Provenance</div>
            <h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, margin: '0 0 14px', color: 'oklch(0.19 0.012 32)' }}>Where this fish comes from</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'oklch(0.40 0.012 34)', margin: 0 }}>Bred at a licensed farm on the Kapuas river system and imported under CITES permit. We received the fish at eight months, chipped and papered, and have grown it on in our own systems since. The lineage card above is written by hand and travels with the fish.</p>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(0.50 0.14 30)', marginBottom: 16 }}>Care</div>
            <h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, margin: '0 0 14px', color: 'oklch(0.19 0.012 32)' }}>What it needs to thrive</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'oklch(0.40 0.012 34)', margin: 0 }}>A minimum 6&times;2&times;2 ft aquarium with a tight lid, gentle current, and a varied diet. This is a dominant individual and is happiest kept alone. We&rsquo;ll walk you through acclimatisation on collection and remain on call for the life of the fish.</p>
          </div>
        </div>
      </section>

      {/* MORE FROM BLOODLINE */}
      <section style={{ background: 'oklch(0.972 0.008 78)', padding: '76px 0 96px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 34, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 'clamp(26px,3.4vw,40px)', margin: 0, color: 'oklch(0.19 0.012 32)', letterSpacing: '-0.015em' }}>More from the <span style={{ fontStyle: 'italic', color: 'oklch(0.50 0.216 27)' }}>red house.</span></h3>
            <Link href="/catalog" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999, transition: '.2s' }}>All Asian Red &rarr;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {MORE.map((m) => (
              <Link key={m.name} href="/specimen-detail" className="dc-more" style={{ display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', background: m.bg, boxShadow: '0 20px 44px -26px oklch(0.16 0.02 40 / 0.6), inset 0 0 0 1px oklch(0.70 0.12 80 / 0.25)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 66% 46% at 50% 47%, ${m.aura}, transparent 70%)` }} />
                  <img className="dc-more-img" src={m.img} alt={m.name} style={{ position: 'absolute', left: '50%', top: '47%', transform: `translate(-50%,-50%)${m.flip ? ' scaleX(-1)' : ''}`, width: '104%' }} draggable={false} />
                </div>
                <div style={{ padding: '14px 4px 0' }}>
                  <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.54 0.03 34)', marginBottom: 5 }}>{m.kind}</div>
                  <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 18, color: 'oklch(0.19 0.012 32)' }}>{m.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
