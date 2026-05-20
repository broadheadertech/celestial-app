'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users,
  Package,
  ShoppingBag,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  Boxes,
  Fish,
  Wallet,
  Sliders,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchPaths?: string[];
  superAdminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const rawSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          href: '/admin/dashboard',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          href: '/admin/analytics',
        },
      ],
    },
    {
      title: 'Sales',
      items: [
        {
          id: 'pos',
          label: 'POS',
          icon: Zap,
          href: '/admin/pos',
        },
        {
          id: 'orders',
          label: 'Orders & Reservations',
          icon: ShoppingBag,
          href: '/admin/orders',
          matchPaths: ['/admin/orders', '/admin/reservation-detail'],
        },
      ],
    },
    {
      title: 'Management',
      items: [
        {
          id: 'products',
          label: 'Products',
          icon: Package,
          href: '/admin/products',
          matchPaths: ['/admin/products', '/admin/product-detail'],
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Boxes,
          href: '/admin/inventory',
          matchPaths: ['/admin/inventory'],
        },
      ],
    },
    {
      title: 'People',
      items: [
        {
          id: 'users',
          label: 'Customers',
          icon: Users,
          href: '/admin/users',
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          id: 'finance',
          label: 'P&L & Expenses',
          icon: Wallet,
          href: '/admin/finance',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/admin/settings',
        },
        {
          id: 'app-settings',
          label: 'App Settings',
          icon: Sliders,
          href: '/admin/app-settings',
          superAdminOnly: true,
        },
        {
          id: 'marketing',
          label: 'Marketing',
          icon: Megaphone,
          href: '/admin/marketing',
        },
      ],
    },
  ];

  const sections: NavSection[] = rawSections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.superAdminOnly || isSuperAdmin),
    }))
    .filter((s) => s.items.length > 0);

  const isActiveRoute = (item: NavItem): boolean => {
    const normalizedPathname = pathname.replace(/\/$/, '');

    if (item.id === 'dashboard') {
      return normalizedPathname === '/admin/dashboard';
    }

    if (normalizedPathname === item.href) return true;

    if (item.matchPaths) {
      for (const path of item.matchPaths) {
        if (normalizedPathname === path || normalizedPathname.startsWith(path + '/')) {
          return true;
        }
      }
    }

    if (normalizedPathname.startsWith(item.href + '/')) return true;

    return false;
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC'
    : 'DC';
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

  // Derive a "drawer" from today's cash sales. No register-session schema exists,
  // so this is a best-effort substitute (cash collected today, no opening float).
  const ordersToday = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const { drawerCash, openedLabel } = useMemo(() => {
    if (!ordersToday) return { drawerCash: null as number | null, openedLabel: null as string | null };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startTs = start.getTime();
    const todays = ordersToday.filter(
      (o) => o.createdAt >= startTs && o.status !== 'cancelled',
    );
    const cash = todays
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const firstTs = todays.length
      ? Math.min(...todays.map((o) => o.createdAt))
      : null;
    const opened = firstTs
      ? new Date(firstTs).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      : null;
    return { drawerCash: cash, openedLabel: opened };
  }, [ordersToday]);

  const fmtPHPshort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${Math.round(n).toLocaleString('en-PH')}`;
  };

  return (
    <aside
      className="hidden sm:flex fixed top-0 left-0 bottom-0 w-64 border-r flex-col z-40 px-3 py-4"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-4 mb-3 border-b" style={{ borderColor: 'var(--line-soft)' }}>
        <DragonsCaveMark size={32} />
        <div className="min-w-0">
          <p
            className="display text-[14px] leading-none truncate"
            style={{ fontVariationSettings: '"opsz" 16, "wght" 800', letterSpacing: '-0.01em' }}
          >
            DRAGON&apos;S CAVE
          </p>
          <p
            className="text-[9.5px] uppercase mt-1 tracking-[0.08em]"
            style={{ color: 'var(--ink-4)' }}
          >
            Premium Arowanas
          </p>
        </div>
      </div>

      {/* Nav (flattened, no section titles per design) */}
      <nav className="flex-1 overflow-y-auto flex flex-col gap-[2px]">
        {sections.flatMap((section) =>
          section.items.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item);
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className="relative w-full flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-[13px] font-medium transition-all text-left"
                style={{
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-[-12px] top-2 bottom-2 w-[3px] rounded-r"
                    style={{ background: 'var(--red)' }}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive && item.id === 'pos' && (
                  <span
                    className="ml-auto w-[7px] h-[7px] rounded-full"
                    style={{
                      background: 'var(--red)',
                      boxShadow: '0 0 0 4px var(--red-wash)',
                    }}
                  />
                )}
              </button>
            );
          }),
        )}
      </nav>

      {/* Shift card */}
      <div
        className="mt-3 p-3 rounded-[12px] border"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-[30px] h-[30px] rounded-[8px] inline-flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
          >
            {initials}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {fullName}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
              Counter 1 · OPEN shift
            </p>
          </div>
        </div>
        <hr className="my-2.5 border-0 h-px" style={{ background: 'var(--line-soft)' }} />
        <div className="flex justify-between text-[10px]" title="Cash collected today">
          <span style={{ color: 'var(--ink-4)' }}>Cash today</span>
          <span className="dc-mono font-semibold" style={{ color: 'var(--ink-2)' }}>
            {drawerCash == null ? '—' : fmtPHPshort(drawerCash)}
          </span>
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span style={{ color: 'var(--ink-4)' }}>First sale</span>
          <span className="dc-mono" style={{ color: 'var(--ink-2)' }}>
            {openedLabel ?? '—'}
          </span>
        </div>
      </div>
    </aside>
  );
}

function DragonsCaveMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <clipPath id="dc-sb-clip">
          <rect x="0" y="0" width="64" height="64" rx="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#dc-sb-clip)">
        <rect x="0" y="0" width="64" height="64" rx="12" fill="var(--red)" />
        <path
          d="M14 14 L34 14 C42 14 46 18 46 24 C46 32 38 34 30 36 C24 37 18 38 14 42 C12 44 10 42 10 38 L10 18 C10 15 11 14 14 14 Z"
          fill="oklch(0.99 0 0)"
        />
        <circle cx="20" cy="26" r="1.6" fill="var(--red)" />
      </g>
    </svg>
  );
}
