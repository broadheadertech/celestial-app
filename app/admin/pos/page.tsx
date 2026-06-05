'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  Package,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Percent,
  User,
  Pause,
  CheckCircle2,
  Receipt,
  Calendar,
  Clock,
  Bookmark,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import OrderReceipt from '@/components/admin/OrderReceipt';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { useAuthStore } from '@/store/auth';

/* ─────────── HELPERS ─────────── */
const fmt = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Mode = 'sale' | 'reserve' | 'refund';
type PaymentMethodId = 'cash' | 'card' | 'gcash' | 'other';

interface CartLine {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  quantity: number;
  image?: string;
  /** Line discount type & value */
  discType: 'amount' | 'percent';
  discValue: number;
}

interface TenderLine {
  method: PaymentMethodId;
  amount: string;
}

const PAY_METHODS: { id: PaymentMethodId; label: string; Icon: typeof Banknote }[] = [
  { id: 'cash',  label: 'Cash',  Icon: Banknote },
  { id: 'card',  label: 'Card',  Icon: CreditCard },
  { id: 'gcash', label: 'GCash', Icon: Smartphone },
  { id: 'other', label: 'Other', Icon: Wallet },
];

const lineNet = (l: CartLine) => {
  const gross = l.price * l.quantity;
  const disc = l.discType === 'percent' ? gross * (l.discValue / 100) : l.discValue;
  return Math.max(0, gross - Math.min(disc, gross));
};

const lineDiscAmt = (l: CartLine) => {
  const gross = l.price * l.quantity;
  const disc = l.discType === 'percent' ? gross * (l.discValue / 100) : l.discValue;
  return Math.min(Math.max(0, disc), gross);
};

/* ──────────────────────── PAGE ──────────────────────── */
function PosPageContent() {
  const router = useRouter();
  const { user: posUser } = useAuthStore();

  // Mode
  const [mode, setMode] = useState<Mode>('sale');

  // Browser state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderDiscType, setOrderDiscType] = useState<'amount' | 'percent'>('amount');
  const [orderDiscInput, setOrderDiscInput] = useState('');
  const [tip, setTip] = useState('');

  // Customer / staff
  const [customerName, setCustomerName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [salesAssociateId, setSalesAssociateId] = useState('');
  const [salesAssociateName, setSalesAssociateName] = useState('');

  // Tender (split payment)
  const [tenders, setTenders] = useState<TenderLine[]>([{ method: 'cash', amount: '' }]);

  // Reservation
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState('14:00');
  const [reservationDepositRatio, setReservationDepositRatio] = useState(0.2);

  // Line discount modal
  const [editLine, setEditLine] = useState<string | null>(null);
  const [editLineType, setEditLineType] = useState<'amount' | 'percent'>('amount');
  const [editLineValue, setEditLineValue] = useState('');

  // Refund modal
  const [refundSearch, setRefundSearch] = useState('');
  const [refundConfirm, setRefundConfirm] = useState<string | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // UI flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showCartMobile, setShowCartMobile] = useState(false);

  // ─── Convex ───
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const users = useQuery(api.services.admin.getAllUsers, {});
  const staffUsers = useQuery(api.services.admin.getStaffUsers, { salesAssociatesOnly: true });
  const recentOrders = useQuery(api.services.orders.getAllOrdersAdmin, {});

  const adminCreateOrder = useMutation(api.services.orders.adminCreateOrder);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);
  const createReservation = useMutation(api.services.reservations.createReservation);
  const addReservationPayment = useMutation(api.services.reservationPayments.addReservationPayment);
  const updateOrderPayment = useMutation(api.services.payments.updateOrderPayment);

  // ─── Categories ───
  const categoryOptions = useMemo(() => {
    if (!products) return [] as Array<{ id: string; name: string; count: number }>;
    const active = products.filter((p) => p.isActive && p.stock > 0);
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const p of active) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Uncategorized';
      const ex = counts.get(id);
      if (ex) ex.count += 1;
      else counts.set(id, { id, name, count: 1 });
    }
    return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // ─── Visible products ───
  const visibleProducts = useMemo(() => {
    if (!products) return [];
    let list = products.filter((p) => p.isActive && p.stock > 0);
    if (selectedCategory !== 'all') {
      list = list.filter((p) => (p.categoryId as string) === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.sku || '').toLowerCase().includes(q) ||
          (p.categoryName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, search, selectedCategory]);

  // SKU scan auto-add (exact SKU match)
  useEffect(() => {
    if (!search.trim() || !products) return;
    const exact = products.find(
      (p) =>
        p.isActive &&
        p.stock > 0 &&
        String(p.sku || '').toLowerCase() === search.toLowerCase().trim(),
    );
    if (exact) {
      addProduct(exact);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, products]);

  // ─── Math ───
  const subtotal = useMemo(() => cart.reduce((s, l) => s + lineNet(l), 0), [cart]);
  const lineDiscountTotal = useMemo(() => cart.reduce((s, l) => s + lineDiscAmt(l), 0), [cart]);
  const orderDiscValue = parseFloat(orderDiscInput) || 0;
  const rawOrderDisc =
    orderDiscType === 'percent' ? subtotal * (orderDiscValue / 100) : orderDiscValue;
  const orderDiscount = Math.max(0, Math.min(rawOrderDisc, subtotal));
  const tipNumber = parseFloat(tip) || 0;
  const total = subtotal - orderDiscount + tipNumber;

  const paid = tenders.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const remaining = +(total - paid).toFixed(2);
  const change = remaining < 0 ? -remaining : 0;

  // ─── Customers ───
  const clientUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === 'client' && u.isActive !== false);
  }, [users]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return clientUsers.slice(0, 30);
    const q = customerSearch.toLowerCase();
    return clientUsers
      .filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [clientUsers, customerSearch]);

  // ─── Cart operations ───
  const addProduct = (p: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    image?: string;
    sku?: string | number;
  }) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p._id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((l) =>
          l.productId === p._id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: p._id,
          name: p.name,
          sku: p.sku !== undefined ? String(p.sku) : undefined,
          price: p.price,
          stock: p.stock,
          image: p.image,
          quantity: 1,
          discType: 'amount',
          discValue: 0,
        },
      ];
    });
  };

  const setQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = l.quantity + delta;
          if (next > l.stock) return l;
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const clearSale = () => {
    setCart([]);
    setOrderDiscInput('');
    setTip('');
    setCustomerName('');
    setSelectedUserId('');
    setSalesAssociateId('');
    setSalesAssociateName('');
    setTenders([{ method: 'cash', amount: '' }]);
  };

  const openLineDiscount = (l: CartLine) => {
    setEditLine(l.productId);
    setEditLineType(l.discType);
    setEditLineValue(l.discValue ? String(l.discValue) : '');
  };

  const applyLineDiscount = () => {
    if (!editLine) return;
    const v = parseFloat(editLineValue) || 0;
    setCart((prev) =>
      prev.map((l) =>
        l.productId === editLine ? { ...l, discType: editLineType, discValue: v } : l,
      ),
    );
    setEditLine(null);
    setEditLineValue('');
  };

  const handleSelectCustomer = (u: { _id: string; firstName: string; lastName: string }) => {
    setSelectedUserId(u._id);
    setCustomerName(`${u.firstName} ${u.lastName}`);
    setShowCustomerPicker(false);
    setCustomerSearch('');
  };

  const handleSelectSalesAssociate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSalesAssociateId(id);
    if (!id) return setSalesAssociateName('');
    const sa = staffUsers?.find((s) => s._id === id);
    if (sa) setSalesAssociateName(`${sa.firstName} ${sa.lastName}`);
  };

  // ─── Sale checkout ───
  const canCheckoutSale =
    cart.length > 0 &&
    (!!selectedUserId || !!customerName.trim()) &&
    !isSubmitting &&
    Math.abs(remaining) < 0.01 || (remaining < 0 && tenders.length > 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedUserId && !customerName.trim()) return;
    if (remaining > 0.01) return; // tender short

    setIsSubmitting(true);
    try {
      // Primary payment method = the largest tender. Split detail stored in notes.
      const sortedTenders = [...tenders]
        .map((t) => ({ ...t, amt: parseFloat(t.amount) || 0 }))
        .sort((a, b) => b.amt - a.amt);
      const primary = sortedTenders[0]?.method || 'cash';
      const tenderSummary = sortedTenders
        .filter((t) => t.amt > 0)
        .map((t) => `${t.method.toUpperCase()} ${fmt(t.amt)}`)
        .join(' + ');

      const items = cart.map((l) => ({
        productId: l.productId as Id<'products'>,
        quantity: l.quantity,
        ...(lineDiscAmt(l) > 0 ? { discount: lineDiscAmt(l) / l.quantity } : {}),
      }));

      const result = await adminCreateOrder({
        userId: selectedUserId ? (selectedUserId as Id<'users'>) : undefined,
        items,
        ...(orderDiscount > 0 ? { orderDiscount } : {}),
        paymentMethod: primary,
        customerName: customerName || undefined,
        salesAssociateId: salesAssociateId ? (salesAssociateId as Id<'users'>) : undefined,
        salesAssociateName: salesAssociateName || undefined,
      });

      const receipt = await acknowledgeOrder({
        orderId: result.orderId as Id<'orders'>,
        adminNotes: tenderSummary ? `POS · ${tenderSummary}` : 'POS sale',
      });
      setReceiptData(receipt);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sale failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Reservation commit ───
  const reservationDeposit = Math.round(total * reservationDepositRatio);
  const reservationBalance = total - reservationDeposit;

  const canReserve =
    cart.length > 0 && (!!selectedUserId || !!customerName.trim()) && reservationDeposit > 0;

  const handleReserve = async () => {
    if (!canReserve) return;
    setIsSubmitting(true);
    try {
      const guestInfo = !selectedUserId
        ? {
            name: customerName.trim() || 'Walk-in',
            email: 'walkin@dragonscave.local',
            phone: '00000000000',
            pickupSchedule: { date: pickupDate, time: pickupTime },
          }
        : undefined;

      const reservationRes = await createReservation({
        userId: selectedUserId ? (selectedUserId as Id<'users'>) : undefined,
        guestId: !selectedUserId ? `walkin-${Date.now()}` : undefined,
        guestInfo,
        items: cart.map((l) => ({
          productId: l.productId as Id<'products'>,
          quantity: l.quantity,
          reservedPrice: l.price - (lineDiscAmt(l) / l.quantity),
        })),
        totalAmount: total,
        totalQuantity: cart.reduce((s, l) => s + l.quantity, 0),
        notes: `Reserved via POS · balance ${fmt(reservationBalance)} due at pickup ${pickupDate} ${pickupTime}`,
      });

      // Record the downpayment as a real ledger entry so it lands in Cash on Hand now
      // (cash deposit at the counter). Further partials are added from the reservation detail page.
      if (reservationDeposit > 0 && reservationRes?.reservationId) {
        await addReservationPayment({
          reservationId: reservationRes.reservationId as Id<'reservations'>,
          amount: reservationDeposit,
          method: 'cash',
          kind: 'downpayment',
          note: 'POS downpayment',
          userId: posUser?._id as Id<'users'> | undefined,
        });
      }

      alert(`Reservation confirmed. Took ${fmt(reservationDeposit)} deposit.`);
      clearSale();
      setMode('sale');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reservation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Refund ───
  const filteredRefundOrders = useMemo(() => {
    if (!recentOrders) return [];
    let list = recentOrders.slice(0, 40);
    if (refundSearch.trim()) {
      const q = refundSearch.toLowerCase();
      list = list.filter(
        (o) =>
          o._id.toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [recentOrders, refundSearch]);

  const handleRefund = async (orderId: string) => {
    setIsProcessingRefund(true);
    try {
      await updateOrderPayment({
        orderId: orderId as Id<'orders'>,
        paymentStatus: 'refunded',
        userId: posUser?._id as Id<'users'> | undefined,
      });
      setRefundConfirm(null);
      alert('Refund posted. Order marked as refunded.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  /* ──────────────────────── RENDER ──────────────────────── */
  return (
    <div className="h-screen flex flex-col text-[var(--ink)]" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-4 border-b safe-area-top"
        style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border hover:opacity-80 transition-opacity flex-shrink-0"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className="display text-base sm:text-2xl truncate"
              style={{ fontVariationSettings: '"opsz" 36, "wght" 700' }}
            >
              Point of Sale
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
              <span className="pulse-dot" />
              <span>Live · drawer open</span>
            </div>
          </div>

          {/* Mobile cart toggle — sits next to title on phones */}
          <button
            onClick={() => setShowCartMobile(true)}
            className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold flex-shrink-0"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="dc-mono">{cart.reduce((s, l) => s + l.quantity, 0)}</span>
          </button>
        </div>

        {/* Mode toggle + associate */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
          {/* Segmented mode toggle */}
          <div
            className="inline-flex p-[3px] gap-[2px] rounded-[10px] border flex-1 sm:flex-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
          >
            {([
              { v: 'sale' as Mode, label: 'New Sale', short: 'Sale' },
              { v: 'reserve' as Mode, label: 'Reservation', short: 'Reserve' },
              { v: 'refund' as Mode, label: 'Return', short: 'Return' },
            ]).map((opt) => {
              const active = mode === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => setMode(opt.v)}
                  className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-[7px] text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: active ? 'var(--surface-hi)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    boxShadow: active ? '0 1px 2px oklch(0 0 0 / 0.2)' : 'none',
                  }}
                >
                  <span className="sm:hidden">{opt.short}</span>
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Associate selector */}
          <div
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          >
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
            >
              {salesAssociateName
                ? salesAssociateName
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'SA'}
            </span>
            <select
              value={salesAssociateId}
              onChange={handleSelectSalesAssociate}
              className="bg-transparent border-0 text-xs font-semibold outline-none cursor-pointer"
              style={{ color: 'var(--ink)' }}
            >
              <option value="" style={{ color: 'black' }}>
                — Associate —
              </option>
              {staffUsers?.map((s) => (
                <option key={s._id} value={s._id} style={{ color: 'black' }}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MAIN BODY — refund mode replaces the entire body */}
      {mode === 'refund' ? (
        <RefundView
          orders={filteredRefundOrders}
          search={refundSearch}
          setSearch={setRefundSearch}
          onConfirm={(id) => setRefundConfirm(id)}
        />
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(440px,38%)]">
          {/* ─── LEFT: PRODUCT BROWSER ─── */}
          <section
            className="flex flex-col min-w-0 overflow-hidden lg:border-r"
            style={{ borderColor: 'var(--line)' }}
          >
            {/* Search row */}
            <div
              className="px-4 sm:px-6 py-3 flex items-center gap-2 border-b"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--ink-4)' }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name · SKU · scan barcode"
                  className="w-full pl-10 pr-16 py-2.5 rounded-[10px] text-sm transition-colors outline-none border"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                />
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg)', color: 'var(--ink-4)' }}
                  >
                    SCAN
                  </span>
                )}
              </div>
            </div>

            {/* Category rail */}
            <div
              className="px-4 sm:px-6 py-2.5 border-b"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <CategoryChip
                  label="All"
                  count={visibleProducts.length}
                  active={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                />
                {categoryOptions.map((c) => (
                  <CategoryChip
                    key={c.id}
                    label={c.name}
                    count={c.count}
                    active={selectedCategory === c.id}
                    onClick={() => setSelectedCategory(c.id)}
                  />
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 pb-24 lg:pb-6">
              {visibleProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-4)' }}
                  >
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="display text-base" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>
                    No products match
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
                    Clear filters or try a different SKU.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
                  {visibleProducts.map((p) => {
                    const inCart = cart.find((l) => l.productId === p._id);
                    return (
                      <ProductTile
                        key={p._id}
                        product={p}
                        qty={inCart?.quantity || 0}
                        onAdd={() =>
                          addProduct({
                            _id: p._id,
                            name: p.name,
                            price: p.price,
                            stock: p.stock,
                            image: p.image,
                            sku: p.sku,
                          })
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ─── RIGHT: CART PANEL ─── */}
          <aside
            className={`flex flex-col min-h-0 overflow-hidden ${
              showCartMobile
                ? 'fixed inset-0 z-[60] safe-area-top lg:static lg:z-auto'
                : 'hidden lg:flex'
            }`}
            style={{ background: 'var(--bg-2)' }}
          >
            <CartPanel
              mode={mode}
              cart={cart}
              setQty={setQty}
              removeLine={removeLine}
              openLineDiscount={openLineDiscount}
              clearSale={clearSale}
              customerName={customerName}
              setCustomerName={setCustomerName}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              setShowCustomerPicker={setShowCustomerPicker}
              orderDiscType={orderDiscType}
              setOrderDiscType={setOrderDiscType}
              orderDiscInput={orderDiscInput}
              setOrderDiscInput={setOrderDiscInput}
              tip={tip}
              setTip={setTip}
              tenders={tenders}
              setTenders={setTenders}
              total={total}
              subtotal={subtotal}
              orderDiscount={orderDiscount}
              lineDiscountTotal={lineDiscountTotal}
              tipNumber={tipNumber}
              paid={paid}
              remaining={remaining}
              change={change}
              clientUsers={clientUsers}
              onCheckout={handleCheckout}
              isSubmitting={isSubmitting}
              showCartMobile={showCartMobile}
              setShowCartMobile={setShowCartMobile}
              // Reservation
              pickupDate={pickupDate}
              setPickupDate={setPickupDate}
              pickupTime={pickupTime}
              setPickupTime={setPickupTime}
              reservationDepositRatio={reservationDepositRatio}
              setReservationDepositRatio={setReservationDepositRatio}
              reservationDeposit={reservationDeposit}
              reservationBalance={reservationBalance}
              onReserve={handleReserve}
              canReserve={canReserve}
            />
          </aside>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {showCustomerPicker && (
        <CustomerPickerModal
          search={customerSearch}
          setSearch={setCustomerSearch}
          customers={filteredCustomers}
          onPick={handleSelectCustomer}
          onClose={() => setShowCustomerPicker(false)}
        />
      )}
      {editLine && (
        <LineDiscountModal
          line={cart.find((l) => l.productId === editLine)!}
          type={editLineType}
          setType={setEditLineType}
          value={editLineValue}
          setValue={setEditLineValue}
          onSave={applyLineDiscount}
          onClose={() => setEditLine(null)}
        />
      )}
      {refundConfirm && (
        <RefundConfirmModal
          orderId={refundConfirm}
          order={recentOrders?.find((o) => o._id === refundConfirm)}
          isProcessing={isProcessingRefund}
          onConfirm={() => handleRefund(refundConfirm)}
          onClose={() => setRefundConfirm(null)}
        />
      )}
      {receiptData && (
        <OrderReceipt
          data={receiptData}
          onClose={() => {
            setReceiptData(null);
            clearSale();
          }}
        />
      )}

      <BottomNavbar />
    </div>
  );
}

/* ──────────────────────── SUBCOMPONENTS ──────────────────────── */

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
      style={{
        borderColor: active ? 'var(--red)' : 'var(--line)',
        background: active ? 'var(--red)' : 'var(--surface)',
        color: active ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
      }}
    >
      <span>{label}</span>
      <span
        className="dc-mono text-[10px] px-1.5 py-0.5 rounded"
        style={{
          background: active ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)',
          color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function ProductTile({
  product,
  qty,
  onAdd,
}: {
  product: any;
  qty: number;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="text-left p-3 rounded-[14px] border transition-all relative overflow-hidden hover:-translate-y-[2px] hover:border-[var(--ink-4)]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="aspect-square mb-2.5 rounded-[10px] overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-8 h-8" style={{ color: 'var(--ink-4)' }} />
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="dc-mono text-[10px] tracking-[0.04em] truncate"
          style={{ color: 'var(--ink-4)' }}
        >
          {product.sku ? `#${product.sku}` : product.categoryName || 'ITEM'}
        </span>
      </div>
      <div
        className="text-[13px] font-semibold leading-tight line-clamp-2"
        style={{ color: 'var(--ink)' }}
      >
        {product.name}
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className="dc-mono text-[13px] font-bold" style={{ color: 'var(--ink)' }}>
          ₱{product.price.toLocaleString('en-PH')}
        </span>
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: product.stock <= 5 ? 'var(--red-hi)' : 'var(--ink-4)' }}
        >
          {product.stock} in stock
        </span>
      </div>
      {qty > 0 && (
        <span
          className="absolute top-2 right-2 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-bold"
          style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}
        >
          {qty}
        </span>
      )}
    </button>
  );
}

function CartPanel(props: any) {
  const {
    mode,
    cart,
    setQty,
    removeLine,
    openLineDiscount,
    clearSale,
    customerName,
    setCustomerName,
    selectedUserId,
    setSelectedUserId,
    setShowCustomerPicker,
    orderDiscType,
    setOrderDiscType,
    orderDiscInput,
    setOrderDiscInput,
    tip,
    setTip,
    tenders,
    setTenders,
    total,
    subtotal,
    orderDiscount,
    tipNumber,
    paid,
    remaining,
    change,
    clientUsers,
    onCheckout,
    isSubmitting,
    showCartMobile,
    setShowCartMobile,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    reservationDepositRatio,
    setReservationDepositRatio,
    reservationDeposit,
    reservationBalance,
    onReserve,
    canReserve,
  } = props;

  const itemCount = cart.reduce((s: number, l: CartLine) => s + l.quantity, 0);
  const isReservation = mode === 'reserve';

  return (
    <div className="flex flex-col min-h-0 flex-1" style={{ background: 'var(--bg-2)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
      >
        <div>
          <h2 className="display text-lg" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>
            {isReservation ? 'Reservation' : 'Current Sale'}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            {cart.length === 0 ? 'Empty' : `${itemCount} items`}
          </p>
        </div>
        <div className="flex gap-1.5 items-center">
          <button
            onClick={clearSale}
            disabled={cart.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold disabled:opacity-40"
            style={{
              borderColor: 'var(--line)',
              background: 'transparent',
              color: 'var(--ink-3)',
            }}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
          {showCartMobile && (
            <button
              onClick={() => setShowCartMobile(false)}
              className="lg:hidden p-1.5 rounded-md hover:opacity-80"
              style={{ color: 'var(--ink-3)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3">
        {cart.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-[14px] border border-dashed gap-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <ShoppingCart className="w-10 h-10" style={{ color: 'var(--ink-4)' }} />
            <p
              className="display text-base"
              style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
            >
              Empty cart
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
              Tap a product or scan a SKU.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cart.map((l: CartLine) => (
              <CartLineRow
                key={l.productId}
                line={l}
                onQty={setQty}
                onRemove={removeLine}
                onEditDiscount={() => openLineDiscount(l)}
              />
            ))}
          </div>
        )}

        {/* Customer block */}
        <div
          className="p-3 rounded-[12px] border"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          <p className="label-eyebrow mb-2">Customer</p>
          {selectedUserId ? (
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'var(--surface-hi)', color: 'var(--ink-2)' }}
              >
                {customerName
                  .split(' ')
                  .map((p: string) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{customerName}</div>
                <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  Registered customer
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUserId('');
                  setCustomerName('');
                }}
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--ink-4)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in name…"
                className="flex-1 px-3 py-2 rounded-md border text-[13px] outline-none"
                style={{
                  background: 'var(--bg-2)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold"
                style={{
                  borderColor: 'var(--line)',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                }}
              >
                <Search className="w-3 h-3" />
                Lookup
              </button>
            </div>
          )}
        </div>

        {/* Sale-only: order discount + tip */}
        {!isReservation && cart.length > 0 && (
          <div
            className="p-3 rounded-[12px] border grid grid-cols-2 gap-2.5"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <div>
              <p className="label-eyebrow mb-1.5">Order discount</p>
              <div className="flex gap-1.5">
                <div
                  className="inline-flex p-[2px] rounded-md border"
                  style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
                >
                  {(['amount', 'percent'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderDiscType(t)}
                      className="px-2 py-1 rounded text-[11px] font-bold"
                      style={{
                        background: orderDiscType === t ? 'var(--surface-hi)' : 'transparent',
                        color: orderDiscType === t ? 'var(--ink)' : 'var(--ink-3)',
                      }}
                    >
                      {t === 'amount' ? '₱' : '%'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  value={orderDiscInput}
                  onChange={(e) => setOrderDiscInput(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-2 py-1.5 rounded-md border text-[12px] outline-none dc-mono"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>
            <div>
              <p className="label-eyebrow mb-1.5">Service / Tip</p>
              <input
                type="number"
                min="0"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-md border text-[12px] outline-none dc-mono"
                style={{
                  background: 'var(--bg-2)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>
        )}

        {/* Sale-only: split payment editor */}
        {!isReservation && cart.length > 0 && (
          <PaymentSplit
            tenders={tenders}
            setTenders={setTenders}
            total={total}
            remaining={remaining}
            change={change}
          />
        )}

        {/* Reservation flow */}
        {isReservation && cart.length > 0 && (
          <div
            className="p-3 rounded-[12px] border flex flex-col gap-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
              >
                <Bookmark className="w-4 h-4" />
              </span>
              <div>
                <p
                  className="display text-sm"
                  style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
                >
                  Fish reservation
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  Hold live items with a deposit; balance at pickup.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="label-eyebrow mb-1">Pickup date</p>
                <div className="relative">
                  <Calendar
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: 'var(--ink-4)' }}
                  />
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-md border text-[12px] outline-none [color-scheme:dark]"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="label-eyebrow mb-1">Pickup time</p>
                <div className="relative">
                  <Clock
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: 'var(--ink-4)' }}
                  />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-md border text-[12px] outline-none [color-scheme:dark]"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="label-eyebrow mb-1">Deposit</p>
              <div className="flex gap-1.5">
                {[0.2, 0.3, 0.5, 1].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReservationDepositRatio(r)}
                    className="flex-1 px-2 py-1.5 rounded-md border text-[11px] font-bold transition-all"
                    style={{
                      borderColor:
                        Math.abs(reservationDepositRatio - r) < 0.01
                          ? 'var(--red)'
                          : 'var(--line)',
                      background:
                        Math.abs(reservationDepositRatio - r) < 0.01
                          ? 'var(--red-wash)'
                          : 'var(--surface-2)',
                      color:
                        Math.abs(reservationDepositRatio - r) < 0.01
                          ? 'var(--red-hi)'
                          : 'var(--ink-2)',
                    }}
                  >
                    {r === 1 ? 'Full' : `${Math.round(r * 100)}%`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-2 border-t" style={{ borderColor: 'var(--line-soft)' }}>
              {[
                ['Total', fmt(total)],
                ['Deposit today', fmt(reservationDeposit)],
                ['Balance at pickup', fmt(reservationBalance)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <span className="dc-mono font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TOTALS + ACTION BUTTON */}
      <div
        className="border-t px-4 sm:px-5 pt-3.5 pb-5 safe-area-bottom"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
      >
        <div className="caustics-line mb-3" />

        {/* Subtotals breakdown */}
        <div className="grid gap-1 text-xs mb-2.5" style={{ color: 'var(--ink-3)' }}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="dc-mono">{fmt(subtotal)}</span>
          </div>
          {orderDiscount > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--jade)' }}>
              <span>Order discount</span>
              <span className="dc-mono">−{fmt(orderDiscount)}</span>
            </div>
          )}
          {tipNumber > 0 && (
            <div className="flex justify-between">
              <span>Tip</span>
              <span className="dc-mono">{fmt(tipNumber)}</span>
            </div>
          )}
        </div>

        {/* HERO TOTAL */}
        <div
          className="ember relative overflow-hidden p-4 rounded-[14px] mb-3"
          style={{
            background: 'linear-gradient(150deg, var(--red-deep), var(--red))',
            color: 'oklch(0.99 0 0)',
          }}
        >
          <div className="scales absolute inset-0 opacity-20" />
          <div className="relative flex items-end justify-between">
            <div>
              <p
                className="label-eyebrow"
                style={{ color: 'oklch(0.99 0 0 / 0.8)', marginBottom: 4 }}
              >
                {isReservation ? 'Reservation value' : 'Total due'}
              </p>
              <div
                key={total}
                className="display dc-mono tick"
                style={{
                  fontVariationSettings: '"opsz" 96, "wght" 800',
                  fontSize: 36,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {fmt(total)}
              </div>
            </div>
            <Sparkles className="w-9 h-9 opacity-60" />
          </div>
        </div>

        {/* Action button */}
        {isReservation ? (
          <button
            onClick={onReserve}
            disabled={!canReserve || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-[12px] font-bold text-sm transition-all"
            style={{
              background: canReserve ? 'var(--red)' : 'var(--surface-2)',
              color: canReserve ? 'oklch(0.99 0 0)' : 'var(--ink-4)',
              opacity: canReserve && !isSubmitting ? 1 : 0.5,
              border: '1px solid ' + (canReserve ? 'var(--red-deep)' : 'var(--line)'),
            }}
          >
            <Bookmark className="w-4 h-4" />
            {cart.length === 0
              ? 'Add items'
              : !customerName && !selectedUserId
              ? 'Pick customer'
              : `Confirm reservation · Take ${fmt(reservationDeposit)}`}
          </button>
        ) : (
          <button
            onClick={onCheckout}
            disabled={
              cart.length === 0 ||
              (!customerName && !selectedUserId) ||
              remaining > 0.01 ||
              isSubmitting
            }
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-[12px] font-bold text-sm transition-all"
            style={{
              background:
                cart.length > 0 &&
                (customerName || selectedUserId) &&
                remaining <= 0.01
                  ? 'var(--red)'
                  : 'var(--surface-2)',
              color:
                cart.length > 0 &&
                (customerName || selectedUserId) &&
                remaining <= 0.01
                  ? 'oklch(0.99 0 0)'
                  : 'var(--ink-4)',
              border:
                '1px solid ' +
                (cart.length > 0 &&
                (customerName || selectedUserId) &&
                remaining <= 0.01
                  ? 'var(--red-deep)'
                  : 'var(--line)'),
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {cart.length === 0
              ? 'Add items to continue'
              : !customerName && !selectedUserId
              ? 'Enter or pick a customer'
              : remaining > 0.01
              ? `Take ${fmt(remaining)} more`
              : `Complete sale · ${fmt(total)}`}
          </button>
        )}
      </div>
    </div>
  );
}

function CartLineRow({
  line,
  onQty,
  onRemove,
  onEditDiscount,
}: {
  line: CartLine;
  onQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onEditDiscount: () => void;
}) {
  const disc = lineDiscAmt(line);
  const net = lineNet(line);

  return (
    <div
      className="fade-up relative p-3 rounded-[12px] border grid gap-2.5"
      style={{
        background: 'var(--bg-2)',
        borderColor: 'var(--line-soft)',
        gridTemplateColumns: '1fr auto',
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="dc-mono text-[10px] tracking-[0.04em]"
            style={{ color: 'var(--ink-4)' }}
          >
            {line.sku ? `#${line.sku}` : 'CUSTOM'}
          </span>
        </div>
        <div
          className="text-[13px] font-semibold leading-tight truncate"
          style={{ color: 'var(--ink)' }}
        >
          {line.name}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="dc-mono text-[12px]" style={{ color: 'var(--ink-3)' }}>
            {fmt(line.price)} × {line.quantity}
          </span>
          {disc > 0 && (
            <span className="dc-mono text-[11px]" style={{ color: 'var(--jade)' }}>
              −{fmt(disc)}
            </span>
          )}
          <span
            className="dc-mono ml-auto text-[13px] font-bold"
            style={{ color: 'var(--ink)' }}
          >
            {fmt(net)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center rounded-md border"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', padding: 2 }}
        >
          <button
            onClick={() => onQty(line.productId, -1)}
            className="w-6 h-6 inline-flex items-center justify-center rounded"
            style={{ color: 'var(--ink-2)' }}
          >
            <Minus className="w-3 h-3" />
          </button>
          <span
            className="dc-mono text-[12px] font-bold"
            style={{ minWidth: 22, textAlign: 'center' }}
          >
            {line.quantity}
          </span>
          <button
            onClick={() => onQty(line.productId, 1)}
            disabled={line.quantity >= line.stock}
            className="w-6 h-6 inline-flex items-center justify-center rounded disabled:opacity-40"
            style={{ color: 'var(--ink-2)' }}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button
          onClick={onEditDiscount}
          title="Line discount"
          className="w-6 h-6 inline-flex items-center justify-center rounded-md border"
          style={{
            background: disc > 0 ? 'var(--jade-wash)' : 'var(--surface)',
            color: disc > 0 ? 'var(--jade)' : 'var(--ink-3)',
            borderColor: 'var(--line)',
          }}
        >
          <Percent className="w-3 h-3" />
        </button>
        <button
          onClick={() => onRemove(line.productId)}
          className="w-6 h-6 inline-flex items-center justify-center rounded-md border"
          style={{
            background: 'var(--surface)',
            color: 'var(--ink-3)',
            borderColor: 'var(--line)',
          }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function PaymentSplit({
  tenders,
  setTenders,
  total,
  remaining,
  change,
}: {
  tenders: TenderLine[];
  setTenders: (t: TenderLine[]) => void;
  total: number;
  remaining: number;
  change: number;
}) {
  return (
    <div
      className="p-3 rounded-[12px] border flex flex-col gap-2"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">Tender</p>
        <span
          className="dc-mono text-[11px] font-bold"
          style={{
            color:
              remaining > 0.01
                ? 'var(--red-hi)'
                : remaining < -0.01
                ? 'var(--jade)'
                : 'var(--jade)',
          }}
        >
          {remaining > 0.01
            ? `${fmt(remaining)} short`
            : remaining < -0.01
            ? `Change ${fmt(change)}`
            : 'Paid in full'}
        </span>
      </div>

      {tenders.map((t, i) => (
        <div
          key={i}
          className="grid items-center gap-2 p-2 rounded-md border"
          style={{
            gridTemplateColumns: 'auto 1fr 24px',
            background: 'var(--bg-2)',
            borderColor: 'var(--line)',
          }}
        >
          <select
            value={t.method}
            onChange={(e) =>
              setTenders(
                tenders.map((x, j) =>
                  j === i ? { ...x, method: e.target.value as PaymentMethodId } : x,
                ),
              )
            }
            className="rounded-md border px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
            style={{
              background: 'var(--surface-hi)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
          >
            {PAY_METHODS.map((m) => (
              <option key={m.id} value={m.id} style={{ color: 'black' }}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px]"
              style={{ color: 'var(--ink-4)' }}
            >
              ₱
            </span>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={t.amount}
              onChange={(e) =>
                setTenders(
                  tenders.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                )
              }
              className="w-full pl-6 pr-2 py-1 rounded-md border text-[12px] font-bold outline-none dc-mono"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            />
          </div>
          <button
            onClick={() => setTenders(tenders.filter((_, j) => j !== i))}
            disabled={tenders.length === 1}
            className="w-6 h-6 inline-flex items-center justify-center rounded disabled:opacity-30"
            style={{ color: 'var(--ink-4)' }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5 flex-wrap mt-0.5">
        {PAY_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() =>
              setTenders([
                ...tenders,
                {
                  method: m.id,
                  amount: remaining > 0.01 ? remaining.toFixed(2) : '',
                },
              ])
            }
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            <Plus className="w-2.5 h-2.5" />
            {m.label}
          </button>
        ))}
        {remaining > 0.01 && (
          <button
            onClick={() => {
              const next = [...tenders];
              const lastIdx = next.length - 1;
              next[lastIdx] = {
                ...next[lastIdx],
                amount: ((parseFloat(next[lastIdx].amount) || 0) + remaining).toFixed(2),
              };
              setTenders(next);
            }}
            className="ml-auto inline-flex items-center px-2 py-1 rounded-md border text-[11px] font-bold"
            style={{
              background: 'var(--red-wash)',
              borderColor: 'var(--red)',
              color: 'var(--red-hi)',
            }}
          >
            Fill · {fmt(remaining)}
          </button>
        )}
      </div>
    </div>
  );
}

function LineDiscountModal({
  line,
  type,
  setType,
  value,
  setValue,
  onSave,
  onClose,
}: {
  line: CartLine;
  type: 'amount' | 'percent';
  setType: (t: 'amount' | 'percent') => void;
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'oklch(0 0 0 / 0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-4 rounded-[16px] border p-5"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--line)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <h3 className="display text-lg mb-1" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>
          Line discount
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
          {line.name} · {fmt(line.price)} × {line.quantity}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="inline-flex p-[2px] rounded-md border"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
          >
            {(['amount', 'percent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-3 py-1.5 rounded text-xs font-bold"
                style={{
                  background: type === t ? 'var(--surface-hi)' : 'transparent',
                  color: type === t ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {t === 'amount' ? '₱' : '%'}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'amount' ? '0.00' : '0'}
            className="flex-1 px-3 py-2 rounded-md border text-sm outline-none dc-mono"
            autoFocus
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md text-sm font-semibold border"
            style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-2 rounded-md text-sm font-bold border"
            style={{
              background: 'var(--red)',
              borderColor: 'var(--red-deep)',
              color: 'oklch(0.99 0 0)',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerPickerModal({
  search,
  setSearch,
  customers,
  onPick,
  onClose,
}: {
  search: string;
  setSearch: (v: string) => void;
  customers: any[];
  onPick: (u: any) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'oklch(0 0 0 / 0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-[16px] border overflow-hidden flex flex-col max-h-[80vh]"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-pop)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--line)' }}>
          <h3 className="display text-base" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>
            Select customer
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:opacity-80" style={{ color: 'var(--ink-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-4)' }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or phone…"
              className="w-full pl-10 pr-3 py-2.5 rounded-md border text-sm outline-none"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </div>
        </div>
        <div className="overflow-y-auto p-2">
          {customers.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'var(--ink-4)' }}>
              No matching customers
            </div>
          ) : (
            customers.map((c) => (
              <button
                key={c._id}
                onClick={() => onPick(c)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-md hover:bg-[var(--bg-2)] transition-colors"
              >
                <span
                  className="w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--surface-hi)', color: 'var(--ink-2)' }}
                >
                  {c.firstName[0]}
                  {c.lastName[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RefundView({
  orders,
  search,
  setSearch,
  onConfirm,
}: {
  orders: any[];
  search: string;
  setSearch: (v: string) => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-8 pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="display text-xl sm:text-2xl mb-1" style={{ fontVariationSettings: '"opsz" 36, "wght" 700' }}>
          Return / Refund
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
          Search a past order to start a return. Refunds mark the order as refunded —
          stock release is manual on this build.
        </p>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order ID, customer name…"
            className="w-full pl-10 pr-3 py-3 rounded-[10px] border text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--ink-4)' }}>
              No recent orders to refund.
            </div>
          ) : (
            orders.map((o) => {
              const refunded = o.paymentStatus === 'refunded';
              const code = `ORD-${o._id.slice(-6).toUpperCase()}`;
              const cust =
                o.user?.firstName && o.user?.lastName
                  ? `${o.user.firstName} ${o.user.lastName}`
                  : o.customerName || 'Walk-in';
              return (
                <div
                  key={o._id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 sm:gap-4 p-3 sm:p-3.5 rounded-[12px] border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                >
                  <div className="flex-1 min-w-0 basis-full sm:basis-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="dc-mono text-xs font-semibold">{code}</span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                        {new Date(o.createdAt).toLocaleString('en-PH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      {refunded && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
                        >
                          Refunded
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold mt-0.5 truncate">{cust}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {o.items?.length || 0} items
                    </div>
                  </div>
                  <div className="dc-mono font-bold text-sm sm:text-base">{fmt(o.totalAmount || 0)}</div>
                  <button
                    onClick={() => onConfirm(o._id)}
                    disabled={refunded}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-bold disabled:opacity-40 flex-shrink-0"
                    style={{
                      background: refunded ? 'var(--surface-2)' : 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: refunded ? 'var(--ink-4)' : 'var(--ink)',
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {refunded ? 'Done' : 'Refund'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function RefundConfirmModal({
  orderId,
  order,
  isProcessing,
  onConfirm,
  onClose,
}: {
  orderId: string;
  order: any;
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'oklch(0 0 0 / 0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-4 rounded-[16px] border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-pop)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--red-wash)', color: 'var(--red-hi)' }}
          >
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="display text-lg"
              style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
            >
              Confirm refund?
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Order {orderId.slice(-6).toUpperCase()} · {fmt(order?.totalAmount || 0)}
            </p>
          </div>
        </div>
        <div
          className="p-3 rounded-md border text-xs mb-4"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--line-soft)', color: 'var(--ink-2)' }}
        >
          Marks the order&apos;s payment status as <strong>refunded</strong>. Stock is not
          auto-returned — adjust manually if items come back.
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-3 py-2 rounded-md text-sm font-semibold border disabled:opacity-50"
            style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-3 py-2 rounded-md text-sm font-bold border disabled:opacity-50"
            style={{
              background: 'var(--red)',
              borderColor: 'var(--red-deep)',
              color: 'oklch(0.99 0 0)',
            }}
          >
            {isProcessing ? 'Processing…' : 'Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── EXPORT ──────────────────────── */
export default function PosPage() {
  return (
    <SafeAreaProvider applySafeArea>
      <PosPageContent />
    </SafeAreaProvider>
  );
}
