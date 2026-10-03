'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Phone,
  RefreshCw,
  Truck,
  Undo2,
  X,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { adminToast } from '@/components/admin/AdminToaster';
import { errorMessage } from '@/lib/errorMessage';

type Delivery = FunctionReturnType<typeof api.services.deliveries.getDeliveries>[number];
type DeliveryStatus = Delivery['deliveryStatus'];

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

const STATUS_LABEL: Record<NonNullable<DeliveryStatus>, string> = {
  unscheduled: 'To schedule',
  scheduled: 'Scheduled',
  dispatched: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

const TONE: Record<NonNullable<DeliveryStatus>, { bg: string; fg: string }> = {
  unscheduled: { bg: 'color-mix(in oklch, var(--gold) 18%, transparent)', fg: 'var(--gold)' },
  scheduled: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
  dispatched: { bg: 'var(--surface-hi)', fg: 'var(--ink-2)' },
  delivered: { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' },
  failed: { bg: 'var(--red-wash)', fg: 'var(--red-hi)' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Admin → Deliveries: every order that has to be taken to a customer, with its own schedule,
 * driver and status. The order's commercial status follows along (dispatched → shipped,
 * delivered → delivered), so the Orders page and the customer's tracking page stay in step.
 */
function DeliveriesContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | NonNullable<DeliveryStatus>>('all');
  const [search, setSearch] = useState('');
  const [scheduling, setScheduling] = useState<Delivery | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 180 days of history is plenty for a delivery queue, and keeps the read bounded.
  const queueWindow = useMemo(() => ({ from: Math.floor(Date.now() / HOUR_MS) * HOUR_MS - 180 * DAY_MS }), []);
  const deliveries = useQuery(api.services.deliveries.getDeliveries, {
    ...queueWindow,
    deliveryStatus: filter === 'all' ? undefined : filter,
    search: search.trim() || undefined,
    limit: 200,
  });
  const counts = useQuery(api.services.deliveries.getDeliveryCounts, queueWindow);
  const summary = useQuery(api.services.deliveries.getDeliverySummary, queueWindow);
  const setStatus = useMutation(api.services.deliveries.setDeliveryStatus);

  const rows = useMemo(() => {
    const list = deliveries ?? [];
    // Anything still to do comes first, soonest date at the top.
    return [...list].sort((a, b) => {
      const open = (d: Delivery) => (d.deliveryStatus === 'delivered' ? 1 : 0);
      if (open(a) !== open(b)) return open(a) - open(b);
      if (a.deliveryDate && b.deliveryDate) return a.deliveryDate.localeCompare(b.deliveryDate);
      if (a.deliveryDate) return -1;
      if (b.deliveryDate) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [deliveries]);

  const move = async (orderId: Id<'orders'>, deliveryStatus: NonNullable<DeliveryStatus>) => {
    setBusyId(orderId);
    try {
      await setStatus({ orderId, deliveryStatus });
    } catch (e) {
      adminToast(errorMessage(e, 'Could not update that delivery.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top" style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back" className="p-2 rounded-lg border flex-shrink-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">Orders going out to customers</p>
            <h1 className="display text-lg sm:text-2xl truncate" style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}>Deliveries</h1>
          </div>
          {summary && (
            <div className="hidden sm:flex gap-5 flex-shrink-0 text-right">
              <div>
                <div className="placard">Open trips</div>
                <div className="font-mono-tabular text-base">{summary.openTrips}</div>
              </div>
              <div>
                <div className="placard">Fees billed</div>
                <div className="font-mono-tabular text-base">{peso(summary.feesBilled)}</div>
              </div>
              <div>
                <div className="placard">To collect</div>
                <div className="font-mono-tabular text-base">{peso(summary.outstanding)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-3)' }}>
          Web and app orders the customer asked us to deliver. Give each one a date and a driver, then mark it out for delivery and delivered — the
          order status and the customer&rsquo;s tracking page follow automatically. Delivery areas and fees live under Home Service → Areas &amp; fees.
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-[220px]">
            {([['all', 'All'], ['unscheduled', 'To schedule'], ['scheduled', 'Scheduled'], ['dispatched', 'Out for delivery'], ['delivered', 'Delivered'], ['failed', 'Failed']] as const).map(([key, label]) => {
              const active = filter === key;
              const count = counts?.[key as keyof typeof counts];
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="admin-tab flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap"
                  data-active={active}
                  style={active ? { borderColor: 'var(--red)', background: 'var(--red)', color: 'oklch(0.99 0 0)' } : { borderColor: 'var(--line)', background: 'var(--surface)' }}
                >
                  <span>{label}</span>
                  {count !== undefined && (
                    <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)', color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)' }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, address, driver…"
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] w-full sm:w-72"
            style={inputStyle}
          />
        </div>

        {deliveries === undefined ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading deliveries…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <Truck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>No deliveries in this view.</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Orders show up here when a customer chooses delivery at checkout. Turn delivery on under Home Service → Settings.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((delivery) => (
              <DeliveryCard
                key={delivery.orderId}
                delivery={delivery}
                busy={busyId === delivery.orderId}
                onSchedule={() => setScheduling(delivery)}
                onMove={move}
              />
            ))}
          </div>
        )}
      </div>

      {scheduling && <ScheduleDeliveryDialog delivery={scheduling} onClose={() => setScheduling(null)} />}
      <BottomNavbar />
    </div>
  );
}

function DeliveryCard({
  delivery,
  busy,
  onSchedule,
  onMove,
}: {
  delivery: Delivery;
  busy: boolean;
  onSchedule: () => void;
  onMove: (orderId: Id<'orders'>, status: NonNullable<DeliveryStatus>) => void;
}) {
  const tone = TONE[delivery.deliveryStatus];
  const balance = Math.max(0, delivery.totalAmount - delivery.amountPaid);

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: tone.bg, color: tone.fg }}>
                {STATUS_LABEL[delivery.deliveryStatus]}
              </span>
              <span className="font-mono-tabular text-[11px]" style={{ color: 'var(--ink-3)' }}>{delivery.code}</span>
              {balance > 0 && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}>
                  {peso(balance)} to collect
                </span>
              )}
            </div>
            <h3 className="display text-base sm:text-lg truncate" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>{delivery.customerName}</h3>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {delivery.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
            </p>
          </div>

          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {delivery.deliveryStatus === 'unscheduled' && (
              <button onClick={onSchedule} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ background: 'var(--jade-wash)', borderColor: 'var(--jade)', color: 'var(--jade)' }}>
                <Calendar size={12} />
                Schedule
              </button>
            )}
            {delivery.deliveryStatus === 'scheduled' && (
              <>
                <button onClick={() => onMove(delivery.orderId, 'dispatched')} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  <Truck size={12} />
                  Out for delivery
                </button>
                <button onClick={onSchedule} disabled={busy} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                  Reschedule
                </button>
              </>
            )}
            {delivery.deliveryStatus === 'dispatched' && (
              <>
                <button onClick={() => onMove(delivery.orderId, 'delivered')} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}>
                  <Check size={12} />
                  Delivered
                </button>
                <button onClick={() => onMove(delivery.orderId, 'failed')} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                  <X size={12} />
                  Couldn&rsquo;t deliver
                </button>
              </>
            )}
            {delivery.deliveryStatus === 'failed' && (
              <button onClick={onSchedule} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                <Undo2 size={12} />
                Rearrange
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Delivery day</div>
              <div className="font-mono-tabular text-[13px] mt-0.5">{delivery.deliveryDate ?? 'Not set'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Truck size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Driver</div>
              <div className="text-[13px] mt-0.5">{delivery.driverName ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Area · fee</div>
              <div className="text-[13px] mt-0.5">
                {delivery.areaName ?? 'Not set'}
                <span className="font-mono-tabular" style={{ color: 'var(--ink-3)' }}> · {delivery.deliveryFee > 0 ? peso(delivery.deliveryFee) : 'quote'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Order total</div>
              <div className="font-mono-tabular text-[13px] mt-0.5">{peso(delivery.totalAmount)}</div>
            </div>
          </div>
        </div>

        <p className="text-[12.5px] mb-2 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          <span className="placard mr-2">Address</span>
          {delivery.address || 'No address recorded — call the customer.'}
        </p>

        <div className="flex flex-wrap gap-3 items-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {delivery.phone && (
            <a href={`tel:${delivery.phone}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
              <Phone size={12} />
              {delivery.phone}
            </a>
          )}
          {delivery.address && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 hover:opacity-80">
              <MapPin size={12} />
              Open in Maps
            </a>
          )}
        </div>

        {delivery.deliveryNotes && (
          <div className="mt-3 p-3 rounded text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
            <span className="placard mr-2">Note</span>
            {delivery.deliveryNotes}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleDeliveryDialog({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const schedule = useMutation(api.services.deliveries.scheduleDelivery);
  const [date, setDate] = useState(delivery.deliveryDate ?? todayLocal());
  const [driverName, setDriverName] = useState(delivery.driverName ?? '');
  const [notes, setNotes] = useState(delivery.deliveryNotes ?? '');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await schedule({
        orderId: delivery.orderId,
        deliveryDate: date,
        driverName: driverName.trim() || undefined,
        deliveryNotes: notes,
        notifyCustomer: notify,
      });
      adminToast(`${delivery.code} scheduled for ${date}.`, 'success');
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not schedule that delivery.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={`Schedule ${delivery.code}`} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">Schedule {delivery.code}</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            {delivery.customerName} · {delivery.address || 'no address recorded'}
          </p>

          <div className="space-y-3">
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Delivery date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
            </label>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Driver <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} maxLength={120} placeholder="Who's taking it out" className={`${inputCls} mt-1`} style={inputStyle} />
            </label>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Note for the driver <span style={{ color: 'var(--ink-4)' }}>(not shown to the customer)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Landmark, gate code, call on arrival…" className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>Email the customer</span>
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  {delivery.email ? `Tells ${delivery.email} the date and what they still owe.` : 'No email on this order — nothing will be sent.'}
                </span>
              </span>
            </label>
          </div>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!valid || busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Saving…' : 'Schedule delivery'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DeliveriesPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <DeliveriesContent />
    </SafeAreaProvider>
  );
}
