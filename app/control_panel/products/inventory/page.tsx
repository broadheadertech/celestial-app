'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  Filter,
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Plus,
  MoreVertical,
  Settings,
  Clock,
  Activity,
  ChevronDown,
  X,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';

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

const getStockStatus = (currentQty: number, status: string) => {
  if (currentQty === 0 || status === 'depleted') return {
    label: 'Depleted',
    color: 'bg-error/10',
    textColor: 'text-error',
    icon: AlertTriangle,
  };
  if (currentQty <= 10) return {
    label: 'Low Stock',
    color: 'bg-warning/10',
    textColor: 'text-warning',
    icon: AlertTriangle,
  };
  if (status === 'quarantine') return {
    label: 'Quarantine',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    icon: AlertTriangle,
  };
  if (status === 'expired') return {
    label: 'Expired',
    color: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    icon: AlertTriangle,
  };
  return {
    label: 'In Stock',
    color: 'bg-success/10',
    textColor: 'text-success',
    icon: CheckCircle,
  };
};

export default function InventoryPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Restock modal state
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProductId, setRestockProductId] = useState('');
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restockQuality, setRestockQuality] = useState<'premium' | 'standard' | 'budget'>('standard');
  const [isRestocking, setIsRestocking] = useState(false);

  // Adjust modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustRecordId, setAdjustRecordId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Fetch real data from Convex
  const stockRecords = useQuery(api.services.stock.getStockRecords, {});
  const stockSummary = useQuery(api.services.stock.getStockSummary);
  const lowStockAlerts = useQuery(api.services.stock.getLowStockAlerts, { threshold: 10 });
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  // Mutations
  const restockProduct = useMutation(api.services.stock.restockProduct);
  const adjustStock = useMutation(api.services.stock.adjustStock);

  // Filter out mortality loss records for main display
  const nonMortalityRecords = useMemo(() => {
    if (!stockRecords) return [];
    return stockRecords.filter(r => !r.isMortalityLoss);
  }, [stockRecords]);

  // Get unique categories from stock records
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(nonMortalityRecords.map(r => r.category))];
    return ['All', ...uniqueCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1))];
  }, [nonMortalityRecords]);

  // Filter inventory data
  const filteredInventory = useMemo(() => {
    let filtered = nonMortalityRecords;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.productName?.toLowerCase().includes(query) ||
        item.batchCode.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item =>
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = getStockStatus(item.currentQty, item.status);
        return stockStatus.label.toLowerCase().replace(' ', '_') === selectedStatus;
      });
    }

    return filtered;
  }, [nonMortalityRecords, searchQuery, selectedCategory, selectedStatus]);

  // Calculate inventory stats from real data
  const inventoryStats = useMemo(() => {
    const totalItems = nonMortalityRecords.length;
    const inStock = nonMortalityRecords.filter(r => r.status === 'active' && r.currentQty > 10).length;
    const lowStock = nonMortalityRecords.filter(r => r.status === 'active' && r.currentQty > 0 && r.currentQty <= 10).length;
    const outOfStock = nonMortalityRecords.filter(r => r.currentQty === 0 || r.status === 'depleted').length;
    const itemsNeedingReorder = lowStock + outOfStock;

    return { totalItems, inStock, lowStock, outOfStock, itemsNeedingReorder };
  }, [nonMortalityRecords]);

  // Handle restock
  const handleRestock = async () => {
    if (!restockProductId || !restockQuantity) return;
    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    setIsRestocking(true);
    try {
      await restockProduct({
        productId: restockProductId as Id<"products">,
        quantity,
        notes: restockNotes || undefined,
        qualityGrade: restockQuality,
      });
      setShowRestockModal(false);
      setRestockProductId('');
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

  // Handle adjust stock
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

  const isLoading = stockRecords === undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
                  <p className="text-sm text-white/60">Monitor stock levels and manage inventory</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setShowRestockModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockAlerts && lowStockAlerts.length > 0 && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-sm text-warning font-medium">
              {lowStockAlerts.length} item{lowStockAlerts.length > 1 ? 's' : ''} with low stock levels
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.totalItems}</p>
              <p className="text-xs text-white/60">Total Batches</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.inStock}</p>
              <p className="text-xs text-white/60">In Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.lowStock}</p>
              <p className="text-xs text-white/60">Low Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.outOfStock}</p>
              <p className="text-xs text-white/60">Depleted</p>
            </div>
          </div>

          {/* Value summary */}
          {stockSummary && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Total Stock Value</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(stockSummary.totalValue)}</p>
              </div>
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Total Units in Stock</p>
                <p className="text-xl font-bold text-white">{stockSummary.totalCurrentQty}</p>
              </div>
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Total Units Sold</p>
                <p className="text-xl font-bold text-success">{stockSummary.totalSoldQty}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search products, batch codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Categories</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary border-primary text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Stock Status</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { key: 'all', label: 'All Status', count: inventoryStats.totalItems },
                    { key: 'in_stock', label: 'In Stock', count: inventoryStats.inStock },
                    { key: 'low_stock', label: 'Low Stock', count: inventoryStats.lowStock },
                    { key: 'depleted', label: 'Depleted', count: inventoryStats.outOfStock },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                        selectedStatus === filter.key
                          ? 'bg-info border-info text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedStatus === filter.key
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
        </div>

        {/* Inventory List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Inventory ({filteredInventory.length})
            </h2>
            {inventoryStats.itemsNeedingReorder > 0 && (
              <div className="flex items-center space-x-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {inventoryStats.itemsNeedingReorder} items need attention
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Loading inventory data...</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No inventory items found</h3>
              <p className="text-white/60 mb-6 text-center">
                {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Add stock to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.currentQty, item.status);
                const StatusIcon = stockStatus.icon;
                const stockPercentage = item.initialQty > 0 ? (item.currentQty / item.initialQty) * 100 : 0;
                const needsAttention = item.currentQty <= 10 && item.currentQty > 0;
                const stockValue = item.productPrice ? item.currentQty * item.productPrice : 0;

                return (
                  <div
                    key={item._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 ${
                      needsAttention
                        ? 'border-warning/30 bg-warning/5'
                        : item.currentQty === 0
                        ? 'border-error/30 bg-error/5'
                        : 'border-white/10 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex space-x-4">
                      {/* Stock Level Indicator */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-secondary border border-white/10 flex items-center justify-center overflow-hidden">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName || 'Product'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-lg font-bold text-white">{item.currentQty}</div>
                              <div className="text-xs text-white/60">units</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {item.productName || 'Unknown Product'}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)} • Batch: {item.batchCode}
                            </p>
                            {item.qualityGrade && (
                              <p className="text-xs text-white/40 capitalize">
                                Quality: {item.qualityGrade}
                              </p>
                            )}
                          </div>

                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setSelectedItem(selectedItem === item._id ? null : item._id)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedItem === item._id && (
                              <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      router.push(`/admin/inventory/activity_log?productId=${item.productId}&productName=${encodeURIComponent(item.productName || '')}`);
                                      setSelectedItem(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Activity className="w-4 h-4" />
                                    <span>Activity Log</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAdjustRecordId(item._id);
                                      setShowAdjustModal(true);
                                      setSelectedItem(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Settings className="w-4 h-4" />
                                    <span>Adjust Stock</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stock Status and Metrics */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`px-3 py-1 rounded-lg ${stockStatus.color} ${stockStatus.textColor} flex items-center space-x-1`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className="text-xs font-medium">{stockStatus.label}</span>
                            </div>

                            <div className="text-xs text-white/60">
                              {item.currentQty} / {item.initialQty} units
                            </div>
                          </div>

                          {item.productPrice && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-white">
                                {formatCurrency(item.productPrice)}
                              </p>
                              <p className="text-xs text-white/60">per unit</p>
                            </div>
                          )}
                        </div>

                        {/* Stock Level Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                            <span>Stock Level</span>
                            <span>{stockPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                stockPercentage > 50 ? 'bg-success' :
                                stockPercentage > 25 ? 'bg-warning' : 'bg-error'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Quantity breakdown */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-white/40">Reserved</p>
                            <p className="text-sm font-medium text-white">{item.reservedQty}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Sold</p>
                            <p className="text-sm font-medium text-primary">{item.soldQty}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Mortality</p>
                            <p className={`text-sm font-medium ${item.mortalityLossQty > 0 ? 'text-error' : 'text-white'}`}>
                              {item.mortalityLossQty}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Returned</p>
                            <p className="text-sm font-medium text-white">{item.returnedQty}</p>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Received: {formatDate(item.receivedDate)}</span>
                            </div>
                            {item.expiryDate && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Expires: {formatDate(item.expiryDate)}</span>
                              </div>
                            )}
                          </div>

                          {stockValue > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-white/60">Stock Value</p>
                              <p className="text-sm font-medium text-white">
                                {formatCurrency(stockValue)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedItem(null)}
        />
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRestockModal(false)}
          />
          <div className="relative bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add New Stock</h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Product</label>
                <div className="relative">
                  <select
                    value={restockProductId}
                    onChange={(e) => setRestockProductId(e.target.value)}
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
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
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
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 px-4 py-3 bg-background/60 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={!restockProductId || !restockQuantity || isRestocking}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestocking ? 'Adding...' : 'Add Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAdjustModal(false); setAdjustRecordId(null); }}
          />
          <div className="relative bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Adjust Stock</h3>
              <button
                onClick={() => { setShowAdjustModal(false); setAdjustRecordId(null); }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

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
                  className="flex-1 px-4 py-3 bg-background/60 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustStock}
                  disabled={!adjustQuantity || !adjustReason.trim() || isAdjusting}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdjusting ? 'Adjusting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
