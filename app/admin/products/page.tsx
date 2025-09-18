'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  TrendingDown,
  Image as ImageIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNavbar from '@/components/common/BottomNavbar';

// Mock data - replace with your Convex queries
const mockCategories = [
  { _id: 'cat1', name: 'Freshwater Fish' },
  { _id: 'cat2', name: 'Saltwater Fish' },
  { _id: 'cat3', name: 'Aquarium Tanks' },
];

const mockProducts = [
  {
    _id: '1',
    name: 'Premium Goldfish',
    description: 'Beautiful ornamental goldfish perfect for any aquarium',
    categoryId: 'cat1',
    price: 250,
    originalPrice: 300,
    stock: 15,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    badge: 'Bestseller',
    createdAt: Date.now() - 86400000
  },
  {
    _id: '2',
    name: 'Betta Fish - Blue',
    description: 'Vibrant blue betta fish, perfect for small tanks',
    categoryId: 'cat1',
    price: 180,
    stock: 8,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c91a?w=400',
    createdAt: Date.now() - 172800000
  },
  {
    _id: '3',
    name: 'Glass Aquarium Tank',
    description: '50L glass aquarium with LED lighting system',
    categoryId: 'cat3',
    price: 1200,
    stock: 0,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400',
    badge: 'New',
    createdAt: Date.now() - 259200000
  },
  {
    _id: '4',
    name: 'Marine Clownfish',
    description: 'Vibrant saltwater clownfish for marine aquariums',
    categoryId: 'cat2',
    price: 350,
    stock: 25,
    isActive: false,
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400',
    createdAt: Date.now() - 345600000
  },
];

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return { 
    status: 'Out of Stock', 
    color: 'bg-error/10', 
    textColor: 'text-error' 
  };
  if (stock < 10) return { 
    status: 'Low Stock', 
    color: 'bg-warning/10', 
    textColor: 'text-warning' 
  };
  return { 
    status: 'In Stock', 
    color: 'bg-success/10', 
    textColor: 'text-success' 
  };
};

export default function AdminProductsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Create category mapping for better filtering
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    mockCategories.forEach(cat => {
      map[cat._id] = cat.name;
    });
    return map;
  }, []);

  // Enhanced filtering logic
  const filteredProducts = useMemo(() => {
    let filtered = mockProducts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (categoryMap[product.categoryId] && categoryMap[product.categoryId].toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => {
        const productCategory = categoryMap[product.categoryId];
        return productCategory === selectedCategory;
      });
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => {
        switch (selectedStatus) {
          case 'active':
            return product.isActive && product.stock > 0;
          case 'inactive':
            return !product.isActive;
          case 'out_of_stock':
            return product.stock === 0;
          case 'low_stock':
            return product.stock > 0 && product.stock < 10;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedStatus, categoryMap]);

  // Calculate stats from filtered data
  const productStats = useMemo(() => {
    const total = mockProducts.length;
    const active = mockProducts.filter(p => p.isActive && p.stock > 0).length;
    const outOfStock = mockProducts.filter(p => p.stock === 0).length;
    const inactive = mockProducts.filter(p => !p.isActive).length;
    const lowStock = mockProducts.filter(p => p.stock > 0 && p.stock < 10).length;

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStock: outOfStock,
      inactiveProducts: inactive,
      lowStock: lowStock,
    };
  }, []);

  // Get category names with proper ordering
  const categoryNames = useMemo(() => {
    return ['All', ...mockCategories.map(cat => cat.name)];
  }, []);

  // Status filter options
  const statusFilters = useMemo(() => [
    { key: 'all', label: 'All Status', count: mockProducts.length },
    { key: 'active', label: 'Active', count: productStats.activeProducts },
    { key: 'inactive', label: 'Inactive', count: productStats.inactiveProducts },
    { key: 'out_of_stock', label: 'Out of Stock', count: productStats.outOfStock },
    { key: 'low_stock', label: 'Low Stock', count: productStats.lowStock },
  ], [productStats]);

  // Create stats array from calculated data
  const statsArray = useMemo(() => [
    {
      id: '1',
      title: 'Total Products',
      value: productStats.totalProducts.toString(),
      change: '+3.1%',
      icon: Package,
      color: 'text-info',
    },
    {
      id: '2',
      title: 'Active Products',
      value: productStats.activeProducts.toString(),
      change: '+2.5%',
      icon: Eye,
      color: 'text-success',
    },
    {
      id: '3',
      title: 'Out of Stock',
      value: productStats.outOfStock.toString(),
      change: '+1.2%',
      icon: TrendingDown,
      color: 'text-error',
    },
  ], [productStats]);

  const handleProductAction = (productId: string, action: string) => {
    if (action === 'Edit') {
      router.push(`/admin/products/edit?id=${productId}`);
    } else if (action === 'View') {
      router.push(`/admin/products/${productId}`);
    } else if (action === 'Toggle') {
      console.log('Toggle status for product:', productId);
    } else if (action === 'Delete') {
      console.log('Delete product:', productId);
    }
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Products</h1>
              <p className="text-sm text-primary">
                {filteredProducts.length} of {mockProducts.length} products
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/products/add')}
              className="px-3 py-2 rounded-lg bg-primary text-foreground flex items-center space-x-1 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder="Search products, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-primary/10 rounded-lg text-foreground placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Filter className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {statsArray.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="flex-shrink-0 bg-secondary/50 border border-primary/10 rounded-xl p-3 backdrop-blur-sm"
                style={{ minWidth: '120px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                  <span 
                    className={`text-xs font-medium ${
                      stat.change.startsWith('+') ? 'text-success' : 'text-error'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted">{stat.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary border-b border-white/10 px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Categories</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {categoryNames.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary border-primary text-foreground'
                        : 'bg-secondary border-primary/10 text-muted hover:text-foreground hover:border-primary/20'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedStatus(filter.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                      selectedStatus === filter.key
                        ? 'bg-info border-info text-foreground'
                        : 'bg-secondary border-primary/10 text-muted hover:text-foreground hover:border-primary/20'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <div className={`px-1.5 py-0.5 rounded text-xs ${
                      selectedStatus === filter.key
                        ? 'bg-foreground/20 text-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {filter.count}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Products List */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">
            Products ({filteredProducts.length})
          </h2>
          {filteredProducts.length === 0 && mockProducts.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedStatus('all');
              }}
              className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-dark mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No products found</h3>
            <p className="text-muted mb-6 text-center">
              {mockProducts.length === 0 
                ? 'No products have been added yet.' 
                : 'Try adjusting your search terms or filters.'}
            </p>
            {mockProducts.length === 0 && (
              <button
                onClick={() => router.push('/admin/products/add')}
                className="px-4 py-2 rounded-lg bg-primary text-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const discount = (product.originalPrice && product.originalPrice > product.price) ? 
                Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
              
              // Determine product status
              const getItemStatus = (prod: typeof product) => {
                if (!prod.isActive) return 'inactive';
                if (prod.stock === 0) return 'out_of_stock';
                return 'active';
              };
              
              const itemStatus = getItemStatus(product);
              const categoryName = categoryMap[product.categoryId] || 'Unknown Category';
              
              return (
                <div
                  key={product._id}
                  className="bg-secondary/50 border border-primary/10 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="flex space-x-4">
                    {/* Product Image */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-white/10">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted" />
                          </div>
                        )}
                      </div>
                      {product.badge && (
                        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-primary">
                          <span className="text-xs font-bold text-foreground">
                            {product.badge === 'Bestseller' ? '★' : product.badge.charAt(0)}
                          </span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded bg-error">
                          <span className="text-xs font-bold text-foreground">
                            -{discount}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground mb-1">
                            {product.name || 'Unnamed Product'}
                          </h3>
                          <p className="text-sm text-muted mb-1">{categoryName}</p>
                          <p className="text-xs text-muted-dark">
                            ID: {product._id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                        
                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setSelectedProduct(selectedProduct === product._id ? null : product._id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-muted" />
                          </button>

                          {selectedProduct === product._id && (
                            <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => handleProductAction(product._id, 'View')}
                                  className="w-full px-4 py-2 text-left text-foreground hover:bg-white/10 flex items-center space-x-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={() => handleProductAction(product._id, 'Edit')}
                                  className="w-full px-4 py-2 text-left text-foreground hover:bg-white/10 flex items-center space-x-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit Product</span>
                                </button>
                                <button
                                  onClick={() => handleProductAction(product._id, 'Toggle')}
                                  className="w-full px-4 py-2 text-left text-foreground hover:bg-white/10 flex items-center space-x-2"
                                >
                                  {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  <span>{product.isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                  onClick={() => handleProductAction(product._id, 'Delete')}
                                  className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm text-muted-dark line-through ml-2">
                              {formatCurrency(product.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-lg ${
                            itemStatus === 'active' ? 'bg-success/10 text-success' :
                            itemStatus === 'inactive' ? 'bg-muted/10 text-muted' :
                            'bg-error/10 text-error'
                          }`}>
                            <span className="text-xs font-medium capitalize">
                              {itemStatus.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-lg ${stockStatus.color} ${stockStatus.textColor}`}>
                            <span className="text-xs font-medium">
                              {product.stock} in stock
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                        <div className="flex items-center">
                          <span className="text-xs text-muted">
                            Created: {new Date(product.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/admin/products/${product._id}`)}
                            className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 transition-colors"
                          >
                            View
                          </button>
                          
                          <button
                            onClick={() => router.push(`/admin/products/edit?id=${product._id}`)}
                            className="px-3 py-2 rounded-lg bg-primary text-foreground text-xs hover:bg-primary/90 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Using the reusable component */}
      <BottomNavbar />

      {/* Bottom padding for mobile navigation */}
      <div className="h-16 sm:hidden" />

      {/* Click outside to close menu */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedProduct(null)}
        />
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