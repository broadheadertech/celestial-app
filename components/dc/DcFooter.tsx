'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { WaIcon } from './styles';
import { hoursSummary, useBusiness } from './business';
import { MessengerIcon } from './MessengerButton';

const footLink: CSSProperties = { color: 'oklch(0.34 0.012 32)', transition: 'color .2s' };
const colHead: CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'oklch(0.55 0.05 40)',
  marginBottom: 18,
};

/** Port of site-footer.dc.html (footer + floating WhatsApp FAB), wired to Business Details. */
export default function DcFooter() {
  const biz = useBusiness();
  const [days, time] = hoursSummary(biz.hours);
  const waHref = biz.wa(`Hi ${biz.storeName} — I'd like to enquire about your arowana.`);

  return (
    <>
      <footer style={{ position: 'relative', overflow: 'hidden', background: 'oklch(0.955 0.010 74)', borderTop: '1px solid oklch(0.84 0.012 66)', fontFamily: "'Geist', system-ui, sans-serif", color: 'oklch(0.34 0.012 32)' }}>
        <div style={{ position: 'absolute', right: -60, bottom: -70, width: 560, opacity: 0.05, pointerEvents: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/highback-gold.webp" alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} draggable={false} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, oklch(0.70 0.12 80 / 0.55), oklch(0.52 0.216 27 / 0.55), transparent)' }} />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '72px 28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 44 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/dc-logo-light.png" alt={biz.storeName} height={44} style={{ height: 44, width: 'auto', display: 'block' }} draggable={false} />
              <span style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 20, color: 'oklch(0.19 0.012 32)' }}>{biz.storeName}</span>
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
              <Link href="/shop" className="dc-foot-link" style={footLink}>Shop gear &amp; food</Link>
              <Link href="/visit" className="dc-foot-link" style={footLink}>Visit &amp; Book</Link>
              <Link href="/contact" className="dc-foot-link" style={footLink}>Contact</Link>
              <Link href="/track" className="dc-foot-link" style={footLink}>Track an order</Link>
            </div>
          </div>

          <div>
            <div style={colHead}>Gallery</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, lineHeight: 1.5 }}>
              {(biz.address || biz.city) && (
                <span>
                  {biz.address}
                  {biz.address && biz.city && <br />}
                  {biz.city}
                </span>
              )}
              {biz.loaded && (
                <span style={{ color: 'oklch(0.48 0.012 34)' }}>
                  {days}{time && <> &middot; {time}</>}
                  {biz.hoursNote && <><br />{biz.hoursNote}</>}
                </span>
              )}
            </div>
          </div>

          <div>
            <div style={colHead}>Enquire</div>
            {biz.phone && <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: 'oklch(0.30 0.012 32)', marginBottom: 6 }}>{biz.phone}</div>}
            {biz.email && <div style={{ fontSize: 13, color: 'oklch(0.48 0.012 34)', marginBottom: 18 }}><a href={`mailto:${biz.email}`}>{biz.email}</a></div>}
            {waHref ? (
              <a href={waHref} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999 }}>
                <WaIcon size={15} />
                Message us on WhatsApp
              </a>
            ) : (
              <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 999 }}>
                Contact us
              </Link>
            )}
            {biz.messenger && (
              <div style={{ marginTop: 10 }}>
                <a href={biz.messenger} target="_blank" rel="noopener" className="dc-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid oklch(0.78 0.02 40)', color: 'oklch(0.34 0.012 34)', fontSize: 13, fontWeight: 600, padding: '10px 17px', borderRadius: 999 }}>
                  <MessengerIcon size={15} />
                  Message us on Messenger
                </a>
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', borderTop: '1px solid oklch(0.86 0.012 68)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.50 0.012 36)' }}>&copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> {biz.storeName}{biz.city && <> &middot; {biz.city}, Philippines</>}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.04em', color: 'oklch(0.50 0.012 36)' }}>龍 &middot; Kept, not merely sold.</span>
          </div>
        </div>
      </footer>

      {waHref && (
        <a href={waHref} target="_blank" rel="noopener" className="dc-fab" aria-label="Enquire on WhatsApp" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80, width: 58, height: 58, borderRadius: 999, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px oklch(0.52 0.216 27 / 0.6)', animation: 'dcFabPulse 3.2s ease-in-out infinite', transition: 'transform .2s, box-shadow .2s' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" /><circle cx="9" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="12.5" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /><circle cx="16" cy="9" r="1.3" fill="oklch(0.52 0.216 27)" /></svg>
        </a>
      )}
    </>
  );
}
