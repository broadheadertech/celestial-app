'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Package,
  ChevronDown,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Card from '@/components/ui/Card';
import OrderReceipt from '@/components/admin/OrderReceipt';

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  stock: number;
}

interface CreateOrderFormProps {
  onSuccess?: () => void;
}

export default function CreateOrderForm({ onSuccess }: CreateOrderFormProps) {
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [salesAssociateId, setSalesAssociateId] = useState('');
  const [salesAssociateName, setSalesAssociateName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const users = useQuery(api.services.admin.getAllUsers, {});
  const staffUsers = useQuery(api.services.admin.getStaffUsers, {});

  const adminCreateOrder = useMutation(api.services.orders.adminCreateOrder);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);
  const adminCreateCustomer = useMutation(api.services.admin.adminCreateCustomer);

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch.trim()) return [];
    const query = productSearch.toLowerCase();
    return products
      .filter(p => p.isActive && p.stock > 0)
      .filter(p => p.name.toLowerCase().includes(query) || String(p.sku || '').toLowerCase().includes(query))
      .slice(0, 8);
  }, [products, productSearch]);

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const clientUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => u.role === 'client' && u.isActive !== false);
  }, [users]);

  const addProduct = (product: any) => {
    const existing = orderItems.find(i => i.productId === product._id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setOrderItems(items => items.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
    } else {
      setOrderItems(items => [...items, { productId: product._id, name: product.name, price: product.price, image: product.image, quantity: 1, stock: product.stock }]);
    }
    setProductSearch('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(items => items.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0 || newQty > i.stock) return i;
      return { ...i, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setOrderItems(items => items.filter(i => i.productId !== productId));
  };

  const handleCreateCustomer = async () => {
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    setIsCreatingCustomer(true);
    try {
      const result = await adminCreateCustomer({ firstName: newFirstName, lastName: newLastName, email: newEmail, phone: newPhone || undefined });
      setSelectedUserId(result.userId);
      setCustomerName(result.name);
      setShowNewCustomer(false);
      setNewFirstName(''); setNewLastName(''); setNewEmail(''); setNewPhone('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) return;
    if (!selectedUserId && !customerName.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await adminCreateOrder({
        userId: selectedUserId ? selectedUserId as Id<"users"> : undefined,
        items: orderItems.map(i => ({ productId: i.productId as Id<"products">, quantity: i.quantity })),
        paymentMethod,
        notes: notes || undefined,
        customerName: customerName || undefined,
        salesAssociateId: salesAssociateId ? salesAssociateId as Id<"users"> : undefined,
        salesAssociateName: salesAssociateName || undefined,
      });
      const receipt = await acknowledgeOrder({ orderId: result.orderId as Id<"orders">, adminNotes: 'Auto-acknowledged on creation' });
      setReceiptData(receipt);
      onSuccess?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = orderItems.length > 0 && (!!selectedUserId || !!customerName.trim()) && !isSubmitting;

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Customer */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Customer</h3>
            <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="text-xs text-primary font-medium hover:text-primary/80 flex items-center gap-1">
              <Plus className="w-3 h-3" /> {showNewCustomer ? 'Select Existing' : 'New Customer'}
            </button>
          </div>
          {!showNewCustomer ? (
            <div className="space-y-3">
              <div className="relative">
                <select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); const u = clientUsers.find((u: any) => u._id === e.target.value); if (u) setCustomerName(`${(u as any).firstName} ${(u as any).lastName}`); }}
                  className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select customer...</option>
                  {clientUsers.map((u: any) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in name..." className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ) : (
            <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="First name *" className="px-3 py-2 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Last name *" className="px-3 py-2 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email *" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone (optional)" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={handleCreateCustomer} disabled={!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || isCreatingCustomer}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">{isCreatingCustomer ? 'Creating...' : 'Create & Select'}</button>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Products</h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {filteredProducts.length > 0 && (
            <div className="mb-3 space-y-1 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-background/40">
              {filteredProducts.map((p) => (
                <button key={p._id} onClick={() => addProduct(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left">
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{p.name}</p><p className="text-xs text-white/40">{formatCurrency(p.price)} • {p.stock} in stock</p></div>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          {orderItems.length === 0 ? (
            <div className="text-center py-4"><ShoppingCart className="w-8 h-8 text-white/20 mx-auto mb-1" /><p className="text-xs text-white/40">Search and add products</p></div>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-white/5">
                  <div className="w-8 h-8 rounded bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-3 h-3 text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{item.name}</p><p className="text-xs text-white/40">{formatCurrency(item.price)}</p></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.productId, -1)} disabled={item.quantity <= 1} className="w-6 h-6 rounded bg-secondary flex items-center justify-center disabled:opacity-30"><Minus className="w-3 h-3 text-white" /></button>
                    <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 rounded bg-secondary flex items-center justify-center disabled:opacity-30"><Plus className="w-3 h-3 text-white" /></button>
                  </div>
                  <p className="text-sm font-bold text-white w-14 text-right">{formatCurrency(item.price * item.quantity)}</p>
                  <button onClick={() => removeItem(item.productId)} className="p-1 rounded hover:bg-error/20"><Trash2 className="w-3 h-3 text-error" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Associate */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><User className="w-4 h-4 text-success" /> Sales Associate</h3>
          <div className="relative">
            <select value={salesAssociateId} onChange={(e) => { setSalesAssociateId(e.target.value); const s = staffUsers?.find((s: any) => s._id === e.target.value); setSalesAssociateName(s ? `${s.firstName} ${s.lastName}` : ''); }}
              className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select (optional)</option>
              {staffUsers?.map((s: any) => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} {s.isSalesAssociate ? '⭐' : ''}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Payment */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2">Payment</h3>
          <div className="flex gap-2 mb-3">
            {['cash', 'gcash', 'bank_transfer', 'card'].map((m) => (
              <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border capitalize ${paymentMethod === m ? 'bg-primary border-primary text-white' : 'bg-background/60 border-white/10 text-white/70'}`}>{m.replace('_', ' ')}</button>
            ))}
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Submit */}
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/30">
          <div className="flex justify-between mb-2"><span className="text-sm text-white/60">Items</span><span className="text-sm font-medium text-white">{orderItems.length}</span></div>
          <div className="flex justify-between mb-4"><span className="text-base font-bold text-white">Total</span><span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span></div>
          {!canSubmit && orderItems.length > 0 && <p className="text-xs text-error mb-2 text-center">Select a customer or enter a walk-in name</p>}
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={`w-full px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${canSubmit ? 'bg-primary text-white hover:bg-primary/90 active:scale-95' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
            {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><ShoppingCart className="w-4 h-4" /> Create Order & Receipt</>}
          </button>
        </div>
      </div>

      {receiptData && <OrderReceipt data={receiptData} onClose={() => setReceiptData(null)} />}
    </>
  );
}
