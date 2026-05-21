'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DragonsCaveMark } from './ArowanaSilhouette';

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Catalog: [
    { label: 'Asian Red', href: '/catalog' },
    { label: 'Crossback Gold', href: '/catalog' },
    { label: 'Red Tail Gold', href: '/catalog' },
    { label: 'Silver Arowana', href: '/catalog' },
    { label: 'Jardini & Pearl', href: '/catalog' },
  ],
  Shop: [
    { label: 'Tanks', href: '/shop' },
    { label: 'Filtration', href: '/shop' },
    { label: 'Food', href: '/shop' },
    { label: 'Lighting', href: '/shop' },
    { label: 'Medicine', href: '/shop' },
  ],
  Studio: [
    { label: 'About', href: '/about' },
    { label: 'Visit', href: '/visit' },
    { label: 'Journal', href: '/journal' },
    { label: 'Contact', href: '/contact' },
  ],
  Account: [
    { label: 'Sign in', href: '/auth/login' },
    { label: 'My orders', href: '/account' },
    { label: 'Reservations', href: '/account' },
    { label: 'Wishlist', href: '/account' },
  ],
};

export default function SiteFooter() {
  return (
    <footer
      style={{
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--line)',
        marginTop: 80,
        padding: '64px 0 28px',
      }}
    >
      <div className="site-container">
        {/* Big mark + tagline + newsletter */}
        <div
          className="grid gap-8 pb-14 items-end"
          style={{ gridTemplateColumns: '1fr auto', borderBottom: '1px solid var(--line-soft)' }}
        >
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <DragonsCaveMark size={42} />
              <div>
                <div
                  className="display"
                  style={{ fontSize: 18, fontVariationSettings: '"opsz" 24, "wght" 800' }}
                >
                  DRAGON&apos;S CAVE
                </div>
                <div className="placard">Home of Premium Arowanas</div>
              </div>
            </div>
            <p
              className="max-w-[480px]"
              style={{
                fontSize: 18,
                lineHeight: 1.4,
                color: 'var(--ink-2)',
                fontVariationSettings: '"opsz" 22, "wght" 500',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                letterSpacing: '-0.015em',
              }}
            >
              A small studio in Quezon City for the patient collector. We hold fish until they are
              ready, then we hand them over.
            </p>
          </div>
          <div className="text-right">
            <div className="placard">Newsletter</div>
            <div className="flex gap-2 mt-3">
              <input className="input" placeholder="you@studio.com" style={{ minWidth: 240 }} />
              <button className="b b-primary" type="button" aria-label="Subscribe">
                <ArrowRight size={12} />
              </button>
            </div>
            <div className="text-[11px] mt-2" style={{ color: 'var(--ink-4)' }}>
              One letter per quarter. New arrivals only.
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div
          className="grid gap-8 py-10"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <div className="placard mb-4">{title}</div>
              <div className="flex flex-col gap-2">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="a-link text-[13px]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr className="hairline" />

        <div
          className="flex justify-between items-center flex-wrap gap-3 pt-5 text-[11px]"
          style={{ color: 'var(--ink-4)' }}
        >
          <div>© 2026 Dragon&apos;s Cave Aquatic Studio · DTI No. 11892-Q</div>
          <div className="flex gap-4">
            <Link href="#" className="a-link">Privacy</Link>
            <Link href="#" className="a-link">Terms</Link>
            <Link href="#" className="a-link">CITES</Link>
            <Link href="#" className="a-link">Press</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
