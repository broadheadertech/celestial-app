'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Package,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

function ExpiringContent() {
  const router = useRouter();
  const [daysAhead, setDaysAhead] = useState(30);

  // Fetch expiring stock
  const expiringStock = useQuery(api.services.stock.getExpiringStock, { daysAhead });

  // Also fetch low stock for the combined alerts view
  const lowStock = useQuery(api.services.stock.getLowStockAlerts, { threshold: 10 });

  const isLoading = expiringStock === undefined;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Stock Alerts</h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">Expiring and low stock warnings</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-orange-500/10 rounded-lg p-2 sm:p-3 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <p className="text-[10px] sm:text-xs text-orange-400/80">Expiring Soon</p>
              </div>
              <p className="text-sm sm:text-lg font-bold text-orange-400 mt-1">
                {expiringStock?.length ?? '...'}
              </p>
            </div>
            <div className="bg-warning/10 rounded-lg p-2 sm:p-3 border border-warning/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="text-[10px] sm:text-xs text-warning/80">Low Stock</p>
              </div>
              <p className="text-sm sm:text-lg font-bold text-warning mt-1">
                {lowStock?.length ?? '...'}
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setDaysAhead(days)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all active:scale-95 touch-manipulation ${
                  daysAhead === days
                    ? 'bg-primary border-primary text-white'
                    : 'bg-secondary/60 border-white/10 text-white/70 hover:border-primary/30'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-6">
        {/* Expiring Stock Section */}
        <div>
          <h2 className="text-sm sm:text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            Expiring Within {daysAhead} Days
            <span className="text-white/60">({expiringStock?.length ?? 0})</span>
          </h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Loading...</p>
            </div>
          ) : expiringStock && expiringStock.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {expiringStock.map((record) => {
                const urgency = record.daysUntilExpiry <= 7
                  ? { color: 'border-error/30 bg-error/5', badge: 'bg-error/10 text-error border-error/30', label: 'Critical' }
                  : record.daysUntilExpiry <= 14
                  ? { color: 'border-orange-500/30 bg-orange-500/5', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', label: 'Warning' }
                  : { color: 'border-warning/20 bg-warning/5', badge: 'bg-warning/10 text-warning border-warning/20', label: 'Upcoming' };

                return (
                  <Card
                    key={record._id}
                    variant="modern"
                    padding="none"
                    className={`border ${urgency.color}`}
                  >
                    <div className="p-3 sm:p-4 flex gap-3">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
                          {record.productImage ? (
                            <img src={record.productImage} alt={record.productName || ''} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-white/30" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">
                              {record.productName || 'Unknown Product'}
                            </h3>
                            <p className="text-xs text-white/60 truncate">
                              Batch: {record.batchCode} • Qty: {record.currentQty}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${urgency.badge}`}>
                            {urgency.label}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span className="text-orange-400 font-medium">
                              {record.daysUntilExpiry} day{record.daysUntilExpiry !== 1 ? 's' : ''} left
                            </span>
                            <span className="text-white/40">
                              (expires {formatDate(record.expiryDate!)})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card variant="modern" padding="lg" className="text-center border border-white/10">
              <Shield className="w-10 h-10 text-success/40 mx-auto mb-2" />
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">All Clear</h3>
              <p className="text-xs sm:text-sm text-white/60">
                No stock expiring within {daysAhead} days.
              </p>
            </Card>
          )}
        </div>

        {/* Low Stock Section */}
        <div>
          <h2 className="text-sm sm:text-lg font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Stock Items
            <span className="text-white/60">({lowStock?.length ?? 0})</span>
          </h2>

          {lowStock === undefined ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Loading...</p>
            </div>
          ) : lowStock.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {lowStock.map((record) => {
                const severity = record.currentQty <= 3
                  ? { color: 'border-error/30 bg-error/5', badge: 'bg-error/10 text-error border-error/30' }
                  : record.currentQty <= 5
                  ? { color: 'border-warning/30 bg-warning/5', badge: 'bg-warning/10 text-warning border-warning/30' }
                  : { color: 'border-white/10', badge: 'bg-white/10 text-white/70 border-white/10' };

                return (
                  <Card
                    key={record._id}
                    variant="modern"
                    padding="none"
                    className={`border ${severity.color}`}
                  >
                    <div className="p-3 sm:p-4 flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
                          {record.productImage ? (
                            <img src={record.productImage} alt={record.productName || ''} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-white/30" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">
                              {record.productName || 'Unknown Product'}
                            </h3>
                            <p className="text-xs text-white/60 truncate">
                              Batch: {record.batchCode} • SKU: {record.productSku || 'N/A'}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${severity.badge}`}>
                            {record.currentQty} left
                          </div>
                        </div>

                        {/* Stock bar */}
                        <div className="mt-2">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full ${record.currentQty <= 3 ? 'bg-error' : record.currentQty <= 5 ? 'bg-warning' : 'bg-primary'}`}
                              style={{ width: `${Math.min((record.currentQty / 10) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card variant="modern" padding="lg" className="text-center border border-white/10">
              <Shield className="w-10 h-10 text-success/40 mx-auto mb-2" />
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">Stock Levels Good</h3>
              <p className="text-xs sm:text-sm text-white/60">
                All items have stock above the threshold.
              </p>
            </Card>
          )}
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
}

export default function ExpiringStockPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ExpiringContent />
    </SafeAreaProvider>
  );
}
