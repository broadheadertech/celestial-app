'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  PackagePlus,
  ShoppingCart,
  RotateCcw,
  Skull,
  Settings,
  ArrowRightLeft,
  Clock,
  X,
  TrendingUp,
  TrendingDown,
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

type MovementType = 'initial' | 'purchase' | 'sale' | 'reservation' | 'return' | 'damage' | 'restock' | 'adjustment' | 'transfer' | 'expiry';

const movementConfig: Record<MovementType, { icon: typeof Package; label: string; color: string; bgColor: string }> = {
  initial: { icon: Package, label: 'Initial Stock', color: 'text-info', bgColor: 'bg-info/10' },
  purchase: { icon: PackagePlus, label: 'Purchase', color: 'text-success', bgColor: 'bg-success/10' },
  restock: { icon: PackagePlus, label: 'Restock', color: 'text-success', bgColor: 'bg-success/10' },
  sale: { icon: ShoppingCart, label: 'Sale', color: 'text-primary', bgColor: 'bg-primary/10' },
  reservation: { icon: Clock, label: 'Reservation', color: 'text-warning', bgColor: 'bg-warning/10' },
  return: { icon: RotateCcw, label: 'Return', color: 'text-info', bgColor: 'bg-info/10' },
  damage: { icon: Skull, label: 'Damage/Mortality', color: 'text-error', bgColor: 'bg-error/10' },
  adjustment: { icon: Settings, label: 'Adjustment', color: 'text-white/70', bgColor: 'bg-white/10' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  expiry: { icon: Clock, label: 'Expiry', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
};

function MovementsContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all stock movements
  const movements = useQuery(api.services.stock.getStockMovements, { limit: 100 });

  // Filter movements
  const filteredMovements = useMemo(() => {
    if (!movements) return [];

    let filtered = movements;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.productName?.toLowerCase().includes(query) ||
        m.batchCode.toLowerCase().includes(query) ||
        String(m.productSku || '').toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(m => m.movementType === selectedType);
    }

    return filtered;
  }, [movements, searchQuery, selectedType]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!movements) return null;

    const totalIn = movements.filter(m => m.quantityChange > 0).reduce((sum, m) => sum + m.quantityChange, 0);
    const totalOut = movements.filter(m => m.quantityChange < 0).reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

    const typeCounts: Record<string, number> = {};
    for (const m of movements) {
      typeCounts[m.movementType] = (typeCounts[m.movementType] || 0) + 1;
    }

    return { totalIn, totalOut, typeCounts, total: movements.length };
  }, [movements]);

  const isLoading = movements === undefined;

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
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Stock Movements</h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">All inventory changes and audit trail</p>
            </div>
          </div>

          {/* Summary Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10">
                <p className="text-[10px] sm:text-xs text-white/40">Total Movements</p>
                <p className="text-sm sm:text-lg font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
                <div>
                  <p className="text-[10px] sm:text-xs text-white/40">Stock In</p>
                  <p className="text-sm sm:text-lg font-bold text-success">+{stats.totalIn}</p>
                </div>
              </div>
              <div className="bg-secondary/60 rounded-lg p-2 sm:p-3 border border-white/10 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-error flex-shrink-0" />
                <div>
                  <p className="text-[10px] sm:text-xs text-white/40">Stock Out</p>
                  <p className="text-sm sm:text-lg font-bold text-error">-{stats.totalOut}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 bg-secondary/60 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 touch-manipulation"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 touch-manipulation ${
                showFilters || selectedType !== 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <h3 className="text-xs sm:text-sm font-medium text-white mb-2">Movement Type</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedType('all')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm border transition-all active:scale-95 touch-manipulation ${
                selectedType === 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white/70'
              }`}
            >
              All
            </button>
            {Object.entries(movementConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm border transition-all active:scale-95 touch-manipulation whitespace-nowrap flex items-center gap-1.5 ${
                  selectedType === key
                    ? 'bg-primary border-primary text-white'
                    : 'bg-secondary/60 border-white/10 text-white/70'
                }`}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Movements List */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <h2 className="text-sm sm:text-lg font-bold text-white mb-3">
          Movements <span className="text-white/60">({filteredMovements.length})</span>
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading movements...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <ArrowRightLeft className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-2">No movements found</h3>
            <p className="text-xs sm:text-sm text-white/60">
              {searchQuery || selectedType !== 'all' ? 'Try adjusting your filters.' : 'Stock movements will appear here.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredMovements.map((movement) => {
              const config = movementConfig[movement.movementType as MovementType] || movementConfig.adjustment;
              const Icon = config.icon;
              const isPositive = movement.quantityChange > 0;

              return (
                <Card
                  key={movement._id}
                  variant="modern"
                  padding="none"
                  className="border border-white/10"
                >
                  <div className="p-3 sm:p-4 flex gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-2.5 sm:p-3 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">
                            {movement.productName || 'Unknown Product'}
                          </h3>
                          <p className="text-xs text-white/60 truncate">
                            {config.label} • Batch: {movement.batchCode}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                          isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {isPositive ? '+' : ''}{movement.quantityChange}
                        </div>
                      </div>

                      {/* Quantity flow */}
                      <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                        <span>{movement.quantityBefore}</span>
                        <span className="text-white/30">&rarr;</span>
                        <span className="font-medium text-white/70">{movement.quantityAfter}</span>
                      </div>

                      {/* Timestamp */}
                      <p className="text-[10px] sm:text-xs text-white/40">
                        {formatDate(movement.createdAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavbar />

      <style jsx global>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @media (min-width: 480px) {
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  );
}

export default function MovementsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <MovementsContent />
    </SafeAreaProvider>
  );
}
