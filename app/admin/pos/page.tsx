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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Percent,
  User,
  UserCog,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import OrderReceipt from '@/components/admin/OrderReceipt';

const fmt = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CartLine {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  image?: string;
}

type PaymentMethod = 'cash' | 'card' | 'gcash' | 'other';

const QUICK_TENDERS = [100, 500, 1000];
const PRODUCTS_PER_PAGE = 10;

export default function PosPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderInput, setTenderInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [salesAssociateId, setSalesAssociateId] = useState('');
  const [salesAssociateName, setSalesAssociateName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showCartMobile, setShowCartMobile] = useState(false);

  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const categories = useQuery(api.services.categories.getCategories, {});
  const users = useQuery(api.services.admin.getAllUsers, {});
  const staffUsers = useQuery(api.services.admin.getStaffUsers, { salesAssociatesOnly: true });

  const adminCreateOrder = useMutation(api.services.orders.adminCreateOrder);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);

  const categoryOptions = useMemo(() => {
    if (!products) return [] as Array<{ id: string; name: string; count: number }>;
    const active = products.filter((p) => p.isActive && p.stock > 0);
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const p of active) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Uncategorized';
      const existing = counts.get(id);
      if (existing) existing.count += 1;
      else counts.set(id, { id, name, count: 1 });
    }
    return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
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

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pagedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE),
    [filteredProducts, page],
  );

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  // Clamp page if total shrinks (e.g. on first load)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [cart],
  );
  const totalItems = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity, 0),
    [cart],
  );
  const discountValue = parseFloat(discountInput) || 0;
  const rawDiscount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
  const orderDiscount = Math.max(0, Math.min(rawDiscount, subtotal));
  const total = subtotal - orderDiscount;

  const tenderNumber = parseFloat(tenderInput) || 0;
  const change = paymentMethod === 'cash' && tenderNumber >= total ? tenderNumber - total : 0;
  const shortfall = paymentMethod === 'cash' && tenderNumber < total ? total - tenderNumber : 0;

  const clientUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === 'client' && u.isActive !== false);
  }, [users]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return clientUsers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return clientUsers
      .filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [clientUsers, customerSearch]);

  const addProduct = (product: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    image?: string;
  }) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) =>
          l.productId === product._id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          image: product.image,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
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
    setDiscountInput('');
    setTenderInput('');
    setCustomerName('');
    setSelectedUserId('');
    setSalesAssociateId('');
    setSalesAssociateName('');
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
    if (!id) {
      setSalesAssociateName('');
      return;
    }
    const sa = staffUsers?.find((s) => s._id === id);
    if (sa) setSalesAssociateName(`${sa.firstName} ${sa.lastName}`);
  };

  const canComplete =
    cart.length > 0 &&
    (!!selectedUserId || !!customerName.trim()) &&
    !isSubmitting &&
    (paymentMethod !== 'cash' || tenderNumber >= total);

  const handleComplete = async () => {
    if (!canComplete) return;
    setIsSubmitting(true);
    try {
      const result = await adminCreateOrder({
        userId: selectedUserId ? (selectedUserId as Id<'users'>) : undefined,
        items: cart.map((l) => ({
          productId: l.productId as Id<'products'>,
          quantity: l.quantity,
        })),
        ...(orderDiscount > 0 ? { orderDiscount } : {}),
        paymentMethod,
        customerName: customerName || undefined,
        salesAssociateId: salesAssociateId ? (salesAssociateId as Id<'users'>) : undefined,
        salesAssociateName: salesAssociateName || undefined,
      });
      const receipt = await acknowledgeOrder({
        orderId: result.orderId as Id<'orders'>,
        adminNotes: 'POS sale',
      });
      setReceiptData(receipt);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setReceiptData(null);
    clearSale();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCustomerPicker(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Point of Sale
                </h1>
                <p className="text-[11px] text-white/40 truncate hidden sm:block">
                  Tap a product to add · receipt prints on complete
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalItems > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {totalItems} · {fmt(total)}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowCartMobile(true)}
              className="lg:hidden relative px-3 py-2 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{totalItems}</span>
            </button>
            <button
              onClick={clearSale}
              disabled={cart.length === 0}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        {/* Products panel */}
        <div className="flex-1 p-4 lg:p-6 lg:overflow-y-auto flex flex-col min-h-0">
          {/* Search */}
          <div className="relative mb-3 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all placeholder:text-white/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>

          {/* Category chips */}
          {categoryOptions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4 lg:-mx-6 lg:px-6 pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20 border border-primary/40'
                    : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                All
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    selectedCategory === 'all' ? 'bg-white/20' : 'bg-white/5'
                  }`}
                >
                  {filteredProducts.length > 0 && selectedCategory === 'all'
                    ? filteredProducts.length
                    : (products?.filter((p) => p.isActive && p.stock > 0).length ?? 0)}
                </span>
              </button>
              {categoryOptions.map((c) => {
                const active = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20 border border-primary/40'
                        : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {c.name}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        active ? 'bg-white/20' : 'bg-white/5'
                      }`}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!products ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Package className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-sm text-white/50 mb-1">
                {search ? 'No matching products in stock.' : 'No active products with stock.'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-primary hover:text-primary/80 font-medium mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {pagedProducts.map((p) => {
                const inCart = cart.find((c) => c.productId === p._id);
                const maxed = inCart && inCart.quantity >= p.stock;
                return (
                  <button
                    key={p._id}
                    onClick={() => addProduct(p)}
                    disabled={maxed}
                    className={`group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border rounded-2xl p-3 text-left transition-all active:scale-[0.97] ${
                      inCart
                        ? 'border-primary/50 shadow-lg shadow-primary/10'
                        : 'border-white/10 hover:border-primary/40 hover:from-white/[0.08] hover:to-white/[0.04]'
                    } ${maxed ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full bg-gradient-to-br from-primary to-orange-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="aspect-square mb-2.5 rounded-xl bg-background/60 overflow-hidden flex items-center justify-center border border-white/5 relative">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-white/20" />
                      )}
                      <span
                        className={`absolute bottom-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                          p.stock <= 5
                            ? 'bg-warning/80 text-white'
                            : 'bg-black/50 text-white/80'
                        }`}
                      >
                        {p.stock <= 5 ? `Only ${p.stock} left` : `${p.stock} in stock`}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white line-clamp-2 mb-1 leading-snug">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">{fmt(p.price)}</span>
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          inCart
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-white/40 group-hover:bg-primary/20 group-hover:text-primary'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > PRODUCTS_PER_PAGE && (
            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
              <p className="text-xs text-white/50">
                Showing{' '}
                <span className="text-white font-medium">
                  {(page - 1) * PRODUCTS_PER_PAGE + 1}–
                  {Math.min(page * PRODUCTS_PER_PAGE, filteredProducts.length)}
                </span>{' '}
                of <span className="text-white font-medium">{filteredProducts.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-semibold text-white min-w-[60px] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div
          className={`${
            showCartMobile ? 'fixed inset-0 z-50 bg-background' : 'hidden'
          } lg:static lg:block lg:w-[440px] lg:flex-shrink-0 lg:border-l lg:border-white/5 lg:bg-gradient-to-b lg:from-secondary/30 lg:to-secondary/10 flex flex-col`}
        >
          {showCartMobile && (
            <div className="lg:hidden sticky top-0 bg-background/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold">Cart · {totalItems}</h2>
              </div>
              <button
                onClick={() => setShowCartMobile(false)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5 flex-1 lg:overflow-y-auto space-y-5">
            {/* Cart lines */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5">
                  <ShoppingCart className="w-3 h-3" /> Cart
                </h3>
                {cart.length > 0 && (
                  <span className="text-[10px] text-white/50">{totalItems} item{totalItems === 1 ? '' : 's'}</span>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-4 h-4 text-white/30" />
                  </div>
                  <p className="text-xs text-white/40">Tap a product to start</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((l) => (
                    <div
                      key={l.productId}
                      className="group relative flex items-center gap-2.5 bg-white/[0.04] border border-white/5 rounded-xl p-2.5 hover:border-white/10 transition-all"
                    >
                      <div className="w-11 h-11 rounded-lg bg-background/60 overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/5">
                        {l.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.image} alt={l.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-white/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{l.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5">
                          <span>{fmt(l.price)}</span>
                          <span>·</span>
                          <span className="text-white font-semibold">{fmt(l.price * l.quantity)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0 bg-background/60 rounded-lg p-0.5 border border-white/5">
                        <button
                          onClick={() => updateQty(l.productId, -1)}
                          className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold">{l.quantity}</span>
                        <button
                          onClick={() => updateQty(l.productId, 1)}
                          disabled={l.quantity >= l.stock}
                          className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(l.productId)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-error/20 text-white/40 hover:text-error flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer */}
            <div>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2">
                <User className="w-3 h-3" /> Customer
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Walk-in name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (selectedUserId) setSelectedUserId('');
                    }}
                    className={`w-full px-3 py-2.5 bg-white/[0.04] border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      selectedUserId ? 'border-primary/40' : 'border-white/10'
                    }`}
                  />
                  {selectedUserId && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  )}
                </div>
                <button
                  onClick={() => setShowCustomerPicker(true)}
                  className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 whitespace-nowrap transition-all"
                >
                  Pick User
                </button>
              </div>
            </div>

            {/* Sales associate */}
            {staffUsers && staffUsers.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2">
                  <UserCog className="w-3 h-3" /> Sales Associate
                </label>
                <div className="relative">
                  <select
                    value={salesAssociateId}
                    onChange={handleSelectSalesAssociate}
                    className="w-full px-3 py-2.5 pr-10 bg-white/[0.04] border border-white/10 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                  >
                    <option value="">None</option>
                    {staffUsers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Discount */}
            {cart.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2">
                  <Percent className="w-3 h-3" /> Discount
                </label>
                <div className="flex gap-2">
                  <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setDiscountType('amount')}
                      className={`px-3 rounded-lg text-xs font-bold transition-all ${
                        discountType === 'amount'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      ₱
                    </button>
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`px-3 rounded-lg text-xs font-bold transition-all ${
                        discountType === 'percent'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Payment */}
            {cart.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2">
                  <Wallet className="w-3 h-3" /> Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'cash', icon: Banknote, label: 'Cash' },
                      { id: 'card', icon: CreditCard, label: 'Card' },
                      { id: 'gcash', icon: Smartphone, label: 'GCash' },
                      { id: 'other', icon: Wallet, label: 'Other' },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                          active
                            ? 'bg-gradient-to-br from-primary to-orange-600 border-primary/50 text-white shadow-lg shadow-primary/20'
                            : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tender (cash only) */}
            {cart.length > 0 && paymentMethod === 'cash' && (
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2">
                  <Banknote className="w-3 h-3" /> Cash Received
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={tenderInput}
                  onChange={(e) => setTenderInput(e.target.value)}
                  className="w-full px-3 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all mb-2"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setTenderInput(total.toFixed(2))}
                    className="px-2 py-2 rounded-lg bg-gradient-to-br from-success/20 to-success/10 border border-success/40 text-success text-[11px] font-bold hover:from-success/30 hover:to-success/20 transition-all"
                  >
                    Exact
                  </button>
                  {QUICK_TENDERS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTenderInput(String(amt))}
                      className="px-2 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Totals + complete button */}
          <div className="p-4 sm:p-5 border-t border-white/5 bg-background/60 backdrop-blur-xl space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-white/50">
                <span>Subtotal</span>
                <span className="font-medium text-white/80">{fmt(subtotal)}</span>
              </div>
              {orderDiscount > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Discount
                  </span>
                  <span className="font-semibold">−{fmt(orderDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
                  {fmt(total)}
                </span>
              </div>
              {paymentMethod === 'cash' && cart.length > 0 && (
                <>
                  {change > 0 && (
                    <div className="mt-2 p-3 rounded-xl bg-gradient-to-br from-success/15 to-success/5 border border-success/30 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Change
                      </span>
                      <span className="text-lg font-bold text-success">{fmt(change)}</span>
                    </div>
                  )}
                  {shortfall > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-error/10 border border-error/30 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-error text-[11px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5" /> Short
                      </span>
                      <span className="text-sm font-bold text-error">{fmt(shortfall)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                canComplete
                  ? 'bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Processing...
                </span>
              ) : cart.length === 0 ? (
                'Add items to continue'
              ) : !selectedUserId && !customerName.trim() ? (
                'Enter customer name'
              ) : paymentMethod === 'cash' && tenderNumber < total ? (
                `Enter ${fmt(total - tenderNumber)} more`
              ) : (
                <>Complete Sale · {fmt(total)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer picker modal */}
      {showCustomerPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in"
            onClick={() => setShowCustomerPicker(false)}
          />
          <div className="fixed inset-x-4 top-16 bottom-16 sm:inset-auto sm:top-24 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 bg-gradient-to-br from-secondary to-secondary/80 border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-bold">Pick Customer</h3>
              </div>
              <button
                onClick={() => setShowCustomerPicker(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/50">No matching customers</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => handleSelectCustomer(u)}
                      className="w-full px-3 py-2.5 rounded-xl text-left hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-orange-600/10 border border-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {u.firstName[0]}
                          {u.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[11px] text-white/50 truncate">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Receipt modal */}
      {receiptData && <OrderReceipt data={receiptData} onClose={handleReceiptClose} />}
    </div>
  );
}
