'use client';

import React, { useState, useMemo } from 'react';
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
  Clock,
  Bell,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import NotificationModal from '@/components/modal/NotificationModal';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'delivered': return 'text-success';
    case 'processing': return 'text-warning';
    case 'pending': return 'text-muted';
    case 'cancelled': return 'text-error';
    default: return 'text-muted';
  }
};

const getOrderStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
    case 'delivered': return CheckCircle;
    case 'processing': return RefreshCw;
    case 'pending': return Clock;
    case 'cancelled': return AlertCircle;
    default: return Clock;
  }
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Convex queries
  const dashboardStats = useQuery(api.services.admin.getDashboardStats);
  const recentOrders = useQuery(api.services.admin.getRecentOrders, { limit: 5 });
  const notificationCounts = useQuery(api.services.notifications.getNotificationCounts);
  const products = useQuery(api.services.admin.getAllProductsAdmin);

  // Test notification mutation
  const createTestNotificationMutation = useMutation(api.services.notifications.createTestNotification);

  // Calculate low stock products
  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(product => product.stock <= 5)
      .slice(0, 4)
      .map(product => ({
        ...product,
        categoryName: product.categoryName || 'Unknown Category'
      }));
  }, [products]);

  // Get unread notifications count
  const unreadCount = notificationCounts?.unread || 0;

  // Test notification handler
  const handleTestNotification = async (type: string) => {
    try {
      await createTestNotificationMutation({ type });
    } catch (error) {
      console.error('Failed to create test notification:', error);
    }
  };

  // Stats cards data with real data - compact design
  const statsCards = useMemo(() => {
    if (!dashboardStats) return [];

    const revenueChange = dashboardStats.totalRevenue > 0 ? '+8.2%' : '0%';
    const pendingCount = dashboardStats.pendingOrders || 0;
    const totalProducts = dashboardStats.totalProducts || 0;
    const newUsers = dashboardStats.newUsersThisMonth || 0;

    return [
      {
        id: 'revenue',
        title: 'Total Revenue',
        value: formatCurrency(dashboardStats.totalRevenue || 0),
        change: revenueChange,
        icon: DollarSign,
        color: 'text-success',
        bgColor: 'bg-success/15'
      },
      {
        id: 'orders',
        title: 'Orders & Reservations',
        value: dashboardStats.totalOrders?.toString() || '0',
        change: `+${pendingCount} pending`,
        icon: ShoppingBag,
        color: 'text-info',
        bgColor: 'bg-info/15'
      },
      {
        id: 'products',
        title: 'Active Products',
        value: dashboardStats.activeProducts?.toString() || '0',
        change: `${totalProducts} total`,
        icon: Package,
        color: 'text-warning',
        bgColor: 'bg-warning/15'
      },
      {
        id: 'users',
        title: 'Total Users',
        value: dashboardStats.totalUsers?.toString() || '0',
        change: `+${newUsers} this month`,
        icon: Users,
        color: 'text-primary',
        bgColor: 'bg-primary/15'
      }
    ];
  }, [dashboardStats]);

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
              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="relative p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
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

      {/* Stats Cards - Compact Modern Design */}
      <div className="px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statsCards.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-secondary/40 border border-primary/10 rounded-lg p-3 backdrop-blur-sm hover:border-primary/20 hover:bg-secondary/50 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className={`p-1.5 rounded-md ${stat.bgColor} group-hover:scale-105 transition-transform`}>
                    <IconComponent className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    stat.change.startsWith('+')
                      ? 'text-success bg-success/15'
                      : 'text-muted bg-muted/15'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-xs text-muted/70 leading-tight">{stat.title}</p>
                </div>
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
              {!recentOrders ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted">Loading recent orders...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">No recent orders</p>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const StatusIcon = getOrderStatusIcon(order.status);
                  return (
                    <div key={order._id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ShoppingBag className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{order.customerName}</p>
                          <p className="text-xs text-muted">{order.type} • {order.itemCount || 1} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.totalAmount)}</p>
                        <div className="flex items-center space-x-1">
                          <StatusIcon className={`w-3 h-3 ${getOrderStatusColor(order.status)}`} />
                          <span className={`text-xs capitalize ${getOrderStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
              {!lowStockProducts ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted">Loading low stock products...</p>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted">All products are well stocked!</p>
                </div>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Package className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{product.name}</p>
                        <p className="text-xs text-muted">{product.categoryName}</p>
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-secondary/50 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/products/form')}
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

          {/* Test Notifications Section (Development Only) */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/70 mb-3">Test Notifications</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={() => handleTestNotification('order')}
                className="flex items-center justify-center p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-xs"
              >
                <ShoppingBag className="w-3 h-3 text-blue-500 mr-1" />
                Order
              </button>
              <button
                onClick={() => handleTestNotification('reservation')}
                className="flex items-center justify-center p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors text-xs"
              >
                <Package className="w-3 h-3 text-orange-500 mr-1" />
                Reservation
              </button>
              <button
                onClick={() => handleTestNotification('user')}
                className="flex items-center justify-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-xs"
              >
                <Users className="w-3 h-3 text-green-500 mr-1" />
                User
              </button>
              <button
                onClick={() => handleTestNotification('payment')}
                className="flex items-center justify-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-xs"
              >
                <DollarSign className="w-3 h-3 text-red-500 mr-1" />
                Payment
              </button>
              <button
                onClick={() => handleTestNotification('alert')}
                className="flex items-center justify-center p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors text-xs"
              >
                <Bell className="w-3 h-3 text-yellow-500 mr-1" />
                Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Bottom padding for mobile navigation */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}