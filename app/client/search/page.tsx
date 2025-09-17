'use client';

import { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/ui/ProductCard';
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
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
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

      {/* Enhanced Products Grid/List */}
      <div className="px-4 py-4">
        {filteredProducts.length === 0 ? (
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
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
              : 'space-y-3'
          }>
            {filteredProducts.map((product) => (
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
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/client/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <Search className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Search</span>
          </button>
          <button
            onClick={() => router.push('/client/cart')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-xs">Cart</span>
          </button>
          <button
            onClick={() => router.push('/client/profile')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />
    </div>
  );
}