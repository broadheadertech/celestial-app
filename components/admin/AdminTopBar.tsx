'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Settings, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import NotificationModal from '@/components/modal/NotificationModal';

export default function AdminTopBar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [now, setNow] = useState<Date | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  const notificationCounts = useQuery(api.services.notifications.getNotificationCounts);
  const unread = notificationCounts?.unread ?? 0;

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC'
    : 'DC';
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

  // Show role-based station label (no register-session schema, so we derive a label).
  const stationLabel = user?.role === 'super_admin'
    ? 'Station · Admin'
    : user?.role === 'admin'
      ? 'Station · Counter 1'
      : 'Station · Client';

  const dateLabel = now
    ? now.toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const timeLabel = now
    ? now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      <div
        className="hidden sm:flex items-center justify-between px-5 h-14 border-b"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="dc-mono text-[11px] tracking-[0.04em] uppercase truncate"
            style={{ color: 'var(--ink-4)' }}
          >
            {stationLabel}
          </span>
          <span
            className="w-1 h-1 rounded-full flex-shrink-0"
            style={{ background: 'var(--ink-4)' }}
          />
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
            <span className="dc-mono">{dateLabel}</span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span className="dc-mono" style={{ color: 'var(--ink-2)' }}>
              {timeLabel}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-lg border hover:opacity-90"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            aria-label="Notifications"
          >
            <Bell className="w-[15px] h-[15px]" />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full min-w-[16px] h-[16px] inline-flex items-center justify-center px-1"
                style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border hover:opacity-90"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="w-[15px] h-[15px]" /> : <Moon className="w-[15px] h-[15px]" />}
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="p-2 rounded-lg border hover:opacity-90"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            aria-label="Settings"
          >
            <Settings className="w-[15px] h-[15px]" />
          </button>
          <div
            className="flex items-center gap-2 ml-1 pl-1 pr-3 py-1 rounded-full border"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
          >
            <span
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
            >
              {initials}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
              {fullName}
            </span>
          </div>
        </div>
      </div>

      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
