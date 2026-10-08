'use client';

import { useCallback, useState } from 'react';
import {
  Heart,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import type { Product } from '@/types';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { MenuIcon } from '@/components/dc/kit/icons';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

function WishlistContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { addItem } = useCartStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    addItem(product, 1);
  };

  const isLoading = wishlistItems === undefined;

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="wishlist" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
          <div className="dk-app-top">
            <div className="dk-app-top-l">
              <button
                type="button"
                className="dk-view-btn dk-app-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon />
              </button>
              <div>
                <h1>My Wishlist</h1>
                {isAuthenticated && (
                  <p className="dk-muted" style={{ fontSize: 14, marginTop: 2 }} aria-live="polite">
                    {wishlistItems ? `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="dk-panel dk-app-section" style={{ padding: 0 }}>
              <EmptyState
                icon={<Heart size={26} aria-hidden="true" />}
                title="Sign In Required"
                actions={
                  <button type="button" className="dk-btn dk-btn-red" onClick={() => router.push('/auth/login')}>
                    Sign In
                  </button>
                }
              >
                Please sign in to view your wishlist.
              </EmptyState>
            </div>
          ) : isLoading ? (
            <div className="dk-member-empty" role="status">
              <p>Loading wishlist...</p>
            </div>
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <div className="dk-app-section dk-stack" style={{ gap: 12 }}>
              {wishlistItems.map((item) => {
                const product = item.product;
                if (!product) return null;

                const isOutOfStock = product.stock <= 0;

                return (
                  <article
                    key={item._id}
                    className="dk-panel"
                    style={{ padding: 12, display: 'flex', gap: 16, alignItems: 'center' }}
                  >
                    {/* Product Image */}
                    <button
                      type="button"
                      onClick={() => router.push(`/client/product-detail?id=${product._id}`)}
                      aria-label={`View ${product.name}`}
                      style={{ position: 'relative', flex: 'none', width: 104, height: 104, padding: 0, border: 0, background: 'none', borderRadius: 'var(--dk-r-sm)', overflow: 'hidden' }}
                    >
                      <Placeholder src={product.image} alt={product.name} contain style={{ width: '100%', height: '100%', borderRadius: 'var(--dk-r-sm)', fontSize: 0, gap: 0 }} />
                    </button>

                    {/* Product Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        className="dk-pc-name"
                        onClick={() => router.push(`/client/product-detail?id=${product._id}`)}
                        title={product.name}
                      >
                        {product.name}
                      </button>

                      <div className="dk-row" style={{ gap: 8, marginTop: 4 }}>
                        <p style={{ fontFamily: 'var(--dk-f-display)', fontWeight: 800, fontSize: 16 }}>
                          {formatCurrency(product.price)}
                        </p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <s className="dk-muted" style={{ fontSize: 12 }}>
                            {formatCurrency(product.originalPrice)}
                          </s>
                        )}
                      </div>

                      <p style={{ marginTop: 6 }}>
                        <span className={`dk-status${isOutOfStock ? ' black' : ''}`}>
                          {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                        </span>
                      </p>

                      {/* Actions */}
                      <div className="dk-row" style={{ gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className="dk-btn dk-btn-red plain"
                        >
                          <ShoppingCart size={15} aria-hidden="true" />
                          <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(product._id)}
                          className="dk-view-btn"
                          aria-label={`Remove ${product.name} from wishlist`}
                          style={{ width: 40, height: 40, borderRadius: '50%', color: 'var(--dk-red)' }}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="dk-panel dk-app-section" style={{ padding: 0 }}>
              <EmptyState
                icon={<Heart size={26} aria-hidden="true" />}
                title="Your wishlist is empty"
                actions={
                  <button type="button" className="dk-btn dk-btn-red" onClick={() => router.push('/client/categories')}>
                    Browse Products
                  </button>
                }
              >
                Browse products and tap the heart icon to save them here.
              </EmptyState>
            </div>
          )}
        </section>
      </div>
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
