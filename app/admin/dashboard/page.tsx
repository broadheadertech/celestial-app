'use client';

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Receipt,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import BottomNavbar from '@/components/common/BottomNavbar';
import NotificationModal from '@/components/modal/NotificationModal';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

/* ─────────── HELPERS ─────────── */
const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPHPshort = (n: number) => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return { lead: `₱${m.toFixed(1).split('.')[0]}`, dot: '.', tail: `${m.toFixed(1).split('.')[1]}M` };
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    const parts = k.toFixed(1).split('.');
    return { lead: `₱${parts[0]}`, dot: '.', tail: `${parts[1]}k` };
  }
  return { lead: `₱${Math.round(n).toLocaleString('en-PH')}`, dot: '', tail: '' };
};

const greetingForHour = (h: number) =>
  h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

const DAY_MS = 24 * 60 * 60 * 1000;

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // ─── Convex queries ───
  const dashboardStats = useQuery(api.services.admin.getDashboardStats);
  const recentOrders = useQuery(api.services.admin.getRecentOrders, { limit: 6 });
  const allOrders = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  // ─── Compute deltas (last 7 days vs prior 7 days) from real orders ───
  const now = Date.now();
  const last7Start = now - 7 * DAY_MS;
  const prior7Start = now - 14 * DAY_MS;

  const last7Orders = useMemo(
    () => (allOrders ?? []).filter((o) => o.createdAt >= last7Start && o.status !== 'cancelled'),
    [allOrders, last7Start],
  );
  const prior7Orders = useMemo(
    () =>
      (allOrders ?? []).filter(
        (o) =>
          o.createdAt >= prior7Start &&
          o.createdAt < last7Start &&
          o.status !== 'cancelled',
      ),
    [allOrders, prior7Start, last7Start],
  );

  const salesL7 = last7Orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const salesP7 = prior7Orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const ordersL7 = last7Orders.length;
  const ordersP7 = prior7Orders.length;
  const avgL7 = ordersL7 > 0 ? salesL7 / ordersL7 : 0;
  const avgP7 = ordersP7 > 0 ? salesP7 / ordersP7 : 0;

  const delta = (a: number, b: number): number | null => {
    if (b === 0) return a > 0 ? 1 : null;
    return (a - b) / b;
  };

  const dSales = delta(salesL7, salesP7);
  const dOrders = delta(ordersL7, ordersP7);
  const dAvg = delta(avgL7, avgP7);

  // ─── Build 7-day chart data (server-time bucketed) ───
  const chartData = useMemo(() => {
    const buckets: { d: string; v: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      d.setHours(0, 0, 0, 0);
      buckets.push({
        d: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        v: 0,
        date: d,
      });
    }
    for (const o of allOrders ?? []) {
      if (o.status === 'cancelled') continue;
      const t = o.createdAt;
      const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
      const dayIndex = 6 - Math.floor((todayMid.getTime() - t) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < 7) {
        buckets[dayIndex].v += o.totalAmount || 0;
      }
    }
    return buckets;
  }, [allOrders, now]);

  // ─── Top sellers (last 7d) ───
  const topSellers = useMemo(() => {
    const map = new Map<string, { name: string; gross: number }>();
    for (const o of last7Orders) {
      for (const item of o.items || []) {
        const product = products?.find((p) => p._id === item.productId);
        const name = product?.name || 'Unknown';
        const gross = (item.price || 0) * item.quantity;
        const ex = map.get(item.productId);
        if (ex) {
          ex.gross += gross;
        } else {
          map.set(item.productId, { name, gross });
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);
  }, [last7Orders, products]);

  // ─── Pickups today (reservations) ───
  const pickupsToday = dashboardStats?.pendingReservations || 0;

  // ─── Greeting / hero text ───
  const nowDate = new Date();
  const greeting = greetingForHour(nowDate.getHours());
  const dateLabel = nowDate
    .toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const firstName = user?.firstName?.trim() || 'there';

  const totalSales = dashboardStats?.totalSales || 0;
  const totalOrdersCount = dashboardStats?.totalOrdersCount || 0;
  const pendingOrders = dashboardStats?.pendingOrders || 0;
  const activeProducts = dashboardStats?.activeProducts || 0;
  const totalProducts = dashboardStats?.totalProducts || 0;
  const avgTicket = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;

  return (
    <div
      className="min-h-screen pb-24 sm:pb-6"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      <div className="px-4 sm:px-6 py-5 sm:py-7 max-w-7xl mx-auto space-y-5">
        {/* ─── HERO STRIP ─── */}
        <section
          className="relative overflow-hidden rounded-[16px] border p-6 sm:p-7"
          style={{
            background:
              'linear-gradient(135deg, var(--surface) 0%, var(--surface) 60%, var(--red-wash) 100%)',
            borderColor: 'var(--line)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Faded arowana watermark */}
          <div className="absolute right-[-40px] top-[-20px] pointer-events-none opacity-[0.08] hidden sm:block">
            <ArowanaSilhouette size={420} color="var(--red)" mirror />
          </div>

          <div className="relative max-w-2xl">
            <p className="label-eyebrow mb-2">{dateLabel}</p>
            <h2
              className="display-xl mb-4"
              style={{
                fontSize: 'clamp(28px, 5.5vw, 52px)',
                color: 'var(--ink)',
              }}
            >
              {greeting},{' '}
              <em
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
              className="text-sm sm:text-[15px] leading-relaxed max-w-[540px]"
              style={{ color: 'var(--ink-3)' }}
            >
              {totalOrdersCount > 0 ? (
                <>
                  Strong day so far —{' '}
                  <strong style={{ color: 'var(--ink)' }}>{fmtPHP(totalSales)}</strong>{' '}
                  tendered across {totalOrdersCount} orders.
                  {pendingOrders > 0 && (
                    <>
                      {' '}You have <strong style={{ color: 'var(--red-hi)' }}>{pendingOrders} pending</strong> to review.
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
                Today&apos;s pickups ({pickupsToday})
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
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
        >
          <Kpi
            label="Sales today"
            value={fmtPHPshort(totalSales)}
            sub={fmtPHP(totalSales)}
            delta={dSales}
          />
          <Kpi
            label="Orders"
            value={{ lead: String(totalOrdersCount), dot: '', tail: '' }}
            sub={`${totalOrdersCount} completed · 0 voided`}
            delta={dOrders}
          />
          <Kpi
            label="Avg ticket"
            value={fmtPHPshort(avgTicket)}
            sub={`vs ${fmtPHPshort(avgP7).lead}${fmtPHPshort(avgP7).dot}${fmtPHPshort(avgP7).tail} last week`}
            delta={dAvg}
          />
          <Kpi
            label="Active products"
            value={{ lead: String(activeProducts), dot: '', tail: '' }}
            sub={`${totalProducts} total in catalog`}
            delta={null}
          />
        </section>

        {/* ─── BOTTOM ROW: Sales chart + Top sellers ─── */}
        <section
          className="grid gap-4 lg:gap-5"
          style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}
        >
          {/* Sales last 7 days */}
          <div
            className="rounded-[14px] border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--line)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-end justify-between mb-1.5">
              <div>
                <p className="label-eyebrow">Sales · last 7 days</p>
                <p
                  className="display dc-mono mt-1.5"
                  style={{
                    fontSize: 26,
                    fontVariationSettings: '"opsz" 36, "wght" 700',
                    color: 'var(--ink)',
                  }}
                >
                  {fmtPHP(salesL7)}
                </p>
              </div>
              {dSales !== null && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold"
                  style={{
                    background: dSales >= 0 ? 'var(--jade-wash)' : 'var(--red-wash)',
                    color: dSales >= 0 ? 'var(--jade)' : 'var(--red-hi)',
                  }}
                >
                  {dSales >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(dSales * 100).toFixed(1)}% week-over-week
                </span>
              )}
            </div>
            <div className="mt-3">
              <BarChart data={chartData} />
            </div>
          </div>

          {/* Top sellers */}
          <div
            className="rounded-[14px] border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--line)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between mb-3.5">
              <p className="label-eyebrow">Top sellers · 7d</p>
              <button
                onClick={() => router.push('/admin/analytics')}
                className="text-[11px] font-bold"
                style={{ color: 'var(--red-hi)' }}
              >
                Report →
              </button>
            </div>

            {topSellers.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--ink-4)' }}>
                No sales in the last 7 days yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {topSellers.map((p, i) => {
                  const max = topSellers[0].gross || 1;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[12.5px] mb-1">
                        <span className="font-medium truncate pr-2" style={{ color: 'var(--ink)' }}>
                          {p.name}
                        </span>
                        <span className="dc-mono flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                          {fmtPHPshort(p.gross).lead}
                          {fmtPHPshort(p.gross).dot}
                          {fmtPHPshort(p.gross).tail}
                        </span>
                      </div>
                      <div
                        className="h-[5px] rounded-full overflow-hidden"
                        style={{ background: 'var(--surface-hi)' }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${(p.gross / max) * 100}%`,
                            background: i === 0 ? 'var(--jade)' : 'var(--gold)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── RECENT ORDERS ─── */}
        <section
          className="rounded-[14px] border p-5"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--line)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3.5">
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
            <p className="py-6 text-center text-xs" style={{ color: 'var(--ink-4)' }}>
              Loading…
            </p>
          ) : recentOrders.length === 0 ? (
            <p className="py-6 text-center text-xs" style={{ color: 'var(--ink-4)' }}>
              No recent orders.
            </p>
          ) : (
            <div className="flex flex-col">
              {recentOrders.map((o, i) => {
                const ts = new Date(o.createdAt || Date.now());
                const time = ts.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
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
                      borderBottom:
                        i === recentOrders.length - 1 ? 'none' : '1px solid var(--line-soft)',
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

/* ──────────────────────── COMPONENTS ──────────────────────── */

function Kpi({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: { lead: string; dot: string; tail: string };
  sub?: string;
  delta: number | null;
}) {
  const up = delta !== null && delta >= 0;
  return (
    <div
      className="rounded-[14px] border p-4 min-w-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="label-eyebrow truncate">{label}</p>
        {delta !== null && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold"
            style={{
              background: up ? 'var(--jade-wash)' : 'var(--red-wash)',
              color: up ? 'var(--jade)' : 'var(--red-hi)',
            }}
          >
            {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <p
        className="display dc-mono leading-none mt-1"
        style={{
          fontSize: 'clamp(24px, 3vw, 30px)',
          fontVariationSettings: '"opsz" 48, "wght" 700',
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {value.lead}
        {value.dot && (
          <span style={{ color: 'var(--ink-3)' }}>{value.dot}</span>
        )}
        {value.tail && (
          <span style={{ fontSize: '0.7em' }}>{value.tail}</span>
        )}
      </p>
      {sub && (
        <p className="text-[12px] mt-1 truncate" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function BarChart({ data }: { data: { d: string; v: number; date: Date }[] }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const heightPx = 160;
  return (
    <div className="flex items-end gap-2.5" style={{ height: heightPx, padding: '8px 0' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max(2, (d.v / max) * (heightPx - 28));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <span
              className="dc-mono text-[10px] font-semibold truncate"
              style={{ color: isLast ? 'var(--ink)' : 'var(--ink-4)' }}
            >
              {d.v === 0
                ? ''
                : `${fmtPHPshort(d.v).lead}${fmtPHPshort(d.v).dot}${fmtPHPshort(d.v).tail}`}
            </span>
            <div
              className="w-full transition-all"
              style={{
                height: h,
                background: isLast
                  ? 'var(--jade)'
                  : 'color-mix(in oklch, var(--jade) 28%, var(--surface-hi))',
                borderRadius: '6px 6px 0 0',
              }}
            />
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
              {d.d}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ArowanaSilhouette({
  size = 200,
  color = 'currentColor',
  mirror = false,
}: {
  size?: number;
  color?: string;
  mirror?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 240 120"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <g transform={mirror ? 'scale(-1,1) translate(-240,0)' : ''}>
        <path
          d="M14 60 C 30 42, 56 28, 90 28 C 130 28, 162 42, 184 56 C 196 50, 212 46, 226 50 C 218 56, 212 62, 208 68 C 218 76, 222 84, 226 92 C 212 88, 196 86, 184 80 C 162 92, 130 102, 90 102 C 56 102, 30 92, 14 76 C 22 72, 28 68, 30 60 Z M 196 56 C 200 58, 204 58, 206 60 M 178 50 L 184 56 M 178 60 L 184 56 M 86 22 L 92 30 M 78 24 L 88 32"
          fill={color}
          opacity="0.95"
        />
        <circle cx="40" cy="56" r="3" fill="var(--bg)" />
        <path
          d="M 56 50 C 60 60, 60 70, 56 78"
          stroke="var(--bg)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

export default function AdminDashboardPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminDashboardContent />
    </SafeAreaProvider>
  );
}
