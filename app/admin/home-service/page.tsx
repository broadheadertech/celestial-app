'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  Sliders,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { adminToast } from '@/components/admin/AdminToaster';
import { errorMessage } from '@/lib/errorMessage';
import HomeServiceMenuTab from '@/components/admin/HomeServiceMenuTab';
import ServiceAreasTab from '@/components/admin/ServiceAreasTab';
import ServiceSettingsTab from '@/components/admin/ServiceSettingsTab';

type Booking = FunctionReturnType<typeof api.services.homeService.getBookings>[number];
type Status = Booking['status'];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

const STATUS_LABEL: Record<Status, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  in_progress: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TONE: Record<Status, { bg: string; fg: string }> = {
  requested: { bg: 'color-mix(in oklch, var(--gold) 18%, transparent)', fg: 'var(--gold)' },
  confirmed: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
  in_progress: { bg: 'var(--surface-hi)', fg: 'var(--ink-2)' },
  completed: { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' },
  cancelled: { bg: 'var(--red-wash)', fg: 'var(--red-hi)' },
};

/** Admin → Home Service: the booking queue, plus the menu, the areas and the on/off switches. */
function HomeServiceContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'bookings' | 'services' | 'areas' | 'settings'>('bookings');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<Booking | null>(null);

  const bookings = useQuery(api.services.homeService.getBookings, {
    status: filter === 'all' ? undefined : filter,
    search: search.trim() || undefined,
    limit: 200,
  });
  const counts = useQuery(api.services.homeService.getBookingCounts, {});
  const setStatus = useMutation(api.services.homeService.updateBookingStatus);

  const rows = useMemo(() => {
    const list = bookings ?? [];
    // Requests needing an answer float to the top; everything else stays newest-first.
    return [...list].sort((a, b) => {
      const aOpen = a.status === 'requested' ? 0 : 1;
      const bOpen = b.status === 'requested' ? 0 : 1;
      return aOpen - bOpen || b.createdAt - a.createdAt;
    });
  }, [bookings]);

  const handleStatus = async (bookingId: Id<'homeServiceBookings'>, status: Status) => {
    setBusyId(bookingId);
    try {
      await setStatus({ bookingId, status });
    } catch (e) {
      adminToast(errorMessage(e, 'Could not update that booking.'));
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
          <div className="min-w-0">
            <p className="label-eyebrow truncate">Bookings · visits to customers</p>
            <h1 className="display text-lg sm:text-2xl truncate" style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}>Home Service</h1>
          </div>
        </div>
        <div className="px-3 sm:px-6 max-w-6xl mx-auto flex gap-1 overflow-x-auto scrollbar-hide border-t" style={{ borderColor: 'var(--line-soft)' }}>
          {([
            ['bookings', 'Bookings', Calendar],
            ['services', 'Services', Wrench],
            ['areas', 'Areas & fees', MapPin],
            ['settings', 'Settings', Sliders],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap"
              style={{ borderColor: tab === id ? 'var(--red)' : 'transparent', color: tab === id ? 'var(--ink)' : 'var(--ink-3)' }}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'bookings' && !!counts?.requested && (
                <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-full" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>{counts.requested}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        {tab === 'bookings' && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-[220px]">
                {([['all', 'All'], ['requested', 'Requested'], ['confirmed', 'Confirmed'], ['in_progress', 'On the way'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] as const).map(([key, label]) => {
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
                placeholder="Search name, phone, code, address…"
                className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] w-full sm:w-72"
                style={inputStyle}
              />
            </div>

            {bookings === undefined ? (
              <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
                <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
                Loading bookings…
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <Wrench className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
                <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>No bookings in this view.</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  Bookings arrive from the Home Service page. Set up your services and areas first, then switch it on under Settings.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {rows.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    busy={busyId === booking._id}
                    onStatus={handleStatus}
                    onSchedule={() => setScheduling(booking)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'services' && <HomeServiceMenuTab />}
        {tab === 'areas' && <ServiceAreasTab />}
        {tab === 'settings' && <ServiceSettingsTab />}
      </div>

      {scheduling && <ScheduleDialog booking={scheduling} onClose={() => setScheduling(null)} />}
      <BottomNavbar />
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onStatus,
  onSchedule,
}: {
  booking: Booking;
  busy: boolean;
  onStatus: (id: Id<'homeServiceBookings'>, status: Status) => void;
  onSchedule: () => void;
}) {
  const tone = TONE[booking.status];
  const total = booking.quotedTotal ?? booking.estimatedTotal;

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: tone.bg, color: tone.fg }}>
                {STATUS_LABEL[booking.status]}
              </span>
              <span className="font-mono-tabular text-[11px]" style={{ color: 'var(--ink-3)' }}>{booking.code}</span>
              <span className="placard" style={{ color: 'var(--ink-4)' }}>
                Booked {new Date(booking.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h3 className="display text-base sm:text-lg truncate" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>{booking.name}</h3>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-2)' }}>{booking.serviceName}</p>
          </div>

          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {booking.status === 'requested' && (
              <>
                <button onClick={onSchedule} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ background: 'var(--jade-wash)', borderColor: 'var(--jade)', color: 'var(--jade)' }}>
                  <Check size={12} />
                  Confirm &amp; schedule
                </button>
                <button onClick={() => onStatus(booking._id, 'cancelled')} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                  <X size={12} />
                  Decline
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                <button onClick={() => onStatus(booking._id, 'in_progress')} disabled={busy} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  On the way
                </button>
                <button onClick={onSchedule} disabled={busy} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  <Settings size={12} />
                </button>
                <button onClick={() => onStatus(booking._id, 'cancelled')} disabled={busy} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                  Cancel
                </button>
              </>
            )}
            {booking.status === 'in_progress' && (
              <button onClick={() => onStatus(booking._id, 'completed')} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}>
                <Check size={12} />
                Mark done
              </button>
            )}
            {(booking.status === 'completed' || booking.status === 'cancelled') && (
              <button onClick={() => onStatus(booking._id, 'requested')} disabled={busy} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                Reopen
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <Fact icon={Calendar} label="Date">{booking.date}</Fact>
          <Fact icon={Clock} label="Time">{booking.time}</Fact>
          <Fact icon={MapPin} label="Area">{booking.areaName}</Fact>
          <Fact icon={Truck} label={booking.quotedTotal !== undefined ? 'Agreed' : 'Estimate'}>
            {total === undefined ? 'To quote' : peso(total)}
          </Fact>
        </div>

        <p className="text-[12.5px] mb-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          <span className="placard mr-2">Address</span>
          {booking.address}
          {booking.tankSize && <span style={{ color: 'var(--ink-3)' }}> · Tank: {booking.tankSize}</span>}
        </p>

        <div className="flex flex-wrap gap-3 items-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
          <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
            <Phone size={12} />
            {booking.phone}
          </a>
          <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
            <Mail size={12} />
            {booking.email}
          </a>
          {booking.assignedToName && <span>Assigned to {booking.assignedToName}</span>}
        </div>

        {booking.notes && (
          <div className="mt-3 p-3 rounded text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
            <span className="placard mr-2">Customer note</span>
            {booking.notes}
          </div>
        )}
        {booking.staffNotes && (
          <div className="mt-2 p-3 rounded text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
            <span className="placard mr-2">Our note</span>
            {booking.staffNotes}
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color: 'var(--ink-4)' }} />
      <div>
        <div className="placard">{label}</div>
        <div className="font-mono-tabular text-[13px] mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Confirms a request: the day and time you agreed, who's going, the price and a note. */
function ScheduleDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const update = useMutation(api.services.homeService.updateBookingDetails);
  const setStatus = useMutation(api.services.homeService.updateBookingStatus);
  const staff = useQuery(api.services.admin.getStaffUsers, {});
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);
  const [assignedToId, setAssignedToId] = useState<string>(booking.assignedToId ?? '');
  const [quoted, setQuoted] = useState(booking.quotedTotal !== undefined ? String(booking.quotedTotal) : booking.estimatedTotal !== undefined ? String(booking.estimatedTotal) : '');
  const [staffNotes, setStaffNotes] = useState(booking.staffNotes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quotedNum = Number(quoted);
  const quotedValid = quoted.trim() === '' || (Number.isFinite(quotedNum) && quotedNum >= 0);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && quotedValid;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await update({
        bookingId: booking._id,
        date,
        time,
        ...(assignedToId ? { assignedToId: assignedToId as Id<'users'> } : {}),
        ...(quoted.trim() === '' ? {} : { quotedTotal: quotedNum }),
        staffNotes,
      });
      if (booking.status === 'requested') {
        await setStatus({ bookingId: booking._id, status: 'confirmed' });
      }
      adminToast(`${booking.code} confirmed for ${date} at ${time}.`, 'success');
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save that booking.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={`Schedule ${booking.code}`} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">Schedule {booking.code}</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            {booking.serviceName} for {booking.name} · {booking.areaName}
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Time
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
            </div>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Who&rsquo;s going
              <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
                <option value="">Not assigned yet</option>
                {(staff ?? []).map((person) => (
                  <option key={person._id} value={person._id}>{person.firstName} {person.lastName}</option>
                ))}
              </select>
            </label>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Agreed price (₱)
              <input type="number" min={0} step="1" value={quoted} onChange={(e) => setQuoted(e.target.value)} placeholder="Leave empty to quote later" className={`${inputCls} mt-1`} style={inputStyle} />
              <span className="block mt-1" style={{ color: 'var(--ink-4)' }}>
                {booking.servicePrice === undefined ? 'This service is quoted on inspection.' : `Service ${peso(booking.servicePrice)} + travel ${peso(booking.travelFee)}.`}
              </span>
            </label>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Note for the team <span style={{ color: 'var(--ink-4)' }}>(not shown to the customer)</span>
              <textarea value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Gate code, parking, bring the 40cm net…" className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
          </div>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!valid || busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Saving…' : booking.status === 'requested' ? 'Confirm booking' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function HomeServicePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <HomeServiceContent />
    </SafeAreaProvider>
  );
}
