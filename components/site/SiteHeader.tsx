'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, Sun, Moon, Menu, X } from 'lucide-react';
import { DragonsCaveMark } from './ArowanaSilhouette';
import { useSiteCart } from '@/store/siteCart';
import { useTheme } from '@/store/theme';

const NAV_LINKS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/cave', label: 'The Cave' },
  { href: '/shop', label: 'Shop' },
  { href: '/journal', label: 'Journal' },
  { href: '/about', label: 'About' },
  { href: '/visit', label: 'Visit' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const items = useSiteCart((s) => s.items);
  const setOpen = useSiteCart((s) => s.setOpen);
  const itemCount = items.reduce((s, l) => s + l.qty, 0);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-250"
        style={{
          background: scrolled ? 'color-mix(in oklch, var(--bg) 88%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(140%)' : 'none',
          borderBottom: scrolled ? '1px solid var(--line-soft)' : '1px solid transparent',
        }}
      >
        <div
          className="site-container grid items-center"
          style={{ gridTemplateColumns: 'auto 1fr auto', gap: 32, padding: '18px 32px' }}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <DragonsCaveMark size={40} />
            <div className="leading-none hidden xs:block">
              <span
                className="display"
                style={{
                  fontSize: 14,
                  fontVariationSettings: '"opsz" 16, "wght" 800',
                  letterSpacing: '-0.005em',
                  display: 'block',
                }}
              >
                DRAGON&apos;S CAVE
              </span>
              <span className="placard" style={{ fontSize: 8.5, marginTop: 3 }}>
                EST. 2021 · QC, PH
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="site-nav hidden md:flex items-center gap-1 justify-self-center">
            {NAV_LINKS.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/');
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="a-link relative px-3.5 py-2"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                  }}
                >
                  {n.label}
                  {active && (
                    <span
                      className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full"
                      style={{ width: 4, height: 4, background: 'var(--red)' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="b b-icon hidden sm:inline-flex"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link href="/account" className="b b-icon hidden sm:inline-flex" aria-label="Account">
              <User size={15} />
            </Link>
            <button
              type="button"
              className="b b-icon relative"
              aria-label="Cart"
              onClick={() => setOpen(true)}
            >
              <ShoppingBag size={15} />
              {itemCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center"
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: 'var(--red)',
                    color: 'oklch(0.99 0 0)',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                    border: '2px solid var(--bg)',
                  }}
                >
                  {itemCount}
                </span>
              )}
            </button>
            <Link
              href="/visit"
              className="b b-primary b-sm hidden lg:inline-flex"
              style={{ marginLeft: 8 }}
            >
              Book a viewing
            </Link>
            <button
              type="button"
              className="b b-icon md:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={15} />
            </button>
          </div>
        </div>

        {/* Red accent hairline when scrolled */}
        <div
          className="absolute left-0 right-0 -bottom-px h-px"
          style={{ display: 'flex' }}
        >
          <div className="flex-1" style={{ background: 'transparent' }} />
          <div
            style={{
              width: 80,
              background: scrolled ? 'var(--red)' : 'transparent',
              transition: 'background 0.25s',
            }}
          />
          <div style={{ flex: 4, background: 'transparent' }} />
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[80] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0"
            onClick={() => setMobileOpen(false)}
            style={{ background: 'oklch(0 0 0 / 0.6)', backdropFilter: 'blur(8px)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 flex flex-col"
            style={{
              width: 'min(360px, 92vw)',
              background: 'var(--bg)',
              borderLeft: '1px solid var(--line)',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)' }}
            >
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <DragonsCaveMark size={32} />
                <span className="display" style={{ fontSize: 13, fontVariationSettings: '"opsz" 16, "wght" 800' }}>
                  DRAGON&apos;S CAVE
                </span>
              </Link>
              <button
                type="button"
                className="b b-icon"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + '/');
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-3 rounded text-[15px]"
                    style={{
                      color: active ? 'var(--ink)' : 'var(--ink-3)',
                      background: active ? 'var(--surface)' : 'transparent',
                    }}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-3 rounded text-[15px]"
                style={{ color: 'var(--ink-3)' }}
              >
                Account
              </Link>
            </nav>
            <div className="p-4 border-t" style={{ borderColor: 'var(--line)' }}>
              <Link
                href="/visit"
                onClick={() => setMobileOpen(false)}
                className="b b-primary b-lg w-full justify-center"
              >
                Book a viewing
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
