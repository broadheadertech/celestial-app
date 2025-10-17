'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Plus,
  Minus,
  Calendar,
  Clock,
  Award,
  Shield,
  Hash,
  Container,
  Droplets,
  Filter,
  Fish,
  Globe,
  Lightbulb,
  Ruler,
  Thermometer,
  Utensils,
  X,
  Eye,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Button from '@/components/ui/Button';
import { Product } from '@/types';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

interface TankData {
  _id: string;
  productId: string;
  tankType: string;
  material: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  thickness: number;
  lighting: number;
  filtation: number;
  _creationTime: number;
}

interface FishData {
  _id: string;
  productId: string;
  scientificName: string;
  weight?: number;
  size: number;
  temperature: number;
  age: number;
  phLevel: string;
  lifespan: string;
  origin: string;
  diet: string;
  _creationTime: number;
}

function ProductDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get product ID from query parameter
  const productId = searchParams.get('id');

  // Fetch real product data from Convex
  const productQuery = useQuery(api.services.products.getProduct,
    productId ? { productId: productId as Id<"products"> } : "skip"
  );

  // Fetch fish and tank data based on product ID (only after product is loaded)
  const tankData = useQuery(api.services.products.getTankByProductId,
    productId && productQuery ? { productId: productId as Id<"products"> } : "skip"
  );

  const fishData = useQuery(api.services.products.getFishByProductId,
    productId && productQuery ? { productId: productId as Id<"products"> } : "skip"
  );

  // Fetch top reserved products to check if current product is most reserved
  const topReservedProducts = useQuery(api.services.products.getTopRatedProducts,
    { limit: 10 }
  ) || [];

  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { addItem } = useCartStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'specs'>('details');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

  const product = productQuery as Product | undefined;
  const images = product?.images && product.images.length > 0 ? product.images : [product?.image].filter(Boolean);

  // Swipe handlers for image gallery
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
    if (isRightSwipe && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAddingToCart(true);
    try {
      addItem(product as Product, quantity);
      // Show success feedback here if needed
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleReserveNow = async () => {
    if (!product) return;

    setIsAddingToCart(true);
    try {
      addItem(product as Product, quantity);
      router.push('/client/cart');
    } catch (error) {
      console.error('Failed to reserve:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Helper function to check if there's a discount
  const hasDiscount = (): boolean => {
    if (!product) return false;
    return !!(product.originalPrice && product.originalPrice > product.price);
  };

  const getDiscountPercentage = (): number => {
    if (!hasDiscount() || !product?.originalPrice) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  };

  // Check if current product is in the most reserved list (top 10)
  const isMostReserved = (): boolean => {
    if (!product || !topReservedProducts || topReservedProducts.length === 0) return false;
    return topReservedProducts.some(topProduct => topProduct._id === product._id);
  };

  // Tank specifications component
  const TankSpecs = ({ data }: { data: TankData }) => (
    <div className="space-y-3">
      {/* Tank Type & Material */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Container className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-blue-400 font-medium">Tank Type</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white truncate">{data.tankType}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-green-400 font-medium">Material</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white truncate">{data.material}</p>
        </div>
      </div>

      {/* Capacity */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-1.5 sm:mb-2">
          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm text-cyan-400 font-medium">Capacity</span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-white">{data.capacity}L</p>
      </div>

      {/* Dimensions */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-2 sm:mb-3">
          <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm text-yellow-500 font-medium">Dimensions (L × W × H)</span>
        </div>
        <p className="text-base sm:text-2xl font-bold text-white text-center">
          {data.dimensions.length} × {data.dimensions.width} × {data.dimensions.height} cm
        </p>
      </div>

      {/* Technical Specs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gray-400 flex items-center justify-center mr-1.5 sm:mr-2 flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">T</span>
            </div>
            <span className="text-xs sm:text-sm text-gray-400 font-medium">Thick</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white">{data.thickness}mm</p>
        </div>
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-yellow-300 font-medium">Light</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white">{data.lighting}W</p>
        </div>
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-green-500 font-medium">Filter</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white">{data.filtation}L/h</p>
        </div>
      </div>
    </div>
  );

  // Fish specifications component
  const FishSpecs = ({ data }: { data: FishData }) => (
    <div className="space-y-3">
      {/* Scientific Name */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-1.5 sm:mb-2">
          <Fish className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm text-blue-500 font-medium">Scientific Name</span>
        </div>
        <p className="text-sm sm:text-lg font-bold text-white italic break-words">{data.scientificName}</p>
      </div>

      {/* Physical Characteristics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-yellow-500 font-medium">Size</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-white">{data.size}&quot;</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-cyan-400 font-medium">Age</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-white">{data.age}mo</p>
        </div>
      </div>

      {/* Environmental Requirements */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-red-400 font-medium">Temp</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white">{data.temperature}°C</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-cyan-400 font-medium">pH</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white">{data.phLevel}</p>
        </div>
      </div>

      {/* Origin & Lifespan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-green-500 font-medium">Origin</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white truncate">{data.origin}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-1.5 sm:mb-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-yellow-500 font-medium">Lifespan</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-white truncate">{data.lifespan}</p>
        </div>
      </div>

      {/* Diet */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-1.5 sm:mb-2">
          <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm text-green-400 font-medium">Diet</span>
        </div>
        <p className="text-sm sm:text-lg font-bold text-white break-words">{data.diet}</p>
      </div>
    </div>
  );

  // Loading state
  if (!product) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4 safe-area-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  const discountPercentage = getDiscountPercentage();

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Fixed Header with Safe Area */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 bg-gradient-to-b from-[#121212] to-transparent safe-area-top">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      </div>

      <div className="pb-24 sm:pb-28 pt-16 safe-area-horizontal">
        {/* Main Product Image with Swipe Support */}
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <div 
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="w-full h-72 sm:h-80 md:h-96 rounded-2xl sm:rounded-3xl object-cover"
            />

            {/* Discount Badge */}
            {hasDiscount() && (
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#FF6B00] shadow-lg">
                <span className="text-white text-xs sm:text-sm font-bold">{discountPercentage}% OFF</span>
              </div>
            )}

            {/* Product Badge */}
            {product.badge && (
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#00D4AA] shadow-lg">
                <span className="text-white text-xs sm:text-sm font-bold">{product.badge}</span>
              </div>
            )}

            {/* Navigation Arrows for Desktop */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => selectedImageIndex > 0 && setSelectedImageIndex(selectedImageIndex - 1)}
                  className={`hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 transition-opacity ${
                    selectedImageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/80'
                  }`}
                  disabled={selectedImageIndex === 0}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => selectedImageIndex < images.length - 1 && setSelectedImageIndex(selectedImageIndex + 1)}
                  className={`hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 transition-opacity ${
                    selectedImageIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/80'
                  }`}
                  disabled={selectedImageIndex === images.length - 1}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                <span className="text-white text-xs sm:text-sm font-medium">
                  {selectedImageIndex + 1}/{images.length}
                </span>
              </div>
            )}

            {/* Image Dots Indicator */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`transition-all ${
                      index === selectedImageIndex 
                        ? 'w-6 h-1.5 bg-[#FF6B00]' 
                        : 'w-1.5 h-1.5 bg-white/40'
                    } rounded-full`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Image Thumbnails - Horizontal Scroll */}
          {images.length > 1 && (
            <div 
              className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 overflow-x-auto pb-2 scrollbar-hide" 
              ref={imageScrollRef}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${
                    index === selectedImageIndex 
                      ? 'border-[#FF6B00] scale-105' 
                      : 'border-white/10 opacity-60'
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
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{product.name}</h1>

            {/* Most Reserved Product Badge */}
            {isMostReserved() && (
              <div className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-lg">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white mr-1 sm:mr-1.5 flex-shrink-0" />
                <span className="text-white text-xs sm:text-sm font-bold">Most Reserved</span>
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 bg-black/20 border border-white/10 backdrop-blur-sm">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-bold text-[#FF6B00]">
                    ₱{product.price.toFixed(2)}
                  </span>
                  {hasDiscount() && (
                    <span className="text-base sm:text-lg text-gray-400 line-through">
                      ₱{product.originalPrice!.toFixed(2)}
                    </span>
                  )}
                </div>
                {hasDiscount() && (
                  <p className="text-xs sm:text-sm text-[#00D4AA] font-medium">
                    Save ₱{(product.originalPrice! - product.price).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                {product.stock > 0 ? (
                  <>
                    <Shield className="w-4 h-4 text-[#00D4AA] mr-1.5" />
                    <span className="text-[#00D4AA] text-xs sm:text-sm font-medium">
                      In Stock ({product.stock})
                    </span>
                  </>
                ) : (
                  <span className="text-red-400 text-xs sm:text-sm font-medium">Out of Stock</span>
                )}
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
            <span className="text-base sm:text-lg font-bold text-white">Quantity</span>
            <div className="flex items-center">
              <button
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                  quantity > 1 ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5'
                }`}
                disabled={quantity <= 1}
              >
                <Minus className={`w-4 h-4 sm:w-5 sm:h-5 ${quantity > 1 ? 'text-white' : 'text-gray-500'}`} />
              </button>

              <span className="text-lg sm:text-xl font-bold text-white mx-4 sm:mx-6 min-w-[2rem] text-center">{quantity}</span>

              <button
                onClick={() => quantity < product.stock && setQuantity(quantity + 1)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                  quantity < product.stock ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5'
                }`}
                disabled={quantity >= product.stock}
              >
                <Plus className={`w-4 h-4 sm:w-5 sm:h-5 ${quantity < product.stock ? 'text-white' : 'text-gray-500'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <div className="flex rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 bg-black/40 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium text-center transition-all ${
                activeTab === 'details'
                  ? 'bg-[#FF6B00] text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium text-center transition-all ${
                activeTab === 'specs'
                  ? 'bg-[#FF6B00] text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Specifications
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 mb-6">
          {activeTab === 'details' && (
            <div>
              {/* Product Description */}
              {product.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">About This Product</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Product Validity Section */}
              {(product.sku || product.certificate) && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Product Validity</h3>

                  {/* SKU */}
                  {product.sku && (
                    <div className="flex items-center p-3 sm:p-4 rounded-xl mb-3 bg-black/20 border border-white/10 backdrop-blur-sm">
                      <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B00] mr-2 sm:mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-400 font-medium">Product SKU</p>
                        <p className="text-sm sm:text-base text-white font-bold truncate">{product.sku}</p>
                      </div>
                    </div>
                  )}

                  {/* Certificate */}
                  {product.certificate && (
                    <div className="p-3 sm:p-4 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center mb-3">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D4AA] mr-2 sm:mr-3" />
                        <span className="text-sm sm:text-base text-[#00D4AA] font-medium">Quality Certificate</span>
                      </div>
                      <button
                        onClick={() => setShowCertificateModal(true)}
                        className="w-full rounded-lg overflow-hidden relative group"
                      >
                        <img
                          src={product.certificate}
                          alt="Quality Certificate"
                          className="w-full h-28 sm:h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                          <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white mr-2" />
                          <span className="text-white text-sm sm:text-base font-medium">View Certificate</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div>
              {/* Show loading only if product exists but fish/tank data is still loading */}
              {productQuery && (tankData === undefined || fishData === undefined) && (
                <div className="p-4 sm:p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
                  <p className="text-gray-400 text-sm sm:text-base font-medium">
                    Loading specifications...
                  </p>
                </div>
              )}

              {/* Tank specifications */}
              {tankData && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Tank Specifications</h3>
                  <TankSpecs data={tankData} />
                </div>
              )}

              {/* Fish specifications */}
              {fishData && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Fish Information</h3>
                  <FishSpecs data={fishData} />
                </div>
              )}

              {/* No specifications available - only show when both queries have completed */}
              {productQuery && tankData !== undefined && fishData !== undefined && !tankData && !fishData && (
                <div className="p-4 sm:p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm text-center">
                  <p className="text-gray-400 text-sm sm:text-base font-medium">
                    No detailed specifications available for this product.
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    This product may not have fish or tank-specific data.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Reservation Bar - Fixed with Safe Area */}
      <div className="fixed bottom-0 left-0 right-0 px-3 sm:px-4 py-3 sm:py-4 bg-[#121212]/95 backdrop-blur-md border-t border-white/10 z-50 safe-area-bottom">
        <div className="flex gap-2 sm:gap-3 max-w-2xl mx-auto">
          <button
            onClick={handleAddToCart}
            className="flex-1 flex items-center justify-center py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={product.stock === 0 || isAddingToCart}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white mr-2 sm:mr-3 flex-shrink-0" />
            <span className="text-white font-bold text-sm sm:text-base truncate">
              {isAddingToCart ? 'Adding...' : 'Add to cart'}
            </span>
          </button>

          <button
            onClick={handleReserveNow}
            className="flex-1 flex items-center justify-center py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/90 active:bg-[#FF6B00]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            disabled={product.stock === 0 || isAddingToCart}
          >
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white mr-2 sm:mr-3 flex-shrink-0" />
            <span className="text-white font-bold text-sm sm:text-base truncate">
              {product.stock === 0 ? 'Not Available' : 'Reserve Now'}
            </span>
          </button>
        </div>
      </div>

      {/* Certificate Modal with Safe Area */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in safe-area-container">
          <div className="w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white">Quality Certificate</h3>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>

            {/* Certificate Image */}
            {product?.certificate && (
              <div className="rounded-xl sm:rounded-2xl overflow-hidden mb-4 bg-black/40 border border-white/10">
                <img
                  src={product.certificate}
                  alt="Quality Certificate"
                  className="w-full h-80 sm:h-96 object-contain bg-white/5"
                />
              </div>
            )}

            {/* Certificate Info */}
            <div className="p-3 sm:p-4 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D4AA] mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-[#00D4AA] font-medium">Verified Quality Certificate</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                This product has been certified to meet quality standards and specifications.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailClient() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProductDetailContent />
    </SafeAreaProvider>
  );
}