'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';
import {
  useSiteCart,
  siteCartSubtotal,
  siteCartDepositToday,
  siteCartLiveItems,
} from '@/store/siteCart';
import ArowanaSilhouette, { SpecimenPlate, GearPlate } from './ArowanaSilhouette';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CartDrawer() {
  const router = useRouter();
  const items = useSiteCart((s) => s.items);
  const isOpen = useSiteCart((s) => s.isOpen);
  const setOpen = useSiteCart((s) => s.setOpen);
  const remove = useSiteCart((s) => s.remove);
  const setQty = useSiteCart((s) => s.setQty);

  if (!isOpen) return null;

  const subtotal = siteCartSubtotal(items);
  const hasLive = siteCartLiveItems(items).length > 0;
  const dueToday = siteCartDepositToday(items);

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        onClick={() => setOpen(false)}
        style={{ background: 'oklch(0 0 0 / 0.55)', backdropFilter: 'blur(8px)' }}
      />
      <aside
        className="absolute right-0 top-0 bottom-0 flex flex-col"
        style={{
          width: 'min(440px, 95vw)',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line)',
          animation: 'fadeUp 0.25s ease-out',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <div
              className="display"
              style={{ fontSize: 22, fontVariationSettings: '"opsz" 24, "wght" 700' }}
            >
              Your selection
            </div>
            <div className="placard mt-0.5">
              {items.length} item{items.length === 1 ? '' : 's'}
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="b b-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 px-4 gap-3.5">
              <ArowanaSilhouette size={120} color="var(--ink-5)" />
              <div className="display" style={{ fontSize: 18, color: 'var(--ink-2)' }}>
                An empty case
              </div>
              <div className="text-[13px] max-w-[240px]" style={{ color: 'var(--ink-4)' }}>
                Browse the catalog or our shop to start a selection.
              </div>
              <button
                className="b"
                onClick={() => {
                  setOpen(false);
                  router.push('/catalog');
                }}
              >
                Open catalog <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {items.map((l) => (
                <div
                  key={l.productId}
                  className="grid items-center gap-3.5"
                  style={{
                    gridTemplateColumns: '72px 1fr auto',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--line-soft)',
                  }}
                >
                  <div className="w-[72px] h-[72px] overflow-hidden rounded">
                    {l.isLive ? (
                      <SpecimenPlate
                        product={{
                          _id: l.productId,
                          sku: l.sku,
                          name: l.name,
                          categoryName: l.categoryName,
                          image: l.image,
                        }}
                        ratio="1 / 1"
                        size={60}
                        showMeta={false}
                      />
                    ) : (
                      <GearPlate product={{ sku: l.sku, name: l.name, image: l.image }} ratio="1 / 1" />
                    )}
                  </div>
                  <div className="min-w-0">
                    {l.sku && (
                      <div className="placard" style={{ fontSize: 9 }}>
                        {l.sku}
                      </div>
                    )}
                    <div className="text-[13px] font-semibold mt-0.5 truncate">{l.name}</div>
                    {l.isLive ? (
                      <div className="placard mt-1" style={{ color: 'var(--red-hi)' }}>
                        Single specimen · 20% deposit
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="inline-flex items-center rounded-full"
                          style={{ border: '1px solid var(--line)', padding: 2 }}
                        >
                          <button
                            onClick={() => setQty(l.productId, l.qty - 1)}
                            className="w-[22px] h-[22px] border-0 bg-transparent cursor-pointer"
                            style={{ color: 'var(--ink-2)' }}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span
                            className="font-mono-tabular text-center font-semibold text-[12px]"
                            style={{ width: 26 }}
                          >
                            {l.qty}
                          </span>
                          <button
                            onClick={() => setQty(l.productId, l.qty + 1)}
                            className="w-[22px] h-[22px] border-0 bg-transparent cursor-pointer"
                            style={{ color: 'var(--ink-2)' }}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className="font-mono-tabular font-bold text-[13px]"
                      style={{ color: 'var(--ink)' }}
                    >
                      {fmt(l.price * l.qty)}
                    </div>
                    <button
                      onClick={() => remove(l.productId)}
                      className="bg-transparent border-0 text-[10px] mt-1 cursor-pointer uppercase"
                      style={{ color: 'var(--ink-4)', letterSpacing: '0.08em' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div
            className="p-5.5"
            style={{
              padding: 22,
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-2)',
            }}
          >
            <div
              className="flex justify-between text-[12.5px]"
              style={{ color: 'var(--ink-3)' }}
            >
              <span>Subtotal</span>
              <span className="font-mono-tabular">{fmt(subtotal)}</span>
            </div>
            {hasLive && (
              <div
                className="flex justify-between text-[12.5px] mt-1"
                style={{ color: 'var(--ink-3)' }}
              >
                <span>Due today (deposit 20% + gear)</span>
                <span className="font-mono-tabular">{fmt(dueToday)}</span>
              </div>
            )}
            <button
              className="b b-primary b-lg w-full justify-center"
              onClick={() => {
                setOpen(false);
                router.push('/checkout');
              }}
              style={{ marginTop: 16 }}
            >
              Continue to checkout <ArrowRight size={14} />
            </button>
            <div
              className="text-center mt-2.5 text-[11px]"
              style={{ color: 'var(--ink-4)' }}
            >
              Live specimens reserved with deposit · gear pays in full
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
