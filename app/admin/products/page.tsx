'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Use native img to avoid domain config issues for external URLs
import { Image as ImageIcon, Tag } from 'lucide-react';
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
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Products will be fetched from Convex

export default function AdminProductsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Fetch products from backend
  const productsQuery = useQuery(api.services.admin.getAllProductsAdmin, {
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    search: searchQuery || undefined
  }) || [];

  // Calculate stats
  const productStats = useMemo(() => {
    const active = productsQuery.filter((p: any) => p.isActive).length;
    const inactive = productsQuery.filter((p: any) => !p.isActive).length;
    const lowStock = productsQuery.filter((p: any) => p.stock <= 10 && p.isActive).length;
    const outOfStock = productsQuery.filter((p: any) => p.stock === 0 && p.isActive).length;

    return { active, inactive, lowStock, outOfStock, total: productsQuery.length };
  }, [productsQuery]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = productsQuery as any[];

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

    return filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [searchQuery, selectedCategory, selectedStatus, productsQuery]);

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
        {/* Loading skeletons */}
        {productsQuery === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse bg-secondary/40 border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
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
              const stockCount = typeof product.stock === 'number' ? product.stock : 0;
              const stockStatus = getStockStatus(stockCount);
              const hasDiscount = typeof product.originalPrice === 'number' && product.originalPrice > product.price;

              return (
                <Card key={product._id} className="relative">
                  <div className="flex space-x-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary/40 border border-white/10 flex items-center justify-center">
                      {(product.image || (product.images && product.images[0])) ? (
                        <img
                          src={(product.image || product.images[0]) as string}
                          alt={product.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white line-clamp-1">{product.name || 'Untitled Product'}</h3>
                            {!product.isActive && (
                              <span className="px-2 py-0.5 bg-muted/20 text-muted text-xs rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          {product.categoryName && product.categoryName.trim() !== '' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-white/10 text-white/70 mr-2">
                              <Tag className="w-3 h-3 mr-1 text-white/50" />
                              {product.categoryName}
                            </span>
                          )}
                          {product.description && product.description.trim() !== '' && (
                            <p className="text-sm text-muted line-clamp-1 mb-1">{product.description}</p>
                          )}
                          <div className="flex items-center space-x-3 text-xs text-muted">
                            <span className={stockStatus.textColor}>
                              {stockCount > 0 ? `Stock: ${stockCount}` : 'Out of stock'}
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
                          {product.badge && product.badge.trim() !== '' && (
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