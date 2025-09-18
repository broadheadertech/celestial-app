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
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
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
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
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
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-white/60 text-xs mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-white/20'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
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
                <h1 className="text-lg font-bold text-white">Settings</h1>
                <p className="text-xs text-white/60">Manage your preferences</p>
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-sm px-4 py-2"
            >
              {isSaving ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1.5" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-2xl space-y-6">
          {/* Profile Information */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Profile Information</h2>
                <p className="text-sm text-white/60">Update your personal details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">First Name</label>
                <input
                  type="text"
                  value={settings.firstName}
                  onChange={(e) => setSettings(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Last Name</label>
                <input
                  type="text"
                  value={settings.lastName}
                  onChange={(e) => setSettings(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-info/10 rounded-lg">
                <Bell className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                <p className="text-sm text-white/60">Configure your notification preferences</p>
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
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Security</h2>
                <p className="text-sm text-white/60">Manage your account security</p>
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
                <div className="space-y-4 p-4 bg-white/5 rounded-lg">
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
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">New Password</label>
                      <input
                        type="password"
                        value={settings.security.newPassword}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, newPassword: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
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
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-success/10 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Quick Actions</h2>
                <p className="text-sm text-white/60">Common admin tasks</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <User className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Manage Users</p>
                  <p className="text-xs text-white/60">View and manage user accounts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 ml-auto" />
              </button>

              <button
                onClick={() => router.push('/admin/products')}
                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <SettingsIcon className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Manage Products</p>
                  <p className="text-xs text-white/60">View and manage products</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 ml-auto" />
              </button>
            </div>
          </Card>

          {/* Logout Section */}
          <Card className="p-6 border-error/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-error/10 rounded-lg">
                  <LogOut className="w-5 h-5 text-error" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Logout</h3>
                  <p className="text-sm text-white/60">Sign out of your admin account</p>
                </div>
              </div>
              <Button
                onClick={() => setShowLogoutConfirm(true)}
                className="bg-error/10 border border-error/20 text-error hover:bg-error/20"
              >
                Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Success</h3>
                <p className="text-sm text-white/60">{modalMessage}</p>
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
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Error</h3>
                <p className="text-sm text-white/60">{modalMessage}</p>
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
          <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-error/10 rounded-lg">
                <LogOut className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Logout</h3>
                <p className="text-sm text-white/60">Are you sure you want to sign out?</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 bg-error hover:bg-error/90"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Bottom padding for mobile navigation */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}