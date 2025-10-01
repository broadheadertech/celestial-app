'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ArrowLeft, Award, Edit, Eye, X, CheckCircle, AlertTriangle, RefreshCw, Fish, Waves, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';

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

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [certificateModalVisible, setCertificateModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch real product data from Convex - use admin API to get all products and filter
  const allProducts = useQuery(api.services.admin.getAllProductsAdmin, {});
  const product = allProducts?.find(p => p._id === id);
  
  // Fix: Only query category if we have a valid categoryId
  const category = useQuery(
    api.services.categories.getCategory,
    product?.categoryId ? { categoryId: product.categoryId as Id<"categories"> } : "skip"
  );
  
  // Fix: Only query fish/tank data if we have a valid product ID
  const fishData = useQuery(
    api.services.products.getFishByProductId,
    product?._id ? { productId: product._id as Id<"products"> } : "skip"
  );
  
  const tankData = useQuery(
    api.services.products.getTankByProductId,
    product?._id ? { productId: product._id as Id<"products"> } : "skip"
  );
  
  // Add delete mutation
  const deleteProduct = useMutation(api.services.admin.deleteProduct);
  
  // Loading state
  if (allProducts === undefined) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h1 className="font-bold text-xl text-white mb-4">Loading product...</h1>
          <p className="text-white/60 text-sm">Please wait while we fetch the product details.</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
          <h1 className="font-bold text-xl text-white mb-4">Product Not Found</h1>
          <p className="text-white/60 text-sm mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => router.push('/admin/products')}
            className="bg-primary hover:bg-primary/90"
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

  // Helper function to normalize image URLs
  const normalizeImageUrl = (url: string | undefined): string => {
    if (!url) return '/img/logo-app.png';
    
    // Handle file:// URLs by converting to data URLs or using fallback
    if (url.startsWith('file://')) {
      console.warn('File URL detected, using fallback image:', url);
      return '/img/logo-app.png';
    }
    
    // Handle relative URLs
    if (url.startsWith('/')) {
      return url;
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) {
      return url;
    }
    
    // Default fallback
    return '/img/logo-app.png';
  };

  // Combine main image with additional images for display, with fallback to logo
  const allImageUrls = [
    product.image,
    ...(product.images || [])
  ].filter(Boolean).map(normalizeImageUrl);

  // Use logo as fallback if no images
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
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-16 pb-4">
        <button
          onClick={() => router.push('/admin/products')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </button>
        <h1 className="font-bold text-xl text-white">Product Details</h1>
        <div className="flex">
          <button
            onClick={handleEdit}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors mr-2"
          >
            <Edit size={18} color="#FF6B00" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Product Images */}
        <div className="px-6 mb-6">
          <div className="rounded-2xl overflow-hidden mb-4 relative">
            <div className="relative w-full h-80">
              <Image
                src={displayImages[activeImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized={true}
                onError={(e) => {
                  console.error('Image load error:', e);
                  // Fallback to logo if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = '/img/logo-app.png';
                }}
              />
            </div>
            
            {discount > 0 && (
              <div className="absolute top-4 left-4 px-2 py-1 rounded-lg bg-[#EF4444]">
                <span className="font-bold text-xs text-white">-{discount}%</span>
              </div>
            )}
            
            {product.badge && (
              <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-[#FF6B00]">
                <span className="font-bold text-xs text-white">{product.badge}</span>
              </div>
            )}

            {/* Certificate indicator */}
            {product.certificate && (
              <button
                onClick={handleViewCertificate}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-[#10B981]/60 hover:bg-[#10B981]/80 transition-colors"
              >
                <Award size={20} color="#FFFFFF" />
              </button>
            )}
          </div>
          
          {/* Image Thumbnails */}
          {displayImages.length > 1 && (
            <div className="flex overflow-x-auto space-x-2 scrollbar-hide">
              {displayImages.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImageIndex === index ? 'border-[#FF6B00]' : 'border-transparent'
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={imageUrl}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized={true}
                      onError={(e) => {
                        console.error('Thumbnail image load error:', e);
                        const target = e.target as HTMLImageElement;
                        target.src = '/img/logo-app.png';
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-bold text-2xl text-white flex-1">{product.name}</h1>
            {product.certificate && (
              <button
                onClick={handleViewCertificate}
                className="ml-2 px-3 py-1 rounded-lg flex items-center bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors"
              >
                <Award size={16} color="#10B981" />
                <span className="font-medium text-sm ml-1 text-[#10B981]">Certified</span>
              </button>
            )}
          </div>
          
          <p className="text-base mb-4 text-[#B3B3B3]">
            {category?.name || 'Unknown Category'}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="font-bold text-3xl text-[#FF6B00]">
                ₱{product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg line-through ml-2 text-[#666666]">
                  ₱{product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <div className="px-3 py-1 rounded-lg" style={{ backgroundColor: `${stockStatus.color}20` }}>
              <span className="font-medium text-sm" style={{ color: stockStatus.color }}>
                {stockStatus.text}
              </span>
            </div>
          </div>
          
          <p className="text-base text-[#CCCCCC]">{product.description}</p>
        </div>

        {/* Certificate Section */}
        {product.certificate && (
          <div className="px-6 mb-6">
            <h2 className="font-bold text-lg mb-4 text-white">Certificate</h2>
            
            <button
              onClick={handleViewCertificate}
              className="w-full rounded-2xl p-4 flex items-center justify-between bg-[#1A1A1A] hover:bg-[#222222] transition-colors"
            >
              <div className="flex items-center flex-1">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 bg-[#10B981]/10">
                  <Award size={24} color="#10B981" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-base text-white">Product Certificate</div>
                  <div className="text-sm text-[#B3B3B3]">Tap to view certificate</div>
                </div>
              </div>
              <Eye size={20} color="#FF6B00" />
            </button>
          </div>
        )}

        {/* Fish Data Section */}
        {isFishProduct && fishData && (
          <div className="px-6 mb-6">
            <h2 className="font-bold text-lg mb-4 text-white flex items-center">
              <Fish className="mr-2" size={20} color="#FF6B00" />
              Fish Information
            </h2>
            
            <div className="rounded-2xl p-4 bg-[#1A1A1A]">
              <div className="grid grid-cols-1 gap-3">
                {fishData.scientificName && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Scientific Name</span>
                    <span className="text-base text-white font-medium">{fishData.scientificName}</span>
                  </div>
                )}
                
                {fishData.size && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Size</span>
                    <span className="text-base text-white">{fishData.size} cm</span>
                  </div>
                )}
                
                {fishData.weight && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Weight</span>
                    <span className="text-base text-white">{fishData.weight} g</span>
                  </div>
                )}
                
                {fishData.temperature && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Temperature</span>
                    <span className="text-base text-white">{fishData.temperature}°C</span>
                  </div>
                )}
                
                {fishData.age !== undefined && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Age</span>
                    <span className="text-base text-white">{fishData.age} months</span>
                  </div>
                )}
                
                {fishData.phLevel && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">pH Level</span>
                    <span className="text-base text-white">{fishData.phLevel}</span>
                  </div>
                )}
                
                {fishData.lifespan && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Lifespan</span>
                    <span className="text-base text-white">{fishData.lifespan}</span>
                  </div>
                )}
                
                {fishData.origin && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Origin</span>
                    <span className="text-base text-white">{fishData.origin}</span>
                  </div>
                )}
                
                {fishData.diet && (
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-base text-[#B3B3B3]">Diet</span>
                    <span className="text-base text-white">{fishData.diet}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tank Data Section */}
        {isTankProduct && tankData && (
          <div className="px-6 mb-6">
            <h2 className="font-bold text-lg mb-4 text-white flex items-center">
              <Waves className="mr-2" size={20} color="#FF6B00" />
              Tank Specifications
            </h2>
            
            <div className="rounded-2xl p-4 bg-[#1A1A1A]">
              <div className="grid grid-cols-1 gap-3">
                {tankData.tankType && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Tank Type</span>
                    <span className="text-base text-white font-medium">{tankData.tankType}</span>
                  </div>
                )}
                
                {tankData.material && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Material</span>
                    <span className="text-base text-white">{tankData.material}</span>
                  </div>
                )}
                
                {tankData.capacity && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Capacity</span>
                    <span className="text-base text-white">{tankData.capacity} L</span>
                  </div>
                )}
                
                {tankData.dimensions && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Dimensions</span>
                    <span className="text-base text-white">
                      {tankData.dimensions.length} × {tankData.dimensions.width} × {tankData.dimensions.height} cm
                    </span>
                  </div>
                )}
                
                {tankData.weight && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Weight</span>
                    <span className="text-base text-white">{tankData.weight} kg</span>
                  </div>
                )}
                
                {tankData.thickness && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Thickness</span>
                    <span className="text-base text-white">{tankData.thickness} mm</span>
                  </div>
                )}
                
                {tankData.lighting && (
                  <div className="flex justify-between py-2 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">Lighting</span>
                    <span className="text-base text-white">{tankData.lighting} W</span>
                  </div>
                )}
                
                {tankData.filtation && (
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-base text-[#B3B3B3]">Filtration</span>
                    <span className="text-base text-white">{tankData.filtation} L/h</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product Details */}
        <div className="px-6 mb-6">
          <h2 className="font-bold text-lg mb-4 text-white">Product Details</h2>
          
          <div className="rounded-2xl p-4 bg-[#1A1A1A]">
            <div className="flex justify-between py-3 border-b border-[#333333]">
              <span className="font-medium text-base text-[#B3B3B3]">SKU</span>
              <span className="text-base text-white">{product.sku || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between py-3 border-b border-[#333333]">
              <span className="font-medium text-base text-[#B3B3B3]">Stock</span>
              <span className="text-base text-white">{product.stock} units</span>
            </div>
            
            {product.lifespan && (
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Lifespan</span>
                <span className="text-base text-white">{product.lifespan}</span>
              </div>
            )}
            
            <div className="flex justify-between py-3">
              <span className="font-medium text-base text-[#B3B3B3]">Status</span>
              <div className="px-2 py-1 rounded" style={{ backgroundColor: `${getStatusColor(product.isActive ? 'active' : 'inactive')}20` }}>
                <span className="font-medium text-sm" style={{ color: getStatusColor(product.isActive ? 'active' : 'inactive') }}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-20" />
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Success</h3>
                <p className="text-sm text-white/60">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-success hover:bg-success/90"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Error</h3>
                <p className="text-sm text-white/60">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-error hover:bg-error/90"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certificateModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="relative w-full h-full">
            {/* Close button */}
            <button
              onClick={() => setCertificateModalVisible(false)}
              className="absolute top-16 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10 bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={20} color="#FFFFFF" />
            </button>
            
            {/* Certificate Image */}
            <div className="flex-1 flex items-center justify-center p-6 h-full">
              {product.certificate ? (
                <div className="relative w-full max-w-4xl h-[80vh]">
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
                  <span className="text-base text-white">No certificate available</span>
                </div>
              )}
            </div>
            
            {/* Bottom info */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="rounded-xl p-4 bg-white/10 backdrop-blur">
                <h3 className="font-bold text-lg text-center mb-2 text-white">
                  Product Certificate
                </h3>
                <p className="text-sm text-center text-[#B3B3B3]">
                  {product.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}