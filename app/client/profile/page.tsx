'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Edit,
  LogOut,
  Package,
  ShoppingCart,
  Settings,
  Bell,
  HelpCircle,
  Star,
  Search,
  Shield
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated, useIsAdmin, useCurrentUser } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { useCartItemCount } from '@/store/cart';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const user = useCurrentUser();
  const cartItemCount = useCartItemCount();

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch real user stats from Convex
  const userReservations = useQuery(api.services.reservations.getReservations,
    user ? { userId: user._id } : "skip"
  ) || [];

  // Calculate user stats from real data
  const totalReservations = userReservations.length;
  const completedReservations = userReservations.filter(r => r.status === 'completed').length;
  const activeReservations = userReservations.filter(r =>
    r.status === 'pending' || r.status === 'confirmed'
  ).length;
  const totalSpent = userReservations
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  const userStats = {
    totalReservations,
    completedReservations,
    activeReservations,
    totalSpent,
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Show error feedback if needed
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAdminAccess = () => {
    if (user?.role === 'super_admin') {
      router.push('/control_panel');
    } else {
      router.push('/admin/dashboard');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-semibold text-white">Profile</h1>
            </div>
          </div>
        </div>

        {/* Guest Profile */}
        <div className="px-6 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Guest User</h2>
            <p className="text-muted">Sign in to access your profile and track reservations</p>
          </div>

          <div className="space-y-4 mb-8">
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push('/auth/register')}
              variant="outline"
              className="w-full"
            >
              Create Account
            </Button>
          </div>

          {/* Guest Actions */}
          <Card className="mb-6">
            <div className="space-y-3">
              <button
                onClick={() => router.push('/client/cart')}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span className="text-white">Shopping Cart</span>
                </div>
                {cartItemCount > 0 && (
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push('/client/search')}
                className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-primary" />
                <span className="text-white">Browse Products</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
          <div className="grid grid-cols-4 py-2">
            <button
              onClick={() => router.push('/client/dashboard')}
              className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
            >
              <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => router.push('/client/search')}
              className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
            >
              <Search className="w-5 h-5 mb-1" />
              <span className="text-xs">Search</span>
            </button>
            <button
              onClick={() => router.push('/client/cart')}
              className="relative flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5 mb-1" />
              <span className="text-xs">Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 right-3 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? '9' : cartItemCount}
                </span>
              )}
            </button>
            <button className="flex flex-col items-center py-2 px-3 text-primary">
              <User className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>

        <div className="h-16" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Profile</h1>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 py-6">
        <Card className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-muted text-sm">{user?.role === 'admin' ? 'Administrator' : 'Customer'}</p>
              {isAdmin && (
                <div className="flex items-center mt-1">
                  <Shield className="w-4 h-4 text-primary mr-1" />
                  <span className="text-primary text-sm font-medium">Admin Access</span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/client/profile/edit')}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Edit className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="w-4 h-4 text-muted" />
              <span className="text-white">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="w-4 h-4 text-muted" />
                <span className="text-white">{user.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Admin Access */}
        {isAdmin && (
          <Card variant="glass" className="mb-6 bg-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">Admin Dashboard</h3>
                <p className="text-sm text-muted">Access administrative functions</p>
              </div>
              <Button
                onClick={handleAdminAccess}
                size="sm"
              >
                Open Admin
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <Card className="mb-6">
          <h3 className="font-semibold text-white mb-4">Your Activity</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{userStats.totalReservations}</p>
              <p className="text-sm text-muted">Total Reservations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{userStats.completedReservations}</p>
              <p className="text-sm text-muted">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{userStats.activeReservations}</p>
              <p className="text-sm text-muted">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-info">₱{userStats.totalSpent.toLocaleString()}</p>
              <p className="text-sm text-muted">Total Spent</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/client/reservations')}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-white">My Reservations</span>
              </div>
              {userStats.activeReservations > 0 && (
                <span className="bg-warning text-white text-xs px-2 py-1 rounded-full">
                  {userStats.activeReservations} active
                </span>
              )}
            </button>

            <button
              onClick={() => router.push('/client/cart')}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="text-white">Shopping Cart</span>
              </div>
              {cartItemCount > 0 && (
                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
              <Star className="w-5 h-5 text-primary" />
              <span className="text-white">Reviews & Ratings</span>
            </button>
          </div>
        </Card>

        {/* Settings */}
        <Card className="mb-6">
          <h3 className="font-semibold text-white mb-4">Settings</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted" />
              <span className="text-white">Notifications</span>
            </button>

            <button className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-muted" />
              <span className="text-white">Account Settings</span>
            </button>

            <button className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5 text-muted" />
              <span className="text-white">Help & Support</span>
            </button>
          </div>
        </Card>

        {/* Logout */}
        <Card className="mb-20">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-3 p-3 hover:bg-error/10 rounded-lg transition-colors text-error"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </Card>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <Card className="w-full max-w-sm">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Sign Out</h3>
              <p className="text-muted mb-6">Are you sure you want to sign out?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowLogoutConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/client/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/client/search')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Search className="w-5 h-5 mb-1" />
            <span className="text-xs">Search</span>
          </button>
          <button
            onClick={() => router.push('/client/cart')}
            className="relative flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-xs">Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 right-3 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {cartItemCount > 9 ? '9' : cartItemCount}
              </span>
            )}
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}