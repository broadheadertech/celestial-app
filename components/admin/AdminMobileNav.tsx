'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/store/theme';
import NotificationModal from '@/components/modal/NotificationModal';
import DragonsCaveMark from '@/components/admin/DragonsCaveMark';
import {
  findActiveAdminNavItem,
  getAdminNavSections,
  isAdminNavItemActive,
} from '@/components/admin/adminNav';

const SM_BREAKPOINT_QUERY = '(min-width: 640px)';

function roleLabel(role: string | undefined): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Staff';
}

/**
 * Phone-only (< sm) admin chrome: a top bar with brand, section title,
 * notifications and a menu button that opens a left slide-out drawer.
 * The desktop equivalents are AdminSidebar + AdminTopBar.
 */
export default function AdminMobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  const notificationCounts = useQuery(api.services.notifications.getNotificationCounts);
  const unread = notificationCounts?.unread ?? 0;

  const sections = useMemo(() => getAdminNavSections(user?.role), [user?.role]);
  const activeItem = findActiveAdminNavItem(sections, pathname);
  const title = activeItem?.label ?? 'Admin';

  // The drawer remembers the route it was opened on, so any navigation closes it
  // without needing a state update inside an effect.
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const isOpen = openedOnPath !== null && openedOnPath === pathname;
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  const drawerId = useId();
  const titleId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const wasOpenRef = useRef(false);

  const close = useCallback(() => setOpenedOnPath(null), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus management: first link on open, back to the menu button on close.
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        menuButtonRef.current?.focus();
      }
      return undefined;
    }
    wasOpenRef.current = true;
    const raf = requestAnimationFrame(() => firstLinkRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // While open: lock body scroll, close on Escape, trap Tab, close if widened to desktop.
  useEffect(() => {
    if (!isOpen) return;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !drawerRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const mql = window.matchMedia(SM_BREAKPOINT_QUERY);
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (e.matches) close();
    };
    mql.addEventListener('change', onBreakpoint);

    return () => {
      body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
      mql.removeEventListener('change', onBreakpoint);
    };
  }, [isOpen, close]);

  const handleSignOut = () => {
    if (window.confirm('Sign out of Dragon’s Cave admin?')) {
      close();
      logout();
    }
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC'
    : 'DC';
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

  const firstItemId = sections[0]?.items[0]?.id;

  const drawer = (
    <div className="sm:hidden">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-[70] bg-black/50 transition-[opacity,visibility] duration-200 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed top-0 bottom-0 left-0 z-[71] w-[84vw] max-w-[320px] flex flex-col border-r shadow-2xl transition-[transform,visibility] duration-200 ease-out ${
          isOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'
        }`}
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--line)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between gap-2 px-4 h-14 border-b flex-shrink-0"
          style={{ borderColor: 'var(--line-soft)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <DragonsCaveMark size={28} />
            <p
              id={titleId}
              className="display text-[13px] leading-none truncate"
              style={{
                color: 'var(--ink)',
                fontVariationSettings: '"opsz" 16, "wght" 800',
                letterSpacing: '-0.01em',
              }}
            >
              DRAGON&apos;S CAVE
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 -mr-1 rounded-lg hover:opacity-80"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="Admin">
          {sections.map((section) => (
            <div key={section.title} className="mb-3 last:mb-0">
              <p
                className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'var(--ink-4)' }}
              >
                {section.title}
              </p>
              <ul className="flex flex-col gap-[2px]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isAdminNavItemActive(item, pathname);
                  return (
                    <li key={item.id}>
                      <Link
                        ref={item.id === firstItemId ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={close}
                        aria-current={active ? 'page' : undefined}
                        className="admin-tab relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium"
                        data-active={active}
                        style={active ? { background: 'var(--surface)', color: 'var(--ink)' } : { color: 'var(--ink-3)' }}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                            style={{ background: 'var(--red)' }}
                          />
                        )}
                        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account footer */}
        <div className="border-t px-3 pt-3 pb-3 flex-shrink-0" style={{ borderColor: 'var(--line)' }}>
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-[12px] border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <span
              className="w-9 h-9 rounded-[9px] inline-flex items-center justify-center text-[12px] font-bold flex-shrink-0"
              style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                {fullName}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                {roleLabel(user?.role)}
              </p>
            </div>
            <Link
              href="/admin/settings"
              onClick={close}
              className="p-2 rounded-lg border"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] font-medium"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] font-semibold"
              style={{ background: 'var(--red-wash)', borderColor: 'var(--line)', color: 'var(--red-hi)' }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/*
        In-flow (not sticky) like the desktop AdminTopBar: most admin pages render their
        own `sticky top-0 z-50` header, which would collide with a pinned global bar.
        The root layout's .safe-area-wrapper already pads for the top inset.
      */}
      <header
        className="sm:hidden flex items-center gap-2 px-3 h-14 border-b"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
      >
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpenedOnPath(pathname)}
          className="p-2 -ml-1 rounded-lg border flex-shrink-0"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={drawerId}
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <Link href="/admin/dashboard" className="flex-shrink-0" aria-label="Dashboard">
          <DragonsCaveMark size={26} />
        </Link>

        <p
          className="flex-1 min-w-0 truncate text-[14px] font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          {title}
        </p>

        <button
          type="button"
          onClick={() => setShowNotifications(true)}
          className="relative p-2 rounded-lg border flex-shrink-0"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full min-w-[16px] h-[16px] inline-flex items-center justify-center px-1"
              style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </header>

      {/*
        Portalled to <body> so the drawer and notification modal paint above page-level
        sticky headers (z-50) that come later in the DOM.
      */}
      {mounted &&
        createPortal(
          <>
            {drawer}
            {showNotifications && (
              <NotificationModal isOpen onClose={() => setShowNotifications(false)} />
            )}
          </>,
          document.body,
        )}
    </>
  );
}
