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
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Boxes,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

interface RecordVisual {
  icon: typeof Package;
  label: string;
  color: string;
  bgColor: string;
  ringColor: string;
}

const getRecordVisual = (record: any): RecordVisual => {
  if (record.isMortalityLoss) {
    return { icon: Skull, label: 'Mortality Loss', color: 'text-error', bgColor: 'bg-error/10', ringColor: 'ring-error/30' };
  }
  if (record.isRestock) {
    return { icon: PackagePlus, label: 'Restock', color: 'text-success', bgColor: 'bg-success/10', ringColor: 'ring-success/30' };
  }
  return { icon: Package, label: 'Initial Stock', color: 'text-info', bgColor: 'bg-info/10', ringColor: 'ring-info/30' };
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-success/10 text-success border-success/30';
    case 'depleted':
      return 'bg-white/5 text-white/40 border-white/10';
    case 'damaged':
      return 'bg-error/10 text-error border-error/30';
    case 'expired':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    default:
      return 'bg-white/5 text-white/60 border-white/10';
  }
};

function ActivityLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName');

  const stockRecords = useQuery(
    api.services.stock.getStockRecordsByProduct,
    productId ? { productId: productId as any } : 'skip'
  );

  const product = useQuery(
    api.services.products.getProduct,
    productId ? { productId: productId as any } : 'skip'
  );

  const sortedRecords = useMemo(() => {
    if (!stockRecords) return [];
    return [...stockRecords].sort((a, b) => b.createdAt - a.createdAt);
  }, [stockRecords]);

  const stats = useMemo(() => {
    if (!stockRecords) return null;
    const nonMortality = stockRecords.filter(r => !r.isMortalityLoss);
    const initialRecords = nonMortality.filter(r => !r.isRestock);
    const restockRecords = nonMortality.filter(r => r.isRestock);
    const mortalityRecords = stockRecords.filter(r => r.isMortalityLoss);

    const totalReceived = nonMortality.reduce((s, r) => s + r.initialQty, 0);
    const totalSold = nonMortality.reduce((s, r) => s + r.soldQty, 0);
    const totalMortality = nonMortality.reduce((s, r) => s + r.mortalityLossQty, 0);
    const activeBatches = nonMortality.filter(r => r.status === 'active').length;

    return {
      totalRecords: stockRecords.length,
      initialCount: initialRecords.length,
      restockCount: restockRecords.length,
      mortalityCount: mortalityRecords.length,
      activeBatches,
      totalReceived,
      totalSold,
      totalMortality,
      currentStock: product?.stock || 0,
    };
  }, [stockRecords, product]);

  if (!productId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card variant="modern" padding="lg" className="text-center border border-white/10 max-w-md">
          <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Activity Log</h1>
              <p className="text-xs sm:text-sm text-white/50 truncate">{productName || 'Product History'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
        {!stockRecords ? (
          <div className="text-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading activity log...</p>
          </div>
        ) : sortedRecords.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Activity Yet</h3>
            <p className="text-sm text-white/60">This product has no stock records yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* LEFT: Summary (1 column on desktop) */}
            <div className="lg:col-span-1 space-y-4">
              {/* Current Stock Big Card */}
              {stats && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Boxes className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider">Current Stock</p>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats.currentStock}</p>
                  <p className="text-xs text-white/50 mt-1">units across {stats.activeBatches} active {stats.activeBatches === 1 ? 'batch' : 'batches'}</p>
                </div>
              )}

              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Received</p>
                    </div>
                    <p className="text-xl font-bold text-white">{stats.totalReceived}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{stats.initialCount + stats.restockCount} batches</p>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Sold</p>
                    </div>
                    <p className="text-xl font-bold text-primary">{stats.totalSold}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">total units</p>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-error" />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Mortality</p>
                    </div>
                    <p className="text-xl font-bold text-error">{stats.totalMortality}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{stats.mortalityCount} events</p>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-info" />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Value</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {product?.price ? formatCurrency(product.price * stats.currentStock) : '—'}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">at current stock</p>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="bg-secondary/30 rounded-xl p-4 border border-white/10 hidden sm:block">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Record Types</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-info/10 flex items-center justify-center">
                      <Package className="w-3 h-3 text-info" />
                    </div>
                    <span className="text-xs text-white/70">Initial Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-success/10 flex items-center justify-center">
                      <PackagePlus className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-xs text-white/70">Restock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-error/10 flex items-center justify-center">
                      <Skull className="w-3 h-3 text-error" />
                    </div>
                    <span className="text-xs text-white/70">Mortality Loss</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Timeline (2 columns on desktop) */}
            <div className="lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Timeline</h2>
                  <p className="text-xs text-white/50 mt-0.5">{sortedRecords.length} {sortedRecords.length === 1 ? 'record' : 'records'} · newest first</p>
                </div>
              </div>

              <div className="relative">
                {/* Vertical timeline line (desktop only) */}
                <div className="hidden sm:block absolute left-6 top-2 bottom-2 w-px bg-white/10" />

                <div className="space-y-3 sm:space-y-4">
                  {sortedRecords.map((record, index) => {
                    const visual = getRecordVisual(record);
                    const Icon = visual.icon;
                    const isLastActivity = index === 0;

                    return (
                      <div key={record._id} className="relative">
                        <div className="flex gap-3 sm:gap-4">
                          {/* Timeline Dot/Icon */}
                          <div className={`relative z-10 w-12 h-12 rounded-xl ${visual.bgColor} ring-2 ${visual.ringColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${visual.color}`} />
                          </div>

                          {/* Content Card */}
                          <div className="flex-1 min-w-0 bg-secondary/30 rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm font-bold text-white">{visual.label}</h3>
                                  {isLastActivity && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                      Latest
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-white/60 text-[10px]">
                                    {record.batchCode}
                                  </span>
                                </div>
                              </div>
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${getStatusStyle(record.status)}`}>
                                {record.status}
                              </span>
                            </div>

                            {/* Quantities Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-white/5">
                              <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Initial</p>
                                <p className="text-base font-bold text-white">{record.initialQty}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Current</p>
                                <p className={`text-base font-bold ${record.currentQty === 0 ? 'text-white/30' : 'text-white'}`}>
                                  {record.currentQty}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Sold</p>
                                <p className={`text-base font-bold ${record.soldQty > 0 ? 'text-primary' : 'text-white/30'}`}>
                                  {record.soldQty || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Mortality</p>
                                <p className={`text-base font-bold ${record.mortalityLossQty > 0 ? 'text-error' : 'text-white/30'}`}>
                                  {record.mortalityLossQty || '—'}
                                </p>
                              </div>
                            </div>

                            {/* Notes */}
                            {record.notes && (
                              <div className="mt-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-3">
                                  {record.notes.split('\n').filter(line =>
                                    !line.includes('Accumulated Total') &&
                                    !line.includes('Previous Batch Remaining') &&
                                    !line.includes('Original Batch:')
                                  ).join('\n')}
                                </p>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center gap-2 text-[11px] text-white/40 mt-3 pt-3 border-t border-white/5">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(record.createdAt)}</span>
                              {record.qualityGrade && (
                                <>
                                  <span className="text-white/20">·</span>
                                  <span className="capitalize">{record.qualityGrade} grade</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
}

function ActivityLogPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="w-12 h-12 animate-spin text-primary" />
        </div>
      }>
        <ActivityLogContent />
      </Suspense>
    </SafeAreaProvider>
  );
}

export default ActivityLogPage;
