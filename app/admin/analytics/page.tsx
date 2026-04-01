'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import {
  ArrowLeft,
  BarChart3,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  Target,
  Calendar,
  RefreshCw,
  Eye,
  MoreVertical,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import Button from '@/components/ui/Button';

function AdminAnalyticsContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  // Fetch real data from Convex analytics service
  const kpis = useQuery(api.services.analytics.getDashboardKPIs);
  const revenueData = useQuery(api.services.analytics.getRevenueData);
  const topProducts = useQuery(api.services.analytics.getTopProducts, { limit: 5 });
  const categoryData = useQuery(api.services.analytics.getCategoryData);
  const customerGrowth = useQuery(api.services.analytics.getCustomerGrowth);
  const stockSummary = useQuery(api.services.stock.getStockSummary);

  const dataReady = kpis && revenueData && topProducts;

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
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
                <p className="text-xs text-white/60">Business insights & performance</p>
              </div>
            </div>
            <Button
              onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-sm px-3 py-1.5"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {!dataReady ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading analytics...</p>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-4">
          {/* KPI Cards */}
          <div className="px-4 sm:px-6 py-4 border-b border-white/10 mb-6">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {[
                {
                  title: 'Total Revenue',
                  value: formatCurrency(kpis.totalRevenue),
                  change: kpis.changes.revenue,
                  icon: DollarSign,
                  color: 'text-primary',
                },
                {
                  title: 'Total Orders',
                  value: kpis.totalOrders.toString(),
                  change: kpis.changes.orders,
                  icon: ShoppingBag,
                  color: 'text-info',
                },
                {
                  title: 'Customers',
                  value: kpis.totalCustomers.toString(),
                  change: kpis.changes.customers,
                  icon: Users,
                  color: 'text-success',
                },
                {
                  title: 'Conversion',
                  value: `${kpis.conversionRate}%`,
                  change: kpis.changes.conversion,
                  icon: Target,
                  color: 'text-warning',
                },
              ].map((stat) => {
                const IconComponent = stat.icon;
                return (
                  <div
                    key={stat.title}
                    className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                    style={{ minWidth: '140px' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <IconComponent className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <span className={`text-xs font-medium ${stat.change.includes('+') ? 'text-success' : 'text-error'}`}>
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

          {/* Stock Summary */}
          {stockSummary && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-white/60">Stock Value</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(stockSummary.totalValue)}</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-white/60">Units Sold</p>
                <p className="text-sm font-bold text-success">{stockSummary.totalSoldQty}</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-white/60">Mortality</p>
                <p className="text-sm font-bold text-error">{stockSummary.totalDamagedQty}</p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Chart */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Monthly Revenue</h3>
                <p className="text-sm text-white/60">Revenue from orders & reservations</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            {categoryData && categoryData.length > 0 && (
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">Product Categories</h3>
                  <p className="text-sm text-white/60">Distribution by category</p>
                </div>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                        labelLine={false}
                      >
                        {categoryData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryData.map((cat: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-white/70">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name} ({cat.count})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Growth */}
          {customerGrowth && (
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Customer Growth</h3>
                <p className="text-sm text-white/60">New signups over last 4 weeks</p>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="newCustomers" stroke="#10B981" fill="#10B98130" name="New Customers" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Products */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Top Products</h3>
                <p className="text-xs text-white/60">By revenue</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar visualization */}
              <div className="space-y-2">
                {topProducts.map((product: any) => {
                  const maxRevenue = Math.max(...topProducts.map((p: any) => p.revenue));
                  const pct = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={product.id} className="flex items-center mb-2">
                      <span className="text-white/70 text-xs w-1/3 mr-3 truncate">{product.name}</span>
                      <div className="relative flex-1 h-6 rounded-full bg-neutral-800">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-medium">
                          {formatCurrency(product.revenue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/60 font-medium border-b border-white/10">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Product</div>
                  <div className="col-span-3 text-center">Sales</div>
                  <div className="col-span-3 text-center">Revenue</div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {topProducts.map((product: any, index: number) => (
                    <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs hover:bg-white/5 border-b border-white/5 last:border-0">
                      <div className="col-span-1 text-primary font-bold">{index + 1}</div>
                      <div className="col-span-5">
                        <p className="text-white font-medium text-xs truncate">{product.name}</p>
                        <p className="text-white/60 text-xs">{product.category}</p>
                      </div>
                      <div className="col-span-3 text-center text-white font-medium">{product.sales}</div>
                      <div className="col-span-3 text-center text-green-400 font-medium">
                        {product.revenue >= 1000 ? `₱${(product.revenue / 1000).toFixed(0)}K` : formatCurrency(product.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar />

      <style jsx global>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminAnalyticsContent />
    </SafeAreaProvider>
  );
}
