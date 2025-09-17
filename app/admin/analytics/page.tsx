'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  FileText
} from 'lucide-react';
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

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

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

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const exportData = () => {
    // Implementation for data export
    alert('Export functionality would be implemented here');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics</h1>
                <p className="text-sm text-muted">Business insights & performance metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="min-w-[100px]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <button className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors">
                <Filter className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Time Filter */}
          <div className="flex items-center space-x-2 mt-4">
            <Calendar className="w-4 h-4 text-muted" />
            <span className="text-sm text-muted mr-3">Time Period:</span>
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedTimeFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeFilter === filter.value
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted hover:text-white hover:bg-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm font-medium">
                  {formatPercentage(mockAnalyticsData.revenue.change)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(mockAnalyticsData.revenue.current)}
              </p>
              <p className="text-sm text-muted">Total Revenue</p>
              <p className="text-xs text-muted mt-1">vs {formatCurrency(mockAnalyticsData.revenue.previous)} last period</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-info/20 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-info" />
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm font-medium">
                  {formatPercentage(mockAnalyticsData.orders.change)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">{mockAnalyticsData.orders.current}</p>
              <p className="text-sm text-muted">Total Orders</p>
              <p className="text-xs text-muted mt-1">vs {mockAnalyticsData.orders.previous} last period</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/20 rounded-xl">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm font-medium">
                  {formatPercentage(mockAnalyticsData.users.change)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">{mockAnalyticsData.users.current}</p>
              <p className="text-sm text-muted">New Customers</p>
              <p className="text-xs text-muted mt-1">vs {mockAnalyticsData.users.previous} last period</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-warning/20 rounded-xl">
                <Target className="w-6 h-6 text-warning" />
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm font-medium">
                  {formatPercentage(mockAnalyticsData.conversionRate.change)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">{mockAnalyticsData.conversionRate.current}%</p>
              <p className="text-sm text-muted">Conversion Rate</p>
              <p className="text-xs text-muted mt-1">vs {mockAnalyticsData.conversionRate.previous}% last period</p>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Sales Trend</h3>
                <p className="text-sm text-muted">Revenue over time</p>
              </div>
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>

            {/* Simplified chart representation */}
            <div className="h-48 bg-secondary/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">Chart visualization would be implemented here</p>
                <p className="text-xs text-muted mt-1">Using charts library like Chart.js or Recharts</p>
              </div>
            </div>
          </Card>

          {/* Order Status Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Order Status</h3>
                <p className="text-sm text-muted">Current order distribution</p>
              </div>
              <Eye className="w-6 h-6 text-primary" />
            </div>

            <div className="space-y-4">
              {Object.entries(mockAnalyticsData.orderStatus).map(([status, count]) => {
                const total = Object.values(mockAnalyticsData.orderStatus).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(status)}`}>
                        {status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{count}</span>
                      <span className="text-muted text-sm">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Top Performing Products</h3>
              <p className="text-sm text-muted">Best selling products this period</p>
            </div>
            <Package className="w-6 h-6 text-primary" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-sm font-medium text-muted">Rank</th>
                  <th className="text-left py-3 text-sm font-medium text-muted">Product</th>
                  <th className="text-left py-3 text-sm font-medium text-muted">Category</th>
                  <th className="text-right py-3 text-sm font-medium text-muted">Sales</th>
                  <th className="text-right py-3 text-sm font-medium text-muted">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {mockAnalyticsData.topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-full">
                        <span className="text-primary font-bold text-sm">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-secondary rounded text-xs text-muted">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-medium text-white">{product.sales}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-bold text-success">{formatCurrency(product.revenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Export Options */}
        <Card className="p-6 mb-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Export Reports</h3>
              <p className="text-sm text-muted">Download detailed analytics reports</p>
            </div>
            <FileText className="w-6 h-6 text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </Card>
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
          <button
            onClick={() => router.push('/admin/products')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Products</span>
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
            <Eye className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}