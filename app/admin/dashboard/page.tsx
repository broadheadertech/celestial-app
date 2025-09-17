'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  TrendingUp,
  Bell,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

type DashboardStats = {
  totalRevenue: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalOrders: number;
  pendingOrders: number;
  totalReservations: number;
  pendingReservations: number;
  activeProducts: number;
  totalProducts?: number;
  lowStockProducts?: number;
};

type DashboardOrder = {
  _id: string;
  userId?: string | null;
  type: 'order' | 'reservation';
  status?: string;
  totalAmount?: number;
  createdAt: number;
  updatedAt: number;
  reservationCode?: string;
  itemCount?: number;
  customerName?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Fetch real data using Convex hooks
  const stats = useQuery(api.services.admin.getDashboardStats) as DashboardStats | undefined;
  const recentOrdersQuery = useQuery(api.services.admin.getRecentOrders, { limit: 6 }) as DashboardOrder[] | undefined;

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const newUsersThisMonth = stats?.newUsersThisMonth ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const totalReservations = stats?.totalReservations ?? 0;
  const pendingReservations = stats?.pendingReservations ?? 0;
  const activeProducts = stats?.activeProducts ?? 0;
  const lowStockProducts = stats?.lowStockProducts ?? 0;

  const recentOrders = Array.isArray(recentOrdersQuery) ? recentOrdersQuery : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning';
      case 'confirmed': return 'text-success';
      case 'processing': return 'text-info';
      default: return 'text-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted">
                Welcome back, {user?.firstName}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="relative p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                  3
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Revenue Card */}
        <Card variant="glass" className="mb-6 bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-muted mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-success mr-1" />
                <span className="text-sm text-success">+12.5% from last month</span>
              </div>
            </div>
            <DollarSign className="w-12 h-12 text-primary" />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Users</p>
                <p className="text-xl font-bold text-white">{totalUsers}</p>
                <p className="text-xs text-success">+{newUsersThisMonth} this month</p>
              </div>
              <Users className="w-8 h-8 text-info" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Active Products</p>
                <p className="text-xl font-bold text-white">{activeProducts}</p>
                <p className="text-xs text-warning">{lowStockProducts} low stock</p>
              </div>
              <Package className="w-8 h-8 text-success" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Orders</p>
                <p className="text-xl font-bold text-white">{totalOrders}</p>
                <p className="text-xs text-warning">{pendingOrders} pending</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Reservations</p>
                <p className="text-xl font-bold text-white">{totalReservations}</p>
                <p className="text-xs text-warning">{pendingReservations} pending</p>
              </div>
              <BarChart3 className="w-8 h-8 text-info" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => router.push('/admin/products')}
              variant="outline"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Package className="w-4 h-4 mr-2" />
              Manage Products
            </Button>
            <Button
              onClick={() => router.push('/admin/orders')}
              variant="outline"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              View Orders
            </Button>
            <Button
              onClick={() => router.push('/admin/users')}
              variant="outline"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button
              onClick={() => router.push('/admin/settings')}
              variant="outline"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/orders')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {recentOrders.length === 0 && (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted">No recent activity yet.</p>
              </Card>
            )}

            {recentOrders.map((order, index) => {
              const key = order._id || `${order.type}-${order.createdAt}-${index}`;
              const status = order.status ?? 'pending';
              const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
              const statusColor = getStatusColor(status);
              const customerName = order.customerName?.trim()
                || (order.user
                  ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
                  : 'Guest Customer');
              const itemCount = order.itemCount ?? 0;
              const totalAmount = order.totalAmount ?? 0;

              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">
                          {order.type === 'reservation' && order.reservationCode
                            ? order.reservationCode
                            : order._id}
                        </h3>
                        <span className={`text-sm font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-sm text-muted mb-1">{customerName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">{itemCount} items</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation (Admin) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-primary"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Dashboard</span>
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
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom padding for fixed navigation */}
      <div className="h-16" />
    </div>
  );
}
