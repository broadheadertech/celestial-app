'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingCart,
  User,
  Search,
  Bell,
  Gift,
  Star,
  Zap,
  TrendingUp,
  Package,
  ChevronRight,
  Crown,
  Shield,
  MapPin,
  CalendarCheck,
  Fish,
  Droplet,
  Leaf,
  Box,
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated, useIsGuest } from '@/store/auth';
import { useCartItemCount, useCartStore } from '@/store/cart';
import { Product } from '@/types';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/ui/ProductCard';

export default function ClientDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, getItemById, updateQuantity } = useCartStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const cartItemCount = useCartItemCount();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch data from Convex
  const productsQuery = useQuery(api.services.products.getProducts, { isActive: true }) || [];

  const displayName = isAuthenticated && user
    ? user.firstName || 'User'
    : 'Guest';

  // Banner auto-rotation (image-based)
  const banners = [
    { id: 1, src: '/banner/ban1.jpg', alt: 'Banner 1' },
    { id: 2, src: '/banner/ban2.jpg', alt: 'Banner 2' },
    { id: 3, src: '/banner/ban3.jpg', alt: 'Banner 3' },
    { id: 4, src: '/banner/ban4.jpg', alt: 'Banner 4' }
  ];

  // Redirect admins and super_admins to their respective dashboards
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      setIsRedirecting(true);
      router.push('/admin/dashboard');
    } else if (isAuthenticated && user?.role === 'super_admin') {
      setIsRedirecting(true);
      router.push('/control_panel');
    }
  }, [isAuthenticated, user?.role, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Essential categories with natural aquatic theme
  const featuredCategories = [
    { key: 'tropical', icon: Fish, name: 'Tropical Fish' },
    { key: 'freshwater', icon: Droplet, name: 'Freshwater' },
    { key: 'tanks', icon: Box, name: 'Aquarium Tanks' },
    { key: 'plants', icon: Leaf, name: 'Live Plants' }
  ];

  // Get featured/trending products
  const limitedStockProducts = productsQuery.slice(0, 6);
  const newArrivals = productsQuery.slice(6, 12);
  const topRated = productsQuery.slice(12, 18);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CD</span>
              </div>
              <div>
                <p className="text-xs text-primary font-medium">Welcome back!</p>
                <p className="text-sm font-bold text-white">{displayName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/client/notifications')}
                className="relative p-2 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-colors"
              >
                <Bell className="w-5 h-5 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </button>

              <button
                onClick={() => router.push('/client/cart')}
                className="relative p-2 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3 relative">
            <button
              onClick={() => router.push('/client/search')}
              className="w-full flex items-center px-4 py-2.5 bg-secondary/60 border border-white/10 rounded-xl text-left transition-colors hover:bg-secondary/80"
            >
              <Search className="w-4 h-4 text-white/50 mr-3" />
              <span className="text-white/50 text-sm">Search for aquatic products...</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {/* Hero Banner */}
        <div className="px-4 pt-4 mb-4">
          <div className="relative h-32 rounded-xl overflow-hidden">
            <Image
              src={banners[currentBannerIndex].src}
              alt={banners[currentBannerIndex].alt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            <button
              aria-label="Open search"
              onClick={() => router.push('/client/search')}
              className="absolute inset-0"
            />

            {/* Banner indicators */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentBannerIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Service Features (Reservation-focused) */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: CalendarCheck, text: 'Easy Reservations', color: 'text-blue-400' },
              { icon: MapPin, text: 'In-Store Pickup', color: 'text-green-400' },
              { icon: Crown, text: 'Premium Quality', color: 'text-yellow-400' },
            ].map((feature, index) => (
              <div key={index} className="bg-secondary/40 backdrop-blur-sm rounded-lg p-3 text-center">
                <feature.icon className={`w-5 h-5 mx-auto mb-1 ${feature.color}`} />
                <p className="text-xs text-white/70 font-medium">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white">Categories</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/client/categories')}
              className="text-primary"
            >
              See All
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {featuredCategories.map((category) => {
              const colorMap = {
                'tropical': 'from-amber-600 to-orange-700 shadow-amber-600/20',
                'freshwater': 'from-slate-600 to-slate-700 shadow-slate-600/20',
                'tanks': 'from-stone-600 to-gray-700 shadow-stone-600/20',
                'plants': 'from-teal-700 to-green-800 shadow-teal-700/20'
              };

              return (
                <button
                  key={category.key}
                  onClick={() => router.push(`/client/search?category=${category.key}`)}
                  className="group relative overflow-hidden"
                  aria-label={category.name}
                >
                  <div className={`w-full h-16 rounded-xl bg-gradient-to-r ${colorMap[category.key as keyof typeof colorMap]} shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="h-full flex items-center px-4 space-x-3 relative z-10">
                      <div className="p-1.5 bg-white/15 rounded-md backdrop-blur-sm border border-white/10">
                        <category.icon className="w-4 h-4 text-white/90" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium text-white/90 block leading-tight">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Limited Stocks Section */}
        {limitedStockProducts.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Package className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-white">Limited Stocks</h3>
                  </div>
                  <div className="flex items-center space-x-1 bg-orange-500/20 px-2 py-1 rounded-full">
                    <span className="text-xs text-orange-400 font-medium">🔥 Running Out</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/client/search')}
                  className="text-primary"
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex space-x-3 px-4">
                {limitedStockProducts.map((product) => (
                  <div key={product._id} className="min-w-[160px] max-w-[160px]">
                    <ProductCard
                      product={product}
                      cartItem={getItemById(product._id)}
                      viewMode="grid"
                      onAddToCart={handleAddToCart}
                      onQuantityChange={handleQuantityChange}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-white">New Arrivals</h3>
                  <div className="bg-blue-500/20 px-2 py-0.5 rounded-full">
                    <span className="text-xs text-blue-400 font-medium">Fresh Stock!</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/client/search?sort=newest')}
                  className="text-primary"
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="px-4">
              <div className="grid grid-cols-2 gap-3">
                {newArrivals.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    cartItem={getItemById(product._id)}
                    viewMode="grid"
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    onClick={handleProductClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-white">Top Rated</h3>
                  <div className="bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    <span className="text-xs text-yellow-400 font-medium">⭐ 4.8+</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/client/search?sort=rating')}
                  className="text-primary"
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex space-x-3 px-4">
                {topRated.slice(0, 6).map((product) => (
                  <div key={product._id} className="min-w-[160px] max-w-[160px]">
                    <ProductCard
                      product={product}
                      cartItem={getItemById(product._id)}
                      viewMode="grid"
                      onAddToCart={handleAddToCart}
                      onQuantityChange={handleQuantityChange}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && (
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-r from-primary/20 to-orange-600/20 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white mb-1">Join Celestial Drakon!</h3>
                  <p className="text-sm text-white/70">Create an account to save favorites, track orders, and get exclusive deals!</p>
                </div>
                <Button
                  onClick={() => router.push('/auth/register')}
                  size="sm"
                  className="bg-primary/90 hover:bg-primary"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* For You Section (if authenticated) */}
        {isAuthenticated && productsQuery.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-white">Recommended for You</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/client/search')}
                  className="text-primary"
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="px-4">
              <div className="grid grid-cols-2 gap-3">
                {productsQuery.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    cartItem={getItemById(product._id)}
                    viewMode="grid"
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    onClick={handleProductClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recently Viewed (placeholder) */}
        {isAuthenticated && (
          <div className="px-4 mb-6">
            <h3 className="font-bold text-white mb-3">Recently Viewed</h3>
            <div className="bg-secondary/30 rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 text-sm">Start browsing to see your recently viewed products</p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-white/10">
        <div className="grid grid-cols-4 py-1">
          <button
            onClick={() => router.push('/client/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-primary"
          >
            <div className="relative">
              <Package className="w-5 h-5 mb-1" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </div>
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => router.push('/client/search')}
            className="flex flex-col items-center py-2 px-3 text-white/60 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5 mb-1" />
            <span className="text-xs">Search</span>
          </button>

          <button
            onClick={() => router.push('/client/cart')}
            className="relative flex flex-col items-center py-2 px-3 text-white/60 hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-xs">Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-0 right-2 min-w-[16px] h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push('/client/profile')}
            className="flex flex-col items-center py-2 px-3 text-white/60 hover:text-white transition-colors"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}