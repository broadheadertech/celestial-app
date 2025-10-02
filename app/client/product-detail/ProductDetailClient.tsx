'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Heart,
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
  Flame
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Button from '@/components/ui/Button';
import { Product } from '@/types';

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

export default function ProductDetailClient() {
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
    <div className="space-y-4">
      {/* Tank Type & Material */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Container className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-sm text-blue-400 font-medium">Tank Type</span>
          </div>
          <p className="text-lg font-bold text-white">{data.tankType}</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Shield className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-sm text-green-400 font-medium">Material</span>
          </div>
          <p className="text-lg font-bold text-white">{data.material}</p>
        </div>
      </div>

      {/* Capacity */}
      <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-2">
          <Droplets className="w-5 h-5 text-cyan-400 mr-2" />
          <span className="text-sm text-cyan-400 font-medium">Capacity</span>
        </div>
        <p className="text-xl font-bold text-white">{data.capacity}L</p>
      </div>

      {/* Dimensions */}
      <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-3">
          <Ruler className="w-5 h-5 text-yellow-500 mr-2" />
          <span className="text-sm text-yellow-500 font-medium">Dimensions (L × W × H)</span>
        </div>
        <p className="text-2xl font-bold text-white text-center">
          {data.dimensions.length} × {data.dimensions.width} × {data.dimensions.height} cm
        </p>
      </div>

      {/* Technical Specs */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <div className="w-5 h-5 rounded bg-gray-400 flex items-center justify-center mr-2">
              <span className="text-xs font-bold text-gray-900">T</span>
            </div>
            <span className="text-sm text-gray-400 font-medium">Thickness</span>
          </div>
          <p className="text-lg font-bold text-white">{data.thickness}mm</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Lightbulb className="w-5 h-5 text-yellow-300 mr-2" />
            <span className="text-sm text-yellow-300 font-medium">Lighting</span>
          </div>
          <p className="text-lg font-bold text-white">{data.lighting}W</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Filter className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm text-green-500 font-medium">Filtration</span>
          </div>
          <p className="text-lg font-bold text-white">{data.filtation}L/h</p>
        </div>
      </div>
    </div>
  );

  // Fish specifications component
  const FishSpecs = ({ data }: { data: FishData }) => (
    <div className="space-y-4">
      {/* Scientific Name */}
      <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-2">
          <Fish className="w-5 h-5 text-blue-500 mr-2" />
          <span className="text-sm text-blue-500 font-medium">Scientific Name</span>
        </div>
        <p className="text-lg font-bold text-white italic">{data.scientificName}</p>
      </div>

      {/* Physical Characteristics */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Ruler className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm text-yellow-500 font-medium">Size</span>
          </div>
          <p className="text-xl font-bold text-white">{data.size}&quot;</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-cyan-400 mr-2" />
            <span className="text-sm text-cyan-400 font-medium">Age</span>
          </div>
          <p className="text-xl font-bold text-white">{data.age}mo</p>
        </div>
      </div>

      {/* Environmental Requirements */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Thermometer className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-sm text-red-400 font-medium">Temperature</span>
          </div>
          <p className="text-lg font-bold text-white">{data.temperature}°C</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Droplets className="w-5 h-5 text-cyan-400 mr-2" />
            <span className="text-sm text-cyan-400 font-medium">pH Level</span>
          </div>
          <p className="text-lg font-bold text-white">{data.phLevel}</p>
        </div>
      </div>

      {/* Origin & Lifespan */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Globe className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm text-green-500 font-medium">Origin</span>
          </div>
          <p className="text-lg font-bold text-white">{data.origin}</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm text-yellow-500 font-medium">Lifespan</span>
          </div>
          <p className="text-lg font-bold text-white">{data.lifespan}</p>
        </div>
      </div>

      {/* Diet */}
      <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center mb-2">
          <Utensils className="w-5 h-5 text-green-400 mr-2" />
          <span className="text-sm text-green-400 font-medium">Diet</span>
        </div>
        <p className="text-lg font-bold text-white">{data.diet}</p>
      </div>
    </div>
  );

  // Loading state
  if (!product) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
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
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-16 pb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="pb-24">
        {/* Main Product Image */}
        <div className="px-6 mb-6">
          <div className="relative">
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="w-full h-80 rounded-3xl object-cover"
            />

            {/* Discount Badge - Only show if there's actually a discount */}
            {hasDiscount() && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-[#FF6B00]">
                <span className="text-white text-sm font-bold">{discountPercentage}% OFF</span>
              </div>
            )}

            {/* Product Badge */}
            {product.badge && (
              <div className="absolute top-4 right-4 px-3 py-1 rounded-xl bg-[#00D4AA]">
                <span className="text-white text-sm font-bold">{product.badge}</span>
              </div>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-sm">
                <span className="text-white text-sm font-medium">
                  {selectedImageIndex + 1}/{images.length}
                </span>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 mt-4" ref={imageScrollRef}>
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${
                    index === selectedImageIndex ? 'border-[#FF6B00]' : 'border-white/10'
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
        <div className="px-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 mr-4">
              <h1 className="text-2xl font-bold text-white mb-2 leading-8">{product.name}</h1>

              {/* Most Reserved Product Badge */}
              {isMostReserved() && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mb-2 shadow-lg">
                  <Flame className="w-4 h-4 text-white mr-1.5" />
                  <span className="text-white text-sm font-bold">Most Reserved Product</span>
                </div>
              )}
            </div>
          </div>

          {/* Price Section */}
          <div className="p-4 rounded-2xl mb-4 bg-black/20 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <span className="text-3xl font-bold text-[#FF6B00] mr-3">
                    ₱{product.price.toFixed(2)}
                  </span>
                  {/* Only show original price if there's a discount */}
                  {hasDiscount() && (
                    <span className="text-lg text-gray-400 line-through">
                      ₱{product.originalPrice!.toFixed(2)}
                    </span>
                  )}
                </div>
                {/* Only show savings if there's a discount */}
                {hasDiscount() && (
                  <p className="text-sm text-[#00D4AA] font-medium">
                    You save ₱{(product.originalPrice! - product.price).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center mb-2">
                  {product.stock > 0 ? (
                    <>
                      <Shield className="w-4 h-4 text-[#00D4AA] mr-1" />
                      <span className="text-[#00D4AA] text-sm font-medium">
                        In Stock ({product.stock})
                      </span>
                    </>
                  ) : (
                    <span className="text-red-400 text-sm font-medium">Out of Stock</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-bold text-white">Quantity</span>
            <div className="flex items-center">
              <button
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  quantity > 1 ? 'bg-white/10' : 'bg-white/5'
                }`}
                disabled={quantity <= 1}
              >
                <Minus className={`w-5 h-5 ${quantity > 1 ? 'text-white' : 'text-gray-500'}`} />
              </button>

              <span className="text-lg font-bold text-white mx-6">{quantity}</span>

              <button
                onClick={() => quantity < product.stock && setQuantity(quantity + 1)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  quantity < product.stock ? 'bg-white/10' : 'bg-white/5'
                }`}
                disabled={quantity >= product.stock}
              >
                <Plus className={`w-5 h-5 ${quantity < product.stock ? 'text-white' : 'text-gray-500'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 mb-6">
          <div className="flex rounded-3xl p-2 bg-black/40 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 rounded-2xl text-base font-medium text-center transition-all ${
                activeTab === 'details'
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-400'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex-1 py-4 rounded-2xl text-base font-medium text-center transition-all ${
                activeTab === 'specs'
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-400'
              }`}
            >
              Specifications
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 mb-6">
          {activeTab === 'details' && (
            <div>
              {/* Product Description */}
              {product.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-3">About This Product</h3>
                  <p className="text-base text-gray-300 leading-6">{product.description}</p>
                </div>
              )}

              {/* Product Validity Section */}
              {(product.sku || product.certificate) && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Product Validity</h3>

                  {/* SKU */}
                  {product.sku && (
                    <div className="flex items-center p-4 rounded-xl mb-3 bg-black/20 border border-white/10 backdrop-blur-sm">
                      <Hash className="w-5 h-5 text-[#FF6B00] mr-3" />
                      <div>
                        <p className="text-sm text-gray-400 font-medium">Product SKU</p>
                        <p className="text-base text-white font-bold">{product.sku}</p>
                      </div>
                    </div>
                  )}

                  {/* Certificate */}
                  {product.certificate && (
                    <div className="p-4 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center mb-3">
                        <Award className="w-5 h-5 text-[#00D4AA] mr-3" />
                        <span className="text-base text-[#00D4AA] font-medium">Quality Certificate</span>
                      </div>
                      <button
                        onClick={() => setShowCertificateModal(true)}
                        className="w-full rounded-lg overflow-hidden relative group"
                      >
                        <img
                          src={product.certificate}
                          alt="Quality Certificate"
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-6 h-6 text-white mr-2" />
                          <span className="text-white font-medium">View Certificate</span>
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
                <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
                  <p className="text-gray-400 text-base font-medium">
                    Loading specifications...
                  </p>
                </div>
              )}

              {/* Tank specifications */}
              {tankData && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Tank Specifications</h3>
                  <TankSpecs data={tankData} />
                </div>
              )}

              {/* Fish specifications */}
              {fishData && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Fish Information</h3>
                  <FishSpecs data={fishData} />
                </div>
              )}

              {/* No specifications available - only show when both queries have completed */}
              {productQuery && tankData !== undefined && fishData !== undefined && !tankData && !fishData && (
                <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm text-center">
                  <p className="text-gray-400 text-base font-medium">
                    No detailed specifications available for this product.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    This product may not have fish or tank-specific data.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Reservation Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#121212]/95 backdrop-blur-sm border-t border-white/10">
        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            className="flex-1 flex items-center justify-center py-4 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            disabled={product.stock === 0 || isAddingToCart}
          >
            <Heart className="w-5 h-5 text-white mr-3" />
            <span className="text-white font-bold text-base">
              {isAddingToCart ? 'Adding...' : 'Reservation List'}
            </span>
          </button>

          <button
            onClick={handleReserveNow}
            className="flex-1 flex items-center justify-center py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors disabled:opacity-50"
            disabled={product.stock === 0 || isAddingToCart}
          >
            <Calendar className="w-5 h-5 text-white mr-3" />
            <span className="text-white font-bold text-base">
              {product.stock === 0 ? 'Not Available' : 'Reserve Now'}
            </span>
          </button>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Quality Certificate</h3>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Certificate Image */}
            {product?.certificate && (
              <div className="rounded-2xl overflow-hidden mb-4">
                <img
                  src={product.certificate}
                  alt="Quality Certificate"
                  className="w-full h-96 object-contain bg-white/5"
                />
              </div>
            )}

            {/* Certificate Info */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center">
                <Award className="w-5 h-5 text-[#00D4AA] mr-2" />
                <span className="text-sm text-[#00D4AA] font-medium">Verified Quality Certificate</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This product has been certified to meet quality standards and specifications.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}