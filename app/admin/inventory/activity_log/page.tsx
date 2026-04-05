'use client';

import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Package,
  PackagePlus,
  Skull,
  ShoppingCart,
  Edit,
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getRecordTypeIcon = (record: any) => {
  if (record.isMortalityLoss) return Skull;
  if (record.isRestock) return PackagePlus;
  return Package;
};

const getRecordTypeLabel = (record: any) => {
  if (record.isMortalityLoss) return 'Mortality Loss';
  if (record.isRestock) return 'Restock';
  return 'Initial Stock';
};

const getRecordTypeColor = (record: any) => {
  if (record.isMortalityLoss) return 'text-error';
  if (record.isRestock) return 'text-success';
  return 'text-info';
};

function ActivityLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName');

  // Fetch stock records for this product
  const stockRecords = useQuery(
    api.services.stock.getStockRecordsByProduct,
    productId ? { productId: productId as any } : 'skip'
  );

  // Fetch product details
  const product = useQuery(
    api.services.products.getProduct,
    productId ? { productId: productId as any } : 'skip'
  );

  // Sort records by creation date (newest first)
  const sortedRecords = useMemo(() => {
    if (!stockRecords) return [];
    return [...stockRecords].sort((a, b) => b.createdAt - a.createdAt);
  }, [stockRecords]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!stockRecords) return null;

    const totalRecords = stockRecords.length;
    const initialStockRecords = stockRecords.filter(r => !r.isRestock && !r.isMortalityLoss);
    const restockRecords = stockRecords.filter(r => r.isRestock);
    const mortalityRecords = stockRecords.filter(r => r.isMortalityLoss);

    const totalAdded = initialStockRecords.reduce((sum, r) => sum + r.initialQty, 0);
    const totalRestocked = restockRecords.reduce((sum, r) => sum + r.initialQty, 0);
    const totalMortality = mortalityRecords.reduce((sum, r) => sum + r.mortalityLossQty, 0);
    const totalSold = stockRecords.reduce((sum, r) => sum + r.soldQty, 0);

    return {
      totalRecords,
      initialStockRecords: initialStockRecords.length,
      restockRecords: restockRecords.length,
      mortalityRecords: mortalityRecords.length,
      totalAdded,
      totalRestocked,
      totalMortality,
      totalSold,
      currentStock: product?.stock || 0
    };
  }, [stockRecords, product]);

  if (!productId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card variant="modern" padding="lg" className="text-center border border-white/10">
          <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Product Selected</h3>
          <p className="text-sm text-white/60 mb-4">
            Please select a product from the inventory page to view its activity log.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all"
          >
            Go Back
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Activity Log</h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">
                {productName || 'Product History'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Stock Records <span className="text-white/60">({sortedRecords.length})</span>
          </h2>
        </div>

        {!stockRecords ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading activity log...</h3>
            <p className="text-sm text-white/60">Please wait while we fetch the data.</p>
          </div>
        ) : sortedRecords.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Activity Yet</h3>
            <p className="text-sm text-white/60">
              This product has no stock records yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedRecords.map((record) => {
              const RecordIcon = getRecordTypeIcon(record);
              const recordColor = getRecordTypeColor(record);
              const recordLabel = getRecordTypeLabel(record);

              return (
                <Card
                  key={record._id}
                  variant="modern"
                  padding="md"
                  className="border border-white/10"
                >
                  <div className="flex gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-3 rounded-lg bg-secondary/60 ${recordColor}`}>
                      <RecordIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-white">
                            {recordLabel}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/60">
                            Batch: {record.batchCode}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                          record.status === 'active'
                            ? 'bg-success/10 text-success border-success/30'
                            : record.status === 'depleted'
                            ? 'bg-error/10 text-error border-error/30'
                            : 'bg-muted/10 text-muted border-muted/30'
                        }`}>
                          {record.status}
                        </div>
                      </div>

                      {/* Quantities Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-white/40">Initial Qty</p>
                          <p className="text-sm font-bold text-white">{record.initialQty}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40">Current Qty</p>
                          <p className="text-sm font-bold text-white">{record.currentQty}</p>
                        </div>
                        {record.mortalityLossQty > 0 && (
                          <div>
                            <p className="text-xs text-white/40">Mortality</p>
                            <p className="text-sm font-bold text-error">{record.mortalityLossQty}</p>
                          </div>
                        )}
                        {record.soldQty > 0 && (
                          <div>
                            <p className="text-xs text-white/40">Sold</p>
                            <p className="text-sm font-bold text-primary">{record.soldQty}</p>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {record.notes && (
                        <div className="mb-2 p-2 rounded-lg bg-secondary/40 border border-white/5">
                          <p className="text-xs text-white/70 whitespace-pre-wrap">
                            {record.notes}
                          </p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-white/40 pt-2 border-t border-white/5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(record.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}

function ActivityLogPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="w-16 h-16 animate-spin text-primary" />
        </div>
      }>
        <ActivityLogContent />
      </Suspense>
    </SafeAreaProvider>
  );
}

export default ActivityLogPage;
