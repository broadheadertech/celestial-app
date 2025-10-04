'use client';

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  Grid,
  List,
  ShoppingCart,
  User,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/ui/ProductCard';
import ClientBottomNavbar from '@/components/client/ClientBottomNavbar';
import { Product } from '@/types';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, getItemById, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'all');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const PRODUCTS_PER_PAGE = 15;
  const topRef = useRef<HTMLDivElement>(null);

  // Fetch real products data from Convex
  const productsQuery = useQuery(api.services.products.getProducts,
    { isActive: true }
  ) || [];

  // Fetch categories from Convex
  const categoriesQuery = useQuery(api.services.categories.getCategories,
    { isActive: true }
  ) || [];

  const filteredProducts = useMemo(() => {
    let filtered = productsQuery;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        const category = categoriesQuery.find(cat => cat._id === product.categoryId);
        return category?.name?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  }, [productsQuery, categoriesQuery, searchQuery, selectedCategory, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setIsLoading(true);
    setCurrentPage(page);
    
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsLoading(false);
    }, 100);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    addItem(product, 1);
  };

  const handleQuantityChange = (product: Product, change: number) => {
    const cartItem = getItemById(product._id);
    const currentQuantity = cartItem?.quantity || 0;
    const newQuantity = Math.max(0, Math.min(product.stock, currentQuantity + change));

    if (newQuantity === 0) return;
    updateQuantity(product._id, newQuantity);
  };

  const handleProductClick = (product: Product) => {
    router.push(`/client/product-detail?id=${product._id}`);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('default');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      {/* Compact Header with Safe Area */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 sm:p-2.5 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 hover:border-primary/30 transition-all active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 bg-secondary/60 border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors active:scale-95"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80 hover:border-primary/30'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      {showFilters && (
        <div className="bg-secondary/60 backdrop-blur-sm border-b border-white/10 px-3 sm:px-4 py-3 sm:py-4 animate-in slide-in-from-top duration-200">
          <div className="space-y-3 sm:space-y-4">
            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <label className="text-xs sm:text-sm font-medium text-white">Categories</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All Products' },
                  ...categoriesQuery.map(category => ({
                    value: category.name.toLowerCase(),
                    label: category.name
                  }))
                ].map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm border transition-all font-medium active:scale-95 ${
                      selectedCategory === category.value
                        ? 'bg-primary border-primary text-white shadow-lg'
                        : 'border-white/10 text-white/70 hover:text-white hover:border-primary/30 hover:bg-primary/10'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <label className="text-xs sm:text-sm font-medium text-white">Sort by</label>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2.5 sm:p-3 bg-secondary/60 border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
              >
                <option value="default">✨ Featured</option>
                <option value="price-low">💰 Price: Low to High</option>
                <option value="price-high">💎 Price: High to Low</option>
                <option value="rating">⭐ Highest Rated</option>
                <option value="newest">🔥 Newest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Compact View Toggle & Results Info */}
      <div className="sticky top-[57px] sm:top-[61px] z-40 bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></div>
            <p className="text-xs sm:text-sm text-white/70 font-medium truncate">
              <span className="hidden sm:inline">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </span>
              <span className="sm:hidden">
                {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </span>
            </p>
          </div>
          <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 sm:p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-md transition-all active:scale-95 ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-md transition-all active:scale-95 ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-sm sm:text-base text-white/60 mb-6 max-w-sm mx-auto">
              We couldn't find any products matching your criteria. Try adjusting your search or filters.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mb-6">
              <Button
                onClick={clearAllFilters}
                className="bg-primary/20 border border-primary/30 hover:bg-primary/30 text-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
              <Button
                onClick={() => router.push('/client/categories')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-sm active:scale-95"
              >
                Browse Categories
              </Button>
            </div>

            {/* Popular suggestions */}
            {productsQuery.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <h4 className="text-xs sm:text-sm font-medium text-white/80 mb-3 sm:mb-4">Popular Products</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto">
                  {productsQuery.slice(0, 6).map((product) => (
                    <button
                      key={product._id}
                      onClick={() => router.push(`/client/product-detail?id=${product._id}`)}
                      className="p-2.5 sm:p-3 bg-secondary/50 rounded-xl border border-white/10 hover:bg-secondary/70 transition-colors text-left active:scale-95"
                    >
                      <p className="text-xs sm:text-sm font-medium text-white line-clamp-2">{product.name}</p>
                      <p className="text-xs text-primary mt-1">₱{product.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Loading Overlay */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" />
                  <span className="text-white/70 text-xs sm:text-sm">Loading products...</span>
                </div>
              </div>
            )}

            {/* Products Grid/List */}
            {!isLoading && (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4'
                  : 'space-y-2.5 sm:space-y-3'
              }>
                {currentProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    cartItem={getItemById(product._id)}
                    viewMode={viewMode}
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    onClick={handleProductClick}
                  />
                ))}
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="mt-6 sm:mt-8 mb-4">
                {/* Desktop Pagination */}
                <div className="hidden sm:flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-all ${
                      currentPage === 1
                        ? 'border-white/10 text-white/30 cursor-not-allowed'
                        : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                    }`}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-all ${
                      currentPage === 1
                        ? 'border-white/10 text-white/30 cursor-not-allowed'
                        : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                    }`}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {getPageNumbers().map((page, index) => (
                      typeof page === 'number' ? (
                        <button
                          key={index}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-[40px] h-10 px-3 rounded-lg border font-medium text-sm transition-all active:scale-95 ${
                            currentPage === page
                              ? 'bg-primary border-primary text-white shadow-lg'
                              : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30'
                          }`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={index} className="px-2 text-white/50">...</span>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-all ${
                      currentPage === totalPages
                        ? 'border-white/10 text-white/30 cursor-not-allowed'
                        : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                    }`}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-all ${
                      currentPage === totalPages
                        ? 'border-white/10 text-white/30 cursor-not-allowed'
                        : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                    }`}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Pagination */}
                <div className="sm:hidden">
                  {/* Page Info */}
                  <div className="text-center mb-3">
                    <span className="text-xs text-white/70">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  {/* Mobile Pagination Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className={`flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        currentPage === 1
                          ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                      }`}
                    >
                      First
                    </button>

                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`flex-1 p-2.5 rounded-lg border transition-all ${
                        currentPage === 1
                          ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4 mx-auto" />
                    </button>

                    <div className="flex items-center gap-1">
                      {[
                        currentPage > 1 ? currentPage - 1 : null,
                        currentPage,
                        currentPage < totalPages ? currentPage + 1 : null
                      ].filter(Boolean).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page!)}
                          className={`min-w-[36px] h-9 px-2 rounded-lg border text-xs font-medium transition-all active:scale-95 ${
                            currentPage === page
                              ? 'bg-primary border-primary text-white shadow-lg'
                              : 'border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`flex-1 p-2.5 rounded-lg border transition-all ${
                        currentPage === totalPages
                          ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>

                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        currentPage === totalPages
                          ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/10 text-white hover:bg-white/10 hover:border-primary/30 active:scale-95'
                      }`}
                    >
                      Last
                    </button>
                  </div>
                </div>

                {/* Page Jump (Optional - for desktop) */}
                <div className="hidden lg:flex items-center justify-center gap-2 mt-4">
                  <span className="text-xs text-white/60">Jump to page:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        handlePageChange(page);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-secondary/60 border border-white/10 rounded-lg text-white text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />

      {/* Bottom padding for mobile navbar with safe area */}
      <div className="h-16 sm:h-20 safe-area-bottom" />
    </div>
  );
}

export default function SearchPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <Suspense fallback={
        <div className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8 safe-area-container">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm sm:text-base text-white/60">Loading search...</p>
            </div>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </SafeAreaProvider>
  );
}