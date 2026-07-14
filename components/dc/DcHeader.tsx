'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WA_ENQUIRE, WaIcon } from './styles';

/** Verbatim port of site-header.dc.html */
export default function DcHeader() {
  const pathname = usePathname();
  const active =
    pathname === '/cave'
      ? 'cave'
      : pathname.startsWith('/catalog')
        ? 'catalog'
        : pathname.startsWith('/visit')
          ? 'visit'
          : 'home';

  const dot = (
    <span
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 2,
        transform: 'translateX(-50%)',
        width: 5,
        height: 5,
        borderRadius: 99,
        background: 'oklch(0.52 0.216 27)',
      }}
    />
  );
  const linkStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.01em',
    color: 'oklch(0.40 0.012 36)',
    padding: '8px 14px',
    transition: 'color .2s',
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'oklch(0.972 0.008 78 / 0.82)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid oklch(0.84 0.012 66 / 0.7)',
        fontFamily: "'Geist', system-ui, sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, maxWidth: 1280, margin: '0 auto', padding: '14px 28px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/dc-logo-light.png" alt="Dragon's Cave" height={40} style={{ display: 'block', height: 40, width: 'auto' }} draggable={false} />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.01em', color: 'oklch(0.19 0.012 32)' }}>Dragon&rsquo;s Cave</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.52 0.10 30)', marginTop: 4 }}>Est. 2021 &middot; Quezon City</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Link href="/catalog" className="dc-navlink" style={linkStyle}>Catalog</Link>
            {active === 'catalog' && dot}
          </span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Link href="/cave" className="dc-navlink" style={linkStyle}>The Cave</Link>
            {active === 'cave' && dot}
          </span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Link href="/visit" className="dc-navlink" style={linkStyle}>Visit</Link>
            {active === 'visit' && dot}
          </span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -8px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-3deg)' }}>
            <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 22, lineHeight: 1, color: 'oklch(0.97 0.012 82)' }}>龍</span>
          </div>
          <a href={WA_ENQUIRE} target="_blank" rel="noopener" className="dc-enquire" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', padding: '10px 16px', borderRadius: 999, transition: 'background .2s' }}>
            <WaIcon size={14} />
            Enquire
          </a>
        </div>
      </div>
    </header>
  );
}
