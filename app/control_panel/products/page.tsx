"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Star,
  TrendingDown,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';

// Mock data - replace with your Convex queries
const mockCategories = [
  { _id: 'cat1', name: 'Tropical Fish' },
  { _id: 'cat2', name: 'Aquarium Tanks' },
  { _id: 'cat3', name: 'Filters & Equipment' },
  { _id: 'cat4', name: 'Fish Food' },
  { _id: 'cat5', name: 'Decorations' },
  { _id: 'cat6', name: 'Lighting' },
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
    rating: 4.8,
    reviews: 24,
    createdAt: Date.now() - 86400000,
    sku: 'GF-001',
    margin: 68,
    sales: 342,
    revenue: 85500,
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
    rating: 4.6,
    reviews: 18,
    createdAt: Date.now() - 172800000,
    sku: 'BF-002',
    margin: 65,
    sales: 267,
    revenue: 48060,
  },
  {
    _id: '3',
    name: '75L Glass Aquarium Tank',
    description: 'Premium glass aquarium with LED lighting system',
    categoryId: 'cat2',
    price: 1200,
    stock: 0,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400',
    badge: 'New',
    rating: 4.9,
    reviews: 12,
    createdAt: Date.now() - 259200000,
    sku: 'TANK-75L',
    margin: 72,
    sales: 198,
    revenue: 237600,
  },
  {
    _id: '4',
    name: 'Aquarium Filter System Pro',
    description: 'High-quality filtration system for clean water',
    categoryId: 'cat3',
    price: 350,
    stock: 25,
    isActive: false,
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400',
    rating: 4.3,
    reviews: 8,
    createdAt: Date.now() - 345600000,
    sku: 'FILTER-PRO',
    margin: 71,
    sales: 156,
    revenue: 54600,
  },
  {
    _id: '5',
    name: 'LED Lighting Kit',
    description: 'Energy-efficient LED lighting for aquariums',
    categoryId: 'cat6',
    price: 250,
    stock: 12,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c91a?w=400',
    rating: 4.5,
    reviews: 15,
    createdAt: Date.now() - 432000000,
    sku: 'LED-KIT-001',
    margin: 65,
    sales: 267,
    revenue: 66750,
  },
];

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

const getStockStatus = (stock: number) => {
  if (stock === 0)
    return {
      status: "Out of Stock",
      color: "bg-error/10",
      textColor: "text-error",
    };
  if (stock < 10)
    return {
      status: "Low Stock",
      color: "bg-warning/10",
      textColor: "text-warning",
    };
  return {
    status: "In Stock",
    color: "bg-success/10",
    textColor: "text-success",
  };
};

export default function ProductsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
        (categoryMap[product.categoryId] && categoryMap[product.categoryId].toLowerCase().includes(query)) ||
        product.sku.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter((product) => {
        const productCategory = categoryMap[product.categoryId];
        return productCategory === selectedCategory;
      });
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((product) => {
        switch (selectedStatus) {
          case "active":
            return product.isActive && product.stock > 0;
          case "inactive":
            return !product.isActive;
          case "out_of_stock":
            return product.stock === 0;
          case "low_stock":
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
    const topRated = mockProducts.filter(p => (p.rating || 0) > 4.5).length;
    const lowStock = mockProducts.filter(p => p.stock > 0 && p.stock < 10).length;
    const totalRevenue = mockProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalSales = mockProducts.reduce((sum, p) => sum + (p.sales || 0), 0);

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStock: outOfStock,
      inactiveProducts: inactive,
      topRated: topRated,
      lowStock: lowStock,
      totalRevenue,
      totalSales,
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

  const handleProductAction = (productId: string, action: string) => {
    if (action === "Edit") {
      router.push(`/control_panel/products/edit/${productId}`);
    } else if (action === "View") {
      router.push(`/control_panel/products/${productId}`);
    } else if (action === "Toggle") {
      console.log("Toggle status for product:", productId);
    } else if (action === "Delete") {
      console.log("Delete product:", productId);
    }
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Product Management
                  </h1>
                  <p className="text-sm text-white/60">
                    Manage your product inventory and catalog
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary text-white"
                        : "bg-secondary/60 text-white/60 hover:text-white"
                    }`}
                  >
                    <Package className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "table"
                        ? "bg-primary text-white"
                        : "bg-secondary/60 text-white/60 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={() => router.push("/control_panel/products/add")}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-xs text-success">+3.1%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.totalProducts}
              </p>
              <p className="text-xs text-white/60">Total Products</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-xs text-success">+2.5%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.activeProducts}
              </p>
              <p className="text-xs text-white/60">Active</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-xs text-warning">+1.2%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.lowStock}
              </p>
              <p className="text-xs text-white/60">Low Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-5 h-5 text-error" />
                <span className="text-xs text-error">+0.8%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.outOfStock}
              </p>
              <p className="text-xs text-white/60">Out of Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-warning" />
                <span className="text-xs text-success">+5.7%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.topRated}
              </p>
              <p className="text-xs text-white/60">Top Rated</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search products, SKU, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-primary border-primary text-white"
                  : "bg-secondary/60 border-white/10 text-white hover:bg-secondary/80"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Categories
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categoryNames.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedCategory === category
                          ? "bg-primary border-primary text-white"
                          : "bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                        selectedStatus === filter.key
                          ? "bg-info border-info text-white"
                          : "bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          selectedStatus === filter.key
                            ? "bg-white/20 text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {filter.count}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Products ({filteredProducts.length})
            </h2>
            {filteredProducts.length === 0 && mockProducts.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedStatus("all");
                }}
                className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No products found
              </h3>
              <p className="text-white/60 mb-6 text-center">
                {mockProducts.length === 0
                  ? "No products have been added yet."
                  : "Try adjusting your search terms or filters."}
              </p>
              {mockProducts.length === 0 && (
                <Button
                  onClick={() => router.push("/control_panel/products/add")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const discount =
                  product.originalPrice && product.originalPrice > product.price
                    ? Math.round(
                        ((product.originalPrice - product.price) /
                          product.originalPrice) *
                          100,
                      )
                    : 0;

                // Determine product status
                const getItemStatus = (prod: typeof product) => {
                  if (!prod.isActive) return "inactive";
                  if (prod.stock === 0) return "out_of_stock";
                  return "active";
                };

                const itemStatus = getItemStatus(product);
                const categoryName =
                  categoryMap[product.categoryId] || "Unknown Category";

                return (
                  <div
                    key={product._id}
                    className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex space-x-4">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary border border-white/10">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-white/20" />
                            </div>
                          )}
                        </div>
                        {product.badge && (
                          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-primary">
                            <span className="text-xs font-bold text-white">
                              {product.badge === "Bestseller"
                                ? "★"
                                : product.badge.charAt(0)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded bg-error">
                            <span className="text-xs font-bold text-white">
                              -{discount}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {product.name || "Unnamed Product"}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {categoryName}
                            </p>
                            <p className="text-xs text-white/40">
                              SKU: {product.sku} • ID:{" "}
                              {product._id.slice(-6).toUpperCase()}
                            </p>
                          </div>

                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setSelectedProduct(
                                  selectedProduct === product._id
                                    ? null
                                    : product._id,
                                )
                              }
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedProduct === product._id && (
                              <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "View")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Edit")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Product</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Toggle")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    {product.isActive ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                    <span>
                                      {product.isActive
                                        ? "Deactivate"
                                        : "Activate"}
                                    </span>
                                  </button>
                                  <div className="border-t border-white/10 my-1"></div>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Delete")
                                    }
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
                            {product.originalPrice &&
                              product.originalPrice > product.price && (
                                <span className="text-sm text-white/40 line-through ml-2">
                                  {formatCurrency(product.originalPrice)}
                                </span>
                              )}
                          </div>

                          {product.rating > 4.5 && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-warning fill-current" />
                              <span className="text-sm text-warning ml-1 font-medium">
                                {product.rating}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`px-3 py-1 rounded-lg ${
                                itemStatus === "active"
                                  ? "bg-success/10 text-success"
                                  : itemStatus === "inactive"
                                    ? "bg-white/10 text-white/60"
                                    : "bg-error/10 text-error"
                              }`}
                            >
                              <span className="text-xs font-medium capitalize">
                                {itemStatus.replace("_", " ")}
                              </span>
                            </div>

                            <div
                              className={`px-3 py-1 rounded-lg ${stockStatus.color} ${stockStatus.textColor}`}
                            >
                              <span className="text-xs font-medium">
                                {product.stock} in stock
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-white/60">
                              Sales: {product.sales || 0}
                            </p>
                            <p className="text-xs text-white/60">
                              Revenue: {formatCurrency(product.revenue || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center">
                            <span className="text-xs text-white/60">
                              Created:{" "}
                              {new Date(product.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() =>
                                router.push(
                                  `/control_panel/products/${product._id}`,
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="border-primary/20 text-primary hover:bg-primary/10"
                            >
                              View
                            </Button>

                            <Button
                              onClick={() =>
                                router.push(
                                  `/control_panel/products/edit/${product._id}`,
                                )
                              }
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                            >
                              Edit
                            </Button>
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
      </div>

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
