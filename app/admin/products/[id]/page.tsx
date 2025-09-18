'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Award, Edit, Eye, X } from 'lucide-react';
import React, { useState } from 'react';
import Image from 'next/image';

// Dummy data for demonstration
const DUMMY_PRODUCT = {
  _id: "1",
  name: "Neon Tetra Fish",
  description: "Beautiful small freshwater fish perfect for community aquariums. Known for their vibrant neon blue and red stripes, these peaceful fish are ideal for beginners and experienced aquarists alike.",
  price: 25.00,
  originalPrice: 35.00,
  stock: 15,
  sku: "FISH-001",
  image: "/api/placeholder/400/320",
  images: ["/api/placeholder/400/320", "/api/placeholder/400/320", "/api/placeholder/400/320"],
  certificate: "/api/placeholder/600/800",
  badge: "Popular",
  isActive: true,
  lifespan: "3-5 years",
  categoryId: "cat1"
};

const DUMMY_CATEGORY = {
  _id: "cat1",
  name: "Tropical Fish"
};

const DUMMY_FISH_DATA = {
  scientificName: "Paracheirodon innesi",
  size: 4,
  temperature: "20-26",
  phLevel: "6.0-7.0",
  diet: "Omnivore",
  lifespan: "3-5 years",
  age: 6,
  origin: "Amazon Basin"
};

const DUMMY_TANK_DATA = {
  tankType: "Glass Aquarium",
  material: "Tempered Glass",
  capacity: 40,
  dimensions: {
    length: 60,
    width: 30,
    height: 35
  },
  weight: 15,
  thickness: 6
};

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
  
  // Use dummy data instead of Convex queries
  const product = DUMMY_PRODUCT;
  const category = DUMMY_CATEGORY;
  const fishData = DUMMY_FISH_DATA;
  const tankData = null; // Set to DUMMY_TANK_DATA if you want to test tank view
  
  if (!product) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-xl text-white mb-4">
            {id ? 'Loading...' : 'Product Not Found'}
          </h1>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#E55A00] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock);
  const discount = product.originalPrice && product.originalPrice > product.price 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;
  const isFishProduct = category?.name?.includes('Fish');
  const isTankProduct = category?.name?.includes('Tank');

  // Combine main image with additional images for display
  const allImageUrls = [
    product.image,
    ...(product.images || [])
  ].filter(Boolean);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      // Simulate delete operation
      console.log('Product deleted:', product._id);
      alert('Product deleted successfully');
      router.back();
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
          onClick={() => router.back()}
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
            {allImageUrls.length > 0 && allImageUrls[activeImageIndex] ? (
              <div className="relative w-full h-80">
                <Image
                  src={allImageUrls[activeImageIndex]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-80 flex items-center justify-center bg-[#1A1A1A]">
                <span className="text-base text-[#666666]">No Image Available</span>
              </div>
            )}
            
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
          {allImageUrls.length > 1 && (
            <div className="flex overflow-x-auto space-x-2 scrollbar-hide">
              {allImageUrls.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImageIndex === index ? 'border-[#FF6B00]' : 'border-transparent'
                  }`}
                >
                  {imageUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={imageUrl}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#333333]">
                      <span className="text-xs text-[#666666]">No Image</span>
                    </div>
                  )}
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

        {/* Fish-specific details */}
        {isFishProduct && fishData && (
          <div className="px-6 mb-6">
            <h2 className="font-bold text-lg mb-4 text-white">Fish Details</h2>
            
            <div className="rounded-2xl p-4 bg-[#1A1A1A]">
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Scientific Name</span>
                <span className="text-base text-white">{fishData.scientificName}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Size</span>
                <span className="text-base text-white">{fishData.size} cm</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Temperature</span>
                <span className="text-base text-white">{fishData.temperature}°C</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">pH Level</span>
                <span className="text-base text-white">{fishData.phLevel}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Diet</span>
                <span className="text-base text-white">{fishData.diet}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Lifespan</span>
                <span className="text-base text-white">{fishData.lifespan}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Age</span>
                <span className="text-base text-white">{fishData.age} months</span>
              </div>
              
              <div className="flex justify-between py-3">
                <span className="font-medium text-base text-[#B3B3B3]">Origin</span>
                <span className="text-base text-white">{fishData.origin}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tank-specific details */}
        {isTankProduct && tankData && (
          <div className="px-6 mb-6">
            <h2 className="font-bold text-lg mb-4 text-white">Tank Specifications</h2>
            
            <div className="rounded-2xl p-4 bg-[#1A1A1A]">
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Tank Type</span>
                <span className="text-base text-white">{tankData.tankType}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Material</span>
                <span className="text-base text-white">{tankData.material}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Capacity</span>
                <span className="text-base text-white">{tankData.capacity} L</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Dimensions</span>
                <span className="text-base text-white">
                  {tankData.dimensions.length}×{tankData.dimensions.width}×{tankData.dimensions.height} cm
                </span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-[#333333]">
                <span className="font-medium text-base text-[#B3B3B3]">Weight</span>
                <span className="text-base text-white">{tankData.weight} kg</span>
              </div>
              
              <div className="flex justify-between py-3">
                <span className="font-medium text-base text-[#B3B3B3]">Thickness</span>
                <span className="text-base text-white">{tankData.thickness} mm</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-20" />
      </div>

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
            <div className="flex-1 flex items-center justify-center p-6">
              {product.certificate ? (
                <div className="relative w-full max-w-4xl h-[80vh]">
                  <Image
                    src={product.certificate}
                    alt="Product Certificate"
                    fill
                    className="object-contain rounded-xl"
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