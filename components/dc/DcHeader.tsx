'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ShoppingBag, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useSiteCart } from '@/store/siteCart';
import { WaIcon } from './styles';
import { useBusiness } from './business';

/** Verbatim port of site-header.dc.html */
export default function DcHeader() {
  const pathname = usePathname();
  const biz = useBusiness();
  const active =
    pathname === '/cave'
      ? 'cave'
      : pathname.startsWith('/catalog')
        ? 'catalog'
        : pathname.startsWith('/shop')
          ? 'shop'
          : pathname.startsWith('/visit')
            ? 'visit'
            : 'home';
  const subline = [biz.establishedYear && `Est. ${biz.establishedYear}`, biz.city].filter(Boolean).join(' · ');

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
            {subline && <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.52 0.10 30)', marginTop: 4 }}>{subline}</span>}
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
            <Link href="/shop" className="dc-navlink" style={linkStyle}>Shop</Link>
            {active === 'shop' && dot}
          </span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Link href="/visit" className="dc-navlink" style={linkStyle}>Visit</Link>
            {active === 'visit' && dot}
          </span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
          <AccountMenu linkStyle={linkStyle} />
          <CartButton />
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'oklch(0.52 0.216 27)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -8px oklch(0.52 0.216 27 / 0.7)', transform: 'rotate(-3deg)' }}>
            <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 900, fontSize: 22, lineHeight: 1, color: 'oklch(0.97 0.012 82)' }}>龍</span>
          </div>
          <a href={biz.generalHref} target={biz.generalHref.startsWith('http') ? '_blank' : undefined} rel="noopener" className="dc-enquire" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'oklch(0.52 0.216 27)', color: 'oklch(0.98 0.012 82)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', padding: '10px 16px', borderRadius: 999, transition: 'background .2s' }}>
            <WaIcon size={14} />
            Enquire
          </a>
        </div>
      </div>
    </header>
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
      onClick={() => setOpen(true)}
      aria-label={shown ? `Cart, ${shown} item${shown === 1 ? '' : 's'}` : 'Cart'}
      style={{
        position: 'relative',
        width: 38,
        height: 38,
        borderRadius: 999,
        border: '1px solid oklch(0.84 0.012 66)',
        background: 'oklch(0.985 0.006 80)',
        color: 'oklch(0.30 0.012 34)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <ShoppingBag size={16} />
      {shown > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 999,
            background: 'oklch(0.52 0.216 27)',
            color: 'oklch(0.98 0.012 82)',
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shown > 99 ? '99+' : shown}
        </span>
      )}
    </button>
  );
}

/** Sign-in link for guests; name menu with account / dashboard / sign-out for signed-in users. */
function AccountMenu({ linkStyle }: { linkStyle: CSSProperties }) {
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
      <Link href="/auth/login" className="dc-navlink" style={linkStyle}>
        Sign in
      </Link>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC';
  const isStaff = user.role === 'admin' || user.role === 'super_admin';
  const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'oklch(0.30 0.012 34)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px 4px 4px',
          borderRadius: 999,
          border: '1px solid oklch(0.84 0.012 66)',
          background: 'oklch(0.985 0.006 80)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            background: 'oklch(0.52 0.216 27 / 0.12)',
            color: 'oklch(0.44 0.20 28)',
          }}
        >
          {initials}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'oklch(0.25 0.012 32)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.firstName || 'Account'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 200,
            padding: 6,
            borderRadius: 10,
            background: 'oklch(0.99 0.004 80)',
            border: '1px solid oklch(0.84 0.012 66)',
            boxShadow: '0 18px 40px -16px oklch(0.19 0.012 32 / 0.35)',
          }}
        >
          <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid oklch(0.90 0.01 66)', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.19 0.012 32)' }}>
              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collector'}
            </div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.50 0.02 40)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>
          <Link href="/account" role="menuitem" className="dc-menu-item" style={itemStyle} onClick={() => setOpen(false)}>
            <UserIcon size={14} /> My account
          </Link>
          {isStaff && (
            <Link href="/admin/dashboard" role="menuitem" className="dc-menu-item" style={itemStyle} onClick={() => setOpen(false)}>
              <LayoutDashboard size={14} /> Admin dashboard
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="dc-menu-item"
            style={{ ...itemStyle, color: 'oklch(0.48 0.20 28)' }}
            onClick={() => {
              setOpen(false);
              logout();
              router.push('/');
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
