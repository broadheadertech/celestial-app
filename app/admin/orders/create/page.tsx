'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  X,
  Package,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import OrderReceipt from '@/components/admin/OrderReceipt';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  stock: number;
}

function CreateOrderContent() {
  const router = useRouter();

  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  // Customer selection
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerName, setCustomerName] = useState('');

  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Sales associate
  const [salesAssociateId, setSalesAssociateId] = useState('');
  const [salesAssociateName, setSalesAssociateName] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Queries
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const users = useQuery(api.services.admin.getAllUsers, {});
  const staffUsers = useQuery(api.services.admin.getStaffUsers, {});

  // Mutations
  const adminCreateOrder = useMutation(api.services.orders.adminCreateOrder);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);
  const adminCreateCustomer = useMutation(api.services.admin.adminCreateCustomer);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!products || !productSearch.trim()) return [];
    const query = productSearch.toLowerCase();
    return products
      .filter(p => p.isActive && p.stock > 0)
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        String(p.sku || '').toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [products, productSearch]);

  // Calculate total
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addProduct = (product: any) => {
    const existing = orderItems.find(i => i.productId === product._id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setOrderItems(items =>
          items.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        );
      }
    } else {
      setOrderItems(items => [...items, {
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        stock: product.stock,
      }]);
    }
    setProductSearch('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(items =>
      items.map(i => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (newQty > i.stock) return i;
        return { ...i, quantity: newQty };
      })
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems(items => items.filter(i => i.productId !== productId));
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) return;
    if (!selectedUserId && !customerName.trim()) return;

    setIsSubmitting(true);
    try {
      // Create the order
      const result = await adminCreateOrder({
        userId: selectedUserId ? selectedUserId as Id<"users"> : undefined,
        items: orderItems.map(i => ({
          productId: i.productId as Id<"products">,
          quantity: i.quantity,
        })),
        paymentMethod,
        notes: notes || undefined,
        customerName: customerName || undefined,
        salesAssociateId: salesAssociateId ? salesAssociateId as Id<"users"> : undefined,
        salesAssociateName: salesAssociateName || undefined,
      });

      // Immediately acknowledge and get receipt
      const receipt = await acknowledgeOrder({
        orderId: result.orderId as Id<"orders">,
        adminNotes: 'Auto-acknowledged on creation',
      });

      setReceiptData(receipt);
    } catch (error) {
      console.error('Create order failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    setIsCreatingCustomer(true);
    try {
      const result = await adminCreateCustomer({
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phone: newPhone || undefined,
      });
      setSelectedUserId(result.userId);
      setCustomerName(result.name);
      setShowNewCustomer(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Filter client users only
  const clientUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => u.role === 'client' && u.isActive !== false);
  }, [users]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Create Order</h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">Walk-in / In-store order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
        {/* Customer Selection */}
        <Card variant="modern" padding="md" className="border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Customer
            </h3>
            <button
              onClick={() => setShowNewCustomer(!showNewCustomer)}
              className="text-xs text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {showNewCustomer ? 'Select Existing' : 'New Customer'}
            </button>
          </div>

          {!showNewCustomer ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Select Registered Customer</label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      const user = clientUsers.find((u: any) => u._id === e.target.value);
                      if (user) setCustomerName(`${(user as any).firstName} ${(user as any).lastName}`);
                    }}
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select customer...</option>
                    {clientUsers.map((user: any) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Walk-in Name (optional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name for receipt..."
                  className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-medium">Register New Customer</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="First name *"
                  className="px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Last name *"
                  className="px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email address *"
                className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleCreateCustomer}
                disabled={!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || isCreatingCustomer}
                className="w-full px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingCustomer ? 'Creating...' : 'Create & Select Customer'}
              </button>
            </div>
          )}
        </Card>

        {/* Sales Associate */}
        <Card variant="modern" padding="md" className="border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-success" />
            Sales Associate
          </h3>
          <div className="relative">
            <select
              value={salesAssociateId}
              onChange={(e) => {
                setSalesAssociateId(e.target.value);
                const staff = staffUsers?.find((s: any) => s._id === e.target.value);
                if (staff) setSalesAssociateName(`${staff.firstName} ${staff.lastName}`);
                else setSalesAssociateName('');
              }}
              className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select staff member (optional)</option>
              {staffUsers?.map((staff: any) => (
                <option key={staff._id} value={staff._id}>
                  {staff.firstName} {staff.lastName} ({staff.role})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          <p className="text-[10px] text-white/40 mt-1.5">For incentive program tracking</p>
        </Card>

        {/* Product Search & Selection */}
        <Card variant="modern" padding="md" className="border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Products
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products to add..."
              className="w-full pl-9 pr-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Search Results */}
          {filteredProducts.length > 0 && (
            <div className="mb-3 space-y-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-background/40">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => addProduct(product)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{product.name}</p>
                    <p className="text-xs text-white/40">{formatCurrency(product.price)} • {product.stock} in stock</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Order Items */}
          {orderItems.length === 0 ? (
            <div className="text-center py-6">
              <ShoppingCart className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/40">Search and add products above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 p-2 rounded-lg bg-background/40 border border-white/5">
                  <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-white/40">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-sm font-bold text-white w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-white w-16 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1.5 rounded hover:bg-error/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment & Notes */}
        <Card variant="modern" padding="md" className="border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3">Payment & Notes</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">Payment Method</label>
              <div className="flex gap-2">
                {['cash', 'gcash', 'bank_transfer', 'card'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-all capitalize active:scale-95 ${
                      paymentMethod === method
                        ? 'bg-primary border-primary text-white'
                        : 'bg-background/60 border-white/10 text-white/70'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Order Summary & Submit */}
        <Card variant="modern" padding="md" className="border border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/60">Items</span>
            <span className="text-sm font-medium text-white">{orderItems.length} product{orderItems.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-white">Total</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          {/* Validation message */}
          {(orderItems.length === 0 || (!selectedUserId && !customerName.trim())) && (
            <p className="text-xs text-error mb-2 text-center">
              {orderItems.length === 0 && (!selectedUserId && !customerName.trim())
                ? 'Add products and enter a customer name or select a customer'
                : orderItems.length === 0
                ? 'Add at least one product'
                : 'Select a customer or enter a walk-in name'}
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={orderItems.length === 0 || (!selectedUserId && !customerName.trim()) || isSubmitting}
            className={`w-full px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
              orderItems.length === 0 || (!selectedUserId && !customerName.trim())
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Create Order & Generate Receipt
              </>
            )}
          </button>
        </Card>
      </div>

      <BottomNavbar />

      {/* Receipt Modal */}
      {receiptData && (
        <OrderReceipt
          data={receiptData}
          onClose={() => {
            setReceiptData(null);
            router.push('/admin/orders');
          }}
        />
      )}
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <CreateOrderContent />
    </SafeAreaProvider>
  );
}
