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
  Bell,
  HelpCircle,
  Search,
  Shield,
  Save,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  TrendingUp,
  Lock
} from 'lucide-react';
import { useIsAuthenticated, useIsAdmin, useCurrentUser, useAuthStore } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { useCartItemCount } from '@/store/cart';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ClientBottomNavbar from '@/components/client/ClientBottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

function ProfileContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const user = useCurrentUser();
  const cartItemCount = useCartItemCount();
  const updateUser = useAuthStore((state) => state.updateUser);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  // Mutations
  const updateProfileMutation = useMutation(api.services.auth.updateProfile);
  const changePasswordMutation = useMutation(api.services.auth.changePassword);

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
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Validate inputs
      if (!profileSettings.firstName.trim() || !profileSettings.lastName.trim()) {
        setModalMessage('First name and last name are required');
        setShowErrorModal(true);
        setIsSaving(false);
        return;
      }

      // Call Convex mutation
      const result = await updateProfileMutation({
        userId: user._id,
        firstName: profileSettings.firstName.trim(),
        lastName: profileSettings.lastName.trim(),
        phone: profileSettings.phone?.trim() || '',
      });

      console.log('Profile update result:', result);
      
      // Update the user in the auth store immediately
      if (result.success && result.user) {
        updateUser(result.user);
      }
      
      setModalMessage('Profile updated successfully!');
      setShowSuccessModal(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error updating profile. Please try again.';
      setModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (!user) return;
    
    try {
      setIsChangingPassword(true);
      
      // Validate inputs
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setModalMessage('Please fill in all password fields');
        setShowErrorModal(true);
        setIsChangingPassword(false);
        return;
      }

      // Validate password match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setModalMessage('New password and confirm password do not match');
        setShowErrorModal(true);
        setIsChangingPassword(false);
        return;
      }

      // Validate password strength (at least 8 characters, contains uppercase, lowercase, and number)
      if (passwordForm.newPassword.length < 8) {
        setModalMessage('Password must be at least 8 characters long');
        setShowErrorModal(true);
        setIsChangingPassword(false);
        return;
      }

      const hasUpperCase = /[A-Z]/.test(passwordForm.newPassword);
      const hasLowerCase = /[a-z]/.test(passwordForm.newPassword);
      const hasNumber = /\d/.test(passwordForm.newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        setModalMessage('Password must contain uppercase, lowercase, and number');
        setShowErrorModal(true);
        setIsChangingPassword(false);
        return;
      }

      // Call Convex mutation
      const result = await changePasswordMutation({
        userId: user._id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (result.success) {
        setModalMessage('Password changed successfully!');
        setShowSuccessModal(true);
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        setModalMessage(result.error || 'Failed to change password');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error changing password. Please try again.';
      setModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutConfirm(false);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      setModalMessage('Failed to sign out. Please try again.');
      setShowErrorModal(true);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--primary-black)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--white)]" />
          </button>
          
          <h1 className="text-lg sm:text-xl font-bold text-[var(--white)] absolute left-1/2 transform -translate-x-1/2">
            Profile
          </h1>
          
          <button
            onClick={() => router.push('/client/notifications')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5 text-[var(--white)]" />
            {clientNotificationCounts?.all?.unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--error-red)] rounded-full flex items-center justify-center">
                <span className="text-[10px] text-[var(--white)]">
                  {clientNotificationCounts.all.unread > 99 ? '99+' : clientNotificationCounts.all.unread}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* User Info Card */}
        <Card className="p-6 glass-morphism">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-[var(--primary-orange)] to-[var(--warning-orange)] flex items-center justify-center border-2 border-white/20">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.firstName} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--white)]" />
                )}
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--white)] mb-1">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-[var(--light-gray)] mb-3">{user?.email}</p>
              
              {/* User Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[var(--primary-orange)]">{userStats.totalReservations}</p>
                  <p className="text-xs text-[var(--light-gray)]">Total Reservations</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[var(--success-green)]">{userStats.completedReservations}</p>
                  <p className="text-xs text-[var(--light-gray)]">Completed</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[var(--warning-orange)]">{userStats.activeReservations}</p>
                  <p className="text-xs text-[var(--light-gray)]">Active</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[var(--info-blue)]">₱{userStats.totalSpent.toLocaleString()}</p>
                  <p className="text-xs text-[var(--light-gray)]">Total Spent</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Settings */}
        <Card className="p-6 glass-morphism">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--white)] flex items-center">
              <User className="w-5 h-5 mr-2 text-[var(--primary-orange)]" />
              Profile Settings
            </h3>
            <div className="flex items-center space-x-2">
              {/* Change Password Button */}
              {user?.loginMethod !== 'facebook' && (
                <Button
                  onClick={() => setShowPasswordModal(true)}
                  className="bg-[var(--warning-orange)]/20 hover:bg-[var(--warning-orange)]/30 text-[var(--warning-orange)] border border-[var(--warning-orange)]/30"
                  size="sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              )}
              
              {isEditing ? (
                <>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset to original values
                      if (user) {
                        setProfileSettings(prev => ({
                          ...prev,
                          firstName: user.firstName || '',
                          lastName: user.lastName || '',
                          email: user.email || '',
                          phone: user.phone || '',
                        }));
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-[var(--light-gray)] hover:text-[var(--white)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-[var(--success-green)] hover:bg-[var(--success-green)]/90"
                    size="sm"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-[var(--light-gray)] hover:text-[var(--white)]"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--light-gray)] mb-2">
                First Name
              </label>
              <input
                type="text"
                value={profileSettings.firstName}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-[var(--white)] ${
                  isEditing 
                    ? 'border-white/20 focus:border-[var(--primary-orange)]/50' 
                    : 'border-white/10 cursor-not-allowed opacity-60'
                } focus:outline-none transition-colors`}
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--light-gray)] mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={profileSettings.lastName}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-[var(--white)] ${
                  isEditing 
                    ? 'border-white/20 focus:border-[var(--primary-orange)]/50' 
                    : 'border-white/10 cursor-not-allowed opacity-60'
                } focus:outline-none transition-colors`}
                placeholder="Enter your last name"
              />
            </div>

            {/* Email - Always disabled */}
            <div>
              <label className="block text-sm font-medium text-[var(--light-gray)] mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={profileSettings.email}
                  disabled
                  className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/10 rounded-lg text-[var(--white)] cursor-not-allowed opacity-60 focus:outline-none"
                  placeholder="your.email@example.com"
                />
                <Mail className="w-5 h-5 text-[var(--medium-gray)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-[var(--medium-gray)] mt-1">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[var(--light-gray)] mb-2">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={profileSettings.phone}
                  onChange={(e) => setProfileSettings(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 pl-10 bg-white/10 border rounded-lg text-[var(--white)] ${
                    isEditing 
                      ? 'border-white/20 focus:border-[var(--primary-orange)]/50' 
                      : 'border-white/10 cursor-not-allowed opacity-60'
                  } focus:outline-none transition-colors`}
                  placeholder="+63 900 000 0000"
                />
                <Phone className="w-5 h-5 text-[var(--medium-gray)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Login Method Indicator */}
            {user?.loginMethod === 'facebook' && (
              <div className="p-3 bg-[var(--info-blue)]/10 border border-[var(--info-blue)]/20 rounded-lg">
                <p className="text-sm text-[var(--info-blue)] flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Connected with Facebook
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Phone Number Prompt - Show when user has no phone */}
        {!user?.phone && (
          <Card className="p-4 sm:p-6 bg-[var(--warning-orange)]/10 border border-[var(--warning-orange)]/20 glass-morphism">
            <div className="flex items-start sm:items-center space-x-3 mb-3 sm:mb-4">
              <div className="flex-shrink-0 p-2 bg-[var(--warning-orange)]/10 rounded-lg">
                <Phone className="w-5 h-5 text-[var(--warning-orange)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--white)] mb-1">Add Your Phone Number</h3>
                <p className="text-xs sm:text-sm text-[var(--light-gray)]">
                  Enable SMS notifications for your orders and reservations. Stay updated with real-time alerts!
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full bg-[var(--warning-orange)] hover:bg-[var(--warning-orange)]/90 text-[var(--white)]"
            >
              <Phone className="w-4 h-4 mr-2" />
              Add Phone Number Now
            </Button>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="divide-y divide-white/10 glass-morphism">
          <button
            onClick={() => router.push('/client/reservations')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Package className="w-5 h-5 text-[var(--primary-orange)]" />
              <span className="text-[var(--white)]">My Reservations</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--medium-gray)]" />
          </button>

          <button
            onClick={() => router.push('/client/cart')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-5 h-5 text-[var(--primary-orange)]" />
              <span className="text-[var(--white)]">Shopping Cart</span>
              {cartItemCount > 0 && (
                <span className="px-2 py-0.5 bg-[var(--primary-orange)]/20 text-[var(--primary-orange)] text-xs rounded-full">
                  {cartItemCount}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--medium-gray)]" />
          </button>

          <button
            onClick={() => router.push('/client/notifications')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-[var(--primary-orange)]" />
              <span className="text-[var(--white)]">Notifications</span>
              {clientNotificationCounts?.all?.unread > 0 && (
                <span className="px-2 py-0.5 bg-[var(--error-red)]/20 text-[var(--error-red)] text-xs rounded-full">
                  {clientNotificationCounts.all.unread} new
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--medium-gray)]" />
          </button>

          <button
            onClick={() => router.push('/help')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-5 h-5 text-[var(--primary-orange)]" />
              <span className="text-[var(--white)]">Help & Support</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--medium-gray)]" />
          </button>
        </Card>

        {/* Sign Out Button */}
        <Button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-[var(--error-red)] hover:bg-[var(--error-red)]/90 text-[var(--white)]"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--secondary-black)] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0 p-2 bg-[var(--success-green)]/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-[var(--success-green)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--white)] mb-1">Success!</h3>
                <p className="text-sm text-[var(--light-gray)]">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-[var(--success-green)] hover:bg-[var(--success-green)]/90 text-[var(--white)]"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--secondary-black)] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0 p-2 bg-[var(--error-red)]/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-[var(--error-red)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--white)] mb-1">Error</h3>
                <p className="text-sm text-[var(--light-gray)]">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-[var(--error-red)] hover:bg-[var(--error-red)]/90 text-[var(--white)]"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--secondary-black)] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-[var(--warning-orange)]/10 rounded-lg">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--warning-orange)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--white)] mb-1">Change Password</h3>
                <p className="text-xs sm:text-sm text-[var(--light-gray)] leading-relaxed">Update your account password</p>
              </div>
            </div>

            {/* Password Form */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--light-gray)] mb-1.5 sm:mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-[var(--white)] focus:border-[var(--primary-orange)]/50 focus:outline-none transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--light-gray)] hover:text-[var(--white)] transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--light-gray)] mb-1.5 sm:mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-[var(--white)] focus:border-[var(--primary-orange)]/50 focus:outline-none transition-colors"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--light-gray)] hover:text-[var(--white)] transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[var(--medium-gray)] mt-1">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--light-gray)] mb-1.5 sm:mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-[var(--white)] focus:border-[var(--primary-orange)]/50 focus:outline-none transition-colors"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--light-gray)] hover:text-[var(--white)] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={isChangingPassword}
                className="flex-1 bg-white/10 border border-white/20 text-[var(--white)] hover:bg-white/20 active:bg-white/30 transition-colors text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="flex-1 bg-[var(--warning-orange)] hover:bg-[var(--warning-orange)]/90 active:bg-[var(--warning-orange)]/80 transition-colors text-sm sm:text-base text-[var(--white)]"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Updating...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1.5 sm:mr-2" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--secondary-black)] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4 sm:mb-6">
              <div className="flex-shrink-0 p-2 bg-[var(--error-red)]/10 rounded-lg">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--error-red)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--white)] mb-1">Confirm Sign Out</h3>
                <p className="text-xs sm:text-sm text-[var(--light-gray)] leading-relaxed">Are you sure you want to sign out of your account?</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 bg-white/10 border border-white/20 text-[var(--white)] hover:bg-white/20 active:bg-white/30 transition-colors text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 bg-[var(--error-red)] hover:bg-[var(--error-red)]/90 active:bg-[var(--error-red)]/80 transition-colors text-sm sm:text-base text-[var(--white)]"
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

export default function ProfilePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProfileContent />
    </SafeAreaProvider>
  );
}