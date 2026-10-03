'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Mail,
  PackageCheck,
  Phone,
  RefreshCw,
  Ship,
  X,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { adminToast } from '@/components/admin/AdminToaster';
import { errorMessage } from '@/lib/errorMessage';

type Group = FunctionReturnType<typeof api.services.preorders.getPreorderQueue>[number];
type Entry = Group['waiting'][number];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

/**
 * Admin → Pre-orders: who is waiting on which incoming fish, what they've paid, and what the
 * next shipment owes. Receiving stock allocates automatically (deposits first); "Allocate now"
 * is here for stock that arrived another way, e.g. a stock count correction.
 */
function PreordersContent() {
  const router = useRouter();
  const groups = useQuery(api.services.preorders.getPreorderQueue, {});
  const summary = useQuery(api.services.preorders.getPreorderSummary, {});
  const allocate = useMutation(api.services.preorders.allocatePreorders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{ entry: Entry; productName: string } | null>(null);
  const [showDone, setShowDone] = useState(false);

  const rows = useMemo(() => groups ?? [], [groups]);
  const anyWaiting = rows.some((g) => g.waiting.length > 0);

  const runAllocate = async (group: Group) => {
    setBusyId(group.productId);
    try {
      const res = await allocate({ productId: group.productId as Id<'products'> });
      adminToast(
        res.allocated > 0
          ? `Allocated ${res.units} to ${res.allocated} pre-order${res.allocated === 1 ? '' : 's'} — they've been emailed.`
          : `Nothing allocated — ${group.stock > 0 ? 'no one is waiting on a full slot' : 'there is no stock to give out yet'}.`,
        res.allocated > 0 ? 'success' : 'info',
      );
    } catch (e) {
      adminToast(errorMessage(e, 'Could not allocate that shipment.'));
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
            <p className="label-eyebrow truncate">Fish people are waiting for</p>
            <h1 className="display text-lg sm:text-2xl truncate" style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}>Pre-orders</h1>
          </div>
          {summary && (
            <div className="hidden sm:flex gap-5 flex-shrink-0 text-right">
              <div>
                <div className="placard">Waiting</div>
                <div className="font-mono-tabular text-base">{summary.waiting}</div>
              </div>
              <div>
                <div className="placard">Deposits in</div>
                <div className="font-mono-tabular text-base">{peso(summary.depositsCollected)}</div>
              </div>
              <div>
                <div className="placard">To collect</div>
                <div className="font-mono-tabular text-base">{peso(summary.depositsOutstanding)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-3)' }}>
          Mark a fish as <b>Open for pre-order</b> in its product form to start a queue. When you receive the shipment through Restocks, the queue is
          filled automatically — paid deposits first, then whoever asked earliest — and those customers are emailed. A pre-order holds no stock until
          it&rsquo;s allocated, so nothing is taken out of inventory before the fish is actually here.
        </p>

        {summary && summary.waiting > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {([
              ['Waiting', String(summary.waiting)],
              ['Units promised', String(summary.units)],
              ['Value committed', peso(summary.committedValue)],
              ['Deposits owed', peso(summary.depositsOutstanding)],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-[14px] border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="placard">{label}</div>
                <div className="font-mono-tabular text-lg mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        )}

        {groups === undefined ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading pre-orders…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <Ship className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>No pre-orders yet.</p>
            <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--ink-3)' }}>
              Open a fish for pre-order in Products → edit → <b>Open for pre-order</b>, set how many are coming and the deposit, and it appears on the
              storefront with the arrival window.
            </p>
          </div>
        ) : (
          <>
            {!anyWaiting && !showDone && (
              <div className="rounded-[14px] border p-4 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                Nobody is waiting right now — every pre-order has been allocated.{' '}
                <button onClick={() => setShowDone(true)} className="font-semibold" style={{ color: 'var(--red)' }}>Show them anyway</button>
              </div>
            )}
            {rows
              .filter((group) => group.waiting.length > 0 || showDone || !anyWaiting)
              .map((group) => (
                <ProductGroup
                  key={group.productId}
                  group={group}
                  busy={busyId === group.productId}
                  onAllocate={() => runAllocate(group)}
                  onCancel={(entry) => setCancelling({ entry, productName: group.displayName })}
                />
              ))}
          </>
        )}
      </div>

      {cancelling && (
        <CancelDialog entry={cancelling.entry} productName={cancelling.productName} onClose={() => setCancelling(null)} />
      )}
      <BottomNavbar />
    </div>
  );
}

function ProductGroup({
  group,
  busy,
  onAllocate,
  onCancel,
}: {
  group: Group;
  busy: boolean;
  onAllocate: () => void;
  onCancel: (entry: Entry) => void;
}) {
  const canAllocate = group.stock > 0 && group.waiting.length > 0;

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--line-soft)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {!group.enabled && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-3)' }}>
                  Closed
                </span>
              )}
              {group.remaining === 0 && group.enabled && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'color-mix(in oklch, var(--gold) 18%, transparent)', color: 'var(--gold)' }}>
                  Fully taken
                </span>
              )}
              {group.expectedLabel && (
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  <CalendarClock size={11} />
                  {group.expectedLabel}
                </span>
              )}
            </div>
            <h3 className="display text-base sm:text-lg" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>{group.productName}</h3>
            <p className="text-[12px] mt-0.5 font-mono-tabular" style={{ color: 'var(--ink-3)' }}>
              {peso(group.price)} each
              {group.depositPerUnit > 0 && ` · ${peso(group.depositPerUnit)} deposit`}
              {' · '}
              {group.committed}/{group.incomingQty} of the shipment claimed
              {group.stock > 0 && ` · ${group.stock} in stock now`}
            </p>
          </div>

          <button
            onClick={onAllocate}
            disabled={busy || !canAllocate}
            title={canAllocate ? 'Hand the stock on hand to the people waiting' : group.waiting.length === 0 ? 'Nobody is waiting' : 'No stock on hand yet'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border flex-shrink-0 disabled:opacity-35"
            style={{ background: canAllocate ? 'var(--jade-wash)' : 'transparent', borderColor: canAllocate ? 'var(--jade)' : 'var(--line)', color: canAllocate ? 'var(--jade)' : 'var(--ink-3)' }}
          >
            <PackageCheck size={13} />
            {busy ? 'Allocating…' : 'Allocate now'}
          </button>
        </div>
      </div>

      {group.waiting.length > 0 && (
        <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
          {group.waiting.map((entry, index) => (
            <EntryRow key={entry.reservationId} entry={entry} position={index + 1} onCancel={() => onCancel(entry)} />
          ))}
        </div>
      )}

      {group.allocated.length > 0 && (
        <div className="px-4 sm:px-5 py-3 text-[11.5px] border-t" style={{ borderColor: 'var(--line-soft)', background: 'var(--bg-2)', color: 'var(--ink-3)' }}>
          <span className="placard mr-2">Already handed over</span>
          {group.allocated.map((entry) => `${entry.name} (${entry.quantity})`).join(' · ')}
          {group.cancelled > 0 && <span style={{ color: 'var(--ink-4)' }}> · {group.cancelled} cancelled</span>}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, position, onCancel }: { entry: Entry; position: number; onCancel: () => void }) {
  const owed = Math.max(0, entry.depositDue - entry.amountPaid);
  const depositPaid = entry.depositDue > 0 && owed === 0;

  return (
    <div className="px-4 sm:px-5 py-3 flex items-start gap-3">
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono-tabular text-[11px] font-bold mt-0.5"
        style={{ background: depositPaid ? 'var(--jade-wash)' : 'var(--surface-hi)', color: depositPaid ? 'var(--jade)' : 'var(--ink-3)' }}
        title={depositPaid ? 'Deposit paid — first in line' : 'No deposit yet'}
      >
        {position}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{entry.name}</span>
          <span className="font-mono-tabular text-[10.5px]" style={{ color: 'var(--ink-4)' }}>{entry.code}</span>
          {entry.quantity > 1 && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-3)' }}>
              ×{entry.quantity}
            </span>
          )}
          {depositPaid ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--jade-wash)', color: 'var(--jade)' }}>
              <Check size={9} /> Deposit paid
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}>
              {entry.depositDue > 0 ? `${peso(owed)} owed` : 'No deposit set'}
            </span>
          )}
        </div>

        <div className="text-[11px] mt-1 flex flex-wrap gap-x-3 font-mono-tabular" style={{ color: 'var(--ink-3)' }}>
          <span>{peso(entry.totalAmount)} total</span>
          {entry.amountPaid > 0 && <span>{peso(entry.amountPaid)} in</span>}
          <span>asked {new Date(entry.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center text-[11.5px] mt-1" style={{ color: 'var(--ink-3)' }}>
          <a href={`tel:${entry.phone}`} className="inline-flex items-center gap-1 hover:opacity-80">
            <Phone size={11} />
            {entry.phone}
          </a>
          <a href={`mailto:${entry.email}`} className="inline-flex items-center gap-1 hover:opacity-80">
            <Mail size={11} />
            {entry.email}
          </a>
        </div>

        {entry.notes && (
          <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            <span className="placard mr-1.5">Note</span>
            {entry.notes}
          </p>
        )}
      </div>

      <button
        onClick={onCancel}
        aria-label={`Cancel ${entry.name}'s pre-order`}
        className="px-2 py-1.5 rounded-md border flex-shrink-0"
        style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function CancelDialog({ entry, productName, onClose }: { entry: Entry; productName: string; onClose: () => void }) {
  const cancelPreorder = useMutation(api.services.preorders.cancelPreorder);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cancelPreorder({ reservationId: entry.reservationId as Id<'reservations'>, reason });
      adminToast(
        res.depositToRefund > 0
          ? `Pre-order cancelled. ${res.depositToRefundLabel} still needs refunding — record it on the reservation's payments.`
          : 'Pre-order cancelled.',
        res.depositToRefund > 0 ? 'info' : 'success',
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not cancel that pre-order.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={`Cancel ${entry.code}`} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">Cancel this pre-order?</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            {entry.name} · {entry.quantity} × {productName} · {entry.code}
          </p>

          {entry.amountPaid > 0 && (
            <div className="p-3 rounded-lg text-[12px] mb-3 leading-relaxed" style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}>
              They&rsquo;ve paid {peso(entry.amountPaid)}. Cancelling doesn&rsquo;t refund it — record the refund on the reservation&rsquo;s payments so
              the money trail stays intact.
            </div>
          )}
          {entry.allocatedAt !== undefined && (
            <div className="p-3 rounded-lg text-[12px] mb-3 leading-relaxed" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
              This one was already allocated, so its {entry.quantity} unit{entry.quantity === 1 ? '' : 's'} will go back into stock.
            </div>
          )}

          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Reason <span style={{ color: 'var(--ink-4)' }}>(goes on the record)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} autoFocus placeholder="Customer changed their mind / shipment fell through / unreachable for two weeks" className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Keep it
            </button>
            <button onClick={submit} disabled={busy || !reason.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Cancelling…' : 'Cancel pre-order'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PreordersPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <PreordersContent />
    </SafeAreaProvider>
  );
}
