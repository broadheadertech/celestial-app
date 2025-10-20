'use client';

import React, { useState, useMemo } from 'react';
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
  Image as ImageIcon,
  RefreshCw,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

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

function AdminProductsContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Convex queries
  const products = useQuery(api.services.admin.getAllProductsAdmin);
  const categories = useQuery(api.services.categories.getCategories);
  
  // Convex mutations
  const toggleProductStatus = useMutation(api.services.admin.toggleProductStatus);

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
        console.error('Failed to toggle product status:', error);
      }
    } else if (action === 'Delete') {
      console.log('Delete product:', productId);
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header - Mobile Optimized with Safe Area */}
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
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Product Management</h1>
                <p className="text-xs sm:text-sm text-white/60 hidden xs:block truncate">Manage inventory and listings</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/admin/products/form')}
              className="px-2.5 sm:px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-1 sm:gap-2 hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Add</span>
            </button>
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

      {/* Stats - Horizontal Scroll on Mobile with Safe Area */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {statsArray.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-secondary/40 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-white/10"
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

      {/* Filters Panel with Safe Area */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
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
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
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
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
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
      
      {/* Products List with Safe Area */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
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
            <div className="space-y-2.5 sm:space-y-4">
              {paginatedProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const discount = (product.originalPrice && product.originalPrice > product.price) ? 
                  Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
                
                const getItemStatus = (prod: typeof product) => {
                  if (!prod.isActive) return 'inactive';
                  if (prod.stock === 0) return 'out_of_stock';
                  return 'active';
                };
                
                const itemStatus = getItemStatus(product);
                const categoryName = categoryMap[product.categoryId] || 'Unknown Category';
                
                return (
                  <div
                    key={product._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:border-primary/30 ${
                      itemStatus === 'out_of_stock' 
                        ? 'border-error/30 bg-error/5' 
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex gap-2.5 sm:gap-4">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center">
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
                              className="w-8 h-8 sm:w-12 sm:h-12 object-contain opacity-60"
                            />
                          )}
                        </div>
                        {product.badge && (
                          <div className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.5 rounded bg-primary">
                            <span className="text-[10px] sm:text-xs font-bold text-foreground">
                              {product.badge === 'Bestseller' ? '★' : product.badge.charAt(0)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute -bottom-1 -left-1 px-1 sm:px-1.5 py-0.5 rounded bg-error">
                            <span className="text-[10px] sm:text-xs font-bold text-foreground">
                              -{discount}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white mb-1 text-sm sm:text-base truncate pr-2">
                              {product.name || 'Unnamed Product'}
                            </h3>
                            <p className="text-xs sm:text-sm text-white/60 mb-0.5 sm:mb-1 truncate">{categoryName}</p>
                            <p className="text-[10px] sm:text-xs text-white/40">
                              ID: {product._id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                          
                          {/* Actions Menu */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => setSelectedProduct(selectedProduct === product._id ? null : product._id)}
                              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                            >
                              <MoreVertical className="w-5 h-5 text-white/60" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm sm:text-lg font-bold text-white">
                            {formatCurrency(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs sm:text-sm text-white/50 line-through">
                              {formatCurrency(product.originalPrice)}
                            </span>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                          <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium ${
                            itemStatus === 'active' ? 'bg-success/10 text-success border border-success/30' :
                            itemStatus === 'inactive' ? 'bg-muted/10 text-muted border border-muted/30' :
                            'bg-error/10 text-error border border-error/30'
                          }`}>
                            {itemStatus.replace('_', ' ')}
                          </div>
                          
                          <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium ${stockStatus.color} ${stockStatus.textColor} border ${
                            stockStatus.textColor === 'text-success' ? 'border-success/30' :
                            stockStatus.textColor === 'text-warning' ? 'border-warning/30' :
                            'border-error/30'
                          }`}>
                            {product.stock} in stock
                          </div>
                        </div>
                        
                        {/* Action Buttons and Date */}
                        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/10">
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/60">
                            <span className="hidden xs:inline">Created:</span>
                            <span>{new Date(product.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: '2-digit'
                            })}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={() => router.push(`/admin/product-detail?id=${product._id}`)}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
                            >
                              View
                            </button>
                            
                            <button
                              onClick={() => router.push(`/admin/products/form?id=${product._id}`)}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-primary text-white text-[10px] sm:text-xs hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
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

                {/* Mobile & Desktop: Show current page info */}
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

      {/* Mobile-Optimized Action Sheet */}
      {selectedProduct && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setSelectedProduct(null)}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-secondary/95 backdrop-blur-md border-t border-white/10 rounded-t-3xl shadow-2xl">
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
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
    </div>
  );
}

// Main Export with SafeAreaProvider
export default function AdminProductsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminProductsContent />
    </SafeAreaProvider>
  );
}