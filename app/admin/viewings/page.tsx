'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Calendar,
  Check,
  Mail,
  Phone,
  X,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type ViewingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

function ViewingsContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | ViewingStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const viewings = useQuery(api.services.viewings.getViewings, {
    status: filter === 'all' ? undefined : filter,
    limit: 200,
  });
  const updateStatus = useMutation(api.services.viewings.updateViewingStatus);

  const counts = useMemo(() => {
    if (!viewings) return { all: 0, requested: 0, confirmed: 0, completed: 0, cancelled: 0 };
    // The query already filtered, so this is approximate. Fetch full counts separately if needed.
    return {
      all: viewings.length,
      requested: viewings.filter((v) => v.status === 'requested').length,
      confirmed: viewings.filter((v) => v.status === 'confirmed').length,
      completed: viewings.filter((v) => v.status === 'completed').length,
      cancelled: viewings.filter((v) => v.status === 'cancelled').length,
    };
  }, [viewings]);

  const handleStatus = async (id: string, status: ViewingStatus) => {
    setBusyId(id);
    try {
      await updateStatus({ id: id as Id<'viewings'>, status });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const sorted = useMemo(() => {
    if (!viewings) return [];
    return [...viewings].sort((a, b) => {
      // Pending first, then by date
      const aPending = a.status === 'requested' ? 0 : 1;
      const bPending = b.status === 'requested' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    });
  }, [viewings]);

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top relative"
        style={{ background: 'oklch(0.135 0.005 25 / 0.85)', borderColor: 'var(--line)' }}
      >
        <div className="caustics-line absolute bottom-0 left-3 right-3 sm:left-6 sm:right-6" />
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">Bookings · gallery visits</p>
              <h1
                className="display text-lg sm:text-2xl truncate"
                style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}
              >
                Viewings
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'requested', label: 'Requested' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ] as const).map((f) => {
            const active = filter === f.key;
            const count = counts[f.key as keyof typeof counts];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all"
                style={{
                  borderColor: active ? 'var(--red)' : 'var(--line)',
                  background: active ? 'var(--red)' : 'var(--surface)',
                  color: active ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
                }}
              >
                <span>{f.label}</span>
                <span
                  className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: active ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)',
                    color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {!viewings ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading viewings…
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="text-center py-16 rounded-[14px] border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              No viewings in this view.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((v) => (
              <ViewingCard
                key={v._id}
                viewing={v}
                onStatus={handleStatus}
                busy={busyId === v._id}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
}

function ViewingCard({
  viewing,
  onStatus,
  busy,
}: {
  viewing: any;
  onStatus: (id: string, status: ViewingStatus) => void;
  busy: boolean;
}) {
  const status = viewing.status as ViewingStatus;
  const statusTone =
    status === 'requested'
      ? { bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' }
      : status === 'confirmed'
      ? { bg: 'var(--jade-wash)', fg: 'var(--jade)' }
      : status === 'completed'
      ? { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' }
      : { bg: 'var(--red-wash)', fg: 'var(--red-hi)' };

  const created = new Date(viewing.createdAt);
  const createdLabel = created.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="rounded-[14px] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                style={{ background: statusTone.bg, color: statusTone.fg }}
              >
                {status}
              </span>
              <span className="placard" style={{ color: 'var(--ink-4)' }}>
                Booked {createdLabel}
              </span>
            </div>
            <h3
              className="display text-base sm:text-lg truncate"
              style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
            >
              {viewing.name}
            </h3>
            {viewing.interest && (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Interest · {viewing.interest}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 flex-shrink-0">
            {status === 'requested' && (
              <>
                <button
                  onClick={() => onStatus(viewing._id, 'confirmed')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                  style={{
                    background: 'var(--jade-wash)',
                    borderColor: 'var(--jade)',
                    color: 'var(--jade)',
                  }}
                >
                  <Check size={12} />
                  Confirm
                </button>
                <button
                  onClick={() => onStatus(viewing._id, 'cancelled')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                  style={{
                    background: 'transparent',
                    borderColor: 'var(--line)',
                    color: 'var(--ink-3)',
                  }}
                >
                  <X size={12} />
                  Decline
                </button>
              </>
            )}
            {status === 'confirmed' && (
              <>
                <button
                  onClick={() => onStatus(viewing._id, 'completed')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                  style={{
                    background: 'var(--red-wash)',
                    borderColor: 'var(--red)',
                    color: 'var(--red-hi)',
                  }}
                >
                  <Check size={12} />
                  Mark complete
                </button>
                <button
                  onClick={() => onStatus(viewing._id, 'cancelled')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                  style={{
                    background: 'transparent',
                    borderColor: 'var(--line)',
                    color: 'var(--ink-3)',
                  }}
                >
                  <X size={12} />
                  Cancel
                </button>
              </>
            )}
            {(status === 'completed' || status === 'cancelled') && (
              <button
                onClick={() => onStatus(viewing._id, 'requested')}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--line)',
                  color: 'var(--ink-3)',
                }}
              >
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Slot + party */}
        <div
          className="grid gap-3 mb-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Date</div>
              <div className="font-mono-tabular text-[13px] mt-0.5">{viewing.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Time</div>
              <div className="font-mono-tabular text-[13px] mt-0.5">{viewing.time}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: 'var(--ink-4)' }} />
            <div>
              <div className="placard">Party</div>
              <div className="font-mono-tabular text-[13px] mt-0.5">
                {viewing.partySize} guest{viewing.partySize === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-wrap gap-3 items-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
          <a
            href={`mailto:${viewing.email}`}
            className="inline-flex items-center gap-1.5 hover:opacity-80"
          >
            <Mail size={12} />
            {viewing.email}
          </a>
          <a
            href={`tel:${viewing.phone}`}
            className="inline-flex items-center gap-1.5 hover:opacity-80"
          >
            <Phone size={12} />
            {viewing.phone}
          </a>
        </div>

        {viewing.notes && (
          <div
            className="mt-3 p-3 rounded text-[12.5px] leading-relaxed"
            style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
          >
            <span className="placard mr-2">Note</span>
            {viewing.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewingsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ViewingsContent />
    </SafeAreaProvider>
  );
}
