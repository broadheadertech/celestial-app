"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import BottomNavbar from "@/components/common/BottomNavbar";
import SafeAreaProvider from "@/components/provider/SafeAreaProvider";
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
  Mail,
  Phone,
  Lock,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

function AdminSettingsContent() {
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
  const [modalMessage, setModalMessage] = useState("");

  // Fetch current user data
  const currentUser = useQuery(
    api.services.auth.getCurrentUser,
    user ? { userId: user._id } : "skip",
  );

  // Profile update mutation
  const updateProfile = useMutation(api.services.auth.updateProfile);
  const changePassword = useMutation(api.services.auth.changePassword);

  // Settings state
  const [settings, setSettings] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    notifications: {
      emailNotifications: true,
      lowStockAlerts: true,
      orderNotifications: true,
      systemAlerts: true,
    },
    security: {
      changePassword: false,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, user, router]);

  // Populate settings from user data
  useEffect(() => {
    if (currentUser) {
      setSettings((prev) => ({
        ...prev,
        email: currentUser.email || "",
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        phone: currentUser.phone || "",
      }));
    }
  }, [currentUser]);

  // Save settings handler
  const handleSaveSettings = async () => {
    if (!user?._id) {
      setModalMessage("User not found. Please log in again.");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsSaving(true);

      // Validate inputs
      if (!settings.firstName.trim() || !settings.lastName.trim()) {
        setModalMessage("First name and last name are required.");
        setShowErrorModal(true);
        setIsSaving(false);
        return;
      }

      if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
        setModalMessage("Please enter a valid email address.");
        setShowErrorModal(true);
        setIsSaving(false);
        return;
      }

      // Validate password change if enabled
      if (settings.security.changePassword) {
        if (!settings.security.currentPassword || !settings.security.newPassword || !settings.security.confirmPassword) {
          setModalMessage("Please fill in all password fields.");
          setShowErrorModal(true);
          setIsSaving(false);
          return;
        }

        if (settings.security.newPassword !== settings.security.confirmPassword) {
          setModalMessage("New passwords do not match.");
          setShowErrorModal(true);
          setIsSaving(false);
          return;
        }

        if (settings.security.newPassword.length < 8) {
          setModalMessage("New password must be at least 8 characters long.");
          setShowErrorModal(true);
          setIsSaving(false);
          return;
        }

        // Validate password strength
        const hasUpperCase = /[A-Z]/.test(settings.security.newPassword);
        const hasLowerCase = /[a-z]/.test(settings.security.newPassword);
        const hasNumber = /\d/.test(settings.security.newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          setModalMessage("Password must contain uppercase, lowercase, and number.");
          setShowErrorModal(true);
          setIsSaving(false);
          return;
        }
      }

      // Update profile information
      await updateProfile({
        userId: user._id,
        firstName: settings.firstName.trim(),
        lastName: settings.lastName.trim(),
        phone: settings.phone.trim() || undefined,
      });

      // Update the auth store with new user data
      if (user) {
        const updatedUser = {
          ...user,
          firstName: settings.firstName.trim(),
          lastName: settings.lastName.trim(),
          phone: settings.phone.trim(),
        };
        useAuthStore.getState().updateUser(updatedUser);
      }

      // Handle password change if enabled
      if (settings.security.changePassword) {
        await changePassword({
          userId: user._id,
          currentPassword: settings.security.currentPassword,
          newPassword: settings.security.newPassword,
        });
      }

      // TODO: Implement notification preferences save if needed

      setModalMessage(settings.security.changePassword 
        ? "Profile and password updated successfully!" 
        : "Profile updated successfully!");
      setShowSuccessModal(true);

      // Reset password fields
      if (settings.security.changePassword) {
        setSettings(prev => ({
          ...prev,
          security: {
            changePassword: false,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          },
        }));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setModalMessage(error instanceof Error ? error.message : "Error saving settings. Please try again.");
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

  // Toggle component - improved mobile design
  const Toggle = ({
    enabled,
    onChange,
    label,
    description,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-start justify-between gap-3 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10 active:bg-white/10 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm sm:text-base font-medium leading-tight">
          {label}
        </p>
        {description && (
          <p className="text-white/60 text-xs sm:text-sm mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 ${
          enabled ? "bg-primary" : "bg-white/20"
        }`}
        aria-label={`Toggle ${label}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Sticky Header with Safe Area */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 shadow-lg safe-area-top">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="flex-shrink-0 p-2 rounded-xl bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">
                  Settings
                </h1>
                <p className="text-xs text-white/60 truncate">
                  Manage preferences
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              size="sm"
              className="flex-shrink-0 bg-primary hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm px-3 sm:px-4 py-2 font-medium shadow-lg"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  <span className="ml-1.5 hidden xs:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="ml-1.5 hidden xs:inline">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Content - Improved spacing and mobile layout */}
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {/* Profile Information Card */}
          <Card className="p-4 sm:p-5 lg:p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Profile Information
                </h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Update your personal details
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Name inputs - stack on mobile, side by side on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    First Name
                  </label>
                  <input
                    type="text"
                    value={settings.firstName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={settings.lastName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Contact inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                    <Mail className="w-3.5 h-3.5 text-white/40" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                    <Phone className="w-3.5 h-3.5 text-white/40" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Notification Settings Card */}
          <Card className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2.5 bg-info/10 rounded-xl flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Notifications
                </h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Configure notification preferences
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Toggle
                enabled={settings.notifications.emailNotifications}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      emailNotifications: value,
                    },
                  }))
                }
                label="Email Notifications"
                description="Receive notifications via email"
              />
              <Toggle
                enabled={settings.notifications.lowStockAlerts}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      lowStockAlerts: value,
                    },
                  }))
                }
                label="Low Stock Alerts"
                description="Get notified when products are running low"
              />
              <Toggle
                enabled={settings.notifications.orderNotifications}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      orderNotifications: value,
                    },
                  }))
                }
                label="Order Notifications"
                description="New orders and order updates"
              />
              <Toggle
                enabled={settings.notifications.systemAlerts}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      systemAlerts: value,
                    },
                  }))
                }
                label="System Alerts"
                description="System health and performance alerts"
              />
            </div>
          </Card>

          {/* Security Settings Card */}
          <Card className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2.5 bg-warning/10 rounded-xl flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Security
                </h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Manage your account security
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Toggle
                enabled={settings.security.changePassword}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, changePassword: value },
                  }))
                }
                label="Change Password"
                description="Update your account password"
              />

              {settings.security.changePassword && (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={settings.security.currentPassword}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              currentPassword: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-11 placeholder:text-white/40"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white active:scale-95 transition-all p-1.5 rounded-lg hover:bg-white/10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                        <Lock className="w-3.5 h-3.5 text-white/40" />
                        New Password
                      </label>
                      <input
                        type="password"
                        value={settings.security.newPassword}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              newPassword: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/70">
                        <Lock className="w-3.5 h-3.5 text-white/40" />
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={settings.security.confirmPassword}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              confirmPassword: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm sm:text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/40"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <p className="text-xs text-info font-medium mb-1">Password Requirements:</p>
                    <ul className="text-xs text-white/60 space-y-0.5">
                      <li>• At least 8 characters long</li>
                      <li>• Contains uppercase and lowercase letters</li>
                      <li>• Contains at least one number</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2.5 bg-success/10 rounded-xl flex-shrink-0">
                <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Quick Actions
                </h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Common admin tasks
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/admin/users")}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/10 active:bg-white/15 active:scale-[0.98] transition-all border border-transparent hover:border-white/10 group"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    Manage Users
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    View and manage accounts
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </button>

              <button
                onClick={() => router.push("/admin/products")}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/10 active:bg-white/15 active:scale-[0.98] transition-all border border-transparent hover:border-white/10 group"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                  <SettingsIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    Manage Products
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    View and manage products
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </button>
            </div>
          </Card>

          {/* Logout Section - Improved mobile design */}
          <Card className="p-4 sm:p-5 lg:p-6 border-error/20 bg-error/5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2.5 bg-error/10 rounded-xl flex-shrink-0">
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-error" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-sm sm:text-base leading-tight">
                    Logout
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 mt-1 leading-relaxed">
                    Sign out of your admin account
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full sm:w-auto flex-shrink-0 bg-error/10 border border-error/20 text-error hover:bg-error/20 active:bg-error/30 active:scale-95 transition-all text-sm px-4 py-2.5 font-medium shadow-lg whitespace-nowrap"
                disabled={isLoggingOut}
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
          </Card>
        </div>
      </div>

      {/* Success Modal - Improved mobile design */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-success/10 rounded-xl flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Success</h3>
                <p className="text-sm text-white/70 break-words leading-relaxed">
                  {modalMessage}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-success hover:bg-success/90 active:scale-95 transition-all mt-2"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal - Improved mobile design */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-error/10 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Error</h3>
                <p className="text-sm text-white/70 break-words leading-relaxed">
                  {modalMessage}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-error hover:bg-error/90 active:scale-95 transition-all mt-2"
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal - Improved mobile design */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3 mb-5">
              <div className="p-2.5 bg-error/10 rounded-xl flex-shrink-0">
                <LogOut className="w-5 h-5 text-error" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Confirm Logout
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Are you sure you want to sign out of your admin account?
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 bg-error hover:bg-error/90 active:scale-95 transition-all"
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

// Main Export with SafeAreaProvider
export default function AdminSettingsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminSettingsContent />
    </SafeAreaProvider>
  );
}