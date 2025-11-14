'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShoppingCart,
  PackagePlus,
  Skull,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  BarChart3
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

// Mock data structure for demonstration
interface InventoryBatch {
  _id: string;
  productId: string;
  productName: string;
  productImage?: string;
  batchNumber: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number;
  supplier?: string;
  expiryDate?: number;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'depleted' | 'expired';
}

function InventoryContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'depleted' | 'low_stock'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);

  // Fetch products for inventory
  const products = useQuery(api.services.admin.getAllProductsAdmin);

  // Mock data - Replace with actual Convex queries
  const mockBatches: InventoryBatch[] = useMemo(() => {
    if (!products) return [];
    
    return products.slice(0, 10).map((product, index) => ({
      _id: `batch-${product._id}-${index}`,
      productId: product._id,
      productName: product.name,
      productImage: product.image,
      batchNumber: `BATCH-${Date.now().toString().slice(-6)}-${index + 1}`,
      initialQuantity: Math.floor(Math.random() * 100) + 50,
      currentQuantity: product.stock,
      unitCost: product.price * 0.6, // Assuming 40% markup
      supplier: ['AquaSupply Co.', 'Marine Traders', 'FishWorld Inc.'][Math.floor(Math.random() * 3)],
      expiryDate: Date.now() + (Math.random() * 180) * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - (Math.random() * 60) * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
      status: product.stock === 0 ? 'depleted' : product.stock < 10 ? 'active' : 'active'
    }));
  }, [products]);



  // Filter batches
  const filteredBatches = useMemo(() => {
    let filtered = mockBatches;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.productName.toLowerCase().includes(query) ||
        batch.batchNumber.toLowerCase().includes(query) ||
        batch.supplier?.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(b => b.status === 'active' && b.currentQuantity > 10);
        break;
      case 'depleted':
        filtered = filtered.filter(b => b.status === 'depleted' || b.currentQuantity === 0);
        break;
      case 'low_stock':
        filtered = filtered.filter(b => b.currentQuantity > 0 && b.currentQuantity < 10);
        break;
    }

    return filtered;
  }, [mockBatches, searchQuery, selectedFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBatches = mockBatches.length;
    const activeBatches = mockBatches.filter(b => b.status === 'active' && b.currentQuantity > 0).length;
    const totalStock = mockBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
    const lowStock = mockBatches.filter(b => b.currentQuantity > 0 && b.currentQuantity < 10).length;
    const totalValue = mockBatches.reduce((sum, b) => sum + (b.currentQuantity * b.unitCost), 0);

    return {
      totalBatches,
      activeBatches,
      totalStock,
      lowStock,
      totalValue
    };
  }, [mockBatches]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
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

          </div>

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search batches..."
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
          <div className="space-y-3">
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
                { key: 'all', label: 'All Batches', count: mockBatches.length },
                { key: 'active', label: 'Active', count: mockBatches.filter(b => b.status === 'active' && b.currentQuantity > 10).length },
                { key: 'low_stock', label: 'Low Stock', count: stats.lowStock },
                { key: 'depleted', label: 'Depleted', count: mockBatches.filter(b => b.currentQuantity === 0).length },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as any)}
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
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Inventory Batches <span className="text-white/60">({filteredBatches.length})</span>
          </h2>
        </div>

        {filteredBatches.length === 0 ? (
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
          <div className="space-y-3 sm:space-y-4">
            {filteredBatches.map((batch) => {
              const stockPercentage = (batch.currentQuantity / batch.initialQuantity) * 100;

              return (
                <Card
                  key={batch._id}
                  variant="modern"
                  padding="none"
                  className="border border-white/10 overflow-hidden"
                >
                  {/* Batch Header */}
                  <div className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
                          {batch.productImage ? (
                            <img
                              src={batch.productImage}
                              alt={batch.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src="/img/logo-app.png"
                              alt="Default"
                              className="w-10 h-10 object-contain opacity-60"
                            />
                          )}
                        </div>
                      </div>

                      {/* Batch Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm sm:text-base truncate">
                              {batch.productName}
                            </h3>
                            <p className="text-xs sm:text-sm text-white/60 truncate">
                              Batch: {batch.batchNumber}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            batch.currentQuantity === 0
                              ? 'bg-error/10 text-error border border-error/30'
                              : batch.currentQuantity < 10
                              ? 'bg-warning/10 text-warning border border-warning/30'
                              : 'bg-success/10 text-success border border-success/30'
                          }`}>
                            {batch.currentQuantity === 0 ? 'Depleted' : batch.currentQuantity < 10 ? 'Low Stock' : 'Active'}
                          </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/60">Stock Level</span>
                            <span className="text-xs font-medium text-white">
                              {batch.currentQuantity} / {batch.initialQuantity}
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
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Batch Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div>
                            <p className="text-[10px] sm:text-xs text-white/40">Unit Cost</p>
                            <p className="text-xs sm:text-sm font-medium text-white">
                              {formatCurrency(batch.unitCost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-white/40">Total Value</p>
                            <p className="text-xs sm:text-sm font-medium text-white">
                              {formatCurrency(batch.currentQuantity * batch.unitCost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-white/40">Supplier</p>
                            <p className="text-xs sm:text-sm font-medium text-white truncate">
                              {batch.supplier || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-white/40">Added</p>
                            <p className="text-xs sm:text-sm font-medium text-white">
                              {new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <button
                            onClick={() => router.push(`/admin/inventory/activity_log?productId=${batch.productId}&productName=${encodeURIComponent(batch.productName)}`)}
                            className="flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors touch-manipulation"
                          >
                            <Activity className="w-4 h-4" />
                            <span>View Activity Log</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button className="px-2 sm:px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation">
                              Adjust
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all touch-manipulation">
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>
                          </div>
                        </div>
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

      {/* Add Batch Modal */}
      {showAddBatch && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowAddBatch(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t border-white/10 rounded-t-3xl shadow-2xl p-4 sm:p-6">
              <div className="flex justify-center pt-2 pb-4">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-4">Add New Batch</h3>
              <p className="text-sm text-white/60 mb-6">
                This feature is coming soon. You'll be able to add new inventory batches here.
              </p>
              <button
                onClick={() => setShowAddBatch(false)}
                className="w-full px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
              >
                Close
              </button>
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