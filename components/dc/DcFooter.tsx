import type { CSSProperties } from 'react';
import Link from 'next/link';
import { WA_ENQUIRE, WaIcon } from './styles';

const footLink: CSSProperties = { color: 'oklch(0.34 0.012 32)', transition: 'color .2s' };
const colHead: CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'oklch(0.55 0.05 40)',
  marginBottom: 18,
};

/** Verbatim port of site-footer.dc.html (footer + floating WhatsApp FAB) */
export default function DcFooter() {
  return (
    <>
      <footer style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.84 0.012 66)', fontFamily: "'Geist', system-ui, sans-serif", color: 'oklch(0.34 0.012 32)' }}>
        <div style={{ position: 'absolute', right: -60, bottom: -70, width: 560, opacity: 0.05, pointerEvents: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/highback-gold.png" alt="" style={{ width: '100%', display: 'block' }} draggable={false} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, oklch(0.70 0.12 80 / 0.55), oklch(0.52 0.216 27 / 0.55), transparent)' }} />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '72px 28px 32px', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.2fr', gap: 44 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/dc-logo-light.png" alt="Dragon's Cave" height={44} style={{ height: 44, width: 'auto', display: 'block' }} draggable={false} />
              <span style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 20, color: 'oklch(0.19 0.012 32)' }}>Dragon&rsquo;s Cave</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.65, maxWidth: 320, color: 'oklch(0.42 0.012 34)', margin: '0 0 22px' }}>Home of premium Asian arowana &mdash; the living dragon. Every specimen chipped, certified, and quarantined before it meets our gallery water.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.52 0.10 30)', border: '1px solid oklch(0.82 0.03 40)', borderRadius: 999, padding: '7px 14px' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(0.55 0.14 150)' }} /> CITES-certified dealer
            </div>
          </div>

          <div>
            <div style={colHead}>Explore</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <Link href="/" className="dc-foot-link" style={footLink}>Home</Link>
              <Link href="/catalog" className="dc-foot-link" style={footLink}>The Catalog</Link>
              <Link href="/cave" className="dc-foot-link" style={footLink}>The Cave</Link>
              <Link href="/visit" className="dc-foot-link" style={footLink}>Visit &amp; Book</Link>
            </div>
          </div>

          <div>
            <div style={colHead}>Gallery</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, lineHeight: 1.5 }}>
              <span>34 Tomas Morato Ave<br />Quezon City, PH</span>
              <span style={{ color: 'oklch(0.48 0.012 34)' }}>Tue&ndash;Sat &middot; 10:00&ndash;18:00<br />By appointment</span>
            </div>
          </div>

          <div>
            <div style={colHead}>Enquire</div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: 'oklch(0.30 0.012 32)', marginBottom: 6 }}>+63 917 234 5678</div>
            <div style={{ fontSize: 13, color: 'oklch(0.48 0.012 34)', marginBottom: 18 }}>hello@dragonscave.ph</div>
            <a href={WA_ENQUIRE} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999 }}>
              <WaIcon size={15} />
              Message us on WhatsApp
            </a>
          </div>
        </div>

        <div style={{ position: 'relative', borderTop: '1px solid oklch(0.86 0.012 68)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.56 0.012 36)' }}>&copy; 2026 Dragon&rsquo;s Cave &middot; Quezon City, Philippines</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.56 0.012 36)' }}>龍 &middot; Kept, not merely sold.</span>
          </div>
        </div>
      </footer>

      <a href={WA_ENQUIRE} target="_blank" rel="noopener" className="dc-fab" aria-label="Enquire on WhatsApp" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80, width: 58, height: 58, borderRadius: 999, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px oklch(0.52 0.216 27 / 0.6)', animation: 'dcFabPulse 3.2s ease-in-out infinite', transition: 'transform .2s, box-shadow .2s' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /><circle cx="9" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="12.5" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="16" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /></svg>
      </a>
    </>
  );
}
