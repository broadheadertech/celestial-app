'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getAdminNavSections, isAdminNavItemActive } from '@/components/admin/adminNav';
import DragonsCaveMark from '@/components/admin/DragonsCaveMark';

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const sections = useMemo(() => getAdminNavSections(user?.role), [user?.role]);

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC'
    : 'DC';
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

  // Derive a "drawer" from today's cash sales. No register-session schema exists,
  // so this is a best-effort substitute (cash collected today, no opening float).
  // Totalled on the server (this sidebar is on every admin screen, so it must stay cheap).
  const till = useQuery(api.services.orders.getTillToday, {});
  const drawerCash = till ? till.cash : null;
  const openedLabel = till?.firstAt
    ? new Date(till.firstAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : null;

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
            const isActive = isAdminNavItemActive(item, pathname);
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
