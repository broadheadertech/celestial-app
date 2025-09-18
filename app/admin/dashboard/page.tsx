'use client';

import React from 'react';
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNavbar from '@/components/common/BottomNavbar';

// Mock data - replace with your Convex queries
const mockStats = {
  totalRevenue: 125000,
  totalOrders: 456,
  totalProducts: 89,
  totalUsers: 1234,
  revenueChange: 12.5,
  ordersChange: 8.3,
  productsChange: 15.7,
  usersChange: 22.1
};

const mockRecentOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    amount: 2500,
    status: 'completed',
    date: Date.now() - 3600000, // 1 hour ago
    items: 3
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    amount: 1800,
    status: 'processing',
    date: Date.now() - 7200000, // 2 hours ago
    items: 2
  },
  {
    id: 'ORD-003',
    customer: 'Mike Johnson',
    amount: 3200,
    status: 'pending',
    date: Date.now() - 10800000, // 3 hours ago
    items: 4
  },
  {
    id: 'ORD-004',
    customer: 'Sarah Wilson',
    amount: 950,
    status: 'completed',
    date: Date.now() - 14400000, // 4 hours ago
    items: 1
  }
];

const mockLowStockProducts = [
  { id: '1', name: 'Premium Goldfish', stock: 2, category: 'Fish' },
  { id: '2', name: 'Betta Fish - Blue', stock: 1, category: 'Fish' },
  { id: '3', name: 'Glass Aquarium Tank', stock: 0, category: 'Tanks' },
  { id: '4', name: 'Aquarium Filter System', stock: 3, category: 'Accessories' }
];

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};


const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-success';
    case 'processing': return 'text-warning';
    case 'pending': return 'text-muted';
    case 'cancelled': return 'text-error';
    default: return 'text-muted';
  }
};

const getOrderStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'processing': return RefreshCw;
    case 'pending': return Clock;
    case 'cancelled': return AlertCircle;
    default: return Clock;
  }
};

export default function AdminDashboardPage() {
  const router = useRouter();

  // Stats cards data
  const statsCards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(mockStats.totalRevenue),
      change: `+${mockStats.revenueChange}%`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      id: 'orders',
      title: 'Total Orders',
      value: mockStats.totalOrders.toString(),
      change: `+${mockStats.ordersChange}%`,
      icon: ShoppingBag,
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    {
      id: 'products',
      title: 'Total Products',
      value: mockStats.totalProducts.toString(),
      change: `+${mockStats.productsChange}%`,
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      id: 'users',
      title: 'Total Users',
      value: mockStats.totalUsers.toString(),
      change: `+${mockStats.usersChange}%`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted">Welcome back! Here&apos;s your business overview.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/admin/analytics')}
                className="p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                title="View Analytics"
              >
                <BarChart3 className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => router.push('/admin/settings')}
                className="p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                title="Settings"
              >
                <Activity className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-secondary/50 border border-primary/10 rounded-xl p-4 backdrop-blur-sm hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <IconComponent className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className={`text-sm font-medium text-success`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted">{stat.title}</p>
              </div>
            );
          })}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-secondary/50 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Recent Orders</h3>
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {mockRecentOrders.map((order) => {
                const StatusIcon = getOrderStatusIcon(order.status);
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{order.customer}</p>
                        <p className="text-xs text-muted">{order.id} • {order.items} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(order.amount)}</p>
                      <div className="flex items-center space-x-1">
                        <StatusIcon className={`w-3 h-3 ${getOrderStatusColor(order.status)}`} />
                        <span className={`text-xs capitalize ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-secondary/50 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Low Stock Alert</h3>
              <button
                onClick={() => router.push('/admin/products')}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Manage
              </button>
            </div>
            <div className="space-y-3">
              {mockLowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Package className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{product.name}</p>
                      <p className="text-xs text-muted">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      product.stock === 0
                        ? 'bg-error/10 text-error'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-secondary/50 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/products/add')}
              className="flex flex-col items-center p-4 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Package className="w-6 h-6 text-primary mb-2" />
              <span className="text-sm font-medium text-primary">Add Product</span>
            </button>
            <button
              onClick={() => router.push('/admin/orders')}
              className="flex flex-col items-center p-4 bg-info/10 border border-info/20 rounded-lg hover:bg-info/20 transition-colors"
            >
              <ShoppingBag className="w-6 h-6 text-info mb-2" />
              <span className="text-sm font-medium text-info">View Orders</span>
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="flex flex-col items-center p-4 bg-warning/10 border border-warning/20 rounded-lg hover:bg-warning/20 transition-colors"
            >
              <Users className="w-6 h-6 text-warning mb-2" />
              <span className="text-sm font-medium text-warning">Manage Users</span>
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="flex flex-col items-center p-4 bg-success/10 border border-success/20 rounded-lg hover:bg-success/20 transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-success mb-2" />
              <span className="text-sm font-medium text-success">View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Bottom padding for mobile navigation */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}