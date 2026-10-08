'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useSiteCart } from '@/store/siteCart';
import { useBusiness } from './business';
import Brand from './kit/Brand';
import { BagIcon, CaretIcon, CloseIcon, MenuIcon, SearchIcon, SignInIcon } from './kit/icons';

type HeaderTheme = 'light' | 'dark' | 'mist';

const NAV = [
  { key: 'catalog', href: '/catalog', label: 'Catalog' },
  { key: 'cave', href: '/cave', label: 'The Cave' },
  { key: 'shop', href: '/shop', label: 'Shop' },
  { key: 'visit', href: '/visit', label: 'Visit' },
  { key: 'service', href: '/home-service', label: 'Home service' },
] as const;

function activeKey(pathname: string) {
  if (pathname === '/cave') return 'cave';
  if (pathname.startsWith('/catalog')) return 'catalog';
  if (pathname.startsWith('/shop')) return 'shop';
  if (pathname.startsWith('/visit')) return 'visit';
  if (pathname.startsWith('/home-service')) return 'service';
  return 'home';
}

/** Header colourway per page, as in the reference: Shop is dark, Visit is misty, the rest light. */
function themeFor(pathname: string): HeaderTheme {
  if (pathname.startsWith('/shop')) return 'dark';
  if (pathname.startsWith('/visit')) return 'mist';
  return 'light';
}

/** Store name sub-line from Business Details, e.g. "Est. 20 · Malolos City". */
function useSubline() {
  const biz = useBusiness();
  return [biz.establishedYear && `Est. ${biz.establishedYear}`, biz.city].filter(Boolean).join(' · ');
}

/** Sticky site header (Cave / Shop / Visit and the other storefront pages). Home draws its own nav in the hero. */
export default function DcHeader() {
  const pathname = usePathname();
  const biz = useBusiness();
  const subline = useSubline();
  const [menuOpen, setMenuOpen] = useMenuToggle(pathname);
  if (pathname === '/') return null;

  const theme = themeFor(pathname);
  const active = activeKey(pathname);
  const onDark = theme === 'dark';

  return (
    <header className="dk dk-header" data-theme={theme}>
      <div className="dk-hd-bar">
        <Brand name={biz.storeName} sub={subline} onDark={onDark} />
        <nav aria-label="Primary">
          <ul className="dk-hd-links">
            {NAV.map((n) => (
              <li key={n.key}>
                <Link href={n.href} aria-current={active === n.key ? 'page' : undefined}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="dk-hd-actions">
          <AccountControl signInClass="dk-hd-signin" />
          <CartButton />
          <EnquireLink className="dk-btn dk-btn-red dk-hd-cta" />
          <MenuToggle open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} className="dk-icon-btn dk-hd-menu" />
        </div>
      </div>
      {menuOpen && <MobileMenu active={active} />}
    </header>
  );
}

/** The nav row inside the Home hero card (white on the red gradient). */
export function HeroNav() {
  const pathname = usePathname();
  const biz = useBusiness();
  const subline = useSubline();
  const [menuOpen, setMenuOpen] = useMenuToggle(pathname);

  return (
    <nav className="dk-nav" aria-label="Primary">
      <Brand name={biz.storeName} sub={subline} onDark />
      <ul className="dk-nav-links">
        {NAV.map((n) => (
          <li key={n.key}><Link href={n.href}>{n.label}</Link></li>
        ))}
      </ul>
      <div className="dk-nav-actions">
        <AccountControl signInClass="dk-nav-signin" />
        <Link className="dk-icon-btn search" href="/catalog" aria-label="Search">
          <SearchIcon size={14} />
        </Link>
        <CartButton />
        <EnquireLink className="dk-btn dk-btn-red dk-nav-cta" />
        <MenuToggle open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} className="dk-icon-btn dk-menu-toggle" />
      </div>
      {menuOpen && <MobileMenu active={activeKey(pathname)} />}
    </nav>
  );
}

/** Mobile menu open state: closes on navigation and on Escape. */
function useMenuToggle(pathname: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return [open, setOpen] as const;
}

function MenuToggle({ open, onToggle, className }: { open: boolean; onToggle: () => void; className: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="dk-mobile-nav"
      aria-label={open ? 'Close menu' : 'Open menu'}
    >
      {open ? <CloseIcon /> : <MenuIcon />}
    </button>
  );
}

/** "Inquire" — WhatsApp with a prefilled message when a number is set (Business Details), else /contact. */
function EnquireLink({ className }: { className: string }) {
  const biz = useBusiness();
  const external = biz.generalHref.startsWith('http');
  return (
    <a href={biz.generalHref} target={external ? '_blank' : undefined} rel="noopener" className={className}>
      Inquire
    </a>
  );
}

/** Dropdown panel shown below the header bar on phones. */
function MobileMenu({ active }: { active: string }) {
  return (
    <nav id="dk-mobile-nav" className="dk-mnav" aria-label="Menu">
      <Link href="/catalog" aria-current={active === 'catalog' ? 'page' : undefined}>Catalog</Link>
      <Link href="/cave" aria-current={active === 'cave' ? 'page' : undefined}>The Cave</Link>
      <Link href="/shop" aria-current={active === 'shop' ? 'page' : undefined}>Shop gear &amp; food</Link>
      <Link href="/visit" aria-current={active === 'visit' ? 'page' : undefined}>Visit &amp; Book</Link>
      <Link href="/home-service" aria-current={active === 'service' ? 'page' : undefined}>Home service</Link>
      <Link href="/contact">Contact</Link>
      <Link href="/track">Track an order</Link>
      <hr />
      <MobileAccountLinks />
    </nav>
  );
}

/** Account entries in the mobile menu (the account dropdown is hidden on small screens). */
function MobileAccountLinks() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!user) return <Link href="/auth/login">Sign in <SignInIcon size={20} /></Link>;
  const isStaff = user.role === 'admin' || user.role === 'super_admin';
  return (
    <>
      <Link href="/account">My account</Link>
      {isStaff && <Link href="/admin/dashboard">Admin dashboard</Link>}
      <button
        type="button"
        onClick={() => {
          logout();
          router.push('/');
        }}
      >
        Sign out
      </button>
    </>
  );
}

/** Opens the cart drawer; shows the item count once the persisted cart has loaded. */
function CartButton() {
  const count = useSiteCart((s) => s.items.reduce((n, l) => n + l.qty, 0));
  const setOpen = useSiteCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = mounted ? count : 0;

  return (
    <button
      type="button"
      className="dk-icon-btn bag"
      onClick={() => setOpen(true)}
      aria-label={shown ? `Cart, ${shown} item${shown === 1 ? '' : 's'}` : 'Cart'}
    >
      <BagIcon />
      {shown > 0 && <span className="dk-count" aria-hidden="true">{shown > 99 ? '99+' : shown}</span>}
    </button>
  );
}

/** "Sign in" for guests; name + menu (account / admin dashboard / sign out) for signed-in users. */
function AccountControl({ signInClass }: { signInClass: string }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // The auth store rehydrates from localStorage, so wait for mount to avoid a hydration mismatch.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!mounted) return null;

  if (!user) {
    return (
      <Link href="/auth/login" className={signInClass}>
        Sign in <SignInIcon />
      </Link>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC';
  const isStaff = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div ref={ref} className="dk-acct">
      <button
        type="button"
        className="dk-acct-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="dk-avatar">{initials}</span>
        <span>{user.firstName || 'Account'}</span>
        <CaretIcon />
      </button>

      {open && (
        <div role="menu" className="dk-menu">
          <div className="dk-menu-head">
            <b>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collector'}</b>
            <small>{user.email}</small>
          </div>
          <Link href="/account" role="menuitem" className="dk-menu-item" onClick={() => setOpen(false)}>
            My account
          </Link>
          {isStaff && (
            <Link href="/admin/dashboard" role="menuitem" className="dk-menu-item" onClick={() => setOpen(false)}>
              Admin dashboard
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="dk-menu-item danger"
            onClick={() => {
              setOpen(false);
              logout();
              router.push('/');
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
