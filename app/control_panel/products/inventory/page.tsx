'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  Filter,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  MoreVertical,
  Settings,
  Zap,
  Clock,
  DollarSign,
} from 'lucide-react';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';

// Mock inventory data
const mockInventoryData = [
  {
    _id: '1',
    name: 'Premium Goldfish',
    sku: 'GF-001',
    category: 'Tropical Fish',
    currentStock: 15,
    minStock: 10,
    maxStock: 50,
    reorderPoint: 15,
    unitCost: 150,
    sellingPrice: 250,
    margin: 40,
    lastRestocked: Date.now() - 86400000,
    nextRestock: Date.now() + 172800000,
    supplier: 'AquaWorld Supplies',
    status: 'in_stock',
    salesVelocity: 2.3,
    turnoverRate: 4.2,
    totalValue: 3750,
  },
  {
    _id: '2',
    name: 'Betta Fish - Blue',
    sku: 'BF-002',
    category: 'Tropical Fish',
    currentStock: 8,
    minStock: 15,
    maxStock: 30,
    reorderPoint: 15,
    unitCost: 120,
    sellingPrice: 180,
    margin: 33.3,
    lastRestocked: Date.now() - 172800000,
    nextRestock: Date.now() + 259200000,
    supplier: 'Tropical Fish Co.',
    status: 'low_stock',
    salesVelocity: 1.8,
    turnoverRate: 3.1,
    totalValue: 1440,
  },
  {
    _id: '3',
    name: '75L Glass Aquarium Tank',
    sku: 'TANK-75L',
    category: 'Aquarium Tanks',
    currentStock: 0,
    minStock: 5,
    maxStock: 20,
    reorderPoint: 5,
    unitCost: 800,
    sellingPrice: 1200,
    margin: 33.3,
    lastRestocked: Date.now() - 345600000,
    nextRestock: Date.now() + 432000000,
    supplier: 'GlassWorks Inc.',
    status: 'out_of_stock',
    salesVelocity: 0.8,
    turnoverRate: 2.1,
    totalValue: 0,
  },
  {
    _id: '4',
    name: 'Aquarium Filter System Pro',
    sku: 'FILTER-PRO',
    category: 'Filters & Equipment',
    currentStock: 25,
    minStock: 10,
    maxStock: 40,
    reorderPoint: 10,
    unitCost: 200,
    sellingPrice: 350,
    margin: 42.9,
    lastRestocked: Date.now() - 432000000,
    nextRestock: Date.now() + 518400000,
    supplier: 'FilterTech Solutions',
    status: 'in_stock',
    salesVelocity: 1.2,
    turnoverRate: 2.8,
    totalValue: 8750,
  },
  {
    _id: '5',
    name: 'LED Lighting Kit',
    sku: 'LED-KIT-001',
    category: 'Lighting',
    currentStock: 12,
    minStock: 8,
    maxStock: 25,
    reorderPoint: 8,
    unitCost: 150,
    sellingPrice: 250,
    margin: 40,
    lastRestocked: Date.now() - 518400000,
    nextRestock: Date.now() + 604800000,
    supplier: 'LightTech Pro',
    status: 'in_stock',
    salesVelocity: 1.5,
    turnoverRate: 3.5,
    totalValue: 3000,
  },
  {
    _id: '6',
    name: 'Premium Fish Food',
    sku: 'FOOD-PREMIUM',
    category: 'Fish Food',
    currentStock: 45,
    minStock: 20,
    maxStock: 100,
    reorderPoint: 20,
    unitCost: 25,
    sellingPrice: 45,
    margin: 44.4,
    lastRestocked: Date.now() - 604800000,
    nextRestock: Date.now() + 691200000,
    supplier: 'NutriFish Corp',
    status: 'in_stock',
    salesVelocity: 3.2,
    turnoverRate: 5.8,
    totalValue: 2025,
  },
];

const getStockStatus = (currentStock: number, minStock: number) => {
  if (currentStock === 0) return { 
    status: 'Out of Stock', 
    color: 'bg-error/10', 
    textColor: 'text-error',
    icon: AlertTriangle
  };
  if (currentStock <= minStock) return { 
    status: 'Low Stock', 
    color: 'bg-warning/10', 
    textColor: 'text-warning',
    icon: AlertTriangle
  };
  return { 
    status: 'In Stock', 
    color: 'bg-success/10', 
    textColor: 'text-success',
    icon: CheckCircle
  };
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString();
};

export default function InventoryPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(mockInventoryData.map(item => item.category))];
    return ['All', ...uniqueCategories];
  }, []);

  // Filter inventory data
  const filteredInventory = useMemo(() => {
    let filtered = mockInventoryData;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = getStockStatus(item.currentStock, item.minStock);
        return stockStatus.status.toLowerCase().replace(' ', '_') === selectedStatus;
      });
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedStatus]);

  // Calculate inventory stats
  const inventoryStats = useMemo(() => {
    const totalItems = mockInventoryData.length;
    const inStock = mockInventoryData.filter(item => item.currentStock > item.minStock).length;
    const lowStock = mockInventoryData.filter(item => item.currentStock > 0 && item.currentStock <= item.minStock).length;
    const outOfStock = mockInventoryData.filter(item => item.currentStock === 0).length;
    const totalValue = mockInventoryData.reduce((sum, item) => sum + item.totalValue, 0);
    const avgTurnoverRate = mockInventoryData.reduce((sum, item) => sum + item.turnoverRate, 0) / mockInventoryData.length;
    const itemsNeedingReorder = mockInventoryData.filter(item => item.currentStock <= item.reorderPoint).length;

    return {
      totalItems,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
      avgTurnoverRate,
      itemsNeedingReorder,
    };
  }, []);

  const handleItemAction = (itemId: string, action: string) => {
    if (action === 'Edit') {
      router.push(`/control_panel/products/edit/${itemId}`);
    } else if (action === 'View') {
      router.push(`/control_panel/products/${itemId}`);
    } else if (action === 'Restock') {
      console.log('Restock item:', itemId);
    } else if (action === 'Adjust') {
      console.log('Adjust stock for item:', itemId);
    }
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
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
                  <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
                  <p className="text-sm text-white/60">Monitor stock levels and manage inventory</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-xs text-success">+2.1%</span>
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.totalItems}</p>
              <p className="text-xs text-white/60">Total Items</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-xs text-success">+1.8%</span>
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.inStock}</p>
              <p className="text-xs text-white/60">In Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-xs text-warning">+0.5%</span>
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.lowStock}</p>
              <p className="text-xs text-white/60">Low Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                <span className="text-xs text-error">+0.2%</span>
              </div>
              <p className="text-2xl font-bold text-white">{inventoryStats.outOfStock}</p>
              <p className="text-xs text-white/60">Out of Stock</p>
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
                placeholder="Search products, SKU, suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
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
                <label className="block text-sm font-medium text-white mb-2">Categories</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary border-primary text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Stock Status</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { key: 'all', label: 'All Status', count: mockInventoryData.length },
                    { key: 'in_stock', label: 'In Stock', count: inventoryStats.inStock },
                    { key: 'low_stock', label: 'Low Stock', count: inventoryStats.lowStock },
                    { key: 'out_of_stock', label: 'Out of Stock', count: inventoryStats.outOfStock },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                        selectedStatus === filter.key
                          ? 'bg-info border-info text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedStatus === filter.key
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {filter.count}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Inventory List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Inventory ({filteredInventory.length})
            </h2>
            {inventoryStats.itemsNeedingReorder > 0 && (
              <div className="flex items-center space-x-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {inventoryStats.itemsNeedingReorder} items need reorder
                </span>
              </div>
            )}
          </div>
          
          {filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No inventory items found</h3>
              <p className="text-white/60 mb-6 text-center">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minStock);
                const StatusIcon = stockStatus.icon;
                const stockPercentage = (item.currentStock / item.maxStock) * 100;
                const needsReorder = item.currentStock <= item.reorderPoint;
                
                return (
                  <div
                    key={item._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 ${
                      needsReorder 
                        ? 'border-warning/30 bg-warning/5' 
                        : 'border-white/10 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex space-x-4">
                      {/* Stock Level Indicator */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-secondary border border-white/10 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-bold text-white">{item.currentStock}</div>
                            <div className="text-xs text-white/60">units</div>
                          </div>
                        </div>
                        {needsReorder && (
                          <div className="mt-1 text-center">
                            <span className="text-xs text-warning font-medium">Reorder</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {item.name}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {item.category} • SKU: {item.sku}
                            </p>
                            <p className="text-xs text-white/40">
                              Supplier: {item.supplier}
                            </p>
                          </div>
                          
                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setSelectedItem(selectedItem === item._id ? null : item._id)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedItem === item._id && (
                              <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleItemAction(item._id, 'View')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleItemAction(item._id, 'Edit')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Item</span>
                                  </button>
                                  <button
                                    onClick={() => handleItemAction(item._id, 'Restock')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>Restock</span>
                                  </button>
                                  <button
                                    onClick={() => handleItemAction(item._id, 'Adjust')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Settings className="w-4 h-4" />
                                    <span>Adjust Stock</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Stock Status and Metrics */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`px-3 py-1 rounded-lg ${stockStatus.color} ${stockStatus.textColor} flex items-center space-x-1`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className="text-xs font-medium">{stockStatus.status}</span>
                            </div>
                            
                            <div className="text-xs text-white/60">
                              Min: {item.minStock} | Max: {item.maxStock}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {formatCurrency(item.sellingPrice)}
                            </p>
                            <p className="text-xs text-white/60">
                              Margin: {item.margin}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Stock Level Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                            <span>Stock Level</span>
                            <span>{stockPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                stockPercentage > 50 ? 'bg-success' :
                                stockPercentage > 25 ? 'bg-warning' : 'bg-error'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Performance Metrics */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>Velocity: {item.salesVelocity}/day</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>Turnover: {item.turnoverRate}x</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Last: {formatDate(item.lastRestocked)}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-white/60">Total Value</p>
                            <p className="text-sm font-medium text-white">
                              {formatCurrency(item.totalValue)}
                            </p>
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
      {selectedItem && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
