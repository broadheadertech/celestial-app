'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
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
  Eye,
  Flame,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Product } from '@/types';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import NotchHero from '@/components/dc/kit/NotchHero';
import Placeholder from '@/components/dc/kit/Placeholder';
import { ChevronIcon, CloseIcon, HeartIcon, MenuIcon } from '@/components/dc/kit/icons';

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

// Matches the `fish` table (scientificName, temperature, lifespan and origin are optional there).
type FishData = Doc<'fish'>;

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

  // Wishlist
  const isInWishlist = useQuery(
    api.services.wishlist.isInWishlist,
    isAuthenticated && user?._id && productId
      ? { userId: user._id as Id<"users">, productId: productId as Id<"products"> }
      : "skip"
  );
  const toggleWishlist = useMutation(api.services.wishlist.toggleWishlist);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated || !user?._id || !productId) return;
    setWishlistLoading(true);
    try {
      await toggleWishlist({
        userId: user._id as Id<"users">,
        productId: productId as Id<"products">,
      });
    } catch (error) {
      console.error('Wishlist toggle failed:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs'>('details');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/admin/dashboard');
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

  // One labelled spec tile (icon + label + value)
  const Spec = ({ icon: Icon, label, children, wide = false }: { icon: LucideIcon; label: string; children: React.ReactNode; wide?: boolean }) => (
    <div className="dk-panel muted" style={{ padding: '14px 16px', minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }}>
      <div className="dk-row" style={{ gap: 8 }}>
        <Icon size={16} aria-hidden="true" style={{ color: 'var(--dk-red)', flex: 'none' }} />
        <span className="dk-meta-label">{label}</span>
      </div>
      <p style={{ marginTop: 6, fontFamily: 'var(--dk-f-display)', fontWeight: 800, fontSize: 17, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
        {children}
      </p>
    </div>
  );

  const specGrid = (cols: number): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: 12,
  });

  // Tank specifications component
  const TankSpecs = ({ data }: { data: TankData }) => (
    <div className="dk-stack" style={{ gap: 12 }}>
      {/* Tank Type & Material */}
      <div style={specGrid(2)}>
        <Spec icon={Container} label="Tank Type">{data.tankType}</Spec>
        <Spec icon={Shield} label="Material">{data.material}</Spec>
      </div>

      {/* Capacity */}
      <Spec icon={Droplets} label="Capacity">{data.capacity}L</Spec>

      {/* Dimensions */}
      <Spec icon={Ruler} label="Dimensions (L × W × H)">
        {data.dimensions.length} × {data.dimensions.width} × {data.dimensions.height} cm
      </Spec>

      {/* Technical Specs */}
      <div style={specGrid(3)}>
        <Spec icon={Ruler} label="Thick">{data.thickness}mm</Spec>
        <Spec icon={Lightbulb} label="Light">{data.lighting}W</Spec>
        <Spec icon={Filter} label="Filter">{data.filtation}L/h</Spec>
      </div>
    </div>
  );

  // Fish specifications component
  const FishSpecs = ({ data }: { data: FishData }) => (
    <div className="dk-stack" style={{ gap: 12 }}>
      {/* Scientific Name */}
      <Spec icon={Fish} label="Scientific Name">
        <i>{data.scientificName}</i>
      </Spec>

      {/* Physical Characteristics */}
      <div style={specGrid(2)}>
        <Spec icon={Ruler} label="Size">{data.size}&quot;</Spec>
        <Spec icon={Clock} label="Age">{data.age}mo</Spec>
      </div>

      {/* Environmental Requirements */}
      <div style={specGrid(2)}>
        <Spec icon={Thermometer} label="Temp">{data.temperature}°C</Spec>
        <Spec icon={Droplets} label="pH">{data.phLevel}</Spec>
      </div>

      {/* Origin & Lifespan */}
      <div style={specGrid(2)}>
        <Spec icon={Globe} label="Origin">{data.origin}</Spec>
        <Spec icon={Clock} label="Lifespan">{data.lifespan}</Spec>
      </div>

      {/* Diet */}
      <Spec icon={Utensils} label="Diet">{data.diet}</Spec>
    </div>
  );

  // Loading state
  if (!product) {
    return (
      <div className="dk dk-member">
        <div className="dk-member-empty" role="status" style={{ margin: 24 }}>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  const discountPercentage = getDiscountPercentage();
  const overlayBtn: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    borderRadius: '50%',
    zIndex: 2,
  };

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="browse" open={sidebarOpen} onClose={closeSidebar} />

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
              <button type="button" className="dk-view-btn" onClick={() => router.back()} aria-label="Go back">
                <ChevronIcon dir="left" />
              </button>
            </div>
            <div className="dk-app-actions">
              {isAuthenticated && (
                <button
                  type="button"
                  className="dk-heart"
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  aria-pressed={!!isInWishlist}
                  aria-label="Save to wishlist"
                  style={{ position: 'static', width: 40, height: 40, opacity: wishlistLoading ? 0.5 : 1 }}
                >
                  <HeartIcon size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Primary block: gallery + info, with price and actions in the notch */}
          <div style={{ marginTop: 8 }}>
            <NotchHero flush
              tone="white"
              behind="var(--dk-n-100)"
              notchHeight={156}
              notchWide
              notchLabel="Price and actions"
              aside={
                <div className="dk-stack" style={{ gap: 14, alignContent: 'start' }}>
                  <div>
                    <h1 style={{ fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.03em' }}>{product.name}</h1>

                    {/* Most Reserved Product Badge */}
                    {isMostReserved() && (
                      <span className="dk-status red" style={{ marginTop: 12 }}>
                        <Flame size={13} aria-hidden="true" />
                        Most Reserved
                      </span>
                    )}
                  </div>

                  <div>
                    {product.stock > 0 ? (
                      <span className="dk-status">
                        <Shield size={13} aria-hidden="true" />
                        In Stock ({product.stock})
                      </span>
                    ) : (
                      <span className="dk-status black">Out of Stock</span>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  <div className="dk-panel muted dk-row between" style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--dk-f-display)', fontWeight: 800, fontSize: 16 }}>Quantity</span>
                    <span className="dk-qty">
                      <button
                        type="button"
                        onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        style={{ width: 36, height: 36 }}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <span aria-live="polite" style={{ minWidth: 32, fontSize: 17 }}>{quantity}</span>
                      <button
                        type="button"
                        className="plus"
                        onClick={() => quantity < product.stock && setQuantity(quantity + 1)}
                        disabled={quantity >= product.stock}
                        aria-label="Increase quantity"
                        style={{ width: 36, height: 36 }}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                </div>
              }
              notch={
                <>
                  {/* Price Section */}
                  <div>
                    <div className="dk-row wrap" style={{ gap: 10, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--dk-f-display)', fontWeight: 800, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em' }}>
                        ₱{product.price.toFixed(2)}
                      </span>
                      {hasDiscount() && (
                        <s className="dk-muted" style={{ fontSize: 16 }}>
                          ₱{product.originalPrice!.toFixed(2)}
                        </s>
                      )}
                    </div>
                    {hasDiscount() && (
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--dk-red)', marginTop: 6 }}>
                        Save ₱{(product.originalPrice! - product.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="dk-actions">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="dk-btn dk-btn-outline-dark"
                      disabled={product.stock === 0 || isAddingToCart}
                    >
                      <ShoppingCart size={18} aria-hidden="true" />
                      {isAddingToCart ? 'Adding...' : 'Add to cart'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReserveNow}
                      className="dk-btn dk-btn-red"
                      disabled={product.stock === 0 || isAddingToCart}
                    >
                      <Calendar size={18} aria-hidden="true" />
                      {product.stock === 0 ? 'Not Available' : 'Reserve Now'}
                    </button>
                  </div>
                </>
              }
            >
              {/* Main Product Image with Swipe Support */}
              <div
                style={{ position: 'relative' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Placeholder
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  priority
                  style={{ height: 'clamp(280px, 38vw, 420px)', borderRadius: 'var(--dk-r-card)' }}
                />

                {/* Discount Badge */}
                {hasDiscount() && (
                  <span className="dk-status red" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
                    {discountPercentage}% OFF
                  </span>
                )}

                {/* Product Badge */}
                {product.badge && (
                  <span className="dk-status black" style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                    {product.badge}
                  </span>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="dk-view-btn"
                      onClick={() => selectedImageIndex > 0 && setSelectedImageIndex(selectedImageIndex - 1)}
                      disabled={selectedImageIndex === 0}
                      aria-label="Previous image"
                      style={{ ...overlayBtn, left: 12, opacity: selectedImageIndex === 0 ? 0.4 : 1 }}
                    >
                      <ChevronIcon dir="left" />
                    </button>
                    <button
                      type="button"
                      className="dk-view-btn"
                      onClick={() => selectedImageIndex < images.length - 1 && setSelectedImageIndex(selectedImageIndex + 1)}
                      disabled={selectedImageIndex === images.length - 1}
                      aria-label="Next image"
                      style={{ ...overlayBtn, right: 12, opacity: selectedImageIndex === images.length - 1 ? 0.4 : 1 }}
                    >
                      <ChevronIcon />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                  <span className="dk-status" style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2 }}>
                    {selectedImageIndex + 1}/{images.length}
                  </span>
                )}

                {/* Image Dots Indicator */}
                {images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
                    {images.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={`Show image ${index + 1}`}
                        aria-current={index === selectedImageIndex ? 'true' : undefined}
                        style={{
                          width: index === selectedImageIndex ? 24 : 8,
                          height: 8,
                          padding: 0,
                          border: 0,
                          borderRadius: 'var(--dk-r-pill)',
                          background: index === selectedImageIndex ? 'var(--dk-red)' : 'var(--dk-n-300)',
                          transition: 'width .2s, background-color .2s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="dk-thumbs" ref={imageScrollRef} style={{ marginTop: 14 }}>
                  {images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-pressed={index === selectedImageIndex}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote Convex storage URL */}
                      <img src={image} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </NotchHero>
          </div>

          {/* Tab Navigation */}
          <div className="dk-tabs dk-app-section" role="tablist" aria-label="Product information">
            <button
              type="button"
              className="dk-chip"
              role="tab"
              aria-selected={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              className="dk-chip"
              role="tab"
              aria-selected={activeTab === 'specs'}
              onClick={() => setActiveTab('specs')}
            >
              Specifications
            </button>
          </div>

          {/* Tab Content */}
          <div className="dk-panel" role="tabpanel" style={{ marginTop: 16 }}>
            {activeTab === 'details' && (
              <div className="dk-stack lg">
                {/* Product Description */}
                {product.description && (
                  <div>
                    <h3 className="dk-h4">About This Product</h3>
                    <p style={{ fontSize: 15, lineHeight: '24px', color: 'var(--dk-n-600)', marginTop: 8 }}>{product.description}</p>
                  </div>
                )}

                {/* Product Validity Section */}
                {(product.sku || product.certificate) && (
                  <div>
                    <h3 className="dk-h4" style={{ marginBottom: 12 }}>Product Validity</h3>

                    <div className="dk-stack" style={{ gap: 12 }}>
                      {/* SKU */}
                      {product.sku && (
                        <div className="dk-panel muted dk-row" style={{ padding: '14px 16px' }}>
                          <Hash size={18} aria-hidden="true" style={{ color: 'var(--dk-red)', flex: 'none' }} />
                          <div style={{ minWidth: 0 }}>
                            <p className="dk-meta-label">Product SKU</p>
                            <p className="dk-meta-val" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.sku}</p>
                          </div>
                        </div>
                      )}

                      {/* Certificate */}
                      {product.certificate && (
                        <div className="dk-panel muted" style={{ padding: '14px 16px' }}>
                          <div className="dk-row" style={{ gap: 8, marginBottom: 12 }}>
                            <Award size={18} aria-hidden="true" style={{ color: 'var(--dk-red)' }} />
                            <span style={{ fontSize: 15, fontWeight: 700 }}>Quality Certificate</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCertificateModal(true)}
                            style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', textAlign: 'left' }}
                          >
                            <Placeholder src={product.certificate} alt="Quality Certificate" style={{ height: 128, borderRadius: 'var(--dk-r-sm)' }} />
                            <span className="dk-btn dk-btn-text" style={{ fontSize: 14, marginTop: 10 }}>
                              <Eye size={16} aria-hidden="true" />
                              View Certificate
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="dk-stack lg">
                {/* Show loading only if product exists but fish/tank data is still loading */}
                {productQuery && (tankData === undefined || fishData === undefined) && (
                  <p className="dk-muted" role="status" style={{ textAlign: 'center', fontSize: 15 }}>
                    Loading specifications...
                  </p>
                )}

                {/* Tank specifications */}
                {tankData && (
                  <div>
                    <h3 className="dk-h4" style={{ marginBottom: 12 }}>Tank Specifications</h3>
                    <TankSpecs data={tankData} />
                  </div>
                )}

                {/* Fish specifications */}
                {fishData && (
                  <div>
                    <h3 className="dk-h4" style={{ marginBottom: 12 }}>Fish Information</h3>
                    <FishSpecs data={fishData} />
                  </div>
                )}

                {/* No specifications available - only show when both queries have completed */}
                {productQuery && tankData !== undefined && fishData !== undefined && !tankData && !fishData && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>
                      No detailed specifications available for this product.
                    </p>
                    <p className="dk-muted" style={{ fontSize: 14, marginTop: 6 }}>
                      This product may not have fish or tank-specific data.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && (
        <>
          <button type="button" className="dk-scrim" aria-label="Close" onClick={() => setShowCertificateModal(false)} />
          <div className="dk-modal" role="dialog" aria-modal="true" aria-labelledby="cert-title">
            {/* Modal Header */}
            <div className="dk-row between" style={{ marginBottom: 16 }}>
              <h3 id="cert-title" className="dk-h4">Quality Certificate</h3>
              <button
                type="button"
                className="dk-view-btn"
                onClick={() => setShowCertificateModal(false)}
                aria-label="Close"
                style={{ borderRadius: '50%' }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Certificate Image */}
            {product?.certificate && (
              <Placeholder
                src={product.certificate}
                alt="Quality Certificate"
                contain
                style={{ height: 'min(384px, 50vh)', borderRadius: 'var(--dk-r-sm)', marginBottom: 16 }}
              />
            )}

            {/* Certificate Info */}
            <div className="dk-panel muted" style={{ padding: '14px 16px' }}>
              <div className="dk-row" style={{ gap: 8 }}>
                <Award size={18} aria-hidden="true" style={{ color: 'var(--dk-red)', flex: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Verified Quality Certificate</span>
              </div>
              <p className="dk-muted" style={{ fontSize: 13, lineHeight: '20px', marginTop: 6 }}>
                This product has been certified to meet quality standards and specifications.
              </p>
            </div>
          </div>
        </>
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
