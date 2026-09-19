'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Check, ClipboardCopy, Download, Info, PackageCheck, PackagePlus, RefreshCw, Truck, X, XCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type Row = FunctionReturnType<typeof api.services.restock.getRestockList>['rows'][number];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const ago = (t: number) => {
  const days = Math.floor((Date.now() - t) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};
const STATUS = {
  out: { label: 'Out of stock', style: { background: 'var(--red-wash)', color: 'var(--red-hi)' } },
  low: { label: 'Low', style: { background: 'color-mix(in oklch, var(--gold) 18%, transparent)', color: 'var(--gold)' } },
  soon: { label: 'Selling fast', style: { background: 'var(--surface-hi)', color: 'var(--ink-2)' } },
} as const;
const NO_SUPPLIER = 'No supplier recorded';

const inputCls = 'px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] transition-colors';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

function RestockContent() {
  const router = useRouter();
  const [includeLiveFish, setIncludeLiveFish] = useState(false);
  const data = useQuery(api.services.restock.getRestockList, { includeLiveFish });
  const setOrdered = useMutation(api.services.restock.setOrdered);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState<Row | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const orderQty = (r: Row) => qty[r.productId] ?? r.suggestedQty;
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key = r.supplier || NO_SUPPLIER;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === NO_SUPPLIER ? 1 : b === NO_SUPPLIER ? -1 : a.localeCompare(b)));
  }, [rows]);

  const chosen = rows.filter((r) => selected.has(r.productId));
  const scope = chosen.length ? chosen : rows;
  const estimate = scope.reduce((sum, r) => sum + (r.lastUnitCost ?? 0) * orderQty(r), 0);
  const counts = { out: rows.filter((r) => r.status === 'out').length, low: rows.filter((r) => r.status === 'low').length, soon: rows.filter((r) => r.status === 'soon').length };

  const flash = (text: string, error = false) => {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), error ? 6000 : 3500);
  };
  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const listText = () => {
    const bySupplier = new Map<string, Row[]>();
    for (const r of scope) bySupplier.set(r.supplier || NO_SUPPLIER, [...(bySupplier.get(r.supplier || NO_SUPPLIER) ?? []), r]);
    const lines = [`Restock list — ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}`];
    for (const [supplier, items] of bySupplier) {
      lines.push('', `${supplier}:`);
      for (const r of items) lines.push(`- ${r.name}${r.sku ? ` (${r.sku})` : ''} — order ${orderQty(r)} (have ${Math.max(r.stock, 0)})`);
    }
    return lines.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(listText());
      flash(`Copied ${scope.length} item${scope.length === 1 ? '' : 's'} — paste into Messenger, Viber or a message to your supplier.`);
    } catch {
      flash('Could not copy — your browser blocked the clipboard.', true);
    }
  };

  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Supplier', 'Product', 'SKU', 'Category', 'In stock', 'Alert level', 'Sold (30 days)', 'Days left', 'Order qty', 'Last unit cost', 'Est. cost', 'Status', 'Ordered'];
    const body = scope.map((r) => [
      r.supplier || '', r.name, r.sku ?? '', r.categoryName, Math.max(r.stock, 0), r.threshold, r.sold30, r.daysLeft ?? '', orderQty(r),
      r.lastUnitCost ?? '', r.lastUnitCost ? Math.round(r.lastUnitCost * orderQty(r)) : '', STATUS[r.status].label, r.orderedAt ? new Date(r.orderedAt).toLocaleDateString('en-PH') : '',
    ]);
    const csv = [header, ...body].map((line) => line.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `restock-list-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const markOrdered = async (ordered: boolean) => {
    const ids = (chosen.length ? chosen : []).map((r) => r.productId as Id<'products'>);
    if (!ids.length) return flash('Tick the items you ordered first.', true);
    setBusy(true);
    try {
      const n = await setOrdered({ productIds: ids, ordered });
      flash(ordered ? `Marked ${n} item${n === 1 ? '' : 's'} as ordered.` : `Cleared ${n} ordered mark${n === 1 ? '' : 's'}.`);
      setSelected(new Set());
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to update', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top" style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => router.back()} className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }} aria-label="Go back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">Inventory · {data ? `${counts.out} out · ${counts.low} low · ${counts.soon} selling fast` : 'loading'}</p>
              <h1 className="display text-lg sm:text-2xl truncate">Restock list</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-[12px] border text-xs sm:text-sm leading-relaxed" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--indigo)' }} />
          <p>
            Items that are out of stock, at or below their alert level (default {data?.defaultThreshold ?? '…'}, change it per item below or in App
            Settings), or selling fast enough to run out within a week. Suggested quantities cover about 30 days of recent sales and bring the item back above its alert level — for big-ticket items like tanks, set a lower alert level (e.g. 1). Tick items to copy,
            download or mark them as ordered — the mark clears when you receive the stock.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm mr-auto cursor-pointer" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={includeLiveFish} onChange={(e) => setIncludeLiveFish(e.target.checked)} />
            Include live fish
          </label>
          <ToolButton onClick={copy} disabled={!rows.length}><ClipboardCopy className="w-3.5 h-3.5" />Copy{chosen.length ? ` (${chosen.length})` : ' all'}</ToolButton>
          <ToolButton onClick={downloadCsv} disabled={!rows.length}><Download className="w-3.5 h-3.5" />CSV</ToolButton>
          <ToolButton onClick={() => markOrdered(true)} disabled={busy || !chosen.length}><Truck className="w-3.5 h-3.5" />Mark ordered</ToolButton>
          <ToolButton onClick={() => markOrdered(false)} disabled={busy || !chosen.length}><X className="w-3.5 h-3.5" />Clear mark</ToolButton>
        </div>

        {rows.length > 0 && (
          <div className="text-xs sm:text-sm" style={{ color: 'var(--ink-3)' }}>
            {chosen.length ? `${chosen.length} selected` : `${rows.length} items`} · estimated cost{' '}
            <span className="font-semibold font-mono-tabular" style={{ color: 'var(--ink)' }}>{peso(estimate)}</span> at last known unit costs
          </div>
        )}

        {data === undefined ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Checking stock levels…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <PackageCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--jade)' }} />
            <h3 className="text-base sm:text-lg font-bold mb-1">Nothing to restock</h3>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Every item is above its alert level.</p>
          </div>
        ) : (
          groups.map(([supplier, items]) => (
            <section key={supplier} className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={items.every((r) => selected.has(r.productId))}
                    onChange={(e) => setSelected((s) => {
                      const next = new Set(s);
                      for (const r of items) {
                        if (e.target.checked) next.add(r.productId);
                        else next.delete(r.productId);
                      }
                      return next;
                    })}
                  />
                  {supplier}
                </label>
                <span className="text-[11px] font-mono-tabular" style={{ color: 'var(--ink-4)' }}>{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
                {items.map((r) => (
                  <RestockRow
                    key={r.productId}
                    row={r}
                    checked={selected.has(r.productId)}
                    onToggle={() => toggle(r.productId)}
                    qty={orderQty(r)}
                    onQty={(n) => setQty((q) => ({ ...q, [r.productId]: n }))}
                    onReceive={() => setReceiving(r)}
                    onError={(m) => flash(m, true)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {receiving && (
        <ReceiveModal
          row={receiving}
          defaultQty={orderQty(receiving)}
          onClose={() => setReceiving(null)}
          onDone={(m) => {
            setReceiving(null);
            flash(m);
          }}
        />
      )}

      {notice && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] sm:max-w-sm">
          <div className="px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-start gap-2" style={{ background: notice.error ? 'var(--red)' : 'var(--jade)', color: 'oklch(0.99 0 0)' }}>
            {notice.error ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {notice.text}
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
}

function RestockRow({ row: r, checked, onToggle, qty, onQty, onReceive, onError }: {
  row: Row; checked: boolean; onToggle: () => void; qty: number; onQty: (n: number) => void; onReceive: () => void; onError: (m: string) => void;
}) {
  const setReorderPoint = useMutation(api.services.restock.setReorderPoint);
  const [level, setLevel] = useState(String(r.threshold));
  const saveLevel = async () => {
    const trimmed = level.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next === r.threshold || (next === null && !r.customThreshold)) return;
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setLevel(String(r.threshold));
      return onError('Alert level must be 0 or more');
    }
    try {
      await setReorderPoint({ productId: r.productId as Id<'products'>, reorderPoint: next });
    } catch (e) {
      setLevel(String(r.threshold));
      onError(e instanceof Error ? e.message : 'Failed to save alert level');
    }
  };

  return (
    <div className="px-3 sm:px-4 py-3 flex items-start gap-3">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1.5" aria-label={`Select ${r.name}`} />
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border" style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {r.image && <img src={r.image} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-bold break-words">{r.name}</span>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={STATUS[r.status].style}>{STATUS[r.status].label}</span>
          {r.orderedAt && (
            <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--jade-wash)', color: 'var(--jade)' }} title={`Ordered ${new Date(r.orderedAt).toLocaleString()}`}>
              Ordered {ago(r.orderedAt)}{r.orderedByName ? ` · ${r.orderedByName}` : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
          <span>{r.categoryName}{r.sku ? ` · ${r.sku}` : ''}</span>
          <span>In stock <b style={{ color: r.stock <= 0 ? 'var(--red-hi)' : 'var(--ink)' }}>{Math.max(r.stock, 0)}</b></span>
          {r.sold30 > 0 ? (
            <span>Sold (30 days) <b style={{ color: 'var(--ink)' }}>{r.sold30}</b></span>
          ) : (
            <span style={{ color: 'var(--gold)' }}>No sales in 30 days — order only if needed</span>
          )}
          {r.daysLeft !== null && r.stock > 0 && <span>≈ {r.daysLeft} day{r.daysLeft === 1 ? '' : 's'} left</span>}
          {r.lastUnitCost !== undefined && <span>Last cost {peso(r.lastUnitCost)}</span>}
          {r.lastRestockAt && <span>Last restock {ago(r.lastRestockAt)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <label className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Order
            <input type="number" min={1} value={qty} onChange={(e) => onQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className={`${inputCls} w-20`} style={inputStyle} />
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }} title="Alert level for this item. Clear it to use the default.">
            Alert at
            <input
              type="number"
              min={0}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              onBlur={saveLevel}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className={`${inputCls} w-16`}
              style={inputStyle}
            />
            {r.customThreshold ? '' : <span style={{ color: 'var(--ink-4)' }}>(default)</span>}
          </label>
          <span className="flex-1" />
          <button onClick={onReceive} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border" style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}>
            <PackagePlus className="w-3.5 h-3.5" />
            Receive stock
          </button>
        </div>
      </div>
    </div>
  );
}

/** Records delivered stock (same as Inventory → Restock), prefilled from the list. */
function ReceiveModal({ row, defaultQty, onClose, onDone }: { row: Row; defaultQty: number; onClose: () => void; onDone: (m: string) => void }) {
  const restockProduct = useMutation(api.services.stock.restockProduct);
  const [quantity, setQuantity] = useState(String(defaultQty));
  const [unitCost, setUnitCost] = useState(row.lastUnitCost !== undefined ? String(row.lastUnitCost) : '');
  const [supplier, setSupplier] = useState(row.supplier ?? '');
  const [source, setSource] = useState<'coh' | 'investment' | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = Math.floor(Number(quantity));
  const cost = Number(unitCost);
  const valid = qty > 0 && unitCost.trim() !== '' && Number.isFinite(cost) && cost >= 0 && source !== null;

  const submit = async () => {
    if (!valid || !source) return;
    setSaving(true);
    setError(null);
    try {
      await restockProduct({
        productId: row.productId as Id<'products'>,
        quantity: qty,
        actualCostPrice: cost,
        fundingSource: source,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onDone(`Received ${qty} × ${row.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record the delivery');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Receive stock" className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto border-t sm:border rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 safe-area-bottom" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base sm:text-lg font-bold">Receive stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--ink-3)' }} aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>{row.name} · {Math.max(row.stock, 0)} in stock now</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity received *"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} w-full`} style={inputStyle} /></Field>
            <Field label="Unit cost (₱) *"><input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className={`${inputCls} w-full`} style={inputStyle} /></Field>
          </div>
          <Field label="Supplier"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} className={`${inputCls} w-full`} style={inputStyle} /></Field>
          <div>
            <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>Paid from *</span>
            <div className="grid grid-cols-2 gap-2">
              {([['coh', 'Till (COH)', 'deducts cash on hand'], ['investment', 'Investment', 'declaration only']] as const).map(([id, label, hint]) => (
                <button key={id} type="button" onClick={() => setSource(id)} className="p-2.5 rounded-lg border text-left" style={{ background: source === id ? 'var(--red-wash)' : 'var(--bg-2)', borderColor: source === id ? 'var(--red)' : 'var(--line)' }}>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="e.g. invoice #1234" className={`${inputCls} w-full`} style={inputStyle} /></Field>
          {qty > 0 && Number.isFinite(cost) && unitCost.trim() !== '' && (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Total <b className="font-mono-tabular" style={{ color: 'var(--ink)' }}>{peso(qty * cost)}</b></p>
          )}
          {error && <p role="alert" className="text-sm" style={{ color: 'var(--red-hi)' }}>{error}</p>}
        </div>
        <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>Cancel</button>
          <button onClick={submit} disabled={!valid || saving} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-bold disabled:opacity-40" style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}>
            {saving ? 'Saving…' : 'Record delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold active:scale-95 transition-all disabled:opacity-40" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>{label}</span>
      {children}
    </label>
  );
}

export default function RestockPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <RestockContent />
    </SafeAreaProvider>
  );
}
