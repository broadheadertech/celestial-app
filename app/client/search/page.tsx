'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/ui/ProductCard';
import ClientBottomNavbar from '@/components/client/ClientBottomNavbar';
import { Product } from '@/types';

export default function SearchPage() {
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

  // Lazy loading states
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Constants for pagination
  const PRODUCTS_PER_PAGE = 12;
  const INITIAL_LOAD_COUNT = 8;

  // Refs for intersection observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

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
        // Find the category name by ID
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

  // Load more products function
  const loadMoreProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const startIndex = isInitialLoad ? 0 : displayedProducts.length;
    const endIndex = startIndex + (isInitialLoad ? INITIAL_LOAD_COUNT : PRODUCTS_PER_PAGE);
    const newProducts = filteredProducts.slice(startIndex, endIndex);

    if (newProducts.length === 0) {
      setHasMore(false);
    } else {
      setDisplayedProducts(prev =>
        isInitialLoad ? newProducts : [...prev, ...newProducts]
      );
      setCurrentPage(prev => prev + 1);
    }

    setIsInitialLoad(false);
    setIsLoading(false);
  }, [filteredProducts, displayedProducts, isLoading, hasMore, isInitialLoad]);

  // Reset displayed products when filters change
  useEffect(() => {
    setDisplayedProducts([]);
    setCurrentPage(1);
    setHasMore(true);
    setIsInitialLoad(true);
  }, [searchQuery, selectedCategory, sortBy]);

  // Initial load and when filteredProducts change
  useEffect(() => {
    if (filteredProducts.length > 0 && displayedProducts.length === 0) {
      loadMoreProducts();
    }
  }, [filteredProducts, loadMoreProducts, displayedProducts.length]);

  // Update hasMore when filteredProducts change
  useEffect(() => {
    const totalAvailable = filteredProducts.length;
    const currentlyDisplayed = displayedProducts.length;
    setHasMore(currentlyDisplayed < totalAvailable);
  }, [filteredProducts.length, displayedProducts.length]);

  // Intersection Observer for infinite scroll
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreProducts();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMoreProducts]);

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
    router.push(`/client/product/${product._id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 hover:border-primary/30 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search aquatic products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <span className="w-3 h-3 text-white/50 text-xs">×</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80 hover:border-primary/30'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      {showFilters && (
        <div className="bg-secondary/60 backdrop-blur-sm border-b border-white/10 px-4 py-4 animate-in slide-in-from-top duration-200">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-white">Categories</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    className={`p-3 rounded-lg text-sm border transition-all font-medium ${
                      selectedCategory === category.value
                        ? 'bg-primary border-primary text-white shadow-lg scale-95'
                        : 'border-white/10 text-white/70 hover:text-white hover:border-primary/30 hover:bg-primary/10'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-white">Sort by</label>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
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

      {/* Enhanced View Toggle */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <p className="text-sm text-white/70 font-medium">
              {displayedProducts.length} of {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} shown
            </p>
          </div>
          <div className="flex items-center bg-secondary/60 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Products Grid/List with Lazy Loading */}
      <div className="px-4 py-4">
        {filteredProducts.length === 0 && !isInitialLoad ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-white/60 mb-6 max-w-sm mx-auto">
              We couldn't find any products matching your criteria. Try adjusting your search or filters.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSortBy('default');
              }}
              className="bg-primary/20 border border-primary/30 hover:bg-primary/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Products Grid/List */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
                : 'space-y-3'
            }>
              {displayedProducts.map((product, index) => (
                <div
                  key={product._id}
                  ref={index === displayedProducts.length - 1 ? lastProductElementRef : null}
                >
                  <ProductCard
                    product={product}
                    cartItem={getItemById(product._id)}
                    viewMode={viewMode}
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    onClick={handleProductClick}
                  />
                </div>
              ))}
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-white/70 text-sm">Loading more products...</span>
                </div>
              </div>
            )}

            {/* Load More Button (fallback for manual loading) */}
            {!isLoading && hasMore && displayedProducts.length > 0 && (
              <div className="flex justify-center py-6">
                <Button
                  onClick={loadMoreProducts}
                  className="bg-secondary/60 border border-white/10 hover:bg-secondary/80 hover:border-primary/30 transition-all"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Load More Products
                </Button>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && displayedProducts.length > 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-success/20 to-primary/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-success" />
                </div>
                <p className="text-white/60 text-sm">
                  You've seen all {filteredProducts.length} products!
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />

      {/* Bottom padding */}
      <div className="h-16" />
    </div>
  );
}