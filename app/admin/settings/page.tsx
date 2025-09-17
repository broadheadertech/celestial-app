'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Settings as SettingsIcon,
  Bell,
  Lock,
  Palette,
  HelpCircle,
  LogOut,
  Database,
  Users as UsersIcon,
  Smartphone,
  ChevronRight,
  Eye,
  EyeOff,
  BarChart3,
  Package,
  ShoppingBag
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuthStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/auth/login');
    return null;
  }

  const settingsMenuSections = [
    {
      title: 'Account Settings',
      items: [
        {
          id: 'profile',
          title: 'Profile Information',
          subtitle: 'Update your admin profile details',
          icon: User,
          action: () => router.push('/admin/profile/edit'),
          hasToggle: false,
        },
        {
          id: 'security',
          title: 'Security Settings',
          subtitle: 'Change password and security preferences',
          icon: Lock,
          action: () => router.push('/admin/profile/security'),
          hasToggle: false,
        },
        {
          id: 'notifications',
          title: 'Notification Preferences',
          subtitle: 'Manage admin notifications',
          icon: Bell,
          action: () => router.push('/admin/profile/notifications'),
          hasToggle: true,
          toggleValue: true,
        },
      ]
    },
    {
      title: 'System Settings',
      items: [
        {
          id: 'general',
          title: 'General Settings',
          subtitle: 'App configuration and preferences',
          icon: SettingsIcon,
          action: () => router.push('/admin/profile/general'),
          hasToggle: false,
        },
        {
          id: 'appearance',
          title: 'Appearance',
          subtitle: 'Theme and display settings',
          icon: Palette,
          action: () => router.push('/admin/profile/appearance'),
          hasToggle: false,
        },
      ]
    },
    {
      title: 'User Management',
      items: [
        {
          id: 'user_roles',
          title: 'User Roles & Permissions',
          subtitle: 'Manage user access levels',
          icon: UsersIcon,
          action: () => router.push('/admin/profile/roles'),
          hasToggle: false,
        },
        {
          id: 'admin_accounts',
          title: 'Admin Accounts',
          subtitle: 'Manage administrator accounts',
          icon: Shield,
          action: () => router.push('/admin/profile/admins'),
          hasToggle: false,
        },
      ]
    },
    {
      title: 'Content Management',
      items: [
        {
          id: 'categories',
          title: 'Product Categories',
          subtitle: 'Manage product categories',
          icon: Database,
          action: () => router.push('/admin/profile/categories'),
          hasToggle: false,
        },
        {
          id: 'content_moderation',
          title: 'Content Moderation',
          subtitle: 'Review and moderate content',
          icon: Shield,
          action: () => router.push('/admin/profile/moderation'),
          hasToggle: true,
          toggleValue: false,
        },
      ]
    },
    {
      title: 'Communication',
      items: [
        {
          id: 'email_templates',
          title: 'Email Templates',
          subtitle: 'Customize email notifications',
          icon: Mail,
          action: () => router.push('/admin/profile/emails'),
          hasToggle: false,
        },
        {
          id: 'push_notifications',
          title: 'Push Notifications',
          subtitle: 'Configure push notification settings',
          icon: Smartphone,
          action: () => router.push('/admin/profile/push'),
          hasToggle: true,
          toggleValue: true,
        },
      ]
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & Documentation',
          subtitle: 'Admin guides and documentation',
          icon: HelpCircle,
          action: () => router.push('/admin/profile/help'),
          hasToggle: false,
        },
      ]
    }
  ];

  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    notifications: true,
    content_moderation: false,
    push_notifications: true,
  });

  const handleToggle = (itemId: string, value: boolean) => {
    setToggleStates(prev => ({ ...prev, [itemId]: value }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
            <h1 className="text-xl font-semibold text-white">Admin Settings</h1>
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
              <p className="text-muted text-sm">Administrator</p>
              <div className="flex items-center mt-1">
                <Shield className="w-4 h-4 text-primary mr-1" />
                <span className="text-primary text-sm font-medium">Admin Access</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/profile/edit')}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="w-4 h-4 text-muted" />
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Shield className="w-4 h-4 text-muted" />
              <span className="text-white">Administrator Account</span>
            </div>
          </div>
        </Card>

        {/* Settings Sections */}
        {settingsMenuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">{section.title}</h3>
            <div className="space-y-3">
              {section.items.map((item) => {
                const IconComponent = item.icon;

                return (
                  <Card
                    key={item.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={item.action}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="text-sm text-muted">{item.subtitle}</p>
                        </div>
                      </div>

                      {item.hasToggle ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted">
                            {toggleStates[item.id] ?? item.toggleValue ? 'On' : 'Off'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(item.id, !(toggleStates[item.id] ?? item.toggleValue));
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              toggleStates[item.id] ?? item.toggleValue ? 'bg-primary' : 'bg-secondary'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                toggleStates[item.id] ?? item.toggleValue ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Section */}
        <Card className="mb-20">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-error/10 rounded-lg transition-colors text-error"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-error/20 rounded-lg flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium">Sign Out</h4>
                <p className="text-sm opacity-80">Sign out of admin panel</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </Card>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <Card className="w-full max-w-sm">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Sign Out</h3>
              <p className="text-muted mb-6">Are you sure you want to sign out of the admin panel?</p>
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
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
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
            className="flex flex-col items-center py-2 px-3 text-primary"
          >
            <SettingsIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}
