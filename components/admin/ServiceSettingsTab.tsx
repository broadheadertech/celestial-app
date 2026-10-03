'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { adminToast } from './AdminToaster';
import { errorMessage } from '@/lib/errorMessage';
import { Toggle } from './ServiceAreasTab';

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

/**
 * The switchboard for both channels. Delivery off hides the option at checkout entirely; home
 * service off closes the booking page. Both start off, so neither appears until you set it up.
 */
export default function ServiceSettingsTab() {
  const settings = useQuery(api.services.serviceAreas.getSettings, {});
  const update = useMutation(api.services.serviceAreas.updateSettings);

  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [freeThreshold, setFreeThreshold] = useState('');
  const [minimum, setMinimum] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [homeServiceEnabled, setHomeServiceEnabled] = useState(false);
  const [homeServiceNote, setHomeServiceNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load once: re-reading on every server change would wipe what's being typed.
  useEffect(() => {
    if (!settings || loaded) return;
    setDeliveryEnabled(settings.deliveryEnabled);
    setFreeThreshold(settings.freeDeliveryThreshold !== undefined ? String(settings.freeDeliveryThreshold) : '');
    setMinimum(settings.minimumDeliveryOrder !== undefined ? String(settings.minimumDeliveryOrder) : '');
    setDeliveryNote(settings.deliveryNote ?? '');
    setHomeServiceEnabled(settings.homeServiceEnabled);
    setHomeServiceNote(settings.homeServiceNote ?? '');
    setLoaded(true);
  }, [settings, loaded]);

  const thresholdNum = Number(freeThreshold);
  const minimumNum = Number(minimum);
  const valid =
    (freeThreshold.trim() === '' || (Number.isFinite(thresholdNum) && thresholdNum >= 0)) &&
    (minimum.trim() === '' || (Number.isFinite(minimumNum) && minimumNum >= 0));

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await update({
        deliveryEnabled,
        ...(freeThreshold.trim() === '' ? {} : { freeDeliveryThreshold: thresholdNum }),
        ...(minimum.trim() === '' ? {} : { minimumDeliveryOrder: minimumNum }),
        deliveryNote: deliveryNote.trim() || undefined,
        homeServiceEnabled,
        homeServiceNote: homeServiceNote.trim() || undefined,
      });
      adminToast('Saved.', 'success');
    } catch (e) {
      adminToast(errorMessage(e, 'Could not save those settings.'));
    } finally {
      setBusy(false);
    }
  };

  if (settings === undefined) {
    return (
      <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
        <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="rounded-[14px] border p-4 sm:p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div>
          <h3 className="text-sm font-bold mb-1">Delivery</h3>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            When this is on, customers buying gear and food can choose delivery at checkout, pick their area and see the fee before they order. Switch it
            off and checkout offers pickup only.
          </p>
        </div>
        <Toggle checked={deliveryEnabled} onChange={setDeliveryEnabled} label="Offer delivery at checkout" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Free delivery from (₱)
            <input type="number" min={0} step="1" value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} placeholder="Leave empty for none" className={`${inputCls} mt-1`} style={inputStyle} />
            <span className="block mt-1" style={{ color: 'var(--ink-4)' }}>Orders at or above this amount pay no delivery fee.</span>
          </label>
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Smallest order we deliver (₱)
            <input type="number" min={0} step="1" value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder="Leave empty for no minimum" className={`${inputCls} mt-1`} style={inputStyle} />
            <span className="block mt-1" style={{ color: 'var(--ink-4)' }}>Below this, checkout asks them to collect instead.</span>
          </label>
        </div>
        <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Note shown at checkout <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
          <textarea value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} rows={2} maxLength={300} placeholder="We deliver Tuesdays and Fridays. Live fish are collected from the gallery only." className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
        </label>
      </section>

      <section className="rounded-[14px] border p-4 sm:p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div>
          <h3 className="text-sm font-bold mb-1">Home service</h3>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            When this is on, the Home Service page accepts bookings. Switch it off while you&rsquo;re fully booked — the page then points people at your
            Messenger instead of taking a request you can&rsquo;t honour.
          </p>
        </div>
        <Toggle checked={homeServiceEnabled} onChange={setHomeServiceEnabled} label="Accept home service bookings" />
        <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Note shown on the booking page <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
          <textarea value={homeServiceNote} onChange={(e) => setHomeServiceNote(e.target.value)} rows={2} maxLength={300} placeholder="Visits run Monday to Saturday, 9am–5pm. We'll confirm your slot by phone." className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
        </label>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={busy || !valid} className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
