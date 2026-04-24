'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,

  RefreshCw,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  TrendingUp,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import DesktopDrawer from '@/components/admin/DesktopDrawer';
import { Suspense } from 'react';

const ITEMS_PER_PAGE = 15;

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return {
    status: 'Out of Stock',
    color: 'bg-error/10',
    textColor: 'text-error'
  };
  if (stock < 10) return {
    status: 'Low Stock',
    color: 'bg-warning/10',
    textColor: 'text-warning'
  };
  return {
    status: 'In Stock',
    color: 'bg-success/10',
    textColor: 'text-success'
  };
};

// Portal-based dropdown menu - escapes overflow clipping, flips up near bottom
function ActionsDropdown({
  product,
  onAction,
}: {
  product: { _id: string; isActive: boolean; name: string };
  onAction: (productId: string, action: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const dropdownWidth = 208; // w-52
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUp ? rect.top - 4 : rect.bottom + 4;
    const left = Math.min(
      rect.right - dropdownWidth,
      window.innerWidth - dropdownWidth - 8
    );
    setPosition({ top, left: Math.max(8, left), openUp });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [open]);

  const run = (action: string) => {
    onAction(product._id, action);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
      >
        <MoreVertical className="w-4 h-4 text-white/60" />
      </button>
      {open && position && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: position.openUp ? 'auto' : position.top,
            bottom: position.openUp ? window.innerHeight - position.top : 'auto',
            left: position.left,
          }}
          className="z-[9999] w-52 bg-secondary border border-white/15 rounded-xl shadow-2xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <button onClick={() => run('View')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            <Eye className="w-4 h-4 text-info" />
            View Details
          </button>
          <button onClick={() => run('Edit')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            <Edit className="w-4 h-4 text-primary" />
            Edit Product
          </button>
          <button onClick={() => run('Restock')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-success" />
            Restock
          </button>
          <button onClick={() => run('MortalityLoss')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-warning" />
            Mortality Loss
          </button>
          <button onClick={() => run('InternalUse')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            <Wrench className="w-4 h-4 text-info" />
            Internal Use
          </button>
          <div className="border-t border-white/10 my-1" />
          <button onClick={() => run('Toggle')} className="w-full px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
            {product.isActive ? (
              <><EyeOff className="w-4 h-4 text-warning" />Deactivate</>
            ) : (
              <><Eye className="w-4 h-4 text-success" />Activate</>
            )}
          </button>
          <button onClick={() => run('Delete')} className="w-full px-3.5 py-2.5 text-left text-sm text-error hover:bg-error/10 flex items-center gap-3">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function AdminProductsContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Add product drawer state (desktop)
  const [showAddProductDrawer, setShowAddProductDrawer] = useState(false);

  // Restock modal state
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');

  // Mortality loss modal state
  const [showMortalityModal, setShowMortalityModal] = useState(false);
  const [mortalityProductId, setMortalityProductId] = useState<string | null>(null);
  const [mortalityQuantity, setMortalityQuantity] = useState('');

  // Internal use modal state
  const [showInternalUseModal, setShowInternalUseModal] = useState(false);
  const [internalUseProductId, setInternalUseProductId] = useState<string | null>(null);
  const [internalUseQuantity, setInternalUseQuantity] = useState('');
  const [internalUseNotes, setInternalUseNotes] = useState('');
  const [isLoggingInternalUse, setIsLoggingInternalUse] = useState(false);

  // Convex queries
  const products = useQuery(api.services.admin.getAllProductsAdmin);
  const categories = useQuery(api.services.categories.getCategories);

  // Convex mutations
  const toggleProductStatus = useMutation(api.services.admin.toggleProductStatus);
  const restockProduct = useMutation(api.services.stock.restockProduct);
  const recordMortalityLoss = useMutation(api.services.stock.recordMortalityLossByProduct);
  const logInternalUse = useMutation(api.services.stock.logInternalUse);
  const deleteProductMutation = useMutation(api.services.admin.deleteProduct);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Create category mapping for better filtering
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (categories) {
      categories.forEach(cat => {
        map[cat._id] = cat.name;
      });
    }
    return map;
  }, [categories]);

  // Enhanced filtering logic
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (categoryMap[product.categoryId] && categoryMap[product.categoryId].toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => {
        const productCategory = categoryMap[product.categoryId];
        return productCategory === selectedCategory;
      });
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => {
        switch (selectedStatus) {
          case 'active':
            return product.isActive && product.stock > 0;
          case 'inactive':
            return !product.isActive;
          case 'out_of_stock':
            return product.stock === 0;
          case 'low_stock':
            return product.stock > 0 && product.stock < 10;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedStatus, categoryMap, products]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  // Calculate local stats from filtered data
  const localStats = useMemo(() => {
    if (!products) return {
      totalProducts: 0,
      activeProducts: 0,
      outOfStock: 0,
      inactiveProducts: 0,
      lowStock: 0,
    };

    const total = products.length;
    const active = products.filter(p => p.isActive && p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const inactive = products.filter(p => !p.isActive).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStock: outOfStock,
      inactiveProducts: inactive,
      lowStock: lowStock,
    };
  }, [products]);

  // Get category names with proper ordering
  const categoryNames = useMemo(() => {
    if (!categories) return ['All'];
    return ['All', ...categories.map(cat => cat.name)];
  }, [categories]);

  // Status filter options
  const statusFilters = useMemo(() => [
    { key: 'all', label: 'All Status', count: localStats.totalProducts },
    { key: 'active', label: 'Active', count: localStats.activeProducts },
    { key: 'inactive', label: 'Inactive', count: localStats.inactiveProducts },
    { key: 'out_of_stock', label: 'Out of Stock', count: localStats.outOfStock },
    { key: 'low_stock', label: 'Low Stock', count: localStats.lowStock },
  ], [localStats]);

  // Create stats array from calculated data
  const statsArray = useMemo(() => [
    {
      id: '1',
      title: 'Total Products',
      value: localStats.totalProducts.toString(),
      change: `${localStats.activeProducts} active`,
      icon: Package,
      color: 'text-info',
    },
    {
      id: '2',
      title: 'Active Products',
      value: localStats.activeProducts.toString(),
      change: `${localStats.totalProducts} total`,
      icon: Eye,
      color: 'text-success',
    },
    {
      id: '3',
      title: 'Out of Stock',
      value: localStats.outOfStock.toString(),
      change: `${localStats.lowStock} low stock`,
      icon: AlertTriangle,
      color: 'text-error',
    },
  ], [localStats]);

  const handleProductAction = async (productId: string, action: string) => {
    if (action === 'Edit') {
      router.push(`/admin/products/form?id=${productId}`);
    } else if (action === 'View') {
      router.push(`/admin/product-detail?id=${productId}`);
    } else if (action === 'Toggle') {
      try {
        const product = products?.find(p => p._id === productId);
        if (!product) return;

        await toggleProductStatus({
          productId: productId as any,
          isActive: !product.isActive,
        });
      } catch (error) {
      }
    } else if (action === 'Restock') {
      setRestockProductId(productId);
      setRestockQuantity('');
      setShowRestockModal(true);
    } else if (action === 'MortalityLoss') {
      setMortalityProductId(productId);
      setMortalityQuantity('');
      setShowMortalityModal(true);
    } else if (action === 'InternalUse') {
      setInternalUseProductId(productId);
      setInternalUseQuantity('');
      setInternalUseNotes('');
      setShowInternalUseModal(true);
    } else if (action === 'Delete') {
      const product = products?.find(p => p._id === productId);
      if (product) setDeleteConfirm({ id: productId, name: product.name });
    }
    setSelectedProduct(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('all');
    setShowFilters(false);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestock = async () => {
    if (!restockProductId || !restockQuantity) return;

    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      // Create a new stock record for this restock (1-to-many relationship)
      const result = await restockProduct({
        productId: restockProductId as any,
        quantity: quantity,
        notes: `Admin restock - Added ${quantity} units`,
      });

      // Close modal and reset
      setShowRestockModal(false);
      setRestockProductId(null);
      setRestockQuantity('');

      alert(`${result.message}\nNew batch code: ${result.batchCode}\nTotal stock: ${result.newTotalStock} units`);
    } catch (error) {
      alert('Failed to restock product. Please try again.');
    }
  };

  const handleInternalUse = async () => {
    if (!internalUseProductId || !internalUseQuantity) return;
    const quantity = parseInt(internalUseQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const product = products?.find((p) => p._id === internalUseProductId);
    if (!product) {
      alert('Product not found');
      return;
    }
    if (product.stock < quantity) {
      alert(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
      return;
    }

    setIsLoggingInternalUse(true);
    try {
      const result = await logInternalUse({
        productId: internalUseProductId as any,
        quantity,
        notes: internalUseNotes.trim() || undefined,
      });
      setShowInternalUseModal(false);
      setInternalUseProductId(null);
      setInternalUseQuantity('');
      setInternalUseNotes('');
      setSuccessMessage(
        `Logged ${quantity} × ${product.name} as internal use. ` +
          `Expense: ₱${result.expenseAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to log internal use');
    } finally {
      setIsLoggingInternalUse(false);
    }
  };

  const handleMortalityLoss = async () => {
    if (!mortalityProductId || !mortalityQuantity) return;

    const quantity = parseInt(mortalityQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const product = products?.find(p => p._id === mortalityProductId);
    if (!product) {
      alert('Product not found');
      return;
    }

    // Check if product has enough stock
    if (product.stock < quantity) {
      alert(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
      return;
    }

    try {
      const result = await recordMortalityLoss({
        productId: mortalityProductId as any,
        quantity: quantity,
        notes: `🪦 Mortality Loss - ${product.name}\nTank: ${product.tankNumber || 'N/A'}\nSKU: ${product.sku || 'N/A'}\nQuantity Lost: ${quantity} units\nRecorded: ${new Date().toLocaleString()}`,
      });

      // Close modal and reset
      setShowMortalityModal(false);
      setMortalityProductId(null);
      setMortalityQuantity('');

      // Show detailed success message with batch information
      const isFirstLoss = result.isFirstMortalityLoss;

      alert(
        `✅ Mortality Loss Recorded Successfully\n\n` +
        `Product: ${product.name}\n` +
        `Tank: ${product.tankNumber || 'N/A'}\n` +
        `SKU: ${product.sku || 'N/A'}\n\n` +
        `📦 Batch Information:\n` +
        `Batch Code: ${result.mortalityBatchCode}\n` +
        `${isFirstLoss ? '(First mortality loss - using source batch)' : '(Using previous mortality batch)'}\n\n` +
        `📊 Mortality Tracking:\n` +
        `Previous Product Stock: ${result.previousProductStock} units\n` +
        `Mortality Loss: ${quantity} units\n` +
        `New Product Stock: ${result.productStock} units\n` +
        `Formula: ${result.previousProductStock} - ${quantity} = ${result.productStock}\n\n` +
        `💾 Mortality Record Saved:\n` +
        `CurrentQty: ${result.newMortalityCurrentQty} units (= Product Stock)\n` +
        `InitialQty: ${result.newMortalityInitialQty} units (= CurrentQty)\n\n` +
        `✓ ${isFirstLoss ? 'First' : 'Continued'} mortality record created\n` +
        `✓ CurrentQty now matches Product Stock (${result.productStock} units)\n` +
        `✓ Stock movements logged for audit trail`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to Record Mortality Loss\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    }
  };

  // Helper to get item status
  const getItemStatus = (prod: { isActive: boolean; stock: number }) => {
    if (!prod.isActive) return 'inactive';
    if (prod.stock === 0) return 'out_of_stock';
    return 'active';
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
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Product Management</h1>
                <p className="text-xs sm:text-sm text-white/60 hidden xs:block truncate">Manage inventory and listings</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Inventory Button */}
              <button
                onClick={() => router.push('/admin/inventory')}
                className="px-2 sm:px-3 py-2 rounded-lg bg-secondary border border-white/10 text-white flex items-center gap-1 sm:gap-1.5 hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
              >
                <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">Inventory</span>
              </button>

              {/* Add Product - Mobile: navigate, Desktop: drawer */}
              <button
                onClick={() => router.push('/admin/products/form')}
                className="sm:hidden px-2.5 py-2 rounded-lg bg-primary text-white flex items-center gap-1 hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Add</span>
              </button>
              <button
                onClick={() => setShowAddProductDrawer(true)}
                className="hidden sm:flex px-4 py-2 rounded-lg bg-primary text-white items-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Product</span>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
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
                showFilters || selectedCategory !== 'All' || selectedStatus !== 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
              {(selectedCategory !== 'All' || selectedStatus !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {statsArray.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.id}
                  className="bg-secondary/40 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                      <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-medium truncate ml-1 ${
                        stat.change.includes('active') ? 'text-success' : 'text-info'
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white truncate">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-white/60 truncate">{stat.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-medium text-white">Filters</h3>
              <div className="flex items-center gap-2">
                {(selectedCategory !== 'All' || selectedStatus !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 transition-colors touch-manipulation"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors sm:hidden touch-manipulation"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-2">Categories</label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:flex-wrap">
                  {categoryNames.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border transition-all active:scale-95 touch-manipulation whitespace-nowrap ${
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
                <label className="block text-xs sm:text-sm font-medium text-white mb-2">Status</label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:flex-wrap">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 touch-manipulation whitespace-nowrap ${
                        selectedStatus === filter.key
                          ? 'bg-info border-info text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
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
          </div>
        </div>
      )}

      {/* Products List / Table */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Products <span className="text-white/60">({filteredProducts.length})</span>
          </h2>
          {filteredProducts.length === 0 && products && products.length > 0 && (
            <button
              onClick={clearFilters}
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-[10px] sm:text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
            >
              Clear Filters
            </button>
          )}
        </div>

        {!products ? (
          <div className="text-center py-8 sm:py-12">
            <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">Loading products...</h3>
            <p className="text-xs sm:text-sm text-white/60">Please wait while we fetch your product data.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">No products found</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 text-center px-4">
              {!products || products.length === 0
                ? 'No products have been added yet.'
                : 'Try adjusting your search terms or filters.'}
            </p>
            {(!products || products.length === 0) && (
              <button
                onClick={() => router.push('/admin/products/form')}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
              >
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ========== DESKTOP TABLE (sm and up) ========== */}
            <div className="hidden sm:block">
              <div className="bg-secondary/40 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-secondary/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Image</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">SKU</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Price</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Stock</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock);
                      const itemStatus = getItemStatus(product);
                      const categoryName = categoryMap[product.categoryId] || 'Unknown';

                      return (
                        <tr
                          key={product._id}
                          className={`hover:bg-white/5 transition-colors ${
                            itemStatus === 'out_of_stock' ? 'bg-error/5' : ''
                          }`}
                        >
                          {/* Image */}
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center flex-shrink-0">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src="/img/logo-app.png"
                                  alt="Default Product"
                                  className="w-7 h-7 object-contain opacity-60"
                                />
                              )}
                            </div>
                          </td>
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate max-w-[200px]">{product.name || 'Unnamed Product'}</p>
                              <p className="text-xs text-white/40">ID: {product._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </td>
                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-white/70">{categoryName}</span>
                          </td>
                          {/* SKU */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-white/70 font-mono">{product.sku || 'N/A'}</span>
                          </td>
                          {/* Price */}
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-white">{formatCurrency(product.price)}</span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <p className="text-xs text-white/40 line-through">{formatCurrency(product.originalPrice)}</p>
                            )}
                          </td>
                          {/* Stock */}
                          <td className="px-4 py-3 text-center">
                            <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${stockStatus.color} ${stockStatus.textColor}`}>
                              {product.stock}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                              itemStatus === 'active' ? 'bg-success/10 text-success' :
                              itemStatus === 'inactive' ? 'bg-muted/10 text-muted' :
                              'bg-error/10 text-error'
                            }`}>
                              {itemStatus === 'active' ? 'Active' : itemStatus === 'inactive' ? 'Inactive' : 'Out of Stock'}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <ActionsDropdown
                              product={product}
                              onAction={handleProductAction}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========== MOBILE CARDS (below sm) ========== */}
            <div className="sm:hidden space-y-2.5">
              {paginatedProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const discount = (product.originalPrice && product.originalPrice > product.price) ?
                  Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
                const itemStatus = getItemStatus(product);
                const categoryName = categoryMap[product.categoryId] || 'Unknown Category';

                return (
                  <div
                    key={product._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-lg p-3 transition-all duration-200 hover:border-primary/30 ${
                      itemStatus === 'out_of_stock'
                        ? 'border-error/30 bg-error/5'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex gap-2.5">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src="/img/logo-app.png"
                              alt="Default Product"
                              className="w-8 h-8 object-contain opacity-60"
                            />
                          )}
                        </div>
                        {product.badge && (
                          <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded bg-primary">
                            <span className="text-[10px] font-bold text-foreground">
                              {product.badge === 'Bestseller' ? '★' : product.badge.charAt(0)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute -bottom-1 -left-1 px-1 py-0.5 rounded bg-error">
                            <span className="text-[10px] font-bold text-foreground">
                              -{discount}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white mb-1 text-sm truncate pr-2">
                              {product.name || 'Unnamed Product'}
                            </h3>
                            <p className="text-xs text-white/60 mb-0.5 truncate">{categoryName}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[10px] text-white/40">
                                ID: {product._id.slice(-6).toUpperCase()}
                              </p>
                              {product.tankNumber && (
                                <span className="px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] font-medium border border-info/30">
                                  Tank: {product.tankNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions Menu */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => setSelectedProduct(selectedProduct === product._id ? null : product._id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                            >
                              <MoreVertical className="w-5 h-5 text-white/60" />
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            {formatCurrency(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-white/50 line-through">
                              {formatCurrency(product.originalPrice)}
                            </span>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <div className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium ${
                            itemStatus === 'active' ? 'bg-success/10 text-success border border-success/30' :
                            itemStatus === 'inactive' ? 'bg-muted/10 text-muted border border-muted/30' :
                            'bg-error/10 text-error border border-error/30'
                          }`}>
                            {itemStatus.replace('_', ' ')}
                          </div>

                          <div className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium ${stockStatus.color} ${stockStatus.textColor} border ${
                            stockStatus.textColor === 'text-success' ? 'border-success/30' :
                            stockStatus.textColor === 'text-warning' ? 'border-warning/30' :
                            'border-error/30'
                          }`}>
                            {product.stock} in stock
                          </div>
                        </div>

                        {/* Action Buttons and Date */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div className="flex items-center gap-1 text-[10px] text-white/60">
                            <span className="hidden xs:inline">Created:</span>
                            <span>{new Date(product.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            })}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => router.push(`/admin/product-detail?id=${product._id}`)}
                              className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
                            >
                              View
                            </button>

                            <button
                              onClick={() => router.push(`/admin/products/form?id=${product._id}`)}
                              className="px-2 py-1 rounded-lg bg-primary text-white text-[10px] hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${
                    currentPage === 1
                      ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Page info */}
                <div className="flex items-center">
                  <span className="text-xs sm:text-sm text-white/80 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${
                    currentPage === totalPages
                      ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Restock Modal */}
      {showRestockModal && restockProductId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => {
              setShowRestockModal(false);
              setRestockProductId(null);
              setRestockQuantity('');
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-success" />
                    Restock Product
                  </h2>
                  <button
                    onClick={() => {
                      setShowRestockModal(false);
                      setRestockProductId(null);
                      setRestockQuantity('');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {(() => {
                  const product = products?.find(p => p._id === restockProductId);
                  if (!product) return null;

                  return (
                    <>
                      {/* Product Info */}
                      <div className="bg-secondary/60 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src="/img/logo-app.png"
                                alt="Default"
                                className="w-12 h-12 m-2 object-contain opacity-60"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-base truncate">{product.name}</h3>
                            <p className="text-sm text-white/60 truncate">{formatCurrency(product.price)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                          <div>
                            <p className="text-xs text-white/60 mb-1">SKU</p>
                            <p className="text-sm font-medium text-white">
                              {product.sku || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Tank Number</p>
                            <p className="text-sm font-medium text-white">
                              {product.tankNumber || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Current Stock</p>
                            <p className="text-sm font-bold text-white">
                              {product.stock} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Status</p>
                            <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              product.stock === 0 ? 'bg-error/10 text-error' :
                              product.stock < 10 ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            }`}>
                              {product.stock === 0 ? 'Out of Stock' :
                               product.stock < 10 ? 'Low Stock' :
                               'In Stock'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Add Quantity <span className="text-primary">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={restockQuantity}
                          onChange={(e) => setRestockQuantity(e.target.value)}
                          placeholder="Enter quantity to add"
                          className="w-full px-4 py-3 bg-secondary border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        {restockQuantity && (
                          <p className="mt-2 text-sm text-white/60">
                            New stock will be: <span className="font-bold text-success">{product.stock + parseInt(restockQuantity || '0')} units</span>
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockProductId(null);
                    setRestockQuantity('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-secondary/60 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={!restockQuantity || parseInt(restockQuantity) <= 0}
                  className="flex-1 px-4 py-2.5 bg-success hover:bg-success/90 disabled:bg-success/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                >
                  Add Stock
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mortality Loss Modal */}
      {showMortalityModal && mortalityProductId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => {
              setShowMortalityModal(false);
              setMortalityProductId(null);
              setMortalityQuantity('');
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Record Mortality Loss
                  </h2>
                  <button
                    onClick={() => {
                      setShowMortalityModal(false);
                      setMortalityProductId(null);
                      setMortalityQuantity('');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {(() => {
                  const product = products?.find(p => p._id === mortalityProductId);
                  if (!product) return null;

                  const availableQty = product.stock;

                  return (
                    <>
                      {/* Product Info */}
                      <div className="bg-secondary/60 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src="/img/logo-app.png"
                                alt="Default"
                                className="w-12 h-12 m-2 object-contain opacity-60"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-base truncate">{product.name}</h3>
                            <p className="text-sm text-white/60 truncate">{formatCurrency(product.price)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                          <div>
                            <p className="text-xs text-white/60 mb-1">SKU</p>
                            <p className="text-sm font-medium text-white">
                              {product.sku || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Tank Number</p>
                            <p className="text-sm font-medium text-white">
                              {product.tankNumber || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Total Stock</p>
                            <p className="text-sm font-bold text-white">
                              {product.stock} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Available</p>
                            <p className="text-sm font-bold text-success">
                              {availableQty} units
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Warning Message */}
                      <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
                        <div className="flex gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning mb-1">
                              Important Notice
                            </p>
                            <p className="text-xs text-white/70">
                              This action will permanently reduce stock count and mark the specified quantity as damaged/lost. This cannot be undone.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Mortality Quantity <span className="text-error">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={availableQty}
                          value={mortalityQuantity}
                          onChange={(e) => setMortalityQuantity(e.target.value)}
                          placeholder="Enter quantity lost"
                          className="w-full px-4 py-3 bg-secondary border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-warning"
                          autoFocus
                        />
                        {mortalityQuantity && (
                          <p className="mt-2 text-sm text-white/60">
                            Remaining stock will be: <span className="font-bold text-warning">{availableQty - parseInt(mortalityQuantity || '0')} units</span>
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => {
                    setShowMortalityModal(false);
                    setMortalityProductId(null);
                    setMortalityQuantity('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-secondary/60 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMortalityLoss}
                  disabled={!mortalityQuantity || parseInt(mortalityQuantity) <= 0}
                  className="flex-1 px-4 py-2.5 bg-warning hover:bg-warning/90 disabled:bg-warning/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                >
                  Record Loss
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Internal Use Modal */}
      {showInternalUseModal && internalUseProductId && (() => {
        const product = products?.find((p) => p._id === internalUseProductId);
        if (!product) return null;
        const qty = parseInt(internalUseQuantity) || 0;
        const missingCost = !product.costPrice || product.costPrice <= 0;
        const expenseAmount = qty * (product.costPrice || 0);
        return (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
              onClick={() => {
                setShowInternalUseModal(false);
                setInternalUseProductId(null);
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div
                className="bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-info" />
                    Log Internal Use
                  </h2>
                  <button
                    onClick={() => {
                      setShowInternalUseModal(false);
                      setInternalUseProductId(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Product card */}
                  <div className="bg-secondary/60 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-white/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base truncate">{product.name}</h3>
                        <p className="text-xs text-white/60">
                          Stock: <span className="text-white font-medium">{product.stock}</span>
                          {product.costPrice ? (
                            <span className="ml-2">
                              · Cost: <span className="text-white font-medium">{formatCurrency(product.costPrice)}</span>
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>

                  {missingCost ? (
                    <div className="bg-error/10 border border-error/30 rounded-xl p-3">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-error mb-1">Cost price required</p>
                          <p className="text-xs text-white/70">
                            Edit this product and set a cost price before logging internal use, so the P&L reflects the correct expense.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-info/10 border border-info/30 rounded-xl p-3">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-white/80">
                          <p className="font-medium mb-0.5">Logged as expense in P&L</p>
                          <p className="text-white/60">
                            Cash-on-hand is unaffected (no cash leaves the drawer). The expense is recorded under Operating Supplies.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Quantity Used <span className="text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={internalUseQuantity}
                      onChange={(e) => setInternalUseQuantity(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-3 bg-secondary border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-info"
                      autoFocus
                      disabled={missingCost}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Notes (optional)</label>
                    <textarea
                      value={internalUseNotes}
                      onChange={(e) => setInternalUseNotes(e.target.value)}
                      placeholder="e.g. Used for store tank feeding"
                      rows={2}
                      className="w-full px-4 py-2.5 bg-secondary border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-info resize-none"
                      disabled={missingCost}
                    />
                  </div>

                  {qty > 0 && !missingCost && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl">
                      <span className="text-xs text-white/60 uppercase tracking-wider">Expense amount</span>
                      <span className="text-lg font-bold text-info">{formatCurrency(expenseAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                  <button
                    onClick={() => {
                      setShowInternalUseModal(false);
                      setInternalUseProductId(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-secondary/60 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInternalUse}
                    disabled={
                      missingCost ||
                      isLoggingInternalUse ||
                      !internalUseQuantity ||
                      parseInt(internalUseQuantity) <= 0 ||
                      parseInt(internalUseQuantity) > product.stock
                    }
                    className="flex-1 px-4 py-2.5 bg-info hover:bg-info/90 disabled:bg-info/40 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                  >
                    {isLoggingInternalUse ? 'Logging...' : 'Log Use'}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Mobile-Optimized Action Sheet */}
      {selectedProduct && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setSelectedProduct(null)}
          />

          {/* Bottom Sheet / Desktop Dialog */}
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 animate-in slide-in-from-bottom sm:animate-in sm:fade-in duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl sm:w-full sm:max-w-md sm:mx-4 sm:max-h-[80vh] sm:overflow-y-auto">
              {/* Handle Bar - mobile only */}
              <div className="flex justify-center pt-3 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              {/* Product Info Header */}
              {(() => {
                const product = products?.find(p => p._id === selectedProduct);
                if (!product) return null;

                return (
                  <div className="px-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src="/img/logo-app.png"
                            alt="Default"
                            className="w-8 h-8 m-2 object-contain opacity-60"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{product.name}</h3>
                        <p className="text-xs text-white/60 truncate">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="p-4 space-y-2">
                {(() => {
                  const product = products?.find(p => p._id === selectedProduct);
                  if (!product) return null;

                  return (
                    <>
                      <button
                        onClick={() => handleProductAction(product._id, 'View')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <Eye className="w-5 h-5 text-info" />
                        <span className="font-medium">View Details</span>
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'Edit')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <Edit className="w-5 h-5 text-primary" />
                        <span className="font-medium">Edit Product</span>
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'Restock')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="font-medium">Restock Product</span>
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'MortalityLoss')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <AlertCircle className="w-5 h-5 text-warning" />
                        <span className="font-medium">Record Mortality Loss</span>
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'InternalUse')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <Wrench className="w-5 h-5 text-info" />
                        <span className="font-medium">Log Internal Use</span>
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'Toggle')}
                        className="w-full px-4 py-3.5 bg-secondary/60 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white flex items-center gap-3 transition-all touch-manipulation"
                      >
                        {product.isActive ? (
                          <>
                            <EyeOff className="w-5 h-5 text-warning" />
                            <span className="font-medium">Deactivate Product</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-5 h-5 text-success" />
                            <span className="font-medium">Activate Product</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleProductAction(product._id, 'Delete')}
                        className="w-full px-4 py-3.5 bg-error/10 hover:bg-error/20 active:bg-error/30 border border-error/30 rounded-xl text-error flex items-center gap-3 transition-all touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-medium">Delete Product</span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Cancel Button */}
              <div className="px-4 pb-6 pt-2">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-white font-medium transition-all touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Product Confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !isDeleting && setDeleteConfirm(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-white mb-2">Delete Product</h3>
              <p className="text-sm text-white/70 mb-1">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <p className="text-xs text-white/50 mb-6">If this product has order history, it will be deactivated instead.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50">No</button>
                <button onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const result = await deleteProductMutation({ id: deleteConfirm.id as any });
                    setSuccessMessage(result?.message || 'Product deleted successfully');
                    setDeleteConfirm(null);
                    setTimeout(() => setSuccessMessage(''), 3000);
                  } catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete'); }
                  finally { setIsDeleting(false); }
                }} disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 active:scale-95 transition-all disabled:opacity-50">
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
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

        /* Custom responsive breakpoints */
        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
          .xs\\:block {
            display: block;
          }
        }
      `}</style>

      {/* Add Product Drawer (Desktop) */}
      <DesktopDrawer
        isOpen={showAddProductDrawer}
        onClose={() => setShowAddProductDrawer(false)}
        title="Add Product"
        subtitle="Create a new product"
        width="max-w-2xl"
      >
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
          <ProductFormInDrawer onSuccess={() => setShowAddProductDrawer(false)} />
        </Suspense>
      </DesktopDrawer>
    </div>
  );
}

// Lazy wrapper for product form inside drawer
function ProductFormInDrawer({ onSuccess }: { onSuccess: () => void }) {
  const { ProductFormContentInner } = require('@/app/admin/products/form/page');
  return <ProductFormContentInner isDrawer onSuccess={onSuccess} />;
}

// Main Export with SafeAreaProvider
export default function AdminProductsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminProductsContent />
    </SafeAreaProvider>
  );
}
