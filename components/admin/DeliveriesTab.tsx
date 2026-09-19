'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import ConfirmCorrectionDialog from './ConfirmCorrectionDialog';

type Delivery = FunctionReturnType<typeof api.services.restockCorrections.getRecentDeliveries>[number];

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

/**
 * Inventory Audit → Deliveries: recent restocks with password-protected Correct / Void
 * (convex/services/restockCorrections.ts). Changes adjust product stock and are logged.
 */
export default function DeliveriesTab({ flash }: { flash: (text: string, error?: boolean) => void }) {
  const deliveries = useQuery(api.services.restockCorrections.getRecentDeliveries, { limit: 100 });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ delivery: Delivery; mode: 'correct' | 'void' } | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = deliveries ?? [];
    return q ? all.filter((d) => `${d.productName} ${d.supplier ?? ''} ${d.batchCode}`.toLowerCase().includes(q)) : all;
  }, [deliveries, search]);

  return (
    <>
      <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-3)' }}>
        Recent deliveries (restocks). Fix a typo with <b>Correct</b> — the difference is added to or taken from the product&apos;s stock. Use <b>Void</b> for a delivery
        entered by mistake (only while none of it has been sold or used). Both need your password and are logged.
      </p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, supplier, batch…" className={inputCls} style={inputStyle} />

      {deliveries === undefined ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Loading deliveries…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>No deliveries found.</p>
      ) : (
        <div className="rounded-[14px] border overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          {rows.map((d) => (
            <div key={d.stockRecordId} className="px-3 sm:px-4 py-3 flex items-start gap-3" style={{ borderColor: 'var(--line-soft)', opacity: d.voidedAt ? 0.6 : 1 }}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold break-words">{d.productName}</span>
                  {d.voidedAt ? (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}>Voided</span>
                  ) : !d.isRestock ? (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-3)' }}>Initial stock</span>
                  ) : null}
                </div>
                <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--ink-3)' }}>
                  <span>{new Date(d.receivedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>
                    Qty <b style={{ color: 'var(--ink)' }}>{d.initialQty}</b>
                    {d.usedQty > 0 && ` · ${d.usedQty} sold/used`}
                  </span>
                  {d.actualCostPrice !== undefined && <span>{peso(d.actualCostPrice)}/unit</span>}
                  {d.supplier && <span>{d.supplier}</span>}
                  <span className="font-mono-tabular" style={{ color: 'var(--ink-4)' }}>{d.batchCode}</span>
                </div>
                {d.voidedAt && (
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--red-hi)' }}>
                    Voided {new Date(d.voidedAt).toLocaleDateString('en-PH')}{d.voidedByName ? ` by ${d.voidedByName}` : ''} — &ldquo;{d.voidReason}&rdquo;
                  </div>
                )}
              </div>
              {!d.voidedAt && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => setEditing({ delivery: d, mode: 'correct' })} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                    Correct
                  </button>
                  <button
                    onClick={() => setEditing({ delivery: d, mode: 'void' })}
                    disabled={d.usedQty > 0 || d.reservedQty > 0}
                    title={d.usedQty > 0 ? 'Some of this delivery was already sold or used — correct the quantity instead' : 'Void this delivery'}
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-35"
                    style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}
                  >
                    Void
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing?.mode === 'correct' && (
        <CorrectDeliveryDialog delivery={editing.delivery} onClose={() => setEditing(null)} onDone={(m) => { setEditing(null); flash(m); }} />
      )}
      {editing?.mode === 'void' && (
        <VoidDeliveryDialog delivery={editing.delivery} onClose={() => setEditing(null)} onDone={(m) => { setEditing(null); flash(m); }} />
      )}
    </>
  );
}

function CorrectDeliveryDialog({ delivery: d, onClose, onDone }: { delivery: Delivery; onClose: () => void; onDone: (m: string) => void }) {
  const correct = useMutation(api.services.restockCorrections.correctDelivery);
  const [quantity, setQuantity] = useState(String(d.initialQty));
  const [cost, setCost] = useState(d.actualCostPrice !== undefined ? String(d.actualCostPrice) : '');
  const [supplier, setSupplier] = useState(d.supplier ?? '');
  const minQty = d.usedQty + d.reservedQty;
  const qty = Math.floor(Number(quantity));
  const qtyValid = quantity.trim() !== '' && Number.isFinite(qty) && qty >= minQty;
  const costNum = Number(cost);
  const costValid = cost.trim() === '' || (Number.isFinite(costNum) && costNum >= 0);
  const delta = qtyValid ? qty - d.initialQty : 0;

  return (
    <ConfirmCorrectionDialog
      title={`Correct delivery — ${d.productName}`}
      description={<>Batch {d.batchCode}, received {new Date(d.receivedDate).toLocaleDateString('en-PH')}.</>}
      confirmLabel="Save correction"
      disabled={!qtyValid || !costValid}
      onClose={onClose}
      onConfirm={async (reason, password) => {
        const res = await correct({
          stockRecordId: d.stockRecordId,
          reason,
          password,
          ...(qty !== d.initialQty ? { quantity: qty } : {}),
          ...(cost.trim() !== '' && costNum !== d.actualCostPrice ? { actualCostPrice: costNum } : {}),
          ...(supplier.trim() !== (d.supplier ?? '') ? { supplier: supplier.trim() } : {}),
        });
        if (res.ok) onDone(`Delivery of ${d.productName} corrected.`);
        return res;
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Quantity received
          <input type="number" min={minQty} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
        </label>
        <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Unit cost (₱)
          <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
        </label>
        <label className="block text-[11px] col-span-2" style={{ color: 'var(--ink-3)' }}>
          Supplier
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} className={`${inputCls} mt-1`} style={inputStyle} />
        </label>
      </div>
      <p className="text-[11px] mt-2" style={{ color: !qtyValid ? 'var(--red-hi)' : 'var(--ink-3)' }}>
        {!qtyValid
          ? `Can't be less than ${minQty} — that many were already sold, used or reserved.`
          : delta === 0
            ? 'Stock stays the same.'
            : `${delta > 0 ? 'Adds' : 'Removes'} ${Math.abs(delta)} unit${Math.abs(delta) === 1 ? '' : 's'} ${delta > 0 ? 'to' : 'from'} ${d.productName}'s stock.`}
      </p>
    </ConfirmCorrectionDialog>
  );
}

function VoidDeliveryDialog({ delivery: d, onClose, onDone }: { delivery: Delivery; onClose: () => void; onDone: (m: string) => void }) {
  const voidDelivery = useMutation(api.services.restockCorrections.voidDelivery);
  return (
    <ConfirmCorrectionDialog
      title="Void this delivery?"
      description={
        <>
          {d.initialQty} × {d.productName} ({d.batchCode}) will be removed from stock. The delivery stays on record, marked voided with your name and reason.
        </>
      }
      confirmLabel="Void delivery"
      danger
      onClose={onClose}
      onConfirm={async (reason, password) => {
        const res = await voidDelivery({ stockRecordId: d.stockRecordId, reason, password });
        if (res.ok) onDone(`Delivery of ${d.productName} voided.`);
        return res;
      }}
    />
  );
}
