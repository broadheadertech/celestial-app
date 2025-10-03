'use client';

import { useState, useEffect } from 'react';
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
  Shield,
  Save,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated, useIsAdmin, useCurrentUser } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { useCartItemCount } from '@/store/cart';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ClientBottomNavbar from '@/components/client/ClientBottomNavbar';

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const user = useCurrentUser();
  const cartItemCount = useCartItemCount();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Profile settings state
  const [profileSettings, setProfileSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notifications: {
      orderUpdates: true,
      promotions: true,
      reservationReminders: true,
      emailNotifications: true,
    }
  });

  // Fetch real user stats from Convex
  const userReservations = useQuery(api.services.reservations.getReservations,
    user ? { userId: user._id } : "skip"
  ) || [];

  // Get client notifications count
  const clientNotificationCounts = useQuery(
    api.services.notifications.getClientNotificationCounts,
    isAuthenticated && user ? {
      userId: user._id,
      userEmail: user.email,
    } : 'skip'
  );

  // Populate profile settings from user data
  useEffect(() => {
    if (user) {
      setProfileSettings(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

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

  // Save profile settings handler
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      // TODO: Implement save profile mutation
      console.log('Saving profile settings:', profileSettings);
      setModalMessage('Profile updated successfully!');
      setShowSuccessModal(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setModalMessage('Error updating profile. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
      setModalMessage('Error during logout. Please try again.');
      setShowErrorModal(true);
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

  // Toggle component
  const Toggle = ({ enabled, onChange, label, description }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-start sm:items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm sm:text-base font-medium">{label}</p>
        {description && <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`flex-shrink-0 relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-white/20'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-secondary border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-white">Profile</h1>
            </div>
          </div>
        </div>

        {/* Guest Profile */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border-2 border-white/10">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Guest User</h2>
            <p className="text-sm sm:text-base text-muted px-4">Sign in to access your profile and track reservations</p>
          </div>

          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
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
            <div className="space-y-2">
              <button
                onClick={() => router.push('/client/cart')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <span className="text-sm sm:text-base text-white font-medium">Shopping Cart</span>
                </div>
                <div className="flex items-center gap-2">
                  {cartItemCount > 0 && (
                    <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {cartItemCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </button>

              <button
                onClick={() => router.push('/client/search')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <span className="text-sm sm:text-base text-white font-medium">Browse Products</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 safe-bottom">
          <div className="grid grid-cols-4 py-2">
            <button
              onClick={() => router.push('/client/dashboard')}
              className="flex flex-col items-center py-2 px-2 text-muted hover:text-white active:text-white transition-colors"
            >
              <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => router.push('/client/search')}
              className="flex flex-col items-center py-2 px-2 text-muted hover:text-white active:text-white transition-colors"
            >
              <Search className="w-5 h-5 mb-1" />
              <span className="text-xs">Search</span>
            </button>
            <button
              onClick={() => router.push('/client/cart')}
              className="relative flex flex-col items-center py-2 px-2 text-muted hover:text-white active:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5 mb-1" />
              <span className="text-xs">Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>
            <button className="flex flex-col items-center py-2 px-2 text-primary">
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
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-white truncate">Profile</h1>
                <p className="text-xs text-white/60 truncate">Manage your account</p>
              </div>
            </div>
            {isEditing && (
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                size="sm"
                className="flex-shrink-0 bg-primary hover:bg-primary/90 text-xs sm:text-sm px-3 sm:px-4 py-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Save</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 sm:px-6 pt-20 pb-6">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Profile Information */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">Profile Information</h2>
                  <p className="text-xs sm:text-sm text-white/60 truncate">Your personal details</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex-shrink-0 p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Profile Avatar and Basic Info */}
            <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg">
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center border-2 border-white/10">
                <span className="text-lg sm:text-2xl font-bold text-primary">
                  {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5 sm:mb-1 truncate">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-white/60 text-xs sm:text-sm truncate">{user?.role === 'admin' ? 'Administrator' : 'Customer'}</p>
                {isAdmin && (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-primary mr-1 flex-shrink-0" />
                    <span className="text-primary text-xs sm:text-sm font-medium truncate">Admin Access</span>
                  </div>
                )}
              </div>
            </div>

            {/* Editable Fields */}
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileSettings.firstName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileSettings.lastName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Email</label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-3 text-sm sm:text-base p-2 rounded-lg hover:bg-white/5">
                  <Mail className="w-4 h-4 text-white/60 flex-shrink-0" />
                  <span className="text-white truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center space-x-3 text-sm sm:text-base p-2 rounded-lg hover:bg-white/5">
                    <Phone className="w-4 h-4 text-white/60 flex-shrink-0" />
                    <span className="text-white truncate">{user.phone}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Admin Access */}
          {isAdmin && (
            <Card className="p-4 sm:p-6 bg-primary/10 border-primary/20">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">Admin Access</h2>
                  <p className="text-xs sm:text-sm text-white/60 truncate">Administrative functions</p>
                </div>
              </div>
              <Button
                onClick={handleAdminAccess}
                className="w-full text-sm sm:text-base"
              >
                <Shield className="w-4 h-4 mr-2" />
                Open Admin Dashboard
              </Button>
            </Card>
          )}

          {/* Activity Stats */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-info/10 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Your Activity</h2>
                <p className="text-xs sm:text-sm text-white/60 truncate">Overview of your account</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary mb-0.5 sm:mb-1">{userStats.totalReservations}</p>
                <p className="text-xs sm:text-sm text-white/60">Total</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-success mb-0.5 sm:mb-1">{userStats.completedReservations}</p>
                <p className="text-xs sm:text-sm text-white/60">Completed</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-warning mb-0.5 sm:mb-1">{userStats.activeReservations}</p>
                <p className="text-xs sm:text-sm text-white/60">Active</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg">
                <p className="text-base sm:text-xl font-bold text-info mb-0.5 sm:mb-1">₱{userStats.totalSpent.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-white/60">Total Spent</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-success/10 rounded-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Quick Actions</h2>
                <p className="text-xs sm:text-sm text-white/60 truncate">Access your features</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => router.push('/client/reservations')}
                className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors group"
              >
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-white truncate">My Reservations</p>
                  <p className="text-xs text-white/60 truncate">View your reservations</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {userStats.activeReservations > 0 && (
                    <span className="bg-warning text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {userStats.activeReservations}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </button>

              <button
                onClick={() => router.push('/client/cart')}
                className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors group"
              >
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-white truncate">Shopping Cart</p>
                  <p className="text-xs text-white/60 truncate">View cart items</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cartItemCount > 0 && (
                    <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {cartItemCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </button>

              <button
                onClick={() => router.push('/client/search')}
                className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors group"
              >
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-white truncate">Browse Products</p>
                  <p className="text-xs text-white/60 truncate">Discover new items</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </button>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-info/10 rounded-lg">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Notifications</h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Configure preferences
                  {clientNotificationCounts && clientNotificationCounts.unread > 0 && (
                    <span className="text-primary ml-1">({clientNotificationCounts.unread} unread)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Toggle
                enabled={profileSettings.notifications.orderUpdates}
                onChange={(value) => setProfileSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, orderUpdates: value }
                }))}
                label="Order Updates"
                description="Get notified about order status changes"
              />
              <Toggle
                enabled={profileSettings.notifications.promotions}
                onChange={(value) => setProfileSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, promotions: value }
                }))}
                label="Promotions & Offers"
                description="Receive special deals and discounts"
              />
              <Toggle
                enabled={profileSettings.notifications.reservationReminders}
                onChange={(value) => setProfileSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, reservationReminders: value }
                }))}
                label="Reservation Reminders"
                description="Reminders for pickup deadlines"
              />
              <Toggle
                enabled={profileSettings.notifications.emailNotifications}
                onChange={(value) => setProfileSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, emailNotifications: value }
                }))}
                label="Email Notifications"
                description="Receive notifications via email"
              />
            </div>
          </Card>

          {/* Help & Support */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-warning/10 rounded-lg">
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Help & Support</h2>
                <p className="text-xs sm:text-sm text-white/60 truncate">Get assistance when needed</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors group">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-white truncate">FAQ</p>
                  <p className="text-xs text-white/60 truncate">Frequently asked questions</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </button>

              <button className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors group">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-white truncate">Contact Support</p>
                  <p className="text-xs text-white/60 truncate">Get help from our team</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </button>
            </div>
          </Card>

          {/* Logout Section */}
          <Card className="p-4 sm:p-6 border-error/20">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 p-2 bg-error/10 rounded-lg">
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-error" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-medium text-white truncate">Sign Out</h3>
                  <p className="text-xs sm:text-sm text-white/60 truncate">Sign out of your account</p>
                </div>
              </div>
              <Button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full sm:w-auto bg-error/10 border border-error/20 text-error hover:bg-error/20 active:bg-error/30 transition-colors text-sm sm:text-base"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Signing out...</span>
                    <span className="sm:hidden">Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Success</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-success hover:bg-success/90 text-sm sm:text-base"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-error/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Error</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-error hover:bg-error/90 text-sm sm:text-base"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-error/10 rounded-lg">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Confirm Sign Out</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">Are you sure you want to sign out of your account?</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 active:bg-white/30 transition-colors text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 bg-error hover:bg-error/90 active:bg-error/80 transition-colors text-sm sm:text-base"
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Signing out...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-1.5 sm:mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />
    </div>
  );
}