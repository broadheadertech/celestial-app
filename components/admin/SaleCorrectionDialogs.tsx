'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import ConfirmCorrectionDialog from './ConfirmCorrectionDialog';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const PAYMENT_METHODS = [
  ['cash', 'Cash'],
  ['gcash', 'GCash'],
  ['card', 'Card'],
  ['bank_transfer', 'Bank transfer'],
  ['other', 'Other'],
] as const;

/** YYYY-MM-DD in the browser's timezone. */
export const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** A picked day as a timestamp: now for today, otherwise midday that day. */
export const fromDateInput = (value: string) => (value === toDateInput(Date.now()) ? Date.now() : new Date(`${value}T12:00:00`).getTime());

type SaleItem = { productId: string; productName: string; quantity: number; price: number; originalPrice?: number; discount?: number };
type Sale = {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  notes?: string;
  orderDiscount?: number;
  createdAt: number;
  items: SaleItem[];
};

export function VoidSaleDialog({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: (message: string) => void }) {
  const voidSale = useMutation(api.services.salesCorrections.voidSale);
  return (
    <ConfirmCorrectionDialog
      title={`Void sale ${sale.orderCode}?`}
      description={
        <>
          The sale ({peso(sale.totalAmount)}) is cancelled and its items go back into stock. It stays on record marked
          &ldquo;voided&rdquo; with your name and reason. To fix a mistake instead, use <b>Correct sale</b>.
        </>
      }
      confirmLabel="Void sale"
      danger
      onClose={onClose}
      onConfirm={async (reason, password) => {
        const res = await voidSale({ orderId: sale.orderId as Id<'orders'>, reason, password });
        if (res.ok) onDone(`Sale ${res.orderCode} voided.`);
        return res;
      }}
    />
  );
}

export function CorrectSaleDialog({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: (message: string, newOrderId: string) => void }) {
  const correctSale = useMutation(api.services.salesCorrections.correctSale);
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const unitPrice = (i: SaleItem) => i.originalPrice ?? i.price + (i.discount ?? 0);

  const [items, setItems] = useState(() =>
    sale.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, discount: i.discount ?? 0, listPrice: unitPrice(i) })),
  );
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const [customerName, setCustomerName] = useState(sale.customerName ?? '');
  const [notes, setNotes] = useState(sale.notes ?? '');
  const [orderDiscount, setOrderDiscount] = useState(String(sale.orderDiscount ?? 0));
  const [date, setDate] = useState(toDateInput(sale.createdAt));
  const [adding, setAdding] = useState('');

  const addable = useMemo(
    () => (products ?? []).filter((p) => p.isActive && p.stock > 0 && !items.some((i) => i.productId === p._id)).sort((a, b) => a.name.localeCompare(b.name)),
    [products, items],
  );
  const subtotal = items.reduce((s, i) => s + (i.listPrice - Math.min(i.discount, i.listPrice)) * i.quantity, 0);
  const discountNum = Math.max(0, Math.min(Number(orderDiscount) || 0, subtotal));
  const total = subtotal - discountNum;

  const inputCls = 'px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
  const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };
  const update = (idx: number, patch: Partial<(typeof items)[number]>) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <ConfirmCorrectionDialog
      title={`Correct sale ${sale.orderCode}`}
      description="Fix what was keyed in wrong. The original sale is voided and a corrected sale is created with the same date, so stock and reports stay right."
      confirmLabel="Void & save correction"
      wide
      disabled={items.length === 0}
      onClose={onClose}
      onConfirm={async (reason, password) => {
        const res = await correctSale({
          orderId: sale.orderId as Id<'orders'>,
          reason,
          password,
          items: items.map((i) => ({ productId: i.productId as Id<'products'>, quantity: i.quantity, ...(i.discount > 0 ? { discount: i.discount } : {}) })),
          orderDiscount: discountNum > 0 ? discountNum : undefined,
          paymentMethod,
          customerName: customerName.trim() || undefined,
          notes: notes.trim() || undefined,
          orderDate: date === toDateInput(sale.createdAt) ? undefined : fromDateInput(date),
        });
        if (res.ok) onDone(`Corrected — new sale ${res.orderCode}.`, res.orderId);
        return res;
      }}
    >
      <div className="space-y-3">
        <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--line)' }}>
          {items.map((it, idx) => (
            <div key={it.productId} className="p-2.5 flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--line-soft)' }}>
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-semibold break-words">{it.productName}</div>
                <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{peso(it.listPrice)} each</div>
              </div>
              <div className="inline-flex items-center rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <button type="button" onClick={() => update(idx, { quantity: Math.max(1, it.quantity - 1) })} className="p-1.5" aria-label="Less"><Minus className="w-3.5 h-3.5" /></button>
                <input type="number" min={1} value={it.quantity} onChange={(e) => update(idx, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="w-12 text-center bg-transparent text-sm focus:outline-none" aria-label="Quantity" />
                <button type="button" onClick={() => update(idx, { quantity: it.quantity + 1 })} className="p-1.5" aria-label="More"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <label className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Disc/unit
                <input type="number" min={0} value={it.discount} onChange={(e) => update(idx, { discount: Math.max(0, Number(e.target.value) || 0) })} className={`${inputCls} w-20`} style={inputStyle} />
              </label>
              <button type="button" onClick={() => setItems((list) => list.filter((_, i) => i !== idx))} className="p-1.5 rounded-md" style={{ color: 'var(--red-hi)' }} aria-label={`Remove ${it.productName}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="p-3 text-sm" style={{ color: 'var(--ink-3)' }}>No items — add one below, or use Void instead.</p>}
        </div>

        <select
          value={adding}
          onChange={(e) => {
            const p = addable.find((x) => x._id === e.target.value);
            if (p) setItems((list) => [...list, { productId: p._id, productName: p.name, quantity: 1, discount: 0, listPrice: p.price }]);
            setAdding('');
          }}
          className={`${inputCls} w-full`}
          style={inputStyle}
          aria-label="Add an item"
        >
          <option value="">+ Add an item (today&apos;s price)…</option>
          {addable.map((p) => (
            <option key={p._id} value={p._id}>{p.name} — {peso(p.price)} ({p.stock} in stock)</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Payment
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={`${inputCls} w-full mt-1`} style={inputStyle}>
              {PAYMENT_METHODS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
              {!PAYMENT_METHODS.some(([id]) => id === paymentMethod) && <option value={paymentMethod}>{paymentMethod}</option>}
            </select>
          </label>
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Sale date
            <input type="date" value={date} max={toDateInput(Date.now())} onChange={(e) => setDate(e.target.value)} className={`${inputCls} w-full mt-1`} style={inputStyle} />
          </label>
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Customer name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`${inputCls} w-full mt-1`} style={inputStyle} />
          </label>
          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Order discount (₱)
            <input type="number" min={0} value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} className={`${inputCls} w-full mt-1`} style={inputStyle} />
          </label>
        </div>
        <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} w-full mt-1`} style={inputStyle} />
        </label>
        <div className="flex justify-between text-sm font-semibold">
          <span>Corrected total</span>
          <span className="font-mono-tabular">
            {peso(total)} <span className="text-xs font-normal" style={{ color: 'var(--ink-4)' }}>(was {peso(sale.totalAmount)})</span>
          </span>
        </div>
      </div>
    </ConfirmCorrectionDialog>
  );
}
