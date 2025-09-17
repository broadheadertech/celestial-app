'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Heart,
  Plus,
  Minus,
  Calendar,
  Clock,
  Award,
  Shield,
  Check,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Product } from '@/types';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();

  // Fetch real product data from Convex
  const productQuery = useQuery(api.services.products.getProduct,
    params?.id ? { productId: params.id } : "skip"
  );
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { addItem } = useCartStore();

  // Redirect admins to admin dashboard
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'specs'>('details');
  const [addToCartFeedback, setAddToCartFeedback] = useState<string | null>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  // Use real product data from Convex
  const product = productQuery;
  const images = product?.images || [product?.image];

  // Loading state
  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading product...</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;

    addItem(product, quantity);

    // Show success feedback
    setAddToCartFeedback(`${quantity} item${quantity > 1 ? 's' : ''} added to cart!`);

    // Clear feedback after 3 seconds
    setTimeout(() => {
      setAddToCartFeedback(null);
    }, 3000);
  };

  const handleReserveNow = () => {
    if (!product) return;

    addItem(product, quantity);

    // Directly redirect to cart page
    router.push('/client/cart');
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Product Not Found</h2>
          <p className="text-muted mb-4">The product you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1" />
            <button
              onClick={toggleWishlist}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'text-red-500 fill-current' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="pb-24">
        {/* Product Images */}
        <div className="px-6 py-4">
          <div className="relative mb-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-secondary">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Badges */}
            {product.badge && (
              <div className="absolute top-4 left-4 bg-primary px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">{product.badge}</span>
              </div>
            )}

            {product.originalPrice && product.originalPrice > product.price && (
              <div className="absolute top-4 right-4 bg-green-500 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </span>
              </div>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm">
                  {selectedImageIndex + 1}/{images.length}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div className="flex space-x-2" ref={imageScrollRef}>
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 ${
                    index === selectedImageIndex
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-6">
          {/* Title and Rating */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
            {product.rating && (
              <div className="flex items-center">
                <div className="flex items-center mr-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-400'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white text-sm mr-2">{product.rating}</span>
                <span className="text-muted text-sm">({product.reviews} reviews)</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <span className="text-3xl font-bold text-primary mr-3">
                ₱{product.price.toLocaleString()}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-muted line-through">
                  ₱{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-green-400 mr-2" />
              <span className={`text-sm ${
                product.stock > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Quantity</h3>
            <div className="flex items-center">
              <button
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                className="w-12 h-12 rounded-xl bg-secondary border border-white/10 flex items-center justify-center disabled:opacity-50"
                disabled={quantity <= 1}
              >
                <Minus className="w-5 h-5 text-white" />
              </button>
              <span className="mx-6 text-xl font-semibold text-white">{quantity}</span>
              <button
                onClick={() => quantity < product.stock && setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-xl bg-secondary border border-white/10 flex items-center justify-center disabled:opacity-50"
                disabled={quantity >= product.stock}
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex bg-secondary rounded-xl p-1">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 rounded-lg text-center transition-colors ${
                  activeTab === 'details'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`flex-1 py-3 rounded-lg text-center transition-colors ${
                  activeTab === 'specs'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                Specifications
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">About This Product</h3>
              <p className="text-muted leading-relaxed mb-4">{product.description}</p>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-white">Premium quality guaranteed</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-white">Healthy and disease-free</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-white">Expert care instructions included</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Specifications</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-muted">SKU</span>
                  <span className="text-white">{product.sku}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-muted">Lifespan</span>
                  <span className="text-white">{product.lifespan}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-muted">Stock Status</span>
                  <span className={`${
                    product.stock > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-muted">Category</span>
                  <span className="text-white">Aquarium Fish</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Cart Feedback */}
      {addToCartFeedback && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg border border-green-400/20">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2 text-white" />
              <span className="font-medium">{addToCartFeedback}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 px-6 py-4">
        <div className="flex space-x-3">
          <Button
            onClick={handleAddToCart}
            variant="outline"
            className="flex-1"
            disabled={product.stock === 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
          </Button>
          <Button
            onClick={handleReserveNow}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={product.stock === 0}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Reserve Now
          </Button>
        </div>
      </div>
    </div>
  );
}
