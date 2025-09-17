'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  ShoppingBag,
  Users,
  BarChart3,
  Bell
} from 'lucide-react';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { Product } from '@/types';

// Mock products data (expanded)
const mockProducts: Product[] = [
  {
    _id: '1',
    name: 'Betta Fish - Crown Tail',
    description: 'Beautiful crown tail betta fish with vibrant colors',
    price: 250,
    originalPrice: 300,
    categoryId: 'fish',
    image: '/api/placeholder/300/300',
    stock: 15,
    rating: 4.5,
    reviews: 32,
    badge: 'Popular',
    isActive: true,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
  {
    _id: '2',
    name: 'Goldfish - Oranda',
    description: 'Premium oranda goldfish with distinctive head growth',
    price: 480,
    categoryId: 'fish',
    image: '/api/placeholder/300/300',
    stock: 8,
    rating: 4.8,
    reviews: 18,
    badge: 'New',
    isActive: true,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now(),
  },
  {
    _id: '3',
    name: '20L Glass Aquarium',
    description: 'Crystal clear glass aquarium perfect for beginners',
    price: 1200,
    originalPrice: 1500,
    categoryId: 'tanks',
    image: '/api/placeholder/300/300',
    stock: 5,
    rating: 4.2,
    reviews: 12,
    badge: 'Sale',
    isActive: true,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now(),
  },
  {
    _id: '4',
    name: 'Angelfish Pair',
    description: 'Beautiful angelfish pair, perfect for community tanks',
    price: 850,
    categoryId: 'fish',
    image: '/api/placeholder/300/300',
    stock: 0,
    rating: 4.6,
    reviews: 25,
    isActive: true,
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now(),
  },
  {
    _id: '5',
    name: 'Neon Tetra School (10pcs)',
    description: 'Schooling fish perfect for community aquariums',
    price: 120,
    categoryId: 'fish',
    image: '/api/placeholder/300/300',
    stock: 25,
    rating: 4.3,
    reviews: 45,
    isActive: false, // Inactive product
    createdAt: Date.now() - 432000000,
    updatedAt: Date.now(),
  },
];

export default function AdminProductsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Calculate stats
  const productStats = useMemo(() => {
    const active = mockProducts.filter(p => p.isActive).length;
    const inactive = mockProducts.filter(p => !p.isActive).length;
    const lowStock = mockProducts.filter(p => p.stock <= 10 && p.isActive).length;
    const outOfStock = mockProducts.filter(p => p.stock === 0 && p.isActive).length;

    return { active, inactive, lowStock, outOfStock, total: mockProducts.length };
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = mockProducts;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(product => product.isActive);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(product => !product.isActive);
      } else if (selectedStatus === 'low-stock') {
        filtered = filtered.filter(product => product.stock <= 10 && product.isActive);
      } else if (selectedStatus === 'out-of-stock') {
        filtered = filtered.filter(product => product.stock === 0);
      }
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedCategory, selectedStatus]);

  const handleToggleStatus = (productId: string) => {
    // TODO: Implement API call to toggle product status
    console.log('Toggle status for product:', productId);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    // TODO: Implement API call to delete product
    console.log('Delete product:', productId);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">Products</h1>
              <p className="text-sm text-muted">{filteredProducts.length} products</p>
            </div>
            <button
              onClick={() => router.push('/admin/products/new')}
              className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-white/10 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-xl bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-primary">{productStats.active}</p>
            <p className="text-xs text-muted">Active</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-warning">{productStats.lowStock}</p>
            <p className="text-xs text-muted">Low Stock</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-error">{productStats.outOfStock}</p>
            <p className="text-xs text-muted">Out of Stock</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-muted">{productStats.inactive}</p>
            <p className="text-xs text-muted">Inactive</p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary border-b border-white/10 px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'fish', label: 'Fish' },
                  { value: 'tanks', label: 'Tanks' },
                ].map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'low-stock', label: 'Low Stock' },
                  { value: 'out-of-stock', label: 'Out of Stock' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="px-6 py-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-muted mb-6">Try adjusting your search or filters</p>
            <Button onClick={() => router.push('/admin/products/new')}>
              Add New Product
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const hasDiscount = product.originalPrice && product.originalPrice > product.price;

              return (
                <Card key={product._id} className="relative">
                  <div className="flex space-x-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
                      <span className="text-xs text-muted">IMG</span>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white line-clamp-1">{product.name}</h3>
                            {!product.isActive && (
                              <span className="px-2 py-0.5 bg-muted/20 text-muted text-xs rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted line-clamp-1 mb-1">{product.description}</p>
                          <div className="flex items-center space-x-3 text-xs text-muted">
                            <span>ID: {product._id}</span>
                            <span className={stockStatus.textColor}>
                              Stock: {product.stock}
                            </span>
                            {product.rating && (
                              <span>★ {product.rating} ({product.reviews} reviews)</span>
                            )}
                          </div>
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
                                  onClick={() => router.push(`/admin/products/${product._id}/edit`)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit Product</span>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(product._id)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  <span>{product.isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                <button
                                  onClick={() => router.push(`/admin/products/${product._id}`)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Details</span>
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                  onClick={() => handleDeleteProduct(product._id)}
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

                      {/* Price and Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{formatCurrency(product.price)}</span>
                          {hasDiscount && (
                            <span className="text-sm text-muted line-through">
                              {formatCurrency(product.originalPrice!)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {product.badge && (
                            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                              {product.badge}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${stockStatus.color} ${stockStatus.textColor}`}>
                            {stockStatus.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Products</span>
          </button>
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />

      {/* Click outside to close menu */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}