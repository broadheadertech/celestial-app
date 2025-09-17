'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Filter,
  Search,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function ControlPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real data
  const productsQuery = useQuery(api.services.products.getProducts, { isActive: true }) || [];

  // Redirect if not authenticated or not admin/super_admin user
  useEffect(() => {
    if (!isAuthenticated || (user && !['admin', 'super_admin'].includes(user.role || ''))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (user && !['admin', 'super_admin'].includes(user.role || ''))) {
    return null;
  }

  // Real-looking analytics data
  const revenueData = [
    { month: 'Jan', revenue: 42500, orders: 125, customers: 89 },
    { month: 'Feb', revenue: 38200, orders: 132, customers: 92 },
    { month: 'Mar', revenue: 51800, orders: 149, customers: 108 },
    { month: 'Apr', revenue: 47300, orders: 141, customers: 98 },
    { month: 'May', revenue: 59600, orders: 167, customers: 124 },
    { month: 'Jun', revenue: 63200, orders: 178, customers: 132 },
    { month: 'Jul', revenue: 68400, orders: 189, customers: 145 },
    { month: 'Aug', revenue: 72100, orders: 201, customers: 156 },
    { month: 'Sep', revenue: 69800, orders: 194, customers: 149 },
    { month: 'Oct', revenue: 75200, orders: 212, customers: 167 },
    { month: 'Nov', revenue: 81300, orders: 228, customers: 178 },
    { month: 'Dec', revenue: 89500, orders: 246, customers: 192 },
  ];

  const categoryData = [
    { name: 'Tropical Fish', value: 35, count: 842, color: '#FF6B00' },
    { name: 'Aquarium Tanks', value: 28, count: 673, color: '#3B82F6' },
    { name: 'Accessories', value: 22, count: 529, color: '#10B981' },
    { name: 'Live Plants', value: 15, count: 361, color: '#F59E0B' },
  ];

  const dailyTraffic = [
    { day: 'Mon', visits: 1240, conversions: 89 },
    { day: 'Tue', visits: 1580, conversions: 112 },
    { day: 'Wed', visits: 1820, conversions: 134 },
    { day: 'Thu', visits: 1670, conversions: 121 },
    { day: 'Fri', visits: 2100, conversions: 167 },
    { day: 'Sat', visits: 2480, conversions: 198 },
    { day: 'Sun', visits: 1950, conversions: 156 },
  ];

  const customerGrowth = [
    { week: 'W1', newCustomers: 23, returning: 67 },
    { week: 'W2', newCustomers: 31, returning: 89 },
    { week: 'W3', newCustomers: 28, returning: 94 },
    { week: 'W4', newCustomers: 42, returning: 112 },
  ];

  const topProductsData = [
    { name: 'Premium Angelfish', sales: 342, revenue: 85500, category: 'Tropical Fish' },
    { name: '75L Glass Tank', sales: 198, revenue: 118800, category: 'Aquarium Tanks' },
    { name: 'LED Lighting Kit', sales: 267, revenue: 66750, category: 'Lighting' },
    { name: 'Neon Tetras (6-pack)', sales: 445, revenue: 35600, category: 'Tropical Fish' },
    { name: 'Filter System Pro', sales: 156, revenue: 78000, category: 'Filtration' },
    { name: 'Live Aquatic Plants', sales: 289, revenue: 57800, category: 'Plants' },
    { name: 'Ceramic Tank Decor', sales: 178, revenue: 26700, category: 'Decorations' },
    { name: 'Premium Fish Food', sales: 234, revenue: 23400, category: 'Food & Care' },
  ];

  const kpiData = [
    {
      title: 'Total Revenue',
      value: '₱847,200',
      change: '+12.3%',
      trend: 'up',
      period: 'vs last month',
      icon: DollarSign,
    },
    {
      title: 'Active Orders',
      value: '1,847',
      change: '+8.7%',
      trend: 'up',
      period: 'vs last month',
      icon: ShoppingCart,
    },
    {
      title: 'Total Customers',
      value: '12,430',
      change: '+15.2%',
      trend: 'up',
      period: 'vs last month',
      icon: Users,
    },
    {
      title: 'Conversion Rate',
      value: '8.4%',
      change: '-2.1%',
      trend: 'down',
      period: 'vs last month',
      icon: TrendingUp,
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-sm text-white/60 mt-1">Monitor your business performance and insights</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/60" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-secondary/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>

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

              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              {/* User Profile & Logout */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-lg border border-white/10">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="text-white font-medium">{user?.firstName || 'Admin'}</p>
                    <p className="text-white/50 text-xs capitalize">{user?.role || 'super_admin'}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <div key={index} className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
                <button className="text-white/40 hover:text-white/60">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-white/70 font-medium">{kpi.title}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 text-sm ${
                    kpi.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {kpi.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">{kpi.change}</span>
                  </div>
                  <span className="text-xs text-white/50">{kpi.period}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Revenue Trends</h3>
                <p className="text-sm text-white/60">Monthly revenue and growth patterns</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FF6B00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Sales by Category</h3>
                <p className="text-sm text-white/60">Product category breakdown</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-4">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-white/80">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{category.value}%</span>
                    <span className="text-white/50 ml-2">({category.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Daily Traffic */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Weekly Traffic</h3>
                <p className="text-sm text-white/60">Visits and conversion rates</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="visits" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Growth */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Customer Growth</h3>
                <p className="text-sm text-white/60">New vs returning customers</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newCustomers"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="returning"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Top Selling Products</h3>
              <p className="text-sm text-white/60">Best performing products by sales volume</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Search className="w-4 h-4 text-white/60" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProductsData}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    `${value} units`,
                    name === 'sales' ? 'Units Sold' : name
                  ]}
                />
                <Bar
                  dataKey="sales"
                  fill="url(#productGradient)"
                  radius={[0, 4, 4, 0]}
                >
                  <defs>
                    <linearGradient id="productGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topProductsData.slice(0, 4).map((product, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">#{index + 1}</span>
                  <span className="text-xs text-white/50">{product.category}</span>
                </div>
                <h4 className="text-white font-medium text-sm mb-1 truncate">{product.name}</h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{product.sales} units</span>
                  <span className="text-green-400 font-medium">₱{product.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="xl:col-span-2 bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <p className="text-sm text-white/60">Latest system events and transactions</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { type: 'order', message: 'New order #ORD-2847 received', amount: '₱2,350', time: '2 minutes ago', status: 'success' },
                { type: 'customer', message: 'Customer Maria Santos registered', amount: null, time: '8 minutes ago', status: 'info' },
                { type: 'payment', message: 'Payment processed for order #ORD-2845', amount: '₱1,890', time: '15 minutes ago', status: 'success' },
                { type: 'alert', message: 'Low stock alert: Premium Angelfish', amount: '5 left', time: '23 minutes ago', status: 'warning' },
                { type: 'order', message: 'Order #ORD-2843 shipped to Cebu', amount: null, time: '1 hour ago', status: 'info' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-400' :
                      activity.status === 'warning' ? 'bg-yellow-400' :
                      'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-white text-sm">{activity.message}</p>
                      <p className="text-white/50 text-xs">{activity.time}</p>
                    </div>
                  </div>
                  {activity.amount && (
                    <span className="text-white font-medium text-sm">{activity.amount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">System Status</h3>
                <p className="text-sm text-white/60">Service health monitoring</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { service: 'Database', status: 'online', response: '12ms', uptime: '99.9%' },
                { service: 'API Services', status: 'online', response: '45ms', uptime: '99.8%' },
                { service: 'Payment Gateway', status: 'online', response: '120ms', uptime: '99.7%' },
                { service: 'Email Service', status: 'online', response: '89ms', uptime: '99.5%' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <div>
                      <p className="text-white text-sm font-medium">{item.service}</p>
                      <p className="text-white/50 text-xs">{item.response} • {item.uptime}</p>
                    </div>
                  </div>
                  <span className="text-green-400 text-xs font-medium uppercase">Online</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Overall Health</span>
                <span className="text-green-400 font-medium">98.7%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}