'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronDown, ChevronUp, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { adminToast } from './AdminToaster';
import { errorMessage } from '@/lib/errorMessage';

type Area = FunctionReturnType<typeof api.services.serviceAreas.listAreas>[number];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

/**
 * Admin → Delivery & Home Service → Areas. One area prices both channels: `deliveryFee` for
 * taking goods out, `travelFee` for sending someone to a customer's place. Either can be switched
 * off per area. Past orders and bookings keep the fee they were quoted, so edits here are safe.
 */
export default function ServiceAreasTab() {
  const areas = useQuery(api.services.serviceAreas.listAreas, {});
  const saveArea = useMutation(api.services.serviceAreas.saveArea);
  const removeArea = useMutation(api.services.serviceAreas.removeArea);
  const reorder = useMutation(api.services.serviceAreas.reorderAreas);
  const [editing, setEditing] = useState<Area | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => areas ?? [], [areas]);

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorder({ orderedIds: next.map((a) => a._id) });
    } catch (e) {
      adminToast(errorMessage(e, 'Could not reorder the areas.'));
    }
  };

  const remove = async (area: Area) => {
    setBusyId(area._id);
    try {
      const res = await removeArea({ areaId: area._id });
      adminToast(res.deleted ? `Deleted ${area.name}.` : `${area.name} has past orders, so it was switched off instead.`, 'success');
    } catch (e) {
      adminToast(errorMessage(e, 'Could not remove that area.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs sm:text-sm max-w-2xl" style={{ color: 'var(--ink-3)' }}>
          The areas you serve, in the order customers see them. <b>Delivery</b> is the fee for bringing an order to them; <b>travel</b> is the fee added
          to a home service visit. Orders and bookings keep the fee they were quoted, so you can change these any time.
        </p>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
          style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
        >
          <Plus className="w-4 h-4" />
          Add area
        </button>
      </div>

      {areas === undefined ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Loading areas…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <MapPin className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>No areas yet.</p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Add one for each place you deliver to or travel to — customers pick from this list.</p>
        </div>
      ) : (
        <div className="rounded-[14px] border overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          {rows.map((area, index) => (
            <div key={area._id} className="px-3 sm:px-4 py-3 flex items-start gap-3" style={{ borderColor: 'var(--line-soft)', opacity: area.isActive ? 1 : 0.55 }}>
              <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${area.name} up`} className="p-0.5 rounded disabled:opacity-25" style={{ color: 'var(--ink-3)' }}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move ${area.name} down`} className="p-0.5 rounded disabled:opacity-25" style={{ color: 'var(--ink-3)' }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold break-words">{area.name}</span>
                  {!area.isActive && <Pill tone="muted">Off</Pill>}
                  {area.deliveryEnabled ? <Pill tone="jade">Delivery</Pill> : <Pill tone="muted">No delivery</Pill>}
                  {area.homeServiceEnabled ? <Pill tone="gold">Home service</Pill> : <Pill tone="muted">No visits</Pill>}
                </div>
                <div className="text-[11px] mt-1 flex flex-wrap gap-x-3 font-mono-tabular" style={{ color: 'var(--ink-3)' }}>
                  <span>Delivery <b style={{ color: 'var(--ink)' }}>{peso(area.deliveryFee)}</b></span>
                  <span>Travel <b style={{ color: 'var(--ink)' }}>{peso(area.travelFee)}</b></span>
                  {area.note && <span style={{ color: 'var(--ink-4)' }}>{area.note}</span>}
                </div>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setEditing(area)} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  Edit
                </button>
                <button
                  onClick={() => remove(area)}
                  disabled={busyId === area._id}
                  aria-label={`Remove ${area.name}`}
                  className="px-2 py-1.5 rounded-md border disabled:opacity-40"
                  style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AreaDialog
          area={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await saveArea(values);
            setEditing(null);
            adminToast(editing === 'new' ? `Added ${values.name}.` : `Saved ${values.name}.`, 'success');
          }}
        />
      )}
    </div>
  );
}

function Pill({ tone, children }: { tone: 'jade' | 'gold' | 'muted'; children: React.ReactNode }) {
  const style =
    tone === 'jade'
      ? { background: 'var(--jade-wash)', color: 'var(--jade)' }
      : tone === 'gold'
        ? { background: 'color-mix(in oklch, var(--gold) 18%, transparent)', color: 'var(--gold)' }
        : { background: 'var(--surface-hi)', color: 'var(--ink-3)' };
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={style}>
      {children}
    </span>
  );
}

type AreaValues = {
  areaId?: Id<'serviceAreas'>;
  name: string;
  deliveryFee: number;
  travelFee: number;
  note?: string;
  deliveryEnabled: boolean;
  homeServiceEnabled: boolean;
  isActive: boolean;
};

function AreaDialog({ area, onClose, onSave }: { area: Area | null; onClose: () => void; onSave: (v: AreaValues) => Promise<void> }) {
  const [name, setName] = useState(area?.name ?? '');
  const [deliveryFee, setDeliveryFee] = useState(String(area?.deliveryFee ?? ''));
  const [travelFee, setTravelFee] = useState(String(area?.travelFee ?? ''));
  const [note, setNote] = useState(area?.note ?? '');
  const [deliveryEnabled, setDeliveryEnabled] = useState(area?.deliveryEnabled ?? true);
  const [homeServiceEnabled, setHomeServiceEnabled] = useState(area?.homeServiceEnabled ?? true);
  const [isActive, setIsActive] = useState(area?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const delivery = Number(deliveryFee);
  const travel = Number(travelFee);
  const valid = name.trim().length > 0
    && deliveryFee.trim() !== '' && Number.isFinite(delivery) && delivery >= 0
    && travelFee.trim() !== '' && Number.isFinite(travel) && travel >= 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({
        ...(area ? { areaId: area._id } : {}),
        name: name.trim(),
        deliveryFee: delivery,
        travelFee: travel,
        note: note.trim() || undefined,
        deliveryEnabled,
        homeServiceEnabled,
        isActive,
      });
    } catch (e) {
      setError(errorMessage(e, 'Could not save that area.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={area ? `Edit ${area.name}` : 'Add an area'} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">{area ? `Edit ${area.name}` : 'Add an area'}</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            Name it the way a customer would recognise it — it appears in the checkout and booking forms.
          </p>

          <div className="space-y-3">
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Area name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Quezon City" className={`${inputCls} mt-1`} style={inputStyle} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Delivery fee (₱)
                <input type="number" min={0} step="1" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Travel fee (₱)
                <input type="number" min={0} step="1" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
            </div>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Note shown to customers <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="e.g. Same day, or 1–2 days" className={`${inputCls} mt-1`} style={inputStyle} />
            </label>

            <div className="space-y-2 pt-1">
              <Toggle checked={deliveryEnabled} onChange={setDeliveryEnabled} label="Deliver orders here" />
              <Toggle checked={homeServiceEnabled} onChange={setHomeServiceEnabled} label="Send a technician here" />
              <Toggle checked={isActive} onChange={setIsActive} label="Show this area to customers" />
            </div>
          </div>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!valid || busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Saving…' : 'Save area'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{label}</span>
        {hint && <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{hint}</span>}
      </span>
    </label>
  );
}
