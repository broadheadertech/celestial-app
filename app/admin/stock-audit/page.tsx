'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, Download, History, Info, RefreshCw, Truck, X, XCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import DeliveriesTab from '@/components/admin/DeliveriesTab';

type Activity = FunctionReturnType<typeof api.services.stockAudit.getStockActivity>;
type MovementType = Activity['rows'][number]['movementType'];

/** Plain-language labels; reservation rows track reserved units rather than units on the shelf. */
const TYPE_LABEL: Record<MovementType, string> = {
  initial: 'New product',
  purchase: 'Purchase',
  restock: 'Restock',
  sale: 'Sale',
  reservation: 'Reserved',
  return: 'Return',
  damage: 'Damaged / loss',
  adjustment: 'Adjustment / count',
  transfer: 'Transfer',
  expiry: 'Expired',
  internal_use: 'Internal use',
};
const SUMMARY: { types: MovementType[]; label: string; sign: 1 | -1 }[] = [
  { types: ['sale'], label: 'Sold', sign: -1 },
  { types: ['restock', 'purchase', 'initial'], label: 'Received', sign: 1 },
  { types: ['damage', 'expiry'], label: 'Lost / damaged', sign: -1 },
  { types: ['internal_use'], label: 'Internal use', sign: -1 },
  { types: ['return'], label: 'Returned', sign: 1 },
  { types: ['adjustment'], label: 'Adjustments (net)', sign: 1 },
];
const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const inputCls = 'px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] transition-colors';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

function AuditContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'activity' | 'check' | 'deliveries'>('activity');
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const flash = (text: string, error = false) => {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), error ? 6000 : 3500);
  };

  return (
    <div className="min-h-screen pb-28 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top" style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => router.back()} className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }} aria-label="Go back">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">Inventory · who changed what, and why</p>
              <h1 className="display text-lg sm:text-2xl truncate">Inventory audit</h1>
            </div>
          </div>
        </div>
        <div className="px-3 sm:px-6 max-w-6xl mx-auto flex gap-1">
          {([['activity', 'Activity', History], ['check', 'Stock check', ClipboardCheck], ['deliveries', 'Deliveries', Truck]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px"
              style={{ borderColor: tab === id ? 'var(--red)' : 'transparent', color: tab === id ? 'var(--ink)' : 'var(--ink-3)' }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        {tab === 'activity' ? <ActivityTab /> : tab === 'check' ? <StockCheckTab flash={flash} /> : <DeliveriesTab flash={flash} />}
      </div>

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

function ActivityTab() {
  const [days, setDays] = useState(7);
  const [movementType, setMovementType] = useState<MovementType | ''>('');
  const [person, setPerson] = useState('');
  const [search, setSearch] = useState('');
  const data = useQuery(api.services.stockAudit.getStockActivity, {
    days,
    movementType: movementType || undefined,
    performedByName: person || undefined,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.rows ?? [];
    return q ? all.filter((r) => `${r.productName} ${r.sku ?? ''} ${r.note ?? ''} ${r.batchCode}`.toLowerCase().includes(q)) : all;
  }, [data, search]);

  const byDay = useMemo(() => {
    const groups: { day: string; rows: typeof rows }[] = [];
    for (const r of rows) {
      const day = new Date(r.createdAt).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.rows.push(r);
      else groups.push({ day, rows: [r] });
    }
    return groups;
  }, [rows]);

  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Time', 'Product', 'SKU', 'Category', 'Change type', 'Change', 'Before', 'After', 'By', 'Note', 'Batch'];
    const body = rows.map((r) => {
      const d = new Date(r.createdAt);
      return [d.toLocaleDateString('en-PH'), d.toLocaleTimeString('en-PH'), r.productName, r.sku ?? '', r.categoryName, TYPE_LABEL[r.movementType], r.quantityChange, r.quantityBefore, r.quantityAfter, r.performedByName ?? 'Customer / system', r.note ?? '', r.batchCode];
    });
    const csv = [header, ...body].map((line) => line.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `inventory-activity-${days}d-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Period + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
          {PERIODS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)} className="px-3 py-2 text-xs sm:text-sm font-semibold" style={{ background: days === p.days ? 'var(--red)' : 'var(--surface-2)', color: days === p.days ? 'oklch(0.99 0 0)' : 'var(--ink-2)' }}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType | '')} className={inputCls} style={inputStyle} aria-label="Change type">
          <option value="">All changes</option>
          {(Object.keys(TYPE_LABEL) as MovementType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select value={person} onChange={(e) => setPerson(e.target.value)} className={inputCls} style={inputStyle} aria-label="Person">
          <option value="">Everyone</option>
          {(data?.people ?? []).map((p) => (
            <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
          ))}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, note, batch…" className={`${inputCls} flex-1 min-w-[160px]`} style={inputStyle} />
        <button onClick={downloadCsv} disabled={!rows.length} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SUMMARY.map((s) => {
            const units = s.types.reduce((sum, t) => sum + (data.totals[t]?.units ?? 0), 0);
            const entries = s.types.reduce((sum, t) => sum + (data.totals[t]?.entries ?? 0), 0);
            const shown = s.sign === -1 ? -units : units;
            return (
              <button
                key={s.label}
                onClick={() => setMovementType(s.types.length === 1 && movementType !== s.types[0] ? s.types[0] : '')}
                className="text-left p-3 rounded-[12px] border"
                style={{ background: 'var(--surface)', borderColor: s.types.includes(movementType as MovementType) ? 'var(--red)' : 'var(--line)' }}
              >
                <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{s.label}</div>
                <div className="text-lg font-bold font-mono-tabular">{shown > 0 && s.label.startsWith('Adjust') ? '+' : ''}{shown.toLocaleString()}</div>
                <div className="text-[10px]" style={{ color: 'var(--ink-4)' }}>{entries} entr{entries === 1 ? 'y' : 'ies'}</div>
              </button>
            );
          })}
        </div>
      )}

      {data === undefined ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Loading activity…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 rounded-[14px] border text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
          No stock changes match these filters.
        </div>
      ) : (
        <>
          {data.truncated && (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Showing the newest {data.rows.length.toLocaleString()} changes. Pick a shorter period or a filter to see older ones.</p>
          )}
          {byDay.map((g) => (
            <section key={g.day} className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div className="px-3 sm:px-4 py-2 border-b text-xs font-bold uppercase tracking-wider" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                {g.day} · {g.rows.length} change{g.rows.length === 1 ? '' : 's'}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
                {g.rows.map((r) => {
                  const positive = r.quantityChange > 0;
                  const reserved = r.movementType === 'reservation';
                  return (
                    <div key={r._id} className="px-3 sm:px-4 py-2.5 flex items-start gap-3">
                      <div className="w-14 flex-shrink-0 text-[11px] font-mono-tabular pt-0.5" style={{ color: 'var(--ink-4)' }}>
                        {new Date(r.createdAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold break-words">{r.productName}</span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-2)' }}>{TYPE_LABEL[r.movementType]}</span>
                        </div>
                        <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--ink-3)' }}>
                          <span>{r.performedByName ?? 'Customer / system'}</span>
                          {r.note && <span className="break-words" style={{ color: 'var(--ink-2)' }}>“{r.note}”</span>}
                          <span className="font-mono-tabular" style={{ color: 'var(--ink-4)' }}>{r.batchCode}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold font-mono-tabular" style={{ color: reserved ? 'var(--ink-2)' : positive ? 'var(--jade)' : r.quantityChange < 0 ? 'var(--red-hi)' : 'var(--ink-3)' }}>
                          {positive ? '+' : ''}{r.quantityChange}
                        </div>
                        <div className="text-[10px] font-mono-tabular" style={{ color: 'var(--ink-4)' }} title={reserved ? 'Reserved units' : 'Stock before → after'}>
                          {r.quantityBefore} → {r.quantityAfter}{reserved ? ' reserved' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function StockCheckTab({ flash }: { flash: (text: string, error?: boolean) => void }) {
  const check = useQuery(api.services.stockAudit.getStockCheck, {});
  const [counting, setCounting] = useState<{ productId: string; name: string; stock: number; batchTotal?: number } | null>(null);

  return (
    <>
      <div className="flex items-start gap-2.5 p-3 rounded-[12px] border text-xs sm:text-sm leading-relaxed" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--indigo)' }} />
        <p>
          Each product has a stock number, and its deliveries (batches) track how many units are left. These should always agree. When they don&apos;t,
          count the item on the shelf and record the count — both numbers are set to what you counted, and the count is saved in the Activity log with
          your name.
        </p>
      </div>

      {check === undefined ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Checking {''}stock…
        </div>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Checked {check.checked} active products: <b>{check.mismatched.length}</b> don&apos;t match their batches, <b>{check.noBatches.length}</b> have no batch records.
          </p>
          <CheckList
            title="Numbers don't match"
            empty="Every product with batches matches. 👍"
            rows={check.mismatched.map((r) => ({ ...r, detail: `Product says ${r.stock} · batches say ${r.batchTotal}` }))}
            onCount={(r) => setCounting(r)}
          />
          <CheckList
            title="No batch records"
            empty="Every product has batch records."
            hint="Older products added before batches were tracked. Recording a count creates a batch so future sales and restocks are tracked."
            rows={check.noBatches.map((r) => ({ ...r, detail: `Product says ${r.stock}` }))}
            onCount={(r) => setCounting(r)}
          />
        </>
      )}

      {counting && (
        <CountModal
          target={counting}
          onClose={() => setCounting(null)}
          onDone={(m) => {
            setCounting(null);
            flash(m);
          }}
        />
      )}
    </>
  );
}

type CheckRow = { productId: string; name: string; sku?: string | number; categoryName: string; stock: number; batchTotal?: number; detail: string };

function CheckList({ title, empty, hint, rows, onCount }: { title: string; empty: string; hint?: string; rows: CheckRow[]; onCount: (r: CheckRow) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, 25);
  return (
    <section className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="px-3 sm:px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
        {rows.length > 0 && <AlertTriangle className="w-4 h-4" style={{ color: 'var(--gold)' }} />}
        <span className="text-sm font-bold">{title}</span>
        <span className="text-[11px] font-mono-tabular ml-auto" style={{ color: 'var(--ink-4)' }}>{rows.length}</span>
      </div>
      {hint && rows.length > 0 && <p className="px-3 sm:px-4 pt-2.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm" style={{ color: 'var(--ink-3)' }}>{empty}</p>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
          {visible.map((r) => (
            <div key={r.productId} className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold break-words">{r.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{r.categoryName}{r.sku ? ` · ${r.sku}` : ''} · {r.detail}</div>
              </div>
              <button onClick={() => onCount(r)} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex-shrink-0" style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                Record count
              </button>
            </div>
          ))}
          {rows.length > 25 && (
            <button onClick={() => setShowAll((s) => !s)} className="w-full px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function CountModal({ target, onClose, onDone }: { target: { productId: string; name: string; stock: number; batchTotal?: number }; onClose: () => void; onDone: (m: string) => void }) {
  const recordStockCount = useMutation(api.services.stockAudit.recordStockCount);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(counted);
  const valid = counted.trim() !== '' && Number.isInteger(n) && n >= 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await recordStockCount({ productId: target.productId as Id<'products'>, counted: n, note: note.trim() || undefined });
      onDone(`Saved: ${target.name} is now ${n}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the count');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Record stock count" className="relative w-full sm:max-w-sm border-t sm:border rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 safe-area-bottom" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold">Record stock count</h2>
          <button onClick={onClose} className="p-1.5 rounded-md" style={{ color: 'var(--ink-3)' }} aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
          {target.name}: system says {target.stock}{target.batchTotal !== undefined ? `, batches say ${target.batchTotal}` : ''}.
        </p>
        <label className="block mb-3">
          <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>How many are available to sell right now? *</span>
          <input type="number" min={0} autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} className={`${inputCls} w-full`} style={inputStyle} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. monthly count, 2 found in back room" className={`${inputCls} w-full`} style={inputStyle} />
        </label>
        {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}
        <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>Cancel</button>
          <button onClick={submit} disabled={!valid || saving} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-bold disabled:opacity-40" style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}>
            {saving ? 'Saving…' : 'Save count'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockAuditPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AuditContent />
    </SafeAreaProvider>
  );
}
