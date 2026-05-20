'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  BarChart3,
  Package,
  ShoppingBag,
  Zap,
  Calendar,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import BottomNavbar from '@/components/common/BottomNavbar';
import NotificationModal from '@/components/modal/NotificationModal';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPHPshort = (n: number) => {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
};

const greetingForHour = (h: number) =>
  h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // ─── Convex queries (unchanged wiring) ───
  const dashboardStats = useQuery(api.services.admin.getDashboardStats);
  const recentOrders = useQuery(api.services.admin.getRecentOrders, { limit: 6 });
  const notificationCounts = useQuery(api.services.notifications.getNotificationCounts);
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  const createTestNotificationMutation = useMutation(
    api.services.notifications.createTestNotification,
  );
  // Keep the test-notification handler referenceable by name (unused but harmless).
  void createTestNotificationMutation;

  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.stock <= 5 && p.isActive)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        categoryName: p.categoryName || 'Uncategorized',
      }));
  }, [products]);

  const unreadCount = notificationCounts?.unread || 0;

  // ─── Today header ───
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const firstName = user?.firstName?.trim() || 'there';

  // ─── KPI strip ───
  const totalSales = dashboardStats?.totalSales || 0;
  const totalOrders = dashboardStats?.totalOrdersCount || 0;
  const pendingOrders = dashboardStats?.pendingOrders || 0;
  const grossProfit = dashboardStats?.grossProfit || 0;
  const profitMargin =
    totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '—';
  const activeProducts = dashboardStats?.activeProducts || 0;
  const totalProducts = dashboardStats?.totalProducts || 0;
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <div
      className="min-h-screen pb-24 sm:pb-6"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      {/* ─── Sticky header ─── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-sm border-b safe-area-top"
        style={{ background: 'oklch(0.135 0.005 25 / 0.85)', borderColor: 'var(--line)' }}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">{dateLabel}</p>
            <h1
              className="display text-lg sm:text-xl truncate"
              style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
            >
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-2 sm:p-2.5 rounded-lg border hover:opacity-90"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-[10px] sm:text-xs rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] inline-flex items-center justify-center font-bold px-1"
                  style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="p-2 sm:p-2.5 rounded-lg border hidden xs:flex"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
        {/* ─── HERO STRIP ─── */}
        <section
          className="relative overflow-hidden rounded-[18px] border p-5 sm:p-7"
          style={{
            background:
              'linear-gradient(135deg, var(--surface) 0%, var(--surface) 60%, var(--red-wash) 100%)',
            borderColor: 'var(--line)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="caustics-line absolute top-0 left-5 right-5" />
          <div className="relative max-w-2xl">
            <p className="label-eyebrow mb-2">{dateLabel}</p>
            <h2
              className="display-xl mb-3"
              style={{
                fontSize: 'clamp(28px, 6vw, 52px)',
                color: 'var(--ink)',
              }}
            >
              {greeting},{' '}
              <em
                className="not-italic"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--red)',
                  fontVariationSettings: '"opsz" 96, "wght" 700',
                }}
              >
                {firstName}
              </em>
              .
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed"
              style={{ color: 'var(--ink-3)' }}
            >
              {totalOrders > 0 ? (
                <>
                  <strong style={{ color: 'var(--ink)' }}>{fmtPHP(totalSales)}</strong>{' '}
                  tendered across {totalOrders} orders — {profitMargin}% gross margin so far.
                  {pendingOrders > 0 && (
                    <>
                      {' '}
                      You have{' '}
                      <strong style={{ color: 'var(--red-hi)' }}>{pendingOrders} pending</strong>{' '}
                      to review.
                    </>
                  )}
                </>
              ) : (
                <>The store is quiet — no orders yet today. Open the register and start tendering.</>
              )}
            </p>
            <div className="flex gap-2 mt-5 flex-wrap">
              <button
                onClick={() => router.push('/admin/pos')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-bold border"
                style={{
                  background: 'var(--red)',
                  borderColor: 'var(--red-deep)',
                  color: 'oklch(0.99 0 0)',
                }}
              >
                <Zap className="w-4 h-4" />
                Open Register
              </button>
              <button
                onClick={() => router.push('/admin/orders')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              >
                <Calendar className="w-4 h-4" />
                Orders {pendingOrders > 0 ? `(${pendingOrders})` : ''}
              </button>
              <button
                onClick={() => router.push('/admin/inventory')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--line)',
                  color: 'var(--ink-2)',
                }}
              >
                <Package className="w-4 h-4" />
                Inventory
              </button>
            </div>
          </div>
        </section>

        {/* ─── KPI STRIP ─── */}
        <section
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          <KpiCard
            label="Sales"
            value={fmtPHPshort(totalSales)}
            sub={fmtPHP(totalSales)}
            icon={<Wallet className="w-3.5 h-3.5" />}
            tone="jade"
          />
          <KpiCard
            label="Orders"
            value={String(totalOrders)}
            sub={`${pendingOrders} pending`}
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            tone="indigo"
          />
          <KpiCard
            label="Avg ticket"
            value={fmtPHPshort(avgTicket)}
            sub={`${profitMargin}% gross margin`}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            tone="gold"
          />
          <KpiCard
            label="Active products"
            value={String(activeProducts)}
            sub={`${totalProducts} total in catalog`}
            icon={<Package className="w-3.5 h-3.5" />}
            tone="red"
          />
        </section>

        {/* ─── BOTTOM: Recent orders + Live alerts ─── */}
        <section className="grid gap-4 lg:gap-5" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
          {/* Recent orders */}
          <div
            className="rounded-[14px] border p-4 sm:p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="label-eyebrow">Recent orders</p>
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-[11px] font-bold"
                style={{ color: 'var(--red-hi)' }}
              >
                All orders →
              </button>
            </div>

            {!recentOrders ? (
              <div className="py-10 text-center text-xs" style={{ color: 'var(--ink-4)' }}>
                Loading…
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-10 text-center text-xs" style={{ color: 'var(--ink-4)' }}>
                No recent orders.
              </div>
            ) : (
              <div className="flex flex-col">
                {recentOrders.map((o, i) => {
                  const isLast = i === recentOrders.length - 1;
                  const ts = new Date(o.createdAt || Date.now());
                  const time = ts.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const payTone =
                    o.status === 'cancelled'
                      ? { bg: 'var(--red-wash)', fg: 'var(--red-hi)' }
                      : o.status === 'completed' || o.status === 'delivered'
                      ? { bg: 'var(--jade-wash)', fg: 'var(--jade)' }
                      : { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' };
                  return (
                    <div
                      key={o._id}
                      className="grid items-center gap-3 py-2.5 px-1"
                      style={{
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
                        borderBottom: isLast ? 'none' : '1px solid var(--line-soft)',
                      }}
                    >
                      <span
                        className="dc-mono text-[11px] min-w-[40px]"
                        style={{ color: 'var(--ink-4)' }}
                      >
                        {time}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {o.customerName || 'Walk-in'}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                          {o.type === 'reservation' ? 'Reservation' : 'Sale'} ·{' '}
                          {o.itemCount || 1} item{(o.itemCount || 1) === 1 ? '' : 's'}
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: payTone.bg, color: payTone.fg }}
                      >
                        {o.status}
                      </span>
                      <span
                        className="dc-mono text-[13px] font-bold text-right"
                        style={{ minWidth: 80, color: 'var(--ink)' }}
                      >
                        {fmtPHP(o.totalAmount || 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live alerts */}
          <div
            className="rounded-[14px] border p-4 sm:p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="label-eyebrow">Live alerts</p>
              <button
                onClick={() => router.push('/admin/inventory/expiring')}
                className="text-[11px] font-bold"
                style={{ color: 'var(--red-hi)' }}
              >
                View →
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div
                className="text-center py-8 text-xs rounded-[10px] border"
                style={{
                  color: 'var(--ink-3)',
                  background: 'var(--jade-wash)',
                  borderColor: 'oklch(0.72 0.13 165 / 0.3)',
                }}
              >
                Everything is stocked. Nothing to flag.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lowStockProducts.map((p) => {
                  const tone =
                    p.stock === 0
                      ? { bg: 'var(--red-wash)', dot: 'var(--red)', text: 'var(--red-hi)' }
                      : p.stock <= 2
                      ? { bg: 'var(--gold-wash)', dot: 'var(--gold)', text: 'var(--gold-deep)' }
                      : { bg: 'var(--indigo-wash)', dot: 'var(--indigo)', text: 'var(--indigo)' };
                  return (
                    <div
                      key={p._id}
                      className="grid items-start gap-2.5 p-3 rounded-[10px]"
                      style={{
                        gridTemplateColumns: 'auto 1fr auto',
                        background: tone.bg,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5"
                        style={{
                          background: tone.dot,
                          boxShadow: p.stock === 0 ? `0 0 0 4px ${tone.bg}` : 'none',
                        }}
                      />
                      <div className="min-w-0">
                        <div
                          className="text-[12.5px] truncate font-medium"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          {p.name}
                        </div>
                        <div className="text-[10.5px]" style={{ color: 'var(--ink-3)' }}>
                          {p.categoryName}
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold whitespace-nowrap"
                        style={{ color: tone.text }}
                      >
                        {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
      <BottomNavbar />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone: 'red' | 'jade' | 'gold' | 'indigo';
}) {
  const toneMap = {
    red: { bg: 'var(--red-wash)', fg: 'var(--red-hi)' },
    jade: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
    gold: { bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' },
    indigo: { bg: 'var(--indigo-wash)', fg: 'var(--indigo)' },
  } as const;
  const t = toneMap[tone];
  return (
    <div
      className="rounded-[14px] border p-4"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ background: t.bg, color: t.fg }}
        >
          {icon}
        </span>
        <p className="label-eyebrow">{label}</p>
      </div>
      <p
        className="display dc-mono text-[22px] sm:text-[24px] leading-none mb-1"
        style={{ fontVariationSettings: '"opsz" 36, "wght" 700', color: 'var(--ink)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminDashboardContent />
    </SafeAreaProvider>
  );
}
