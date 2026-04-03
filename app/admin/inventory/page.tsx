'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Activity,
  AlertTriangle,
  X,
  MoreVertical,
  PackagePlus,
  ChevronDown,
  Minus,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function InventoryContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'depleted' | 'low_stock' | 'expired' | 'quarantine'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Add Batch modal state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restockQuality, setRestockQuality] = useState<'premium' | 'standard' | 'budget'>('standard');
  const [isRestocking, setIsRestocking] = useState(false);

  // Adjust Stock modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustRecordId, setAdjustRecordId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch real data from Convex
  const stockRecords = useQuery(api.services.stock.getStockRecords, {});
  const stockSummary = useQuery(api.services.stock.getStockSummary);
  const lowStockAlerts = useQuery(api.services.stock.getLowStockAlerts, { threshold: 10 });
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  // Mutations
  const restockProduct = useMutation(api.services.stock.restockProduct);
  const adjustStock = useMutation(api.services.stock.adjustStock);

  // Filter stock records
  const filteredRecords = useMemo(() => {
    if (!stockRecords) return [];

    let filtered = stockRecords.filter(r => !r.isMortalityLoss);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.productName?.toLowerCase().includes(query) ||
        record.batchCode.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(r => r.status === 'active' && r.currentQty > 10);
        break;
      case 'depleted':
        filtered = filtered.filter(r => r.status === 'depleted' || r.currentQty === 0);
        break;
      case 'low_stock':
        filtered = filtered.filter(r => r.status === 'active' && r.currentQty > 0 && r.currentQty <= 10);
        break;
      case 'expired':
        filtered = filtered.filter(r => r.status === 'expired');
        break;
      case 'quarantine':
        filtered = filtered.filter(r => r.status === 'quarantine');
        break;
    }

    return filtered;
  }, [stockRecords, searchQuery, selectedFilter]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    if (!stockRecords) return { all: 0, active: 0, depleted: 0, low_stock: 0, expired: 0, quarantine: 0 };
    const nonMortality = stockRecords.filter(r => !r.isMortalityLoss);
    return {
      all: nonMortality.length,
      active: nonMortality.filter(r => r.status === 'active' && r.currentQty > 10).length,
      depleted: nonMortality.filter(r => r.status === 'depleted' || r.currentQty === 0).length,
      low_stock: nonMortality.filter(r => r.status === 'active' && r.currentQty > 0 && r.currentQty <= 10).length,
      expired: nonMortality.filter(r => r.status === 'expired').length,
      quarantine: nonMortality.filter(r => r.status === 'quarantine').length,
    };
  }, [stockRecords]);

  // Handle restock submit
  const handleRestock = async () => {
    if (!selectedProductId || !restockQuantity) return;

    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    setIsRestocking(true);
    try {
      await restockProduct({
        productId: selectedProductId as Id<"products">,
        quantity,
        notes: restockNotes || undefined,
        qualityGrade: restockQuality,
      });

      setShowAddBatch(false);
      setSelectedProductId('');
      setRestockQuantity('');
      setRestockNotes('');
      setRestockQuality('standard');
    } catch (error) {
      console.error('Restock failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to restock');
    } finally {
      setIsRestocking(false);
    }
  };

  // Handle adjust stock submit
  const handleAdjustStock = async () => {
    if (!adjustRecordId || !adjustQuantity || !adjustReason.trim()) return;

    const quantityChange = parseInt(adjustQuantity);
    if (isNaN(quantityChange) || quantityChange === 0) return;

    setIsAdjusting(true);
    try {
      await adjustStock({
        stockRecordId: adjustRecordId as Id<"stockRecords">,
        quantityChange,
        reason: adjustReason,
      });

      setShowAdjustModal(false);
      setAdjustRecordId(null);
      setAdjustQuantity('');
      setAdjustReason('');
    } catch (error) {
      console.error('Adjust stock failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to adjust stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  const isLoading = stockRecords === undefined || stockSummary === undefined;

  // Helper to get status badge classes and label
  const getStatusBadge = (record: { status: string; currentQty: number }) => {
    const isLowStock = record.currentQty > 0 && record.currentQty <= 10;
    const isDepleted = record.currentQty === 0 || record.status === 'depleted';

    if (isDepleted) {
      return { label: 'Depleted', className: 'bg-error/10 text-error border border-error/30' };
    }
    if (isLowStock) {
      return { label: 'Low Stock', className: 'bg-warning/10 text-warning border border-warning/30' };
    }
    if (record.status === 'quarantine') {
      return { label: 'Quarantine', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' };
    }
    if (record.status === 'expired') {
      return { label: 'Expired', className: 'bg-orange-500/10 text-orange-400 border border-orange-500/30' };
    }
    return { label: record.status.charAt(0).toUpperCase() + record.status.slice(1), className: 'bg-success/10 text-success border border-success/30' };
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Inventory Management</h1>
                <p className="text-xs sm:text-sm text-white/60 hidden xs:block truncate">Track batches and stock activities</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddBatch(true)}
              className="px-3 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation flex items-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Stock</span>
            </button>
          </div>

          {/* Quick Nav */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => router.push('/admin/inventory/movements')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-xs sm:text-sm font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation flex items-center justify-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Movements</span>
            </button>
            <button
              onClick={() => router.push('/admin/inventory/expiring')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-xs sm:text-sm font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Alerts</span>
            </button>
          </div>

          {/* Low Stock Alert Banner */}
          {lowStockAlerts && lowStockAlerts.length > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs sm:text-sm text-warning font-medium">
                {lowStockAlerts.length} item{lowStockAlerts.length > 1 ? 's' : ''} with low stock
              </p>
            </div>
          )}

          {/* Summary Stats */}
          {stockSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10">
                <p className="text-[10px] sm:text-xs text-white/40">Total Batches</p>
                <p className="text-sm sm:text-lg font-bold text-white">{stockSummary.totalRecords}</p>
              </div>
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10">
                <p className="text-[10px] sm:text-xs text-white/40">Active</p>
                <p className="text-sm sm:text-lg font-bold text-success">{stockSummary.activeRecords}</p>
              </div>
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10">
                <p className="text-[10px] sm:text-xs text-white/40">Total Stock</p>
                <p className="text-sm sm:text-lg font-bold text-white">{stockSummary.totalCurrentQty}</p>
              </div>
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10">
                <p className="text-[10px] sm:text-xs text-white/40">Total Value</p>
                <p className="text-sm sm:text-lg font-bold text-primary">{formatCurrency(stockSummary.totalValue)}</p>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search batches, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 bg-secondary/60 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 active:scale-95 touch-manipulation ${
                showFilters || selectedFilter !== 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
              {selectedFilter !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-medium text-white">Filter by Status</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors sm:hidden touch-manipulation"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { key: 'all', label: 'All Batches', count: filterCounts.all },
                { key: 'active', label: 'Active', count: filterCounts.active },
                { key: 'low_stock', label: 'Low Stock', count: filterCounts.low_stock },
                { key: 'depleted', label: 'Depleted', count: filterCounts.depleted },
                { key: 'expired', label: 'Expired', count: filterCounts.expired },
                { key: 'quarantine', label: 'Quarantine', count: filterCounts.quarantine },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as typeof selectedFilter)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm border flex items-center gap-2 transition-all active:scale-95 touch-manipulation whitespace-nowrap ${
                    selectedFilter === filter.key
                      ? 'bg-primary border-primary text-white'
                      : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                  }`}
                >
                  <span>{filter.label}</span>
                  <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    selectedFilter === filter.key
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {filter.count}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batch List */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Inventory Batches <span className="text-white/60">({filteredRecords.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading inventory data...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-2">No batches found</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4">
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Add your first batch to start tracking inventory.'}
            </p>
            <button
              onClick={() => setShowAddBatch(true)}
              className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
            >
              Add First Batch
            </button>
          </Card>
        ) : (
          <>
            {/* ============ DESKTOP TABLE (sm and up) ============ */}
            <div className="hidden sm:block">
              <div className="bg-secondary/40 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Product</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Batch Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider min-w-[160px]">Stock Level</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Reserved</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Sold</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Mortality</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Value</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRecords.map((record) => {
                        const stockPercentage = record.initialQty > 0 ? (record.currentQty / record.initialQty) * 100 : 0;
                        const isLowStock = record.currentQty > 0 && record.currentQty <= 10;
                        const isDepleted = record.currentQty === 0 || record.status === 'depleted';
                        const badge = getStatusBadge(record);
                        const stockValue = record.productPrice ? record.currentQty * record.productPrice : 0;

                        return (
                          <tr
                            key={record._id}
                            className={`hover:bg-white/5 transition-colors ${
                              isLowStock ? 'bg-warning/5' : isDepleted ? 'bg-error/5' : ''
                            }`}
                          >
                            {/* Product (Image + Name) */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0 flex items-center justify-center">
                                  {record.productImage ? (
                                    <img
                                      src={record.productImage}
                                      alt={record.productName || 'Product'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-white/30" />
                                  )}
                                </div>
                                <span className="font-medium text-white truncate max-w-[180px]">
                                  {record.productName || 'Unknown Product'}
                                </span>
                              </div>
                            </td>

                            {/* Batch Code */}
                            <td className="px-4 py-3">
                              <span className="text-white/70 font-mono text-xs">{record.batchCode}</span>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-3">
                              <span className="text-white/70 capitalize">{record.category}</span>
                            </td>

                            {/* Stock Level with progress bar */}
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-white font-medium">{record.currentQty}</span>
                                  <span className="text-white/40 text-xs">/ {record.initialQty}</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      stockPercentage < 20
                                        ? 'bg-error'
                                        : stockPercentage < 50
                                        ? 'bg-warning'
                                        : 'bg-success'
                                    }`}
                                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Reserved */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-white/70">{record.reservedQty}</span>
                            </td>

                            {/* Sold */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-primary font-medium">{record.soldQty}</span>
                            </td>

                            {/* Mortality */}
                            <td className="px-4 py-3 text-center">
                              <span className={record.mortalityLossQty > 0 ? 'text-error font-medium' : 'text-white/70'}>
                                {record.mortalityLossQty}
                              </span>
                            </td>

                            {/* Value */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-white font-medium">
                                {record.productPrice ? formatCurrency(stockValue) : '--'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-center">
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === record._id ? null : record._id)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
                                >
                                  <MoreVertical className="w-4 h-4 text-white/60" />
                                </button>
                                {openMenuId === record._id && (
                                  <div className="absolute right-0 top-8 w-44 bg-secondary border border-white/10 rounded-lg shadow-xl z-20">
                                    <button
                                      onClick={() => {
                                        setAdjustRecordId(record._id);
                                        setShowAdjustModal(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 rounded-t-lg"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                      Adjust Stock
                                    </button>
                                    <button
                                      onClick={() => {
                                        router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName || '')}`);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 rounded-b-lg"
                                    >
                                      <Activity className="w-3.5 h-3.5" />
                                      Activity Log
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ============ MOBILE CARDS (below sm) ============ */}
            <div className="sm:hidden space-y-3">
              {filteredRecords.map((record) => {
                const stockPercentage = record.initialQty > 0 ? (record.currentQty / record.initialQty) * 100 : 0;
                const isLowStock = record.currentQty > 0 && record.currentQty <= 10;
                const isDepleted = record.currentQty === 0 || record.status === 'depleted';
                const badge = getStatusBadge(record);

                return (
                  <Card
                    key={record._id}
                    variant="modern"
                    padding="none"
                    className={`border overflow-hidden ${
                      isLowStock ? 'border-warning/30' : isDepleted ? 'border-error/30' : 'border-white/10'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
                            {record.productImage ? (
                              <img
                                src={record.productImage}
                                alt={record.productName || 'Product'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-white/30" />
                            )}
                          </div>
                        </div>

                        {/* Batch Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-white text-sm truncate">
                                {record.productName || 'Unknown Product'}
                              </h3>
                              <p className="text-xs text-white/60 truncate">
                                Batch: {record.batchCode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </div>
                              {/* Action Menu */}
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === record._id ? null : record._id)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                                >
                                  <MoreVertical className="w-4 h-4 text-white/60" />
                                </button>
                                {openMenuId === record._id && (
                                  <div className="absolute right-0 top-8 w-40 bg-secondary border border-white/10 rounded-lg shadow-xl z-20">
                                    <button
                                      onClick={() => {
                                        setAdjustRecordId(record._id);
                                        setShowAdjustModal(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                      Adjust Stock
                                    </button>
                                    <button
                                      onClick={() => {
                                        router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName || '')}`);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                    >
                                      <Activity className="w-3.5 h-3.5" />
                                      Activity Log
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stock Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-white/60">Stock Level</span>
                              <span className="text-xs font-medium text-white">
                                {record.currentQty} / {record.initialQty}
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  stockPercentage < 20
                                    ? 'bg-error'
                                    : stockPercentage < 50
                                    ? 'bg-warning'
                                    : 'bg-success'
                                }`}
                                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Batch Details Grid */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <p className="text-[10px] text-white/40">Category</p>
                              <p className="text-xs font-medium text-white capitalize">{record.category}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/40">Reserved</p>
                              <p className="text-xs font-medium text-white">{record.reservedQty}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/40">Sold</p>
                              <p className="text-xs font-medium text-primary">{record.soldQty}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/40">Mortality</p>
                              <p className={`text-xs font-medium ${record.mortalityLossQty > 0 ? 'text-error' : 'text-white'}`}>
                                {record.mortalityLossQty}
                              </p>
                            </div>
                          </div>

                          {/* Second row details */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {record.productPrice && (
                              <div>
                                <p className="text-[10px] text-white/40">Unit Price</p>
                                <p className="text-xs font-medium text-white">
                                  {formatCurrency(record.productPrice)}
                                </p>
                              </div>
                            )}
                            {record.productPrice && (
                              <div>
                                <p className="text-[10px] text-white/40">Stock Value</p>
                                <p className="text-xs font-medium text-white">
                                  {formatCurrency(record.currentQty * record.productPrice)}
                                </p>
                              </div>
                            )}
                            {record.qualityGrade && (
                              <div>
                                <p className="text-[10px] text-white/40">Quality</p>
                                <p className="text-xs font-medium text-white capitalize">{record.qualityGrade}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-white/40">Received</p>
                              <p className="text-xs font-medium text-white">
                                {formatDate(record.receivedDate)}
                              </p>
                            </div>
                          </div>

                          {/* Expiry warning */}
                          {record.expiryDate && record.expiryDate > Date.now() && (
                            (() => {
                              const daysLeft = Math.floor((record.expiryDate - Date.now()) / (24 * 60 * 60 * 1000));
                              if (daysLeft <= 30) {
                                return (
                                  <div className="mb-3 px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                                    <span className="text-xs text-orange-400">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                              onClick={() => router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName || '')}`)}
                              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors touch-manipulation"
                            >
                              <Activity className="w-4 h-4" />
                              <span>View Activity Log</span>
                            </button>

                            <button
                              onClick={() => {
                                setAdjustRecordId(record._id);
                                setShowAdjustModal(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
                            >
                              Adjust
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Click outside to close menus */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Add Batch / Restock Modal */}
      {showAddBatch && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowAddBatch(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t border-white/10 rounded-t-3xl shadow-2xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-center pt-2 pb-4">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Add New Stock</h3>
              <p className="text-sm text-white/60 mb-4">Restock an existing product with a new batch.</p>

              <div className="space-y-4">
                {/* Product Selector */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Product</label>
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-3 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a product...</option>
                      {products?.filter(p => p.isActive).map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} (Stock: {product.stock})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    placeholder="Enter quantity..."
                    min="1"
                    className="w-full px-3 py-3 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Quality Grade */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Quality Grade</label>
                  <div className="flex gap-2">
                    {(['premium', 'standard', 'budget'] as const).map((grade) => (
                      <button
                        key={grade}
                        onClick={() => setRestockQuality(grade)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all active:scale-95 capitalize ${
                          restockQuality === grade
                            ? 'bg-primary border-primary text-white'
                            : 'bg-background/60 border-white/10 text-white/70 hover:border-primary/30'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Notes (optional)</label>
                  <textarea
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="Supplier name, batch details..."
                    rows={2}
                    className="w-full px-3 py-3 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddBatch(false)}
                    className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestock}
                    disabled={!selectedProductId || !restockQuantity || isRestocking}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRestocking ? 'Adding...' : 'Add Stock'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustRecordId && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => { setShowAdjustModal(false); setAdjustRecordId(null); }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t border-white/10 rounded-t-3xl shadow-2xl p-4 sm:p-6">
              <div className="flex justify-center pt-2 pb-4">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Adjust Stock</h3>
              <p className="text-sm text-white/60 mb-4">
                Use positive numbers to increase, negative to decrease.
              </p>

              {(() => {
                const record = stockRecords?.find(r => r._id === adjustRecordId);
                if (!record) return null;
                return (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-background/40 border border-white/10">
                    <p className="text-sm font-medium text-white">{record.productName}</p>
                    <p className="text-xs text-white/60">Batch: {record.batchCode} | Current: {record.currentQty}</p>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Quantity Change</label>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="e.g. -5 or +10"
                    className="w-full px-3 py-3 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Reason</label>
                  <textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Reason for adjustment..."
                    rows={2}
                    className="w-full px-3 py-3 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowAdjustModal(false); setAdjustRecordId(null); }}
                    className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjustStock}
                    disabled={!adjustQuantity || !adjustReason.trim() || isAdjusting}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdjusting ? 'Adjusting...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <InventoryContent />
    </SafeAreaProvider>
  );
}
