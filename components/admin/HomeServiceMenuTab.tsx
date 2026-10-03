'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronDown, ChevronUp, Plus, RefreshCw, Sparkles, Trash2, Wrench } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { formatDuration } from '@/convex/lib/serviceQuote';
import { adminToast } from './AdminToaster';
import { errorMessage } from '@/lib/errorMessage';
import { Toggle } from './ServiceAreasTab';

type Service = FunctionReturnType<typeof api.services.homeService.listServices>[number];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

/**
 * Admin → Home Service → Services: the menu customers book from. Leave the price empty for jobs
 * you can only price after seeing the tank — the booking then says "quoted" instead of a total.
 */
export default function HomeServiceMenuTab() {
  const services = useQuery(api.services.homeService.listServices, {});
  const saveService = useMutation(api.services.homeService.saveService);
  const removeService = useMutation(api.services.homeService.removeService);
  const reorder = useMutation(api.services.homeService.reorderServices);
  const seed = useMutation(api.services.homeService.seedStarterServices);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const rows = useMemo(() => services ?? [], [services]);

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorder({ orderedIds: next.map((s) => s._id) });
    } catch (e) {
      adminToast(errorMessage(e, 'Could not reorder the services.'));
    }
  };

  const remove = async (service: Service) => {
    setBusyId(service._id);
    try {
      const res = await removeService({ serviceId: service._id });
      adminToast(res.deleted ? `Deleted “${service.name}”.` : `“${service.name}” has bookings, so it was switched off instead.`, 'success');
    } catch (e) {
      adminToast(errorMessage(e, 'Could not remove that service.'));
    } finally {
      setBusyId(null);
    }
  };

  const runSeed = async () => {
    setSeeding(true);
    try {
      const res = await seed({});
      adminToast(
        res.services || res.areas
          ? `Added ${res.services} starter service${res.services === 1 ? '' : 's'} and ${res.areas} area${res.areas === 1 ? '' : 's'} — edit the names and prices to match your shop.`
          : 'Nothing to add — you already have services and areas.',
        'success',
      );
    } catch (e) {
      adminToast(errorMessage(e, 'Could not add the starter services.'));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs sm:text-sm max-w-2xl" style={{ color: 'var(--ink-3)' }}>
          What customers can book, in the order they&rsquo;ll see it. Leave the price empty for a job you can only price after seeing the tank — the
          booking then reads &ldquo;quoted&rdquo; and you set the real figure when you confirm.
        </p>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
          style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
        >
          <Plus className="w-4 h-4" />
          Add service
        </button>
      </div>

      {services === undefined ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Loading services…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 px-5 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <Wrench className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>No services yet.</p>
          <p className="text-xs mb-5 max-w-md mx-auto" style={{ color: 'var(--ink-3)' }}>
            Start from the usual five — cleaning, monthly maintenance, new tank setup, aquascaping and a health check — then rename and reprice them to
            match what you actually offer.
          </p>
          <button onClick={runSeed} disabled={seeding} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
            <Sparkles className="w-4 h-4" />
            {seeding ? 'Adding…' : 'Add the starter services'}
          </button>
        </div>
      ) : (
        <div className="rounded-[14px] border overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          {rows.map((service, index) => (
            <div key={service._id} className="px-3 sm:px-4 py-3 flex items-start gap-3" style={{ borderColor: 'var(--line-soft)', opacity: service.isActive ? 1 : 0.55 }}>
              <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${service.name} up`} className="p-0.5 rounded disabled:opacity-25" style={{ color: 'var(--ink-3)' }}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move ${service.name} down`} className="p-0.5 rounded disabled:opacity-25" style={{ color: 'var(--ink-3)' }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold break-words">{service.name}</span>
                  {!service.isActive && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-3)' }}>Off</span>
                  )}
                </div>
                {service.description && (
                  <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>{service.description}</p>
                )}
                <div className="text-[11px] mt-1 flex flex-wrap gap-x-3 font-mono-tabular" style={{ color: 'var(--ink-3)' }}>
                  <span style={{ color: 'var(--ink)' }}>
                    <b>{service.price === undefined ? 'Quoted' : peso(service.price)}</b>
                    {service.priceNote && service.price !== undefined && ` ${service.priceNote}`}
                  </span>
                  {service.durationMinutes ? <span>{formatDuration(service.durationMinutes)}</span> : null}
                </div>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setEditing(service)} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  Edit
                </button>
                <button
                  onClick={() => remove(service)}
                  disabled={busyId === service._id}
                  aria-label={`Remove ${service.name}`}
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
        <ServiceDialog
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await saveService(values);
            setEditing(null);
            adminToast(editing === 'new' ? `Added “${values.name}”.` : `Saved “${values.name}”.`, 'success');
          }}
        />
      )}
    </div>
  );
}

type ServiceValues = {
  serviceId?: Id<'homeServices'>;
  name: string;
  description?: string;
  price?: number;
  priceNote?: string;
  durationMinutes?: number;
  isActive: boolean;
};

function ServiceDialog({ service, onClose, onSave }: { service: Service | null; onClose: () => void; onSave: (v: ServiceValues) => Promise<void> }) {
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(service?.price !== undefined ? String(service.price) : '');
  const [priceNote, setPriceNote] = useState(service?.priceNote ?? '');
  const [duration, setDuration] = useState(service?.durationMinutes ? String(service.durationMinutes) : '');
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const priceNum = Number(price);
  const durationNum = Number(duration);
  const priceValid = price.trim() === '' || (Number.isFinite(priceNum) && priceNum >= 0);
  const durationValid = duration.trim() === '' || (Number.isFinite(durationNum) && durationNum >= 0);
  const valid = name.trim().length > 0 && priceValid && durationValid;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({
        ...(service ? { serviceId: service._id } : {}),
        name: name.trim(),
        description: description.trim() || undefined,
        ...(price.trim() === '' ? {} : { price: priceNum }),
        priceNote: priceNote.trim() || undefined,
        ...(duration.trim() === '' ? {} : { durationMinutes: durationNum }),
        isActive,
      });
    } catch (e) {
      setError(errorMessage(e, 'Could not save that service.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={service ? `Edit ${service.name}` : 'Add a service'} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-4">{service ? `Edit ${service.name}` : 'Add a service'}</h3>

          <div className="space-y-3">
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Service name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Tank cleaning & water change" className={`${inputCls} mt-1`} style={inputStyle} />
            </label>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              What it includes <span style={{ color: 'var(--ink-4)' }}>(shown to customers)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={600} placeholder="Glass, substrate vacuum, filter rinse and a partial water change with treated water." className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Price (₱)
                <input type="number" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Leave empty to quote" className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
              <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Price note
                <input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} maxLength={60} placeholder="e.g. per tank" className={`${inputCls} mt-1`} style={inputStyle} />
              </label>
            </div>
            <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              How long it takes (minutes) <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
              <input type="number" min={0} step="15" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="90" className={`${inputCls} mt-1`} style={inputStyle} />
            </label>
            <div className="pt-1">
              <Toggle checked={isActive} onChange={setIsActive} label="Offer this service to customers" hint="Switch off to take it off the booking page without losing its history." />
            </div>
            {price.trim() === '' && (
              <p className="text-[11px] p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}>
                With no price, customers see &ldquo;quoted after we see the tank&rdquo; and only the travel fee for their area. You set the agreed price on the booking.
              </p>
            )}
          </div>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!valid || busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Saving…' : 'Save service'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
