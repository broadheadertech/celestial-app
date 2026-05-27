'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  X,
  MoreVertical,
  PackagePlus,
  ChevronDown,
  Minus,
  ArrowRightLeft,
  Clock,
  Hourglass,
  Trash2,
  Barcode,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Fish as FishIcon,
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
  return new Date(timestamp).toLocaleDateString('en-PH', {
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Success feedback
  const [successMessage, setSuccessMessage] = useState('');
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000); };

  // Add Batch modal state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockActualCost, setRestockActualCost] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restockQuality, setRestockQuality] = useState<'premium' | 'standard' | 'budget'>('standard');
  const [isRestocking, setIsRestocking] = useState(false);

  // Adjust Stock modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustRecordId, setAdjustRecordId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Delete product confirm modal state
  const [deleteCandidate, setDeleteCandidate] = useState<{ productId: string; productName: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

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
  const deleteProductMutation = useMutation(api.services.admin.deleteProduct);
  const cleanupOrphans = useMutation(api.services.admin.cleanupOrphanedRecords);

  // Orphan detection — stockRecords whose product lookup failed during enrichment
  // (productName comes back undefined when ctx.db.get(productId) returns null).
  const orphanCount = useMemo(
    () => (stockRecords ?? []).filter(r => !r.productName).length,
    [stockRecords]
  );

  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const [showOrphanConfirm, setShowOrphanConfirm] = useState(false);
  const handleCleanupOrphans = async () => {
    setIsCleaningOrphans(true);
    try {
      const r = await cleanupOrphans({});
      setShowOrphanConfirm(false);
      const parts = [
        r.removedBatches && `${r.removedBatches} batch${r.removedBatches === 1 ? '' : 'es'}`,
        r.removedMovements && `${r.removedMovements} movement${r.removedMovements === 1 ? '' : 's'}`,
        r.removedFish && `${r.removedFish} fish`,
        r.removedTank && `${r.removedTank} tank`,
        r.removedCart && `${r.removedCart} cart`,
        r.removedWishlist && `${r.removedWishlist} wishlist`,
      ].filter(Boolean);
      showSuccess(parts.length > 0 ? `Cleaned up ${parts.join(', ')}.` : 'No orphans found — already clean.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cleanup failed');
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  // Aggregate sold/reserved across all batches per product — gates Delete menu visibility.
  // A product is deletable only if every batch shows zero sold AND zero reserved.
  const productActivityMap = useMemo(() => {
    const map = new Map<string, { sold: number; reserved: number }>();
    for (const r of stockRecords ?? []) {
      const cur = map.get(r.productId) ?? { sold: 0, reserved: 0 };
      cur.sold += r.soldQty || 0;
      cur.reserved += r.reservedQty || 0;
      map.set(r.productId, cur);
    }
    return map;
  }, [stockRecords]);

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

  // ─── Catalog (product-centric) computations ───
  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive),
    [products],
  );

  // Per-category chips (only categories that have at least one active product).
  const catalogCategoryChips = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const p of activeProducts) {
      const id = p.categoryId as string;
      const name = p.categoryName || 'Uncategorized';
      const ex = m.get(id);
      if (ex) ex.count += 1;
      else m.set(id, { id, name, count: 1 });
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeProducts]);

  // Distinguish "live" (fish/livestock) categories vs "gear" by name heuristic.
  const isLiveCategory = (name?: string) => {
    const n = (name || '').toLowerCase();
    return n.includes('fish') || n.includes('arowana') || n.includes('shrimp') || n.includes('livestock');
  };

  // 4 catalog KPIs.
  const catalogKpis = useMemo(() => {
    const live = activeProducts.filter((p) => isLiveCategory(p.categoryName));
    const gear = activeProducts.filter((p) => !isLiveCategory(p.categoryName));
    const livestockValue = live.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
    const gearValue = gear.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
    const liveCount = live.reduce((s, p) => s + (p.stock || 0), 0);
    const tanks = new Set<string>();
    for (const p of live) {
      if (p.tankNumber) tanks.add(p.tankNumber);
    }
    const critical = activeProducts.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
    const criticalNames = critical.slice(0, 3).map((p) => p.name).join(' · ');
    return {
      liveCount,
      tankCount: tanks.size,
      livestockValue,
      gearValue,
      criticalCount: critical.length,
      criticalNames,
    };
  }, [activeProducts]);

  // Filtered catalog (Grid view).
  const catalogProducts = useMemo(() => {
    let list = activeProducts;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => (p.categoryId as string) === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.sku || '').toLowerCase().includes(q) ||
          (p.tankNumber || '').toLowerCase().includes(q) ||
          (p.certificate || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeProducts, selectedCategory, searchQuery]);

  // Handle restock submit
  const handleRestock = async () => {
    if (!selectedProductId || !restockQuantity) return;

    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    // Actual cost is REQUIRED — every batch must declare what it actually cost so
    // P&L COGS (FIFO) reflects real acquisition prices.
    const actualCostNum = parseFloat(restockActualCost);
    if (restockActualCost.trim() === '' || isNaN(actualCostNum) || actualCostNum < 0) {
      alert('Enter the actual cost per unit for this batch.');
      return;
    }
    const actualCostPrice = actualCostNum;

    setIsRestocking(true);
    try {
      const result = await restockProduct({
        productId: selectedProductId as Id<"products">,
        quantity,
        notes: restockNotes || undefined,
        qualityGrade: restockQuality,
        actualCostPrice,
      });

      setShowAddBatch(false);
      setSelectedProductId('');
      setRestockQuantity('');
      setRestockActualCost('');
      setRestockNotes('');
      setRestockQuality('standard');

      const macMsg = result?.movingAverageCost !== undefined
        ? ` · MAC now ₱${result.movingAverageCost.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
        : '';
      showSuccess(`Restocked ${quantity} units${macMsg}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to restock');
    } finally {
      setIsRestocking(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!deleteCandidate) return;
    setIsDeletingProduct(true);
    try {
      const result = await deleteProductMutation({
        id: deleteCandidate.productId as Id<"products">,
      });
      setDeleteCandidate(null);
      showSuccess(result?.message || 'Product deleted');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setIsDeletingProduct(false);
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
      showSuccess('Stock adjusted successfully');
    } catch (error) {
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

  const totalActiveSkus = activeProducts.length;

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Catalog header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="label-eyebrow">Catalog · {totalActiveSkus} SKUs</p>
            <h1
              className="display mt-1"
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontVariationSettings: '"opsz" 48, "wght" 700' }}
            >
              Inventory
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              title="Print labels — coming soon"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border text-sm font-semibold opacity-60 cursor-not-allowed"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            >
              <Barcode className="w-4 h-4" />
              Print labels
            </button>
            <button
              onClick={() => router.push('/admin/inventory/aging')}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-sm font-semibold"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              <Hourglass className="w-4 h-4" />
              Aging
            </button>
            <button
              onClick={() => router.push('/admin/inventory/movements')}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-sm font-semibold"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Movements
            </button>
            <button
              onClick={() => setShowAddBatch(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border text-sm font-bold"
              style={{
                background: 'var(--red)',
                borderColor: 'var(--red-deep)',
                color: 'oklch(0.99 0 0)',
              }}
            >
              <Plus className="w-4 h-4" />
              Receive shipment
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Orphaned Records Banner */}
        {orphanCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-error/10 to-error/5 border border-error/30">
            <div className="w-9 h-9 rounded-lg bg-error/20 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-error" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-error">
                {orphanCount} orphaned batch{orphanCount === 1 ? '' : 'es'} ("Unknown Product")
              </p>
              <p className="text-xs text-error/70 truncate">Stock records pointing to deleted products. Safe to remove.</p>
            </div>
            <button
              onClick={() => setShowOrphanConfirm(true)}
              disabled={isCleaningOrphans}
              className="px-3 py-1.5 rounded-lg bg-error/20 hover:bg-error/30 text-error text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Clean Up
            </button>
          </div>
        )}

        {/* Low Stock Alert Banner */}
        {lowStockAlerts && lowStockAlerts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/30">
            <div className="w-9 h-9 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">
                {lowStockAlerts.length} batch{lowStockAlerts.length > 1 ? 'es' : ''} running low
              </p>
              <p className="text-xs text-warning/70">Review the Alerts page for details</p>
            </div>
            <button
              onClick={() => router.push('/admin/inventory/expiring')}
              className="px-3 py-1.5 rounded-lg bg-warning/20 hover:bg-warning/30 text-warning text-xs font-semibold transition-colors"
            >
              View
            </button>
          </div>
        )}

        {/* Catalog KPI strip (Dragon's Cave) */}
        {products && (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
          >
            <CatalogKpi
              label="Live arowanas"
              value={String(catalogKpis.liveCount)}
              sub={`Across ${catalogKpis.tankCount} holding tank${catalogKpis.tankCount === 1 ? '' : 's'}`}
              accent="ink"
            />
            <CatalogKpi
              label="Livestock value"
              value={formatShort(catalogKpis.livestockValue)}
              sub="At retail"
              accent="jade"
            />
            <CatalogKpi
              label="Gear value"
              value={formatShort(catalogKpis.gearValue)}
              sub="Tanks, filtration, feed"
              accent="ink"
            />
            <CatalogKpi
              label="Critical stock"
              value={String(catalogKpis.criticalCount)}
              sub={catalogKpis.criticalNames || 'All stock healthy'}
              accent={catalogKpis.criticalCount > 0 ? 'red' : 'ink'}
            />
          </div>
        )}

        {/* Search + Grid/List toggle */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--ink-4)' }}
            />
            <input
              type="text"
              placeholder="Name, SKU, microchip ID, CITES…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-11 py-3 rounded-[12px] border text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-2)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80"
                style={{ color: 'var(--ink-4)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div
            className="inline-flex p-[3px] gap-[2px] rounded-[10px] border flex-shrink-0"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="px-3 py-2 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5"
              style={{
                background: viewMode === 'grid' ? 'var(--surface-hi)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: viewMode === 'grid' ? '0 1px 2px oklch(0 0 0 / 0.2)' : 'none',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-2 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5"
              style={{
                background: viewMode === 'list' ? 'var(--surface-hi)' : 'transparent',
                color: viewMode === 'list' ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: viewMode === 'list' ? '0 1px 2px oklch(0 0 0 / 0.2)' : 'none',
              }}
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>

        {/* Category rail */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <CategoryChip
            label="All"
            count={activeProducts.length}
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {catalogCategoryChips.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              count={c.count}
              active={selectedCategory === c.id}
              onClick={() => setSelectedCategory(c.id)}
            />
          ))}
        </div>

        {/* List-view filter chips (only shown when in list mode) */}
        {viewMode === 'list' && (
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide pb-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'low_stock', label: 'Low stock' },
              { key: 'depleted', label: 'Depleted' },
              { key: 'expired', label: 'Expired' },
              { key: 'quarantine', label: 'Quarantine' },
            ].map((filter) => {
              const count = filterCounts[filter.key as keyof typeof filterCounts];
              const isActive = selectedFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as typeof selectedFilter)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
                  style={{
                    borderColor: isActive ? 'var(--red)' : 'var(--line)',
                    background: isActive ? 'var(--red)' : 'var(--surface)',
                    color: isActive ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
                  }}
                >
                  <span>{filter.label}</span>
                  <span
                    className="dc-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: isActive ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)',
                      color: isActive ? 'oklch(0.99 0 0)' : 'var(--ink-3)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ============ GRID VIEW (catalog cards) ============ */}
        {viewMode === 'grid' && (
          <div>
            {catalogProducts.length === 0 ? (
              <Card variant="modern" padding="lg" className="text-center border border-white/10">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" style={{ color: 'var(--ink-4)' }} />
                <h3 className="display text-lg mb-2" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>
                  No products match
                </h3>
                <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Clear filters or try a different category.'
                    : 'Add your first product to start tracking inventory.'}
                </p>
              </Card>
            ) : (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
              >
                {catalogProducts.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    isLive={isLiveCategory(p.categoryName)}
                    onClick={() => router.push(`/admin/product-detail?id=${p._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ LIST VIEW (batch table — original) ============ */}
        {viewMode === 'list' && (
          <div>
        <div className="flex items-end justify-between mb-3 sm:mb-4 gap-3">
          <div className="min-w-0">
            <p className="label-eyebrow">{filteredRecords.length} {filteredRecords.length === 1 ? 'batch' : 'batches'}{selectedFilter !== 'all' ? ` · ${selectedFilter.replace('_', ' ')}` : ''}</p>
            <h2 className="display text-lg sm:text-xl mt-0.5" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>Batches</h2>
          </div>
        </div>
        <div className="caustics-line mb-3 sm:mb-4" />

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
              <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60">
                        <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Product</th>
                        <th className="text-left px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Batch</th>
                        <th className="text-left px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Category</th>
                        <th className="text-left px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider min-w-[180px]">Stock</th>
                        <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Reserved</th>
                        <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Sold</th>
                        <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Loss</th>
                        <th className="text-right px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Value</th>
                        <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Status</th>
                        <th className="text-center px-3 py-3.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRecords.map((record) => {
                        const stockPercentage = record.initialQty > 0 ? (record.currentQty / record.initialQty) * 100 : 0;
                        const isLowStock = record.currentQty > 0 && record.currentQty <= 10;
                        const isDepleted = record.currentQty === 0 || record.status === 'depleted';
                        const badge = getStatusBadge(record);
                        const stockValue = record.productCostPrice ? record.currentQty * record.productCostPrice : 0;

                        return (
                          <tr
                            key={record._id}
                            className={`hover:bg-white/[0.03] transition-colors ${
                              isLowStock ? 'bg-warning/[0.03]' : isDepleted ? 'bg-error/[0.03] opacity-70' : ''
                            }`}
                          >
                            {/* Product (Image + Name) */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0 flex items-center justify-center ring-1 ring-white/5">
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
                                <span className="font-medium text-white truncate max-w-[200px]">
                                  {record.productName || 'Unknown Product'}
                                </span>
                              </div>
                            </td>

                            {/* Batch Code - as pill */}
                            <td className="px-3 py-4">
                              <span className="inline-block px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70 font-mono text-[10px] tracking-tight">
                                {record.batchCode}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="px-3 py-4">
                              <span className="text-white/70 capitalize text-xs">{record.category}</span>
                            </td>

                            {/* Stock Level with progress bar */}
                            <td className="px-3 py-4">
                              <div className="space-y-1.5">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-white font-bold text-sm">{record.currentQty}</span>
                                  <span className="text-white/40 text-[10px]">of {record.initialQty}</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 rounded-full ${
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
                            <td className="px-3 py-4 text-center">
                              <span className={`text-sm ${record.reservedQty > 0 ? 'text-warning font-medium' : 'text-white/30'}`}>
                                {record.reservedQty || '—'}
                              </span>
                            </td>

                            {/* Sold */}
                            <td className="px-3 py-4 text-center">
                              <span className={`text-sm ${record.soldQty > 0 ? 'text-primary font-semibold' : 'text-white/30'}`}>
                                {record.soldQty || '—'}
                              </span>
                            </td>

                            {/* Mortality */}
                            <td className="px-3 py-4 text-center">
                              <span className={`text-sm ${record.mortalityLossQty > 0 ? 'text-error font-semibold' : 'text-white/30'}`}>
                                {record.mortalityLossQty || '—'}
                              </span>
                            </td>

                            {/* Value */}
                            <td className="px-3 py-4 text-right">
                              <span className="text-white font-semibold text-sm" title="Stock value at cost">
                                {record.productCostPrice ? formatCurrency(stockValue) : '—'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-4 text-center">
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === record._id ? null : record._id)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
                                >
                                  <MoreVertical className="w-4 h-4 text-white/60" />
                                </button>
                                {openMenuId === record._id && (() => {
                                  const activity = productActivityMap.get(record.productId);
                                  const canDelete = (activity?.sold ?? 0) === 0 && (activity?.reserved ?? 0) === 0;
                                  return (
                                    <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                                      <button
                                        onClick={() => {
                                          setAdjustRecordId(record._id);
                                          setShowAdjustModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                        Adjust Stock
                                      </button>
                                      <button
                                        onClick={() => {
                                          router.push(`/admin/inventory/activity_log?productId=${record.productId}&productName=${encodeURIComponent(record.productName || '')}`);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                      >
                                        <Activity className="w-3.5 h-3.5" />
                                        Activity Log
                                      </button>
                                      {canDelete && (
                                        <button
                                          onClick={() => {
                                            setDeleteCandidate({ productId: record.productId, productName: record.productName || 'this product' });
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full px-3 py-2.5 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2 border-t border-white/5"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          Delete Product
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
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
                                {openMenuId === record._id && (() => {
                                  const activity = productActivityMap.get(record.productId);
                                  const canDelete = (activity?.sold ?? 0) === 0 && (activity?.reserved ?? 0) === 0;
                                  return (
                                    <div className="absolute right-0 top-8 w-44 bg-secondary border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
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
                                      {canDelete && (
                                        <button
                                          onClick={() => {
                                            setDeleteCandidate({ productId: record.productId, productName: record.productName || 'this product' });
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2 border-t border-white/5"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          Delete Product
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
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
                            {record.productCostPrice ? (
                              <div>
                                <p className="text-[10px] text-white/40">Stock Cost</p>
                                <p className="text-xs font-medium text-white">
                                  {formatCurrency(record.currentQty * record.productCostPrice)}
                                </p>
                              </div>
                            ) : null}
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
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 animate-in slide-in-from-bottom sm:animate-in sm:fade-in duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto sm:w-full sm:max-w-md sm:mx-4">
              <div className="flex justify-center pt-2 pb-4 sm:hidden">
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

                {/* Actual Cost Price for this batch + MAC preview */}
                {(() => {
                  const selected = products?.find((p) => p._id === selectedProductId);
                  if (!selected) return null;
                  const baseCost = selected.costPrice ?? 0;
                  const currentMac =
                    (selected as { movingAverageCost?: number }).movingAverageCost ?? baseCost;
                  const qty = parseInt(restockQuantity) || 0;
                  const actualCostNum = parseFloat(restockActualCost);
                  const hasActual =
                    restockActualCost.trim() !== '' &&
                    !isNaN(actualCostNum) &&
                    actualCostNum >= 0;
                  const projectedMac = hasActual && qty > 0
                    ? selected.stock <= 0
                      ? actualCostNum
                      : ((selected.stock * currentMac) + (qty * actualCostNum)) /
                        (selected.stock + qty)
                    : null;
                  const expenseAmount = hasActual ? actualCostNum * qty : baseCost * qty;
                  return (
                    <div>
                      <label className="block text-sm font-medium text-white mb-1.5">
                        Actual cost / unit <span className="text-error">*</span>{' '}
                        <span className="text-xs text-white/40 font-normal">
                          (what you paid this batch)
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={restockActualCost}
                          onChange={(e) => setRestockActualCost(e.target.value)}
                          placeholder={baseCost > 0 ? `e.g. ${baseCost.toLocaleString('en-PH')} (last basis cost)` : 'e.g. 120.00'}
                          className={`w-full pl-7 pr-3 py-3 bg-background/60 border rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary ${
                            !hasActual ? 'border-error/40' : 'border-white/10'
                          }`}
                        />
                      </div>
                      {qty > 0 && (
                        <div className="mt-2 px-3 py-2 rounded-lg border border-white/10 bg-background/40 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white/50">Expense recorded</span>
                            <span className="font-mono-tabular font-semibold text-white">
                              {formatCurrency(expenseAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Current MAC</span>
                            <span className="font-mono-tabular text-white/80">
                              {formatCurrency(currentMac)}
                            </span>
                          </div>
                          {projectedMac !== null && Math.abs(projectedMac - currentMac) > 0.005 && (
                            <div className="flex justify-between">
                              <span className="text-warning">New MAC after restock</span>
                              <span
                                className="font-mono-tabular font-semibold"
                                style={{ color: 'var(--warning)' }}
                              >
                                {formatCurrency(projectedMac)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {!hasActual && (
                        <p className="text-[10px] text-error/80 mt-1.5">
                          Required — enter what this batch actually cost per unit.
                        </p>
                      )}
                    </div>
                  );
                })()}

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
                    disabled={
                      !selectedProductId ||
                      !restockQuantity ||
                      restockActualCost.trim() === '' ||
                      isNaN(parseFloat(restockActualCost)) ||
                      parseFloat(restockActualCost) < 0 ||
                      isRestocking
                    }
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
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 animate-in slide-in-from-bottom sm:animate-in sm:fade-in duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:w-full sm:max-w-md sm:mx-4">
              <div className="flex justify-center pt-2 pb-4 sm:hidden">
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

      {/* Delete Product Confirm Modal */}
      {deleteCandidate && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => !isDeletingProduct && setDeleteCandidate(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 animate-in slide-in-from-bottom sm:animate-in sm:fade-in duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:w-full sm:max-w-md sm:mx-4">
              <div className="flex justify-center pt-2 pb-4 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error/15 border border-error/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-error" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">Delete product?</h3>
                  <p className="text-sm text-white/70 mt-0.5 truncate">{deleteCandidate.productName}</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="px-3 py-2.5 rounded-lg bg-error/5 border border-error/20 text-xs text-white/80">
                  This permanently removes the product, all its batches, all stock movements, and any fish/tank metadata. <strong className="text-error">This cannot be undone.</strong>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70">
                  Allowed only because this product has <strong className="text-white">no sales</strong> and <strong className="text-white">no reservations</strong>. If history is found server-side, the product will be deactivated instead.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  disabled={isDeletingProduct}
                  className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={isDeletingProduct}
                  className="flex-1 px-4 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 active:scale-95 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingProduct ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cleanup Orphans Confirm Modal */}
      {showOrphanConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => !isCleaningOrphans && setShowOrphanConfirm(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 animate-in slide-in-from-bottom sm:animate-in sm:fade-in duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:w-full sm:max-w-md sm:mx-4">
              <div className="flex justify-center pt-2 pb-4 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error/15 border border-error/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-error" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">Remove orphaned records?</h3>
                  <p className="text-sm text-white/70 mt-0.5">{orphanCount} batch{orphanCount === 1 ? '' : 'es'} will be deleted</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="px-3 py-2.5 rounded-lg bg-error/5 border border-error/20 text-xs text-white/80">
                  This sweeps all <strong>stockRecords</strong>, <strong>stockMovements</strong>, fish/tank metadata, cart, and wishlist rows whose product no longer exists. Cannot be undone.
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70">
                  These show as "Unknown Product" because the product was deleted before today's cascade-cleanup fix.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOrphanConfirm(false)}
                  disabled={isCleaningOrphans}
                  className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all touch-manipulation disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCleanupOrphans}
                  disabled={isCleaningOrphans}
                  className="flex-1 px-4 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 active:scale-95 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCleaningOrphans ? 'Cleaning...' : 'Clean Up'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] animate-in slide-in-from-top duration-300">
          <div className="bg-success/90 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <span>&#10003;</span> {successMessage}
          </div>
        </div>
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

/* ─────────── DRAGON'S CAVE CATALOG HELPERS ─────────── */

function formatShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `₱${m.toFixed(m >= 10 ? 1 : 2)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `₱${k.toFixed(k >= 10 ? 0 : 1)}k`;
  }
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

function CatalogKpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: 'ink' | 'red' | 'jade';
}) {
  const colorMap = {
    ink: 'var(--ink)',
    red: 'var(--red-hi)',
    jade: 'var(--jade)',
  } as const;
  return (
    <div
      className="rounded-[14px] border p-5 min-w-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <p className="label-eyebrow mb-3">{label}</p>
      <p
        className="display dc-mono mb-1"
        style={{
          fontSize: 'clamp(28px, 3.4vw, 36px)',
          fontVariationSettings: '"opsz" 48, "wght" 700',
          letterSpacing: '-0.02em',
          color: colorMap[accent],
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[12px] mt-1.5 truncate" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
      style={{
        borderColor: active ? 'var(--red)' : 'var(--line)',
        background: active ? 'var(--red)' : 'var(--surface)',
        color: active ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
      }}
    >
      <span>{label} · {count}</span>
    </button>
  );
}

function ProductCard({
  product,
  isLive,
  onClick,
}: {
  product: any;
  isLive: boolean;
  onClick: () => void;
}) {
  const stock = product.stock || 0;
  const stockPill =
    stock === 0
      ? { label: 'Sold', bg: 'var(--red-wash)', fg: 'var(--red-hi)' }
      : isLive && stock === 1
      ? { label: 'Single specimen', bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' }
      : stock <= 3
      ? { label: `${stock} left`, bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' }
      : stock <= 10
      ? { label: `${stock} in stock`, bg: 'var(--jade-wash)', fg: 'var(--jade)' }
      : { label: `${stock} in stock`, bg: 'var(--surface-hi)', fg: 'var(--ink-3)' };

  // Live products get a red-tinted hero; gear gets a neutral surface tone.
  const heroFrom = isLive ? 'oklch(0.30 0.14 27)' : 'var(--surface-2)';
  const heroTo = isLive ? 'oklch(0.18 0.08 22)' : 'var(--surface)';
  const fishColor = isLive ? 'oklch(0.62 0.22 27)' : 'var(--ink-4)';

  return (
    <button
      onClick={onClick}
      className="text-left rounded-[14px] border overflow-hidden transition-all hover:-translate-y-[2px]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: '4 / 3',
          background: `linear-gradient(155deg, ${heroFrom}, ${heroTo})`,
        }}
      >
        <div className="scales absolute inset-0 opacity-50" />
        {/* Top metadata strip */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 z-[2]">
          {/* Tank number (left) — substitute for grade badge until schema adds one */}
          {product.tankNumber ? (
            <span
              className="dc-mono inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'oklch(0 0 0 / 0.35)',
                color: 'oklch(0.95 0 0 / 0.85)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {product.tankNumber}
            </span>
          ) : (
            <span className="w-px" />
          )}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: stockPill.bg, color: stockPill.fg }}
          >
            {stockPill.label}
          </span>
        </div>
        {/* Centered fish image or silhouette */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <FishIcon className="w-24 h-24" style={{ color: fishColor }} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <p
          className="dc-mono text-[10px] uppercase tracking-[0.05em] truncate mb-1"
          style={{ color: 'var(--ink-4)' }}
        >
          {product.sku ? `#${product.sku}` : product.categoryName || 'ITEM'}
        </p>
        <h3
          className="text-[14px] font-bold leading-snug line-clamp-2 mb-1"
          style={{ color: 'var(--ink)' }}
        >
          {product.name}
        </h3>
        {product.certificate ? (
          <p
            className="dc-mono text-[10px] truncate inline-flex items-center gap-1"
            style={{ color: 'var(--ink-3)' }}
          >
            <span>⊕</span>
            {product.certificate}
          </p>
        ) : (
          <p
            className="text-[10px] truncate"
            style={{ color: 'var(--ink-4)' }}
          >
            {product.categoryName || ''}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-2.5">
          <span
            className="dc-mono text-[14px] font-bold"
            style={{ color: 'var(--ink)' }}
          >
            ₱{(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span
              className="dc-mono text-[11px] line-through"
              style={{ color: 'var(--ink-4)' }}
            >
              ₱{product.originalPrice.toLocaleString('en-PH')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function InvKpi({
  label,
  value,
  sub,
  icon,
  tone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone: 'red' | 'jade' | 'gold' | 'indigo';
  accent?: boolean;
}) {
  const toneMap = {
    red: { bg: 'var(--red-wash)', fg: 'var(--red-hi)' },
    jade: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
    gold: { bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' },
    indigo: { bg: 'var(--indigo-wash)', fg: 'var(--indigo)' },
  } as const;
  const t = toneMap[tone];
  return (
    <div
      className="rounded-[14px] border p-4"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ background: t.bg, color: t.fg }}
        >
          {icon}
        </span>
        <p className="label-eyebrow">{label}</p>
      </div>
      <p
        className="display dc-mono text-[22px] sm:text-[24px] leading-none mb-1"
        style={{
          fontVariationSettings: '"opsz" 36, "wght" 700',
          color: accent ? 'var(--red)' : 'var(--ink)',
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </p>
      )}
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
