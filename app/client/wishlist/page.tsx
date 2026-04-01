'use client';

import React from 'react';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Trash2,
  Package,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import Card from '@/components/ui/Card';
import ClientBottomNavbar from '@/components/client/ClientBottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

function WishlistContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { addItem } = useCartStore();

  const wishlistItems = useQuery(
    api.services.wishlist.getWishlist,
    isAuthenticated && user?._id
      ? { userId: user._id as Id<"users"> }
      : "skip"
  );

  const removeFromWishlist = useMutation(api.services.wishlist.removeFromWishlist);

  const handleRemove = async (productId: string) => {
    if (!user?._id) return;
    try {
      await removeFromWishlist({
        userId: user._id as Id<"users">,
        productId: productId as Id<"products">,
      });
    } catch (error) {
      console.error('Remove from wishlist failed:', error);
    }
  };

  const handleAddToCart = (product: any) => {
    if (product.stock <= 0) return;
    addItem(product, 1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card variant="modern" padding="lg" className="text-center border border-white/10 max-w-sm">
          <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sign In Required</h3>
          <p className="text-sm text-white/60 mb-4">
            Please sign in to view your wishlist.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all"
          >
            Sign In
          </button>
        </Card>
      </div>
    );
  }

  const isLoading = wishlistItems === undefined;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">My Wishlist</h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">
                {wishlistItems ? `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''}` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading wishlist...</p>
          </div>
        ) : wishlistItems && wishlistItems.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {wishlistItems.map((item) => {
              const product = item.product;
              if (!product) return null;

              const isOutOfStock = product.stock <= 0;

              return (
                <Card
                  key={item._id}
                  variant="modern"
                  padding="none"
                  className="border border-white/10 overflow-hidden"
                >
                  <div className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <button
                      onClick={() => router.push(`/client/product-detail?id=${product._id}`)}
                      className="flex-shrink-0"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-secondary border border-white/10">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-white/30" />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/client/product-detail?id=${product._id}`)}
                        className="text-left w-full"
                      >
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {product.name}
                        </h3>
                      </button>

                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm sm:text-base font-bold text-primary">
                          {formatCurrency(product.price)}
                        </p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <p className="text-xs text-white/40 line-through">
                            {formatCurrency(product.originalPrice)}
                          </p>
                        )}
                      </div>

                      <p className={`text-xs mt-1 ${isOutOfStock ? 'text-error' : 'text-success'}`}>
                        {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleAddToCart(product as any)}
                          disabled={isOutOfStock}
                          className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
                        </button>
                        <button
                          onClick={() => handleRemove(product._id)}
                          className="p-2 rounded-lg bg-error/10 border border-error/20 text-error hover:bg-error/20 active:scale-95 transition-all touch-manipulation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Your wishlist is empty</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-6">
              Browse products and tap the heart icon to save them here.
            </p>
            <button
              onClick={() => router.push('/client/categories')}
              className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all"
            >
              Browse Products
            </button>
          </div>
        )}
      </div>

      <ClientBottomNavbar />
    </div>
  );
}

export default function WishlistPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <WishlistContent />
    </SafeAreaProvider>
  );
}
