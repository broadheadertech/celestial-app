'use client';

import React, { useRef } from 'react';
import { Printer, X, CheckCircle, Package } from 'lucide-react';

interface ReceiptItem {
  productId: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  productName: string;
  productImage?: string;
}

interface ReceiptData {
  receiptType: 'acknowledgement' | 'release';
  orderCode: string;
  items: ReceiptItem[];
  subtotal?: number;
  orderDiscount?: number;
  totalAmount: number;
  paymentMethod: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  createdAt: number;
  acknowledgedAt?: number;
  releasedAt?: number;
  notes?: string;
  salesAssociateName?: string;
}

interface OrderReceiptProps {
  data: ReceiptData;
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrderReceipt({ data, onClose }: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${data.receiptType === 'acknowledgement' ? 'Acknowledgement' : 'Release'} Receipt - ${data.orderCode}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; color: #1a1a1a; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px dashed #ddd; }
            .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
            .header h2 { font-size: 14px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .header p { font-size: 12px; color: #888; margin-top: 8px; }
            .section { margin-bottom: 16px; }
            .section-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .info-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
            .info-row .label { color: #666; }
            .info-row .value { font-weight: 500; }
            .items { border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 12px 0; margin: 12px 0; }
            .item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
            .item .name { flex: 1; }
            .item .qty { width: 40px; text-align: center; color: #666; }
            .item .price { width: 80px; text-align: right; font-weight: 500; }
            .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding-top: 8px; border-top: 2px solid #1a1a1a; }
            .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 2px dashed #ddd; font-size: 11px; color: #888; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .badge-ack { background: #e8f5e9; color: #2e7d32; }
            .badge-rel { background: #e3f2fd; color: #1565c0; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const isAcknowledgement = data.receiptType === 'acknowledgement';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Actions Bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-800">
            {isAcknowledgement ? 'Acknowledgement Receipt' : 'Release Receipt'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="receipt p-6">
          {/* Header */}
          <div className="header text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
            <h1 className="text-lg font-bold text-gray-900">Dragon Cave Inventory</h1>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
              {isAcknowledgement ? 'Acknowledgement Receipt' : 'Release Receipt'}
            </h2>
            <div className="mt-3">
              <span className={`badge ${isAcknowledgement ? 'badge-ack' : 'badge-rel'}`}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isAcknowledgement ? '#e8f5e9' : '#e3f2fd',
                  color: isAcknowledgement ? '#2e7d32' : '#1565c0',
                }}>
                {isAcknowledgement ? 'ORDER ACKNOWLEDGED' : 'ORDER RELEASED'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formatDate(isAcknowledgement ? (data.acknowledgedAt || Date.now()) : (data.releasedAt || Date.now()))}
            </p>
          </div>

          {/* Order Info */}
          <div className="section mb-4">
            <p className="section-title text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Order Information</p>
            <div className="space-y-1">
              <div className="info-row flex justify-between text-sm">
                <span className="label text-gray-500">Order Code</span>
                <span className="value font-semibold text-gray-900">{data.orderCode}</span>
              </div>
              <div className="info-row flex justify-between text-sm">
                <span className="label text-gray-500">Order Date</span>
                <span className="value text-gray-700">{formatDate(data.createdAt)}</span>
              </div>
              <div className="info-row flex justify-between text-sm">
                <span className="label text-gray-500">Payment</span>
                <span className="value text-gray-700 capitalize">{data.paymentMethod}</span>
              </div>
              {data.salesAssociateName && (
                <div className="info-row flex justify-between text-sm">
                  <span className="label text-gray-500">Sales Associate</span>
                  <span className="value font-medium text-gray-900">{data.salesAssociateName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          {data.customer && (
            <div className="section mb-4">
              <p className="section-title text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer</p>
              <div className="space-y-1">
                <div className="info-row flex justify-between text-sm">
                  <span className="label text-gray-500">Name</span>
                  <span className="value font-medium text-gray-900">{data.customer.name}</span>
                </div>
                {data.customer.phone && (
                  <div className="info-row flex justify-between text-sm">
                    <span className="label text-gray-500">Phone</span>
                    <span className="value text-gray-700">{data.customer.phone}</span>
                  </div>
                )}
                <div className="info-row flex justify-between text-sm">
                  <span className="label text-gray-500">Email</span>
                  <span className="value text-gray-700 text-xs">{data.customer.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="items border-t border-b border-gray-200 py-3 my-3">
            <p className="section-title text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
            <div className="space-y-2">
              {data.items.map((item, index) => {
                const hasLineDiscount = (item.discount || 0) > 0 && item.originalPrice;
                return (
                  <div key={index} className="item flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="name text-gray-800">{item.productName}</span>
                      {hasLineDiscount && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          <span className="line-through">{formatCurrency(item.originalPrice!)}</span>
                          <span className="text-green-700 ml-1">-{formatCurrency(item.discount!)}</span>
                        </div>
                      )}
                    </div>
                    <span className="qty w-10 text-center text-gray-500">x{item.quantity}</span>
                    <span className="price w-20 text-right font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtotal / Discount / Total */}
          {(data.orderDiscount || 0) > 0 && data.subtotal !== undefined && (
            <>
              <div className="info-row flex justify-between text-sm mb-1">
                <span className="label text-gray-500">Subtotal</span>
                <span className="value text-gray-700">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="info-row flex justify-between text-sm mb-2">
                <span className="label text-gray-500">Order Discount</span>
                <span className="value font-medium text-green-700">-{formatCurrency(data.orderDiscount || 0)}</span>
              </div>
            </>
          )}

          {/* Total */}
          <div className="total flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-gray-900">
            <span>TOTAL</span>
            <span>{formatCurrency(data.totalAmount)}</span>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Notes</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="footer text-center mt-6 pt-4 border-t-2 border-dashed border-gray-300">
            <p className="text-xs text-gray-400">Thank you for your purchase!</p>
            <p className="text-xs text-gray-400 mt-1">Dragon Cave Inventory</p>
            {isAcknowledgement && (
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Please present this receipt when picking up your order.
              </p>
            )}
            {!isAcknowledgement && (
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Order has been released to the customer.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
