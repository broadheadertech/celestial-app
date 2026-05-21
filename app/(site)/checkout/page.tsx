'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CreditCard, Building2, Smartphone, Banknote, ShoppingBag } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import {
  useSiteCart,
  siteCartSubtotal,
  siteCartDepositToday,
  siteCartLiveItems,
  siteCartGearItems,
  siteCartBalanceAtPickup,
  type SiteCartLine,
} from '@/store/siteCart';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Step = 'selection' | 'delivery' | 'payment' | 'confirmation';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'gcash', label: 'GCash', icon: Smartphone },
  { id: 'bank_transfer', label: 'Bank transfer', icon: Building2 },
  { id: 'cash', label: 'Cash at pickup', icon: Banknote },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const items = useSiteCart((s) => s.items);
  const clear = useSiteCart((s) => s.clear);

  const createReservation = useMutation(api.services.reservations.createReservation);
  const adminCreateOrder = useMutation(api.services.orders.adminCreateOrder);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);

  const [step, setStep] = useState<Step>('selection');
  const [guestName, setGuestName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [guestAddress, setGuestAddress] = useState('');
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState('14:00');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ code: string; total: number; deposit: number } | null>(null);

  const subtotal = siteCartSubtotal(items);
  const live = siteCartLiveItems(items);
  const gear = siteCartGearItems(items);
  const hasLive = live.length > 0;
  const dueToday = siteCartDepositToday(items);
  const balanceAtPickup = siteCartBalanceAtPickup(items);
  const totalQty = items.reduce((s, l) => s + l.qty, 0);

  const canContinueDelivery = useMemo(
    () => guestName.trim().length > 1 && /.+@.+\..+/.test(guestEmail) && guestPhone.trim().length >= 7,
    [guestName, guestEmail, guestPhone],
  );

  if (items.length === 0 && !confirmation) {
    return (
      <main className="py-20" style={{ padding: '80px 0' }}>
        <div className="site-container text-center" style={{ color: 'var(--ink-3)' }}>
          <ShoppingBag size={32} className="mx-auto mb-4" style={{ color: 'var(--ink-4)' }} />
          <h1
            className="display mb-3"
            style={{ fontSize: 28, fontVariationSettings: '"opsz" 32, "wght" 700' }}
          >
            An empty case
          </h1>
          <p className="text-[14px] mb-6">Add a specimen or gear to start a checkout.</p>
          <Link href="/catalog" className="b">
            Browse catalog <ArrowRight size={12} />
          </Link>
        </div>
      </main>
    );
  }

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const userIdArg = user?._id as Id<'users'> | undefined;
      const baseCustomerName = guestName.trim() || (user ? `${user.firstName} ${user.lastName}` : 'Walk-in');

      // 1) Create reservation for live items (one reservation for the whole live batch).
      let reservationCode: string | undefined;
      if (live.length > 0) {
        const reservationResult = await createReservation({
          userId: userIdArg,
          guestId: !userIdArg ? `web-${Date.now()}` : undefined,
          guestInfo: !userIdArg
            ? {
                name: baseCustomerName,
                email: guestEmail,
                phone: guestPhone,
                completeAddress: guestAddress || undefined,
                pickupSchedule: { date: pickupDate, time: pickupTime },
                notes: notes || undefined,
              }
            : undefined,
          items: live.map((l) => ({
            productId: l.productId as Id<'products'>,
            quantity: l.qty,
            reservedPrice: l.price,
          })),
          totalAmount: live.reduce((s, l) => s + l.price * l.qty, 0),
          totalQuantity: live.reduce((s, l) => s + l.qty, 0),
          notes: `Deposit ${fmt(dueToday)} via ${paymentMethod}. Balance ${fmt(balanceAtPickup)} due at pickup ${pickupDate} ${pickupTime}.${notes ? ' · ' + notes : ''}`,
        });
        reservationCode =
          (reservationResult as { reservationCode?: string })?.reservationCode || undefined;
      }

      // 2) Create order for gear items (one order, paid in full, ready-to-fulfill).
      let orderCode: string | undefined;
      if (gear.length > 0) {
        const orderResult = await adminCreateOrder({
          userId: userIdArg,
          items: gear.map((l) => ({
            productId: l.productId as Id<'products'>,
            quantity: l.qty,
          })),
          paymentMethod,
          customerName: baseCustomerName,
        });
        await acknowledgeOrder({
          orderId: orderResult.orderId as Id<'orders'>,
          adminNotes: `Web checkout. Pickup ${pickupDate} ${pickupTime}. ${notes || ''}`.trim(),
        });
        orderCode = `ORD-${String(orderResult.orderId).slice(-6).toUpperCase()}`;
      }

      const finalCode = reservationCode || orderCode || 'CHECKOUT';
      setConfirmation({
        code: finalCode,
        total: subtotal,
        deposit: dueToday,
      });
      clear();
      setStep('confirmation');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Checkout failed. Try again or contact us.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'selection', label: 'Selection' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'payment', label: 'Payment' },
    { id: 'confirmation', label: 'Confirmation' },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <main>
      <div className="site-container pt-6 pb-3" style={{ padding: '24px 32px 12px' }}>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: 'var(--ink-3)' }}
        >
          <ChevronLeft size={14} />
          Back to gallery
        </Link>
      </div>

      <section className="pb-10" style={{ padding: '0 0 40px' }}>
        <div className="site-container">
          <div className="placard mb-3" style={{ color: 'var(--red-hi)' }}>
            Checkout
          </div>
          <h1
            className="display-xl mb-8"
            style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}
          >
            Take it <em className="italic-flourish">home.</em>
          </h1>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-10 flex-wrap">
            {steps.map((s, i) => {
              const done = currentStepIndex > i;
              const active = currentStepIndex === i;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold text-[12px]"
                    style={{
                      background: active
                        ? 'var(--red)'
                        : done
                        ? 'var(--jade-wash)'
                        : 'var(--surface)',
                      color: active
                        ? 'oklch(0.99 0 0)'
                        : done
                        ? 'var(--jade)'
                        : 'var(--ink-3)',
                      border:
                        '1px solid ' +
                        (active ? 'var(--red-deep)' : done ? 'var(--jade)' : 'var(--line)'),
                    }}
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: active ? 'var(--ink)' : 'var(--ink-3)' }}
                  >
                    {s.label}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className="w-8 h-px"
                      style={{ background: done ? 'var(--jade)' : 'var(--line)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="grid gap-10"
            style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}
          >
            <div>
              {step === 'selection' && (
                <SelectionStep
                  items={items}
                  onContinue={() => setStep('delivery')}
                />
              )}
              {step === 'delivery' && (
                <DeliveryStep
                  name={guestName}
                  setName={setGuestName}
                  email={guestEmail}
                  setEmail={setGuestEmail}
                  phone={guestPhone}
                  setPhone={setGuestPhone}
                  address={guestAddress}
                  setAddress={setGuestAddress}
                  hasLive={hasLive}
                  pickupDate={pickupDate}
                  setPickupDate={setPickupDate}
                  pickupTime={pickupTime}
                  setPickupTime={setPickupTime}
                  notes={notes}
                  setNotes={setNotes}
                  onBack={() => setStep('selection')}
                  onContinue={() => setStep('payment')}
                  canContinue={canContinueDelivery}
                />
              )}
              {step === 'payment' && (
                <PaymentStep
                  method={paymentMethod}
                  setMethod={setPaymentMethod}
                  hasLive={hasLive}
                  dueToday={dueToday}
                  onBack={() => setStep('delivery')}
                  onSubmit={submit}
                  isSubmitting={isSubmitting}
                />
              )}
              {step === 'confirmation' && confirmation && (
                <ConfirmationStep
                  code={confirmation.code}
                  total={confirmation.total}
                  deposit={confirmation.deposit}
                  pickupDate={pickupDate}
                  pickupTime={pickupTime}
                  router={router}
                />
              )}
            </div>

            {/* Order summary */}
            <aside>
              <div
                className="sticky top-[100px] rounded p-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
              >
                <div className="placard mb-4">Selection</div>

                <div className="flex flex-col gap-3 mb-5">
                  {items.length === 0 ? (
                    <p
                      className="text-[12px] text-center py-4"
                      style={{ color: 'var(--ink-4)' }}
                    >
                      Empty.
                    </p>
                  ) : (
                    items.map((l) => (
                      <div key={l.productId} className="flex justify-between text-[13px] gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.name}</div>
                          <div className="placard mt-0.5">
                            {l.isLive ? 'Live · single' : `Gear × ${l.qty}`}
                          </div>
                        </div>
                        <div className="font-mono-tabular font-semibold">
                          {fmt(l.price * l.qty)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <hr className="hairline my-4" />

                <div className="flex flex-col gap-1.5 text-[13px]">
                  <div className="flex justify-between" style={{ color: 'var(--ink-3)' }}>
                    <span>Subtotal ({totalQty} item{totalQty === 1 ? '' : 's'})</span>
                    <span className="font-mono-tabular">{fmt(subtotal)}</span>
                  </div>
                  {hasLive && (
                    <>
                      <div
                        className="flex justify-between"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <span>Deposit due today (20% of live)</span>
                        <span className="font-mono-tabular">
                          {fmt(live.reduce((s, l) => s + l.price * 0.2, 0))}
                        </span>
                      </div>
                      <div
                        className="flex justify-between"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <span>Balance at pickup</span>
                        <span className="font-mono-tabular">{fmt(balanceAtPickup)}</span>
                      </div>
                    </>
                  )}
                  {gear.length > 0 && (
                    <div className="flex justify-between" style={{ color: 'var(--ink-3)' }}>
                      <span>Gear (paid in full)</span>
                      <span className="font-mono-tabular">
                        {fmt(gear.reduce((s, l) => s + l.price * l.qty, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <hr className="hairline my-4" />

                <div className="flex justify-between items-baseline">
                  <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                    Due now
                  </span>
                  <span
                    className="display font-mono-tabular"
                    style={{
                      fontSize: 22,
                      fontVariationSettings: '"opsz" 28, "wght" 700',
                    }}
                  >
                    {fmt(dueToday)}
                  </span>
                </div>
                {hasLive && (
                  <p
                    className="text-[11px] mt-3 text-center"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    Live specimens reserved with deposit; balance settles at pickup.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ─────────── STEPS ─────────── */

function SelectionStep({
  items,
  onContinue,
}: {
  items: SiteCartLine[];
  onContinue: () => void;
}) {
  return (
    <div>
      <h2
        className="display mb-2"
        style={{ fontSize: 26, fontVariationSettings: '"opsz" 32, "wght" 700' }}
      >
        Confirm your selection
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: 'var(--ink-3)' }}>
        {items.length} item{items.length === 1 ? '' : 's'} in your case. Live specimens reserve
        with a 20% deposit; gear pays in full.
      </p>
      <div
        className="flex flex-col rounded"
        style={{ border: '1px solid var(--line-soft)' }}
      >
        {items.map((l, i) => (
          <div
            key={l.productId}
            className="flex justify-between items-center px-4 py-3.5"
            style={{
              borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate">{l.name}</div>
              <div className="placard mt-1">
                {l.isLive ? 'Live specimen · 20% deposit' : `Gear × ${l.qty}`}
                {l.sku && <> · #{l.sku}</>}
              </div>
            </div>
            <div className="font-mono-tabular font-bold text-[14px]">
              {fmt(l.price * l.qty)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button
          type="button"
          onClick={onContinue}
          disabled={items.length === 0}
          className="b b-primary b-lg"
        >
          Continue to delivery <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function DeliveryStep({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  address,
  setAddress,
  hasLive,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  notes,
  setNotes,
  onBack,
  onContinue,
  canContinue,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  hasLive: boolean;
  pickupDate: string;
  setPickupDate: (v: string) => void;
  pickupTime: string;
  setPickupTime: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <h2
        className="display mb-2"
        style={{ fontSize: 26, fontVariationSettings: '"opsz" 32, "wght" 700' }}
      >
        How should we reach you?
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: 'var(--ink-3)' }}>
        Contact details and {hasLive ? 'pickup' : 'delivery'} preferences.
      </p>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="placard mb-1.5">Full name</div>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mark Santos"
            />
          </div>
          <div>
            <div className="placard mb-1.5">Phone</div>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 917 234 5678"
            />
          </div>
        </div>
        <div>
          <div className="placard mb-1.5">Email</div>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
          />
        </div>
        <div>
          <div className="placard mb-1.5">Address</div>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional · for delivery or records"
          />
        </div>
        {hasLive && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="placard mb-1.5">Pickup date</div>
              <input
                type="date"
                className="input [color-scheme:dark]"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div>
              <div className="placard mb-1.5">Pickup time</div>
              <input
                type="time"
                className="input [color-scheme:dark]"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          </div>
        )}
        <div>
          <div className="placard mb-1.5">Notes (optional)</div>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know — tank size, preferred grade, who is collecting…"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8 gap-3">
        <button type="button" onClick={onBack} className="b">
          <ChevronLeft size={12} /> Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="b b-primary b-lg"
        >
          Continue to payment <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PaymentStep({
  method,
  setMethod,
  hasLive,
  dueToday,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  method: string;
  setMethod: (v: string) => void;
  hasLive: boolean;
  dueToday: number;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div>
      <h2
        className="display mb-2"
        style={{ fontSize: 26, fontVariationSettings: '"opsz" 32, "wght" 700' }}
      >
        How would you like to pay?
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: 'var(--ink-3)' }}>
        {hasLive
          ? 'Pay your deposit now; the balance settles at pickup.'
          : 'One-time payment for your gear and food.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_METHODS.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className="p-5 rounded text-left transition-colors"
              style={{
                background: active ? 'var(--red-wash)' : 'var(--surface)',
                border: '1px solid ' + (active ? 'var(--red)' : 'var(--line)'),
                color: 'var(--ink)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} style={{ color: active ? 'var(--red-hi)' : 'var(--ink-3)' }} />
                {active && <Check size={14} style={{ color: 'var(--red-hi)' }} />}
              </div>
              <div className="text-[14px] font-semibold">{m.label}</div>
              <div className="placard mt-0.5">
                {m.id === 'cash' && 'Settle on arrival'}
                {m.id === 'gcash' && 'Send to 0917-234-5678'}
                {m.id === 'bank_transfer' && 'BPI · BDO · UB'}
                {m.id === 'card' && 'Visa / MC · in person'}
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="mt-6 p-5 rounded"
        style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
      >
        <div className="placard">Confirmation</div>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          We&apos;ll email you a confirmation and our gallery address. Live specimens are held in
          your name once payment lands.
        </p>
      </div>

      <div className="flex justify-between mt-8 gap-3">
        <button type="button" onClick={onBack} className="b" disabled={isSubmitting}>
          <ChevronLeft size={12} /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="b b-primary b-lg"
        >
          {isSubmitting ? 'Locking it in…' : `Pay ${fmt(dueToday)} & confirm`}
          {!isSubmitting && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
}

function ConfirmationStep({
  code,
  total,
  deposit,
  pickupDate,
  pickupTime,
  router,
}: {
  code: string;
  total: number;
  deposit: number;
  pickupDate: string;
  pickupTime: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <div
        className="flex items-center justify-center rounded-full mb-6"
        style={{
          width: 56,
          height: 56,
          background: 'var(--jade-wash)',
          color: 'var(--jade)',
          border: '1px solid var(--jade)',
        }}
      >
        <Check size={24} />
      </div>
      <h2
        className="display mb-2"
        style={{ fontSize: 32, fontVariationSettings: '"opsz" 48, "wght" 700' }}
      >
        Held in your name.
      </h2>
      <p className="mb-6 max-w-[520px]" style={{ color: 'var(--ink-2)', fontSize: 16 }}>
        We&apos;ve emailed you the confirmation. Bring this code on pickup — or quote it on the
        phone:
      </p>
      <div
        className="inline-block px-4 py-3 rounded font-mono-tabular text-[16px] font-bold mb-7"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
        }}
      >
        {code}
      </div>

      <div
        className="grid grid-cols-2 gap-0 rounded mb-8"
        style={{ border: '1px solid var(--line-soft)' }}
      >
        <div className="p-4" style={{ borderRight: '1px solid var(--line-soft)' }}>
          <div className="placard">Total</div>
          <div className="font-mono-tabular font-bold mt-1 text-[18px]">{fmt(total)}</div>
        </div>
        <div className="p-4">
          <div className="placard">Paid today</div>
          <div className="font-mono-tabular font-bold mt-1 text-[18px]">{fmt(deposit)}</div>
        </div>
      </div>

      <div
        className="p-5 rounded mb-8"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        <div className="placard mb-2">Pickup window</div>
        <div className="text-[15px] font-semibold">{pickupDate} at {pickupTime}</div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--ink-3)' }}>
          34 Tomas Morato Ave, Quezon City. Bring valid ID.
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={() => router.push('/account')} className="b b-primary">
          Track in account <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => router.push('/catalog')} className="b">
          Back to gallery
        </button>
      </div>
    </div>
  );
}
