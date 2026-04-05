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
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

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

function AdminDashboardContent() {
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
    }
  };

  // Stats cards data with real data
  const statsCards = useMemo(() => {
    if (!dashboardStats) return [];

    const pendingCount = dashboardStats.pendingOrders || 0;
    const totalProducts = dashboardStats.totalProducts || 0;
    const newUsers = dashboardStats.newUsersThisMonth || 0;
    const profitMargin = dashboardStats.totalSales > 0
      ? ((dashboardStats.grossProfit / dashboardStats.totalSales) * 100).toFixed(1)
      : '0';

    return [
      {
        id: 'sales',
        title: 'Total Sales',
        value: formatCurrency(dashboardStats.totalSales || 0),
        change: `${dashboardStats.totalOrdersCount || 0} orders`,
        icon: DollarSign,
        color: 'text-success',
        bgColor: 'bg-success/15'
      },
      {
        id: 'orders',
        title: 'Total Orders',
        value: dashboardStats.totalOrdersCount?.toString() || '0',
        change: `+${pendingCount} pending`,
        icon: ShoppingBag,
        color: 'text-info',
        bgColor: 'bg-info/15'
      },
      {
        id: 'profit',
        title: 'Gross Profit',
        value: formatCurrency(dashboardStats.grossProfit || 0),
        change: `${profitMargin}% margin`,
        icon: BarChart3,
        color: 'text-primary',
        bgColor: 'bg-primary/15'
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
    ];
  }, [dashboardStats]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header - Mobile Optimized with Safe Area */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted truncate hidden xs:block">Welcome back! Here&apos;s your overview.</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="relative p-2 sm:p-2.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] sm:text-xs rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center font-medium px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/analytics')}
                className="p-2 sm:p-2.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all touch-manipulation hidden xs:flex"
                title="View Analytics"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
              </button>
              <button
                onClick={() => router.push('/admin/settings')}
                className="p-2 sm:p-2.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all touch-manipulation hidden sm:flex"
                title="Settings"
              >
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Safe Area Horizontal */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        {/* Stats Cards - Mobile First Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {statsCards.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-secondary/40 border border-primary/10 rounded-lg sm:rounded-xl p-3 sm:p-4 backdrop-blur-sm hover:border-primary/20 hover:bg-secondary/50 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-2.5">
                  <div className={`p-1.5 sm:p-2 rounded-md ${stat.bgColor} group-hover:scale-105 transition-transform`}>
                    <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`} />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap ${
                    stat.change.startsWith('+')
                      ? 'text-success bg-success/15'
                      : 'text-muted bg-muted/15'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-base sm:text-lg font-bold text-foreground leading-none truncate">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted/70 leading-tight line-clamp-2">{stat.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Orders & Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {/* Recent Orders */}
          <div className="bg-secondary/50 border border-primary/10 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-foreground">Recent Orders</h3>
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors font-medium touch-manipulation"
              >
                View All
              </button>
            </div>

            {!recentOrders ? (
              <div className="text-center py-6 sm:py-8">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-muted">Loading...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-muted mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-muted">No recent orders</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted border-b border-white/10">
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const StatusIcon = getOrderStatusIcon(order.status);
                        return (
                          <tr key={order._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2.5 text-white font-medium">{order.customerName}</td>
                            <td className="py-2.5 text-muted capitalize">{order.type}</td>
                            <td className="py-2.5 text-white font-bold text-right">{formatCurrency(order.totalAmount)}</td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-flex items-center gap-1 text-xs capitalize ${getOrderStatusColor(order.status)}`}>
                                <StatusIcon className="w-3 h-3" />
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {recentOrders.map((order) => {
                    const StatusIcon = getOrderStatusIcon(order.status);
                    return (
                      <div key={order._id} className="flex items-center justify-between gap-2 p-2.5 bg-background/50 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs truncate">{order.customerName}</p>
                            <p className="text-[10px] text-muted truncate">{order.type} • {order.itemCount || 1} items</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-foreground text-xs">{formatCurrency(order.totalAmount)}</p>
                          <div className="flex items-center justify-end gap-1">
                            <StatusIcon className={`w-2.5 h-2.5 ${getOrderStatusColor(order.status)}`} />
                            <span className={`text-[10px] capitalize ${getOrderStatusColor(order.status)}`}>{order.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Low Stock Alert */}
          <div className="bg-secondary/50 border border-primary/10 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-foreground">Low Stock Alert</h3>
              <button
                onClick={() => router.push('/admin/products')}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors font-medium touch-manipulation"
              >
                Manage
              </button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {!lowStockProducts ? (
                <div className="text-center py-6 sm:py-8">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-muted">Loading low stock products...</p>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-success mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-muted">All products are well stocked!</p>
                </div>
              ) : (
                lowStockProducts.map((product) => (
                  <div 
                    key={product._id} 
                    className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-background/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10 flex-shrink-0">
                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-xs sm:text-sm truncate">{product.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted truncate">{product.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                        product.stock === 0
                          ? 'bg-error/10 text-error'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {product.stock === 0 ? 'Out' : `${product.stock} left`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Mobile Optimized Grid */}
        {/* <div className="mt-4 sm:mt-8 bg-secondary/50 border border-primary/10 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/admin/products/form')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 active:scale-95 transition-all touch-manipulation min-h-[80px] sm:min-h-[100px]"
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1.5 sm:mb-2" />
              <span className="text-xs sm:text-sm font-medium text-primary text-center">Add Product</span>
            </button>
            <button
              onClick={() => router.push('/admin/orders')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-info/10 border border-info/20 rounded-lg hover:bg-info/20 active:scale-95 transition-all touch-manipulation min-h-[80px] sm:min-h-[100px]"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-info mb-1.5 sm:mb-2" />
              <span className="text-xs sm:text-sm font-medium text-info text-center">View Orders</span>
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-warning/10 border border-warning/20 rounded-lg hover:bg-warning/20 active:scale-95 transition-all touch-manipulation min-h-[80px] sm:min-h-[100px]"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-warning mb-1.5 sm:mb-2" />
              <span className="text-xs sm:text-sm font-medium text-warning text-center">Manage Users</span>
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-success/10 border border-success/20 rounded-lg hover:bg-success/20 active:scale-95 transition-all touch-manipulation min-h-[80px] sm:min-h-[100px]"
            >
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-success mb-1.5 sm:mb-2" />
              <span className="text-xs sm:text-sm font-medium text-success text-center">View Analytics</span>
            </button>
          </div>
        </div> */}
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}

// Main Export with SafeAreaProvider
export default function AdminDashboardPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminDashboardContent />
    </SafeAreaProvider>
  );
}