'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { BrandMark } from './Brand';
import { useBusiness } from '../business';
import { CalendarIcon, CartIcon, CloseIcon, HomeIcon, OrdersIcon, SearchIcon } from './icons';

/** 'profile' highlights nothing in the menu (profile is reached from the user block). */
export type MemberNavKey = 'home' | 'browse' | 'reservations' | 'cart' | 'wishlist' | 'orders' | 'profile';

/**
 * Black member-app sidebar from the reference. Fixed column on desktop; below 1100px it becomes an
 * off-canvas drawer (`open`/`onClose`) with a scrim, closed by Escape, the scrim or the close button.
 */
export default function MemberSidebar({
  id = 'member-sidebar',
  active,
  open,
  onClose,
}: {
  id?: string;
  active: MemberNavKey;
  open: boolean;
  onClose: () => void;
}) {
  const biz = useBusiness();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items?.reduce((n, i) => n + i.quantity, 0) || 0);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items: { key: MemberNavKey; href: string; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'home', href: '/client/dashboard', label: 'Home', icon: <HomeIcon /> },
    { key: 'browse', href: '/client/search', label: 'Browse', icon: <SearchIcon size={18} /> },
    { key: 'reservations', href: '/client/reservations', label: 'Reservations', icon: <CalendarIcon /> },
    { key: 'cart', href: '/client/cart', label: 'Cart', icon: <CartIcon />, badge: mounted ? cartCount : 0 },
    { key: 'wishlist', href: '/client/wishlist', label: 'Wishlist', icon: <svg width={20} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><HeartIconPath /></svg> },
    { key: 'orders', href: '/account', label: 'Orders', icon: <OrdersIcon /> },
  ];
  const name = mounted && user ? user.firstName || 'Account' : '';

  return (
    <>
      <aside id={id} className={`dk-sidebar${open ? ' open' : ''}`} aria-label="Member navigation">
        <button ref={closeRef} type="button" className="dk-sb-close" onClick={onClose} aria-label="Close menu">
          <CloseIcon />
        </button>
        <Link className="dk-sb-brand" href="/">
          <BrandMark onDark />
          <span><span className="dk-brand-name">{biz.storeName}</span><span className="dk-brand-sub">Member</span></span>
        </Link>
        <p className="dk-sb-label">MENU</p>
        <nav className="dk-sb-nav">
          {items.map((it) => (
            <Link key={it.key} href={it.href} aria-current={active === it.key ? 'page' : undefined} onClick={onClose}>
              {it.icon}
              {it.label}
              {it.badge ? <span className="dk-sb-badge" aria-label={`${it.badge} in cart`}>{it.badge > 9 ? '9+' : it.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="dk-sb-user">
          {name ? (
            <>
              <span className="dk-avatar">{name[0]!.toUpperCase()}</span>
              <div><b>{name}</b><Link href="/client/profile">View profile →</Link></div>
            </>
          ) : mounted ? (
            <div><Link href="/auth/login">Sign in</Link></div>
          ) : null}
        </div>
      </aside>
      <button
        type="button"
        className={`dk-app-scrim${open ? ' open' : ''}`}
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
      />
    </>
  );
}

/** The heart outline, reused inside the sidebar's 20×18 icon box. */
function HeartIconPath() {
  return <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" strokeWidth="1.8" strokeLinejoin="round" />;
}
