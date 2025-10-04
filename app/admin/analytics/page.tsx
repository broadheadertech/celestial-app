'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  Target,
  Calendar,
  RefreshCw,
  Eye,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Mock analytics data - replace with real API calls
const mockAnalyticsData = {
  revenue: {
    current: 125680.50,
    previous: 98450.25,
    change: 27.7,
    trend: 'up'
  },
  orders: {
    current: 456,
    previous: 389,
    change: 17.2,
    trend: 'up'
  },
  users: {
    current: 234,
    previous: 198,
    change: 18.2,
    trend: 'up'
  },
  conversionRate: {
    current: 4.2,
    previous: 3.8,
    change: 10.5,
    trend: 'up'
  },
  salesTrend: [
    { date: '2024-01-01', revenue: 12000, orders: 45 },
    { date: '2024-01-02', revenue: 15000, orders: 52 },
    { date: '2024-01-03', revenue: 18000, orders: 61 },
    { date: '2024-01-04', revenue: 22000, orders: 73 },
    { date: '2024-01-05', revenue: 25000, orders: 82 },
    { date: '2024-01-06', revenue: 28000, orders: 89 },
    { date: '2024-01-07', revenue: 31000, orders: 95 },
  ],
  topProducts: [
    { name: 'Betta Splendens Premium', sales: 89, revenue: 44500, category: 'Fish' },
    { name: 'LED Aquarium Light 60cm', sales: 67, revenue: 33500, category: 'Accessories' },
    { name: 'Glass Tank 40L', sales: 45, revenue: 22500, category: 'Tanks' },
    { name: 'Aquarium Filter Pro', sales: 38, revenue: 19000, category: 'Equipment' },
    { name: 'Fish Food Premium Mix', sales: 156, revenue: 15600, category: 'Food' },
  ],
  orderStatus: {
    pending: 12,
    confirmed: 89,
    processing: 156,
    shipped: 89,
    delivered: 234,
    cancelled: 8
  }
};

const timeFilters = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
];

function AdminAnalyticsContent() {
  const router = useRouter();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400';
      case 'shipped': return 'bg-blue-500/20 text-blue-400';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-purple-500/20 text-purple-400';
      case 'pending': return 'bg-orange-500/20 text-orange-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Fetch real data from Convex
  const dashboardStats = useQuery(api.services.admin.getDashboardStats);
  const recentOrders = useQuery(api.services.admin.getRecentOrders, { limit: 10 });
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Refresh data by refetching queries
      await new Promise(resolve => setTimeout(resolve, 1000));
      setModalMessage('Analytics data refreshed successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setModalMessage('Error refreshing analytics data. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    try {
      // TODO: Implement actual export functionality
      setModalMessage('Export functionality will be implemented soon!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      setModalMessage('Error exporting data. Please try again.');
      setShowErrorModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header with Safe Area */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Analytics</h1>
                <p className="text-xs text-white/60">Business insights & performance metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-sm px-3 py-1.5"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
                className="text-sm px-3 py-1.5"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
              <button className="p-1.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Time Filter */}
          <div className="flex items-center space-x-2 mt-3">
            <Calendar className="w-3 h-3 text-white/60" />
            <span className="text-xs text-white/60 mr-2">Time Period:</span>
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedTimeFilter(filter.value)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedTimeFilter === filter.value
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {/* Key Metrics - Compact Horizontal Layout */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 mb-6">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[
              {
                id: 'revenue',
                title: 'Total Revenue',
                value: dashboardStats ? formatCurrency(dashboardStats.totalRevenue) : formatCurrency(mockAnalyticsData.revenue.current),
                change: dashboardStats ? '+12.3%' : formatPercentage(mockAnalyticsData.revenue.change),
                icon: DollarSign,
                color: 'text-primary'
              },
              {
                id: 'orders',
                title: 'Total Orders',
                value: dashboardStats ? dashboardStats.totalOrders.toString() : mockAnalyticsData.orders.current.toString(),
                change: dashboardStats ? '+8.7%' : formatPercentage(mockAnalyticsData.orders.change),
                icon: ShoppingBag,
                color: 'text-info'
              },
              {
                id: 'customers',
                title: 'New Customers',
                value: dashboardStats ? dashboardStats.totalUsers.toString() : mockAnalyticsData.users.current.toString(),
                change: dashboardStats ? '+15.2%' : formatPercentage(mockAnalyticsData.users.change),
                icon: Users,
                color: 'text-success'
              },
              {
                id: 'conversion',
                title: 'Conversion Rate',
                value: dashboardStats ? '8.4%' : `${mockAnalyticsData.conversionRate.current}%`,
                change: dashboardStats ? '-2.1%' : formatPercentage(mockAnalyticsData.conversionRate.change),
                icon: Target,
                color: 'text-warning'
              }
            ].map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.id}
                  className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                  style={{ minWidth: '140px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <IconComponent className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <span className={`text-xs font-medium ${
                      stat.change.includes('+') ? 'text-success' : 'text-error'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/60">{stat.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Performance Chart */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Sales Performance</h3>
                <p className="text-sm text-white/60">Revenue over time</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Vertical Bar Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalyticsData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Order Status</h3>
                <p className="text-sm text-white/60">Current order distribution</p>
              </div>
              <Eye className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-3">
              {Object.entries(mockAnalyticsData.orderStatus).map(([status, count]) => {
                const total = Object.values(mockAnalyticsData.orderStatus).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={status} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(status)}`}>
                        {status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium text-sm">{count}</span>
                      <span className="text-white/60 text-xs">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Products - Compact Layout */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Top Products</h3>
                <p className="text-xs text-white/60">Performance overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart Column */}
            <div className="space-y-3">
              {/* Vertical Bar Chart */}
              <div className="rounded-lg p-3">
                <h4 className="text-white font-medium text-sm mb-3">Sales Performance</h4>
                <div className="h-48">
                  <div className="space-y-2">
                    {mockAnalyticsData.topProducts.map((product) => (
                      <div key={product.name} className="flex items-center mb-2">
                        <span className="text-white/70 text-sm w-1/3 mr-3 truncate">{product.name}</span>
                        <div className="relative flex-1 h-6 rounded-full bg-neutral-800">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full"
                            style={{ width: `${(product.revenue / Math.max(...mockAnalyticsData.topProducts.map(p => p.revenue))) * 100}%` }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-medium">₱{product.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Column */}
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/10">
                <h4 className="text-white font-medium text-sm">Product Details</h4>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/60 font-medium border-b border-white/10">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Product</div>
                <div className="col-span-3 text-center">Sales</div>
                <div className="col-span-3 text-center">Revenue</div>
              </div>

              {/* Table Body */}
              <div className="max-h-48 overflow-y-auto">
                {mockAnalyticsData.topProducts.map((product, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0">
                    <div className="col-span-1 text-primary font-bold">{index + 1}</div>
                    <div className="col-span-5">
                      <div className="flex items-center space-x-2">
                        <div>
                          <p className="text-white font-medium text-xs leading-tight line-clamp-1">{product.name}</p>
                          <p className="text-white/60 text-xs">{product.category}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3 text-center">
                      <p className="text-white font-medium">{product.sales}</p>
                    </div>
                    <div className="col-span-3 text-center">
                      <p className="text-green-400 font-medium">₱{(product.revenue / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-info to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Export Reports</h3>
                <p className="text-xs text-white/60">Download detailed analytics reports</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={exportData} className="text-sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportData} className="text-sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

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

      {/* Scrollbar hide style */}
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

// Main Export with SafeAreaProvider
export default function AdminAnalyticsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminAnalyticsContent />
    </SafeAreaProvider>
  );
}