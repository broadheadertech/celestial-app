'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Printer,
  RefreshCw,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import OrderReceipt from '@/components/admin/OrderReceipt';

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-warning/20 text-warning border-warning/30', icon: Clock },
  confirmed: { color: 'bg-success/20 text-success border-success/30', icon: CheckCircle },
  processing: { color: 'bg-info/20 text-info border-info/30', icon: RefreshCw },
  shipped: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package },
  delivered: { color: 'bg-success/20 text-success border-success/30', icon: CheckCircle },
  cancelled: { color: 'bg-error/20 text-error border-error/30', icon: XCircle },
};

function OrderDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const order = useQuery(
    api.services.orders.getOrderReceipt,
    orderId ? { orderId: orderId as Id<"orders"> } : 'skip'
  );

  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);
  const releaseOrder = useMutation(api.services.orders.releaseOrder);
  const updateOrderStatus = useMutation(api.services.orders.updateOrderStatus);

  const [receiptData, setReceiptData] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => Promise<void> } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Order Selected</h3>
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-primary text-white font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-error/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Order Not Found</h3>
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-primary text-white font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      await confirmAction.action();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const requestAcknowledge = () => {
    setConfirmAction({
      label: 'Acknowledge this order? This will confirm the order and generate a receipt.',
      action: async () => {
        const receipt = await acknowledgeOrder({ orderId: orderId as Id<"orders"> });
        setReceiptData(receipt);
      },
    });
  };

  const requestRelease = () => {
    setConfirmAction({
      label: 'Release this order? This will mark it as delivered and generate a release receipt.',
      action: async () => {
        const receipt = await releaseOrder({ orderId: orderId as Id<"orders"> });
        setReceiptData(receipt);
      },
    });
  };

  const requestCancel = () => {
    setConfirmAction({
      label: 'Cancel this order? Stock will be restored. This cannot be undone.',
      action: async () => {
        await updateOrderStatus({ orderId: orderId as Id<"orders">, status: 'cancelled' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Order {order.orderCode}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="capitalize">{order.status}</span>
                </span>
                <span className="text-xs text-white/40">{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 space-y-4 max-w-3xl mx-auto">
        {/* Customer */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Customer
          </h3>
          {order.customer ? (
            <div className="space-y-1.5">
              <p className="text-sm text-white font-medium">{order.customer.name}</p>
              {order.customer.email && order.customer.email !== 'Walk-in' && (
                <p className="text-xs text-white/60 flex items-center gap-1.5"><Mail className="w-3 h-3" />{order.customer.email}</p>
              )}
              {order.customer.phone && (
                <p className="text-xs text-white/60 flex items-center gap-1.5"><Phone className="w-3 h-3" />{order.customer.phone}</p>
              )}
              {order.customer.email === 'Walk-in' && (
                <p className="text-xs text-white/40">Walk-in customer</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">No customer info</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Items ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-white/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-white/50">x{item.quantity} @ {formatCurrency(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-white">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-3 border-t border-white/10">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3">Order Info</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-white/40">Payment</p><p className="text-white capitalize">{order.paymentMethod}</p></div>
            <div><p className="text-white/40">Created</p><p className="text-white">{formatDate(order.createdAt)}</p></div>
            <div><p className="text-white/40">Updated</p><p className="text-white">{formatDate(order.updatedAt)}</p></div>
            {order.salesAssociateName && (
              <div><p className="text-white/40">Sales Associate</p><p className="text-white">{order.salesAssociateName}</p></div>
            )}
          </div>
          {order.notes && (
            <div className="mt-3 p-2 rounded-lg bg-background/40 border border-white/5">
              <p className="text-xs text-white/40 mb-1">Notes</p>
              <p className="text-xs text-white/70 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {order.status === 'pending' && (
            <button onClick={requestAcknowledge} className="w-full px-4 py-3 rounded-xl bg-success/20 border border-success/30 text-success font-medium text-sm hover:bg-success/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Acknowledge Order (Receipt)
            </button>
          )}
          {(order.status === 'confirmed' || order.status === 'processing') && (
            <button onClick={requestRelease} className="w-full px-4 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover:bg-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> Release Order (Receipt)
            </button>
          )}
          {['pending', 'confirmed'].includes(order.status) && (
            <button onClick={requestCancel} className="w-full px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error font-medium text-sm hover:bg-error/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Cancel Order
            </button>
          )}
        </div>
      </div>

      <BottomNavbar />

      {/* Confirmation Prompt */}
      {confirmAction && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !isProcessing && setConfirmAction(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
              <p className="text-sm text-white/70 mb-6">{confirmAction.label}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmedAction}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <OrderReceipt data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }>
        <OrderDetailContent />
      </Suspense>
    </SafeAreaProvider>
  );
}
