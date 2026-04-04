'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ArrowLeft, Award, Edit, Eye, X, CheckCircle, AlertTriangle, RefreshCw, Fish, Waves, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#10B981';
    case 'inactive': return '#EF4444';
    case 'out_of_stock': return '#F59E0B';
    default: return '#6B7280';
  }
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return { text: 'Out of Stock', color: '#EF4444' };
  if (stock < 10) return { text: 'Low Stock', color: '#F59E0B' };
  return { text: 'In Stock', color: '#10B981' };
};

function ProductDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get('id');

  useEffect(() => {
    if (false) {
      const requestedPath = sessionStorage.getItem('_capacitor_requested_path');
      if (requestedPath && requestedPath.startsWith('/admin/products/')) {
        const productId = requestedPath.split('/admin/products/')[1]?.split('/')[0];
        if (productId) {
          sessionStorage.removeItem('_capacitor_requested_path');
          router.replace(`/admin/products/${productId}`);
        }
      }
    }
  }, [id, router]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [certificateModalVisible, setCertificateModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const allProducts = useQuery(api.services.admin.getAllProductsAdmin, {});
  const product = allProducts?.find(p => p._id === id);
  
  const category = useQuery(
    api.services.categories.getCategory,
    product?.categoryId ? { categoryId: product.categoryId as Id<"categories"> } : "skip"
  );
  
  const fishData = useQuery(
    api.services.products.getFishByProductId,
    product?._id ? { productId: product._id as Id<"products"> } : "skip"
  );
  
  const tankData = useQuery(
    api.services.products.getTankByProductId,
    product?._id ? { productId: product._id as Id<"products"> } : "skip"
  );
  
  const deleteProduct = useMutation(api.services.admin.deleteProduct);
  
  if (allProducts === undefined) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary mx-auto mb-4" />
          <h1 className="font-bold text-lg sm:text-xl text-white mb-2">Loading product...</h1>
          <p className="text-white/60 text-xs sm:text-sm">Please wait while we fetch the product details.</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-error mx-auto mb-4" />
          <h1 className="font-bold text-lg sm:text-xl text-white mb-2">Product Not Found</h1>
          <p className="text-white/60 text-xs sm:text-sm mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => router.push('/admin/products')}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock);
  const discount = product.originalPrice && product.originalPrice > product.price 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;
  const isFishProduct = category?.name?.toLowerCase().includes('fish') || false;
  const isTankProduct = category?.name?.toLowerCase().includes('tank') || category?.name?.toLowerCase().includes('aquarium') || false;

  const normalizeImageUrl = (url: string | undefined): string => {
    if (!url) return '/img/logo-app.png';
    if (url.startsWith('file://')) {
      console.warn('File URL detected, using fallback image:', url);
      return '/img/logo-app.png';
    }
    if (url.startsWith('/')) return url;
    if (url.startsWith('http')) return url;
    return '/img/logo-app.png';
  };

  const allImageUrls = [
    product.image,
    ...(product.images || [])
  ].filter(Boolean).map(normalizeImageUrl);

  const displayImages = allImageUrls.length > 0 ? allImageUrls : ['/img/logo-app.png'];

  const handleDelete = async () => {
    if (!product?._id) return;
    
    try {
      setIsDeleting(true);
      await deleteProduct({ productId: product._id as Id<"products"> });
      setModalMessage('Product deleted successfully!');
      setShowDeleteConfirm(false);
      setShowSuccessModal(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);
    } catch (error) {
      console.error('Error deleting product:', error);
      setModalMessage('Error deleting product. Please try again.');
      setShowDeleteConfirm(false);
      setShowErrorModal(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/admin/products/form?id=${product._id}`);
  };

  const handleViewCertificate = () => {
    if (product.certificate) {
      setCertificateModalVisible(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header with Safe Area */}
      <div className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={18} color="#FFFFFF" className="sm:w-5 sm:h-5" />
          </button>
          <h1 className="font-bold text-base sm:text-xl text-white">Product Details</h1>
          <button
            onClick={handleEdit}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Edit product"
          >
            <Edit size={16} color="#FF6B00" className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Desktop: two-column layout | Mobile: stacked */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Left: Images */}
            <div>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden mb-3 relative bg-[#1A1A1A]">
                <div className="relative w-full h-64 sm:h-80 lg:h-[400px]">
                  <Image
                    src={displayImages[activeImageIndex]}
                    alt={product.name}
                    fill
                    className="object-contain"
                    unoptimized={true}
                    onError={(e) => { const t = e.target as HTMLImageElement; t.src = '/img/logo-app.png'; }}
                  />
                </div>
                {discount > 0 && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-[#EF4444] shadow-lg">
                    <span className="font-bold text-xs text-white">-{discount}%</span>
                  </div>
                )}
                {product.badge && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-[#FF6B00] shadow-lg">
                    <span className="font-bold text-xs text-white">{product.badge}</span>
                  </div>
                )}
              </div>
              {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {displayImages.map((imageUrl, index) => (
                    <button key={index} onClick={() => setActiveImageIndex(index)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === index ? 'border-[#FF6B00]' : 'border-transparent opacity-60'}`}>
                      <div className="relative w-full h-full bg-[#1A1A1A]">
                        <Image src={imageUrl} alt={`${product.name} ${index + 1}`} fill className="object-cover" unoptimized={true}
                          onError={(e) => { const t = e.target as HTMLImageElement; t.src = '/img/logo-app.png'; }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="font-bold text-xl sm:text-2xl text-white flex-1 leading-tight">{product.name}</h1>
                {product.certificate && (
                  <button onClick={handleViewCertificate}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 active:scale-95 transition-all">
                    <Award size={14} color="#10B981" />
                    <span className="font-medium text-xs text-[#10B981]">Certified</span>
                  </button>
                )}
              </div>

              <p className="text-sm mb-4 text-[#B3B3B3]">{category?.name || 'Unknown Category'}</p>

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl sm:text-3xl text-[#FF6B00]">₱{product.price.toFixed(2)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-base line-through text-[#666666]">₱{product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${stockStatus.color}20` }}>
                  <span className="font-medium text-xs whitespace-nowrap" style={{ color: stockStatus.color }}>{stockStatus.text}</span>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-[#CCCCCC] leading-relaxed mb-4">{product.description}</p>
              )}

              {/* Quick Details */}
              <div className="rounded-xl p-4 bg-[#1A1A1A] mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-[#B3B3B3] text-xs">SKU</span><p className="text-white font-medium">{product.sku || 'N/A'}</p></div>
                  <div><span className="text-[#B3B3B3] text-xs">Stock</span><p className="text-white font-medium">{product.stock} units</p></div>
                  {product.costPrice && <div><span className="text-[#B3B3B3] text-xs">Cost Price</span><p className="text-white font-medium">₱{product.costPrice.toFixed(2)}</p></div>}
                  <div><span className="text-[#B3B3B3] text-xs">Status</span>
                    <p className="font-medium" style={{ color: getStatusColor(product.isActive ? 'active' : 'inactive') }}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  {product.lifespan && <div><span className="text-[#B3B3B3] text-xs">Lifespan</span><p className="text-white font-medium">{product.lifespan}</p></div>}
                  {product.tankNumber && <div><span className="text-[#B3B3B3] text-xs">Tank #</span><p className="text-white font-medium">{product.tankNumber}</p></div>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleEdit} className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Edit size={16} /> Edit Product
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error font-medium text-sm hover:bg-error/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width sections below the two-column grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Fish Data Section */}
        {isFishProduct && fishData && (
          <div className="mb-4 sm:mb-6">
            <h2 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-white flex items-center gap-2">
              <Fish size={18} color="#FF6B00" className="sm:w-5 sm:h-5" />
              Fish Information
            </h2>
            
            <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-[#1A1A1A]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {fishData.scientificName && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Scientific Name</span>
                    <span className="text-xs sm:text-sm text-white font-medium text-right">{fishData.scientificName}</span>
                  </div>
                )}
                
                {fishData.size && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Size</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.size} cm</span>
                  </div>
                )}
                
                {fishData.weight && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Weight</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.weight} g</span>
                  </div>
                )}
                
                {fishData.temperature && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Temperature</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.temperature}°C</span>
                  </div>
                )}
                
                {fishData.age !== undefined && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Age</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.age} months</span>
                  </div>
                )}
                
                {fishData.phLevel && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">pH Level</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.phLevel}</span>
                  </div>
                )}
                
                {fishData.lifespan && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Lifespan</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.lifespan}</span>
                  </div>
                )}
                
                {fishData.origin && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Origin</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.origin}</span>
                  </div>
                )}
                
                {fishData.diet && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Diet</span>
                    <span className="text-xs sm:text-sm text-white">{fishData.diet}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tank Data Section */}
        {isTankProduct && tankData && (
          <div className="mb-4 sm:mb-6">
            <h2 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-white flex items-center gap-2">
              <Waves size={18} color="#FF6B00" className="sm:w-5 sm:h-5" />
              Tank Specifications
            </h2>
            
            <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-[#1A1A1A]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {tankData.tankType && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Tank Type</span>
                    <span className="text-xs sm:text-sm text-white font-medium">{tankData.tankType}</span>
                  </div>
                )}
                
                {tankData.material && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Material</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.material}</span>
                  </div>
                )}
                
                {tankData.capacity && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Capacity</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.capacity} L</span>
                  </div>
                )}
                
                {tankData.dimensions && (
                  <div className="flex justify-between items-start gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Dimensions</span>
                    <span className="text-xs sm:text-sm text-white text-right">
                      {tankData.dimensions.length} × {tankData.dimensions.width} × {tankData.dimensions.height} cm
                    </span>
                  </div>
                )}
                
                {tankData.weight && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Weight</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.weight} kg</span>
                  </div>
                )}
                
                {tankData.thickness && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Thickness</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.thickness} mm</span>
                  </div>
                )}
                
                {tankData.lighting && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5 border-b border-[#333333]">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Lighting</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.lighting} W</span>
                  </div>
                )}
                
                {tankData.filtation && (
                  <div className="flex justify-between items-center gap-3 py-2 sm:py-2.5">
                    <span className="font-medium text-xs sm:text-sm text-[#B3B3B3]">Filtration</span>
                    <span className="text-xs sm:text-sm text-white">{tankData.filtation} L/h</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 rounded-xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Success</h3>
                <p className="text-xs sm:text-sm text-white/60 break-words">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-success hover:bg-success/90 active:scale-95 transition-all"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 rounded-xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Error</h3>
                <p className="text-xs sm:text-sm text-white/60 break-words">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-error hover:bg-error/90 active:scale-95 transition-all"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certificateModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <div className="relative w-full h-full">
            {/* Close button */}
            <button
              onClick={() => setCertificateModalVisible(false)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 rounded-full flex items-center justify-center z-10 bg-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-lg"
              aria-label="Close certificate"
            >
              <X size={20} color="#FFFFFF" />
            </button>
            
            {/* Certificate Image */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 h-full">
              {product.certificate ? (
                <div className="relative w-full max-w-4xl h-[70vh] sm:h-[80vh]">
                  <Image
                    src={normalizeImageUrl(product.certificate)}
                    alt="Product Certificate"
                    fill
                    className="object-contain rounded-xl"
                    unoptimized={true}
                    onError={(e) => {
                      console.error('Certificate image load error:', e);
                      const target = e.target as HTMLImageElement;
                      target.src = '/img/logo-app.png';
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-sm sm:text-base text-white">No certificate available</span>
                </div>
              )}
            </div>
            
            {/* Bottom info */}
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
              <div className="rounded-xl p-3 sm:p-4 bg-white/10 backdrop-blur-md">
                <h3 className="font-bold text-base sm:text-lg text-center mb-1 sm:mb-2 text-white">
                  Product Certificate
                </h3>
                <p className="text-xs sm:text-sm text-center text-[#B3B3B3] truncate">
                  {product.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function ProductDetailsClient() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProductDetailsContent />
    </SafeAreaProvider>
  );
}