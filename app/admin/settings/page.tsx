'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import {
  ArrowLeft,
  User,
  Shield,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, logout: authStoreLogout } = useAuthStore();
  const { logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Fetch current user data
  const currentUser = useQuery(api.services.auth.getCurrentUser, user ? { userId: user._id } : "skip");

  // Settings state
  const [settings, setSettings] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    notifications: {
      emailNotifications: true,
      lowStockAlerts: true,
      orderNotifications: true,
      systemAlerts: true,
    },
    security: {
      changePassword: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  // Handle logout success - force redirect if user is no longer authenticated
  useEffect(() => {
    if (!isAuthenticated && user === null) {
      console.log('User logged out, redirecting to login...');
      // Force redirect to login page
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated, user]);

  // Populate settings from user data
  useEffect(() => {
    if (currentUser) {
      setSettings(prev => ({
        ...prev,
        email: currentUser.email || '',
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        phone: currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  // Save settings handler
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      // TODO: Implement save settings mutation
      console.log('Saving settings:', settings);
      setModalMessage('Settings saved successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setModalMessage('Error saving settings. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      console.log('🚪 Starting logout process...');
      
      // Close the confirmation modal first
      setShowLogoutConfirm(false);
      
      // Clear any pending settings changes
      setSettings({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        notifications: {
          emailNotifications: true,
          lowStockAlerts: true,
          orderNotifications: true,
          systemAlerts: true,
        },
        security: {
          changePassword: false,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }
      });

      // Step 1: Sign out from NextAuth
      console.log('🔐 Signing out from NextAuth...');
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: false 
      });

      // Step 2: Clear auth store
      console.log('🗄️ Clearing auth store...');
      authStoreLogout();

      // Step 3: Clear localStorage
      console.log('🧹 Clearing localStorage...');
      try {
        localStorage.removeItem('celestial-auth-storage');
        localStorage.removeItem('next-auth.session-token');
        localStorage.removeItem('next-auth.csrf-token');
        localStorage.removeItem('next-auth.callback-url');
        // Clear any other potential auth-related items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('auth') || key.includes('session') || key.includes('token')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('Could not clear localStorage:', storageError);
      }

      // Step 4: Force redirect to login
      console.log('🔄 Redirecting to login...');
      
      // Show success message briefly
      setModalMessage('Successfully logged out!');
      setShowSuccessModal(true);
      
      // Force redirect using multiple methods to ensure it works
      setTimeout(() => {
        setShowSuccessModal(false);
        // Multiple redirect methods to ensure it works
        window.location.href = '/auth/login';
        router.replace('/auth/login');
        router.push('/auth/login');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      setModalMessage('Error during logout. Redirecting to login...');
      setShowErrorModal(true);
      
      // Force redirect even on error
      setTimeout(() => {
        setShowErrorModal(false);
        // Force redirect on error
        window.location.href = '/auth/login';
      }, 2000);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Toggle component
  const Toggle = ({ enabled, onChange, label, description }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex-1 pr-3">
        <p className="text-white text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-white/60 text-xs mt-1 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          enabled ? 'bg-primary' : 'bg-white/20'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="flex-shrink-0 p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">Settings</h1>
                <p className="text-xs text-white/60 hidden sm:block">Manage your preferences</p>
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              size="sm"
              className="flex-shrink-0 bg-primary hover:bg-primary/90 text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              {isSaving ? (
                <RefreshCw className="w-3 h-3 sm:mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3 h-3 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Profile Information */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white">Profile Information</h2>
                <p className="text-xs sm:text-sm text-white/60">Update your personal details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">First Name</label>
                  <input
                    type="text"
                    value={settings.firstName}
                    onChange={(e) => setSettings(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={settings.lastName}
                    onChange={(e) => setSettings(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-info/10 rounded-lg flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white">Notifications</h2>
                <p className="text-xs sm:text-sm text-white/60">Configure your notification preferences</p>
              </div>
            </div>

            <div className="space-y-3">
              <Toggle
                enabled={settings.notifications.emailNotifications}
                onChange={(value) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, emailNotifications: value }
                }))}
                label="Email Notifications"
                description="Receive notifications via email"
              />
              <Toggle
                enabled={settings.notifications.lowStockAlerts}
                onChange={(value) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, lowStockAlerts: value }
                }))}
                label="Low Stock Alerts"
                description="Get notified when products are running low"
              />
              <Toggle
                enabled={settings.notifications.orderNotifications}
                onChange={(value) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, orderNotifications: value }
                }))}
                label="Order Notifications"
                description="New orders and order updates"
              />
              <Toggle
                enabled={settings.notifications.systemAlerts}
                onChange={(value) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, systemAlerts: value }
                }))}
                label="System Alerts"
                description="System health and performance alerts"
              />
            </div>
          </Card>

          {/* Security Settings */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-warning/10 rounded-lg flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white">Security</h2>
                <p className="text-xs sm:text-sm text-white/60">Manage your account security</p>
              </div>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.security.changePassword}
                onChange={(value) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, changePassword: value }
                }))}
                label="Change Password"
                description="Update your account password"
              />

              {settings.security.changePassword && (
                <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.security.currentPassword}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, currentPassword: e.target.value }
                        }))}
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                        placeholder="Enter current password"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">New Password</label>
                      <input
                        type="password"
                        value={settings.security.newPassword}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, newPassword: e.target.value }
                        }))}
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={settings.security.confirmPassword}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, confirmPassword: e.target.value }
                        }))}
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white">Quick Actions</h2>
                <p className="text-xs sm:text-sm text-white/60">Common admin tasks</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Manage Users</p>
                  <p className="text-xs text-white/60">View and manage user accounts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </button>

              <button
                onClick={() => router.push('/admin/products')}
                className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                  <SettingsIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Manage Products</p>
                  <p className="text-xs text-white/60">View and manage products</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </button>
            </div>
          </Card>

          {/* Logout Section */}
          <Card className="p-4 sm:p-6 border-error/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="p-2 bg-error/10 rounded-lg flex-shrink-0">
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-error" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-white text-sm sm:text-base">Logout</h3>
                  <p className="text-xs sm:text-sm text-white/60">Sign out of your admin account</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-yellow-400 mt-1 break-all">
                      Dev: Auth Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'} | 
                      User: {user ? `${user.firstName} (${user.role})` : 'None'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  console.log('🚪 Logout button clicked');
                  setShowLogoutConfirm(true);
                }}
                className="flex-shrink-0 bg-error/10 border border-error/20 text-error hover:bg-error/20 transition-colors text-xs sm:text-sm px-3 sm:px-4 py-2"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-sm sm:max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Success</h3>
                <p className="text-sm text-white/60 break-words">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-success hover:bg-success/90"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-sm sm:max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Error</h3>
                <p className="text-sm text-white/60 break-words">{modalMessage}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-error hover:bg-error/90"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-sm sm:max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg flex-shrink-0">
                <LogOut className="w-5 h-5 text-error" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Confirm Logout</h3>
                <p className="text-sm text-white/60">Are you sure you want to sign out of your admin account?</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  console.log('Cancel logout clicked');
                  setShowLogoutConfirm(false);
                }}
                disabled={isLoggingOut}
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  console.log('Confirm logout clicked');
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="flex-1 bg-error hover:bg-error/90 transition-colors order-1 sm:order-2"
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}