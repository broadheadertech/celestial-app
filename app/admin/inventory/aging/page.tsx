'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Package,
  Search,
  X,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
  });
};

type BucketKey = 'fresh' | 'aging' | 'old' | 'stale' | 'dead';
type CategoryFilter = 'all' | 'fish' | 'tank' | 'accessory';

const bucketTheme: Record<BucketKey, { label: string; chip: string; bar: string; row: string; dot: string; text: string }> = {
  fresh: {
    label: 'Fresh',
    chip: 'bg-success/10 text-success border-success/30',
    bar: 'bg-success',
    row: 'border-l-success/60',
    dot: 'bg-success',
    text: 'text-success',
  },
  aging: {
    label: 'Aging',
    chip: 'bg-info/10 text-info border-info/30',
    bar: 'bg-info',
    row: 'border-l-info/60',
    dot: 'bg-info',
    text: 'text-info',
  },
  old: {
    label: 'Old',
    chip: 'bg-warning/10 text-warning border-warning/30',
    bar: 'bg-warning',
    row: 'border-l-warning/60',
    dot: 'bg-warning',
    text: 'text-warning',
  },
  stale: {
    label: 'Stale',
    chip: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    bar: 'bg-orange-500',
    row: 'border-l-orange-500/60',
    dot: 'bg-orange-500',
    text: 'text-orange-400',
  },
  dead: {
    label: 'Dead',
    chip: 'bg-error/10 text-error border-error/30',
    bar: 'bg-error',
    row: 'border-l-error/60',
    dot: 'bg-error',
    text: 'text-error',
  },
};

function StockAgingContent() {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [bucketFilter, setBucketFilter] = useState<'all' | BucketKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const aging = useQuery(
    api.services.stock.getStockAging,
    category === 'all' ? {} : { category }
  );

  const isLoading = aging === undefined;

  const filteredRecords = useMemo(() => {
    if (!aging) return [];
    let rows = aging.records;
    if (bucketFilter !== 'all') {
      rows = rows.filter((r) => r.bucket === bucketFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.batchCode.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [aging, bucketFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedRecords = filteredRecords.slice(pageStart, pageEnd);

  // Reset to page 1 whenever filters change the result set
  useEffect(() => {
    setPage(1);
  }, [category, bucketFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Stock Aging</h1>
                <p className="text-xs text-white/50 hidden sm:block">Days-in-stock buckets per batch (FIFO basis)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {([
            { key: 'all', label: 'All categories' },
            { key: 'fish', label: 'Fish' },
            { key: 'tank', label: 'Tanks' },
            { key: 'accessory', label: 'Accessories' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setCategory(opt.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                category === opt.key
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                  : 'bg-secondary/40 border-white/10 text-white/70 hover:text-white hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Headline KPIs */}
        {aging && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Batches</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{aging.totals.batches}</p>
              <p className="text-xs text-white/50 mt-0.5">{aging.totals.units} units in stock</p>
            </div>

            <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Hourglass className="w-4 h-4 text-info" />
                </div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Avg age</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{aging.totals.avgAgeDays}<span className="text-sm text-white/50 ml-1">d</span></p>
              <p className="text-xs text-white/50 mt-0.5">Across all live batches</p>
            </div>

            <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-warning" />
                </div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Oldest</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{aging.totals.oldestAgeDays}<span className="text-sm text-white/50 ml-1">d</span></p>
              <p className="text-xs text-white/50 mt-0.5">Single batch high-water mark</p>
            </div>

            <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-success" />
                </div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Retail value</span>
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(aging.totals.retailValue)}</p>
              <p className="text-xs text-white/50 mt-0.5">Cost basis {formatCurrency(aging.totals.costValue)}</p>
            </div>
          </div>
        )}

        {/* Aging buckets */}
        {aging && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-white">Buckets</h2>
              <p className="text-xs text-white/50">Tap to filter</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                onClick={() => setBucketFilter('all')}
                className={`text-left p-3 rounded-xl border transition-all ${
                  bucketFilter === 'all'
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-secondary/40 border-white/10 hover:border-white/20'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1">All ages</p>
                <p className="text-xl font-bold text-white tabular-nums">{aging.totals.batches}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{aging.totals.units} units · {formatCurrency(aging.totals.retailValue)}</p>
              </button>

              {aging.summary.map((b) => {
                const theme = bucketTheme[b.key as BucketKey];
                const isActive = bucketFilter === b.key;
                const pct = aging.totals.batches > 0 ? (b.batches / aging.totals.batches) * 100 : 0;
                return (
                  <button
                    key={b.key}
                    onClick={() => setBucketFilter(b.key as BucketKey)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isActive ? 'bg-white/[0.06] border-white/30' : 'bg-secondary/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${theme.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        {theme.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50">{b.label}</p>
                    <p className="text-xl font-bold text-white tabular-nums mt-0.5">{b.batches}</p>
                    <p className="text-[10px] text-white/50">{b.units} units · {formatCurrency(b.retailValue)}</p>
                    <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full ${theme.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product or batch code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-secondary/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          )}
        </div>

        {/* Batch list */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-white">Batches by age</h2>
            <p className="text-xs text-white/50">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'batch' : 'batches'}
              {bucketFilter !== 'all' ? ` · ${bucketTheme[bucketFilter].label.toLowerCase()}` : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-white/60">Calculating stock aging...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card variant="modern" padding="lg" className="text-center border border-white/10">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-xl font-bold text-white mb-2">No batches in view</h3>
              <p className="text-xs sm:text-sm text-white/60">
                {searchQuery || bucketFilter !== 'all' || category !== 'all'
                  ? 'Try a different bucket, category, or search term.'
                  : 'There are no live batches with current quantity > 0.'}
              </p>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-secondary/60">
                          <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Product</th>
                          <th className="text-left px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Batch</th>
                          <th className="text-left px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Received</th>
                          <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Age</th>
                          <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Bucket</th>
                          <th className="text-right px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Qty</th>
                          <th className="text-right px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Cost</th>
                          <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Retail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pagedRecords.map((record) => {
                          const theme = bucketTheme[record.bucket as BucketKey];
                          return (
                            <tr
                              key={record._id}
                              className={`hover:bg-white/[0.03] transition-colors border-l-4 ${theme.row} cursor-pointer`}
                              onClick={() => router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName)}`)}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0 flex items-center justify-center">
                                    {record.productImage ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={record.productImage} alt={record.productName} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package className="w-4 h-4 text-white/30" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-white truncate max-w-[220px]">{record.productName}</p>
                                    <p className="text-[10px] text-white/40 capitalize">{record.category}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <span className="inline-block px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70 font-mono text-[10px]">
                                  {record.batchCode}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-white/70 text-xs">{formatDate(record.receivedDate)}</td>
                              <td className="px-3 py-4 text-center">
                                <span className={`text-sm font-semibold tabular-nums ${theme.text}`}>{record.ageDays}<span className="text-[10px] text-white/40 ml-0.5">d</span></span>
                              </td>
                              <td className="px-3 py-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${theme.chip}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                  {theme.label}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-right">
                                <span className="text-white font-semibold tabular-nums">{record.currentQty}</span>
                                <span className="text-white/40 text-[10px] ml-1">/ {record.initialQty}</span>
                              </td>
                              <td className="px-3 py-4 text-right text-white/70 text-xs tabular-nums">
                                {record.unitCost > 0 ? formatCurrency(record.costValue) : '—'}
                              </td>
                              <td className="px-5 py-4 text-right text-white font-semibold tabular-nums">
                                {record.unitPrice > 0 ? formatCurrency(record.retailValue) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {pagedRecords.map((record) => {
                  const theme = bucketTheme[record.bucket as BucketKey];
                  return (
                    <Card
                      key={record._id}
                      variant="modern"
                      padding="none"
                      className={`border border-white/10 overflow-hidden border-l-4 ${theme.row}`}
                    >
                      <button
                        onClick={() => router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName)}`)}
                        className="w-full p-3 text-left active:scale-[0.99] transition-transform"
                      >
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center flex-shrink-0">
                            {record.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={record.productImage} alt={record.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-white/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-white text-sm truncate">{record.productName}</p>
                              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${theme.chip}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                {theme.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 truncate font-mono mb-2">Batch · {record.batchCode}</p>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] text-white/40">Age</p>
                                <p className={`text-sm font-bold tabular-nums ${theme.text}`}>{record.ageDays}<span className="text-[10px] text-white/40 ml-0.5">d</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/40">Qty</p>
                                <p className="text-sm font-bold text-white tabular-nums">{record.currentQty}<span className="text-[10px] text-white/40 ml-0.5">/ {record.initialQty}</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/40">Retail</p>
                                <p className="text-sm font-semibold text-white tabular-nums">
                                  {record.unitPrice > 0 ? formatCurrency(record.retailValue) : '—'}
                                </p>
                              </div>
                            </div>

                            <p className="text-[10px] text-white/40 mt-2">Received {formatDate(record.receivedDate)}</p>
                          </div>
                        </div>
                      </button>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-white/50">
                  Showing <span className="text-white font-medium tabular-nums">{filteredRecords.length === 0 ? 0 : pageStart + 1}</span>
                  –<span className="text-white font-medium tabular-nums">{Math.min(pageEnd, filteredRecords.length)}</span>
                  {' '}of <span className="text-white font-medium tabular-nums">{filteredRecords.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-2 rounded-lg bg-secondary/60 border border-white/10 text-white/80 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 rounded-lg bg-secondary/60 border border-white/10 text-xs font-semibold text-white tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-2 rounded-lg bg-secondary/60 border border-white/10 text-white/80 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNavbar />

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function StockAgingPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <StockAgingContent />
    </SafeAreaProvider>
  );
}
