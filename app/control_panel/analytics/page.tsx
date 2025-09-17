'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Star,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  PieChart,
  LineChart,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Mock analytics data
  const analyticsData = {
    overview: {
      revenue: { value: 125000, growth: 12.5, comparison: 'vs last month' },
      orders: { value: 1250, growth: 8.3, comparison: 'vs last month' },
      customers: { value: 850, growth: 15.2, comparison: 'vs last month' },
      conversionRate: { value: 3.2, growth: 5.7, comparison: 'vs last month' },
    },
    demographics: {
      age: [
        { range: '18-24', percentage: 25, count: 213 },
        { range: '25-34', percentage: 35, count: 298 },
        { range: '35-44', percentage: 22, count: 187 },
        { range: '45+', percentage: 18, count: 152 },
      ],
      gender: [
        { type: 'Male', percentage: 60, count: 510 },
        { type: 'Female', percentage: 35, count: 298 },
        { type: 'Other', percentage: 5, count: 42 },
      ],
      location: [
        { city: 'Manila', percentage: 40, count: 340 },
        { city: 'Cebu', percentage: 25, count: 213 },
        { city: 'Davao', percentage: 15, count: 128 },
        { city: 'Others', percentage: 20, count: 169 },
      ],
    },
    devices: [
      { type: 'Mobile', percentage: 65, sessions: 2450 },
      { type: 'Desktop', percentage: 30, sessions: 1130 },
      { type: 'Tablet', percentage: 5, sessions: 188 },
    ],
    topPages: [
      { path: '/client/dashboard', views: 12500, bounce: 25 },
      { path: '/client/search', views: 8900, bounce: 35 },
      { path: '/client/product/*', views: 7200, bounce: 40 },
      { path: '/client/cart', views: 3400, bounce: 20 },
    ],
    salesTrends: [
      { period: 'Mon', revenue: 15000, orders: 120 },
      { period: 'Tue', revenue: 18000, orders: 145 },
      { period: 'Wed', revenue: 22000, orders: 180 },
      { period: 'Thu', revenue: 19000, orders: 155 },
      { period: 'Fri', revenue: 25000, orders: 200 },
      { period: 'Sat', revenue: 28000, orders: 220 },
      { period: 'Sun', revenue: 21000, orders: 170 },
    ],
  };

  const MetricCard = ({ icon: Icon, title, value, growth, prefix = '', suffix = '', color = 'primary' }) => {
    const isPositive = growth >= 0;
    const GrowthIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    const colorMap = {
      primary: 'from-primary/20 to-orange-600/20 text-primary',
      blue: 'from-blue-500/20 to-cyan-600/20 text-blue-400',
      green: 'from-green-500/20 to-emerald-600/20 text-green-400',
      purple: 'from-purple-500/20 to-violet-600/20 text-purple-400',
    };

    return (
      <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className={`flex items-center space-x-1 text-sm ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <GrowthIcon className="w-4 h-4" />
            <span className="font-medium">{Math.abs(growth)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-white/70 text-sm font-medium">{title}</h3>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </span>
          </div>
          <p className="text-white/50 text-xs">vs last month</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>
                  <p className="text-sm text-white/60">Detailed insights and metrics</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-secondary/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border border-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button size="sm" className="bg-primary/90 hover:bg-primary">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          <MetricCard
            icon={DollarSign}
            title="Total Revenue"
            value={analyticsData.overview.revenue.value}
            growth={analyticsData.overview.revenue.growth}
            prefix="₱"
            color="green"
          />
          <MetricCard
            icon={ShoppingCart}
            title="Total Orders"
            value={analyticsData.overview.orders.value}
            growth={analyticsData.overview.orders.growth}
            color="blue"
          />
          <MetricCard
            icon={Users}
            title="Total Customers"
            value={analyticsData.overview.customers.value}
            growth={analyticsData.overview.customers.growth}
            color="purple"
          />
          <MetricCard
            icon={TrendingUp}
            title="Conversion Rate"
            value={analyticsData.overview.conversionRate.value}
            growth={analyticsData.overview.conversionRate.growth}
            suffix="%"
            color="primary"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Sales Trends */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Sales Trends</h3>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white/60">
                  <LineChart className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="h-64 bg-gradient-to-br from-primary/10 to-orange-600/10 rounded-lg flex items-center justify-center border border-white/5 mb-4">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-primary/60 mx-auto mb-3" />
                <p className="text-white/60 text-sm">Sales Trend Chart</p>
                <p className="text-white/40 text-xs mt-1">Chart integration needed</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {analyticsData.salesTrends.map((day, index) => (
                <div key={index} className="text-center p-2 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs font-medium">{day.period}</p>
                  <p className="text-white text-sm font-bold">₱{(day.revenue / 1000).toFixed(0)}K</p>
                  <p className="text-white/40 text-xs">{day.orders}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Device Analytics */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Device Usage</h3>
              <Button variant="ghost" size="sm" className="text-white/60">
                <PieChart className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-40 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-lg flex items-center justify-center border border-white/5 mb-6">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-blue-400/60 mx-auto mb-3" />
                <p className="text-white/60 text-sm">Device Distribution Chart</p>
              </div>
            </div>

            <div className="space-y-3">
              {analyticsData.devices.map((device, index) => {
                const icons = { Mobile: Smartphone, Desktop: Monitor, Tablet: Smartphone };
                const DeviceIcon = icons[device.type] || Monitor;

                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DeviceIcon className="w-5 h-5 text-primary" />
                      <span className="text-white text-sm font-medium">{device.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{device.percentage}%</p>
                      <p className="text-white/60 text-xs">{device.sessions.toLocaleString()} sessions</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Demographics and Top Pages */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Customer Demographics */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">Customer Demographics</h3>

            <div className="space-y-6">
              {/* Age Distribution */}
              <div>
                <h4 className="text-white/80 text-sm font-medium mb-3">Age Distribution</h4>
                <div className="space-y-2">
                  {analyticsData.demographics.age.map((group, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">{group.range}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-orange-600 h-2 rounded-full"
                            style={{ width: `${group.percentage}%` }}
                          />
                        </div>
                        <span className="text-white text-sm font-medium w-12 text-right">{group.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender Distribution */}
              <div>
                <h4 className="text-white/80 text-sm font-medium mb-3">Gender Distribution</h4>
                <div className="space-y-2">
                  {analyticsData.demographics.gender.map((group, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">{group.type}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full"
                            style={{ width: `${group.percentage}%` }}
                          />
                        </div>
                        <span className="text-white text-sm font-medium w-12 text-right">{group.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Top Pages</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {analyticsData.topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium font-mono">{page.path}</p>
                    <p className="text-white/60 text-xs">{page.views.toLocaleString()} views</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm">{page.bounce}%</p>
                    <p className="text-white/50 text-xs">bounce rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Analytics */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Geographic Distribution</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-lg flex items-center justify-center border border-white/5">
              <div className="text-center">
                <Globe className="w-12 h-12 text-green-400/60 mx-auto mb-3" />
                <p className="text-white/60 text-sm">Geographic Map</p>
                <p className="text-white/40 text-xs mt-1">Map integration needed</p>
              </div>
            </div>

            <div className="space-y-3">
              {analyticsData.demographics.location.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-green-400">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{location.city}</p>
                      <p className="text-white/60 text-xs">{location.count} customers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-bold">{location.percentage}%</p>
                    <div className="w-16 bg-white/10 rounded-full h-1 mt-1">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-1 rounded-full"
                        style={{ width: `${location.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}