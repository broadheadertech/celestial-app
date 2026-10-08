'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Edit,
  LogOut,
  Package,
  ShoppingCart,
  Bell,
  HelpCircle,
  Shield,
  Save,
  RefreshCw,
  ChevronRight,
  Lock
} from 'lucide-react';
import { useIsAuthenticated, useCurrentUser, useAuthStore } from '@/store/auth';
import { useAuth } from '@/hooks/useAuth';
import { useCartItemCount } from '@/store/cart';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import NotchHero from '@/components/dc/kit/NotchHero';
import Field from '@/components/dc/kit/Field';
import EmptyState from '@/components/dc/kit/EmptyState';
import { AlertIcon, BackIcon, CheckIcon, EyeIcon, EyeOffIcon, MenuIcon } from '@/components/dc/kit/icons';

const modalIconStyle: CSSProperties = { width: 48, height: 48, margin: 0, flex: 'none' };
/** The notifications panel only exists on the member home screen; ?notifications opens it there. */
const NOTIFICATIONS_HREF = '/client/dashboard?notifications=1';
const rowBtnStyle: CSSProperties = {
  width: '100%', padding: '18px 24px', background: 'none', border: 0, textAlign: 'left', justifyContent: 'space-between',
};

function ProfileContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const cartItemCount = useCartItemCount();
  const updateUser = useAuthStore((state) => state.updateUser);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
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
    router.push('/admin/dashboard');
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
        userId: user._id as Id<'users'>,
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
        userId: user._id as Id<'users'>,
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
        setModalMessage(result.message || 'Failed to change password');
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

  const unread = clientNotificationCounts?.unread ?? 0;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  // "Add Phone Number Now": switch to editing and put the cursor in the phone field.
  const startAddingPhone = () => {
    setIsEditing(true);
    setTimeout(() => {
      const el = document.getElementById('profile-phone') as HTMLInputElement | null;
      el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el?.focus({ preventScroll: true });
    }, 0);
  };

  // Signed out: say so plainly instead of showing an empty profile with zeros.
  if (!isAuthenticated || !user) {
    return (
      <div className="dk dk-member">
        <div className="dk-app">
          <MemberSidebar id="sidebar" active="profile" open={sidebarOpen} onClose={closeSidebar} />
          <section className="dk-app-main">
            <div className="dk-app-top">
              <div className="dk-app-top-l">
                <button
                  type="button"
                  className="dk-view-btn dk-app-menu"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                  aria-controls="sidebar"
                  aria-expanded={sidebarOpen}
                >
                  <MenuIcon />
                </button>
              </div>
            </div>
            <div className="dk-member-empty" style={{ marginTop: 24 }}>
              <EmptyState
                as="h1"
                icon={<User size={24} />}
                title="Sign in to view your case"
                actions={
                  <>
                    <button type="button" className="dk-btn dk-btn-red" onClick={() => router.push('/auth/login')}>Sign In</button>
                    <button type="button" className="dk-btn dk-btn-outline-dark" onClick={() => router.push('/auth/register')}>Sign Up</button>
                  </>
                }
              >
                Your orders, reservations, and wishlist live here. We&apos;ll keep them safe between visits.
              </EmptyState>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: 'My Reservations', icon: Package, href: '/client/reservations', badge: null },
    {
      label: 'Shopping Cart', icon: ShoppingCart, href: '/client/cart',
      badge: cartItemCount > 0 ? <span className="dk-status black">{cartItemCount}</span> : null,
    },
    {
      // The notifications panel lives on the member home screen; this opens it there.
      label: 'Notifications', icon: Bell, href: NOTIFICATIONS_HREF,
      badge: unread > 0 ? <span className="dk-status red">{clientNotificationCounts?.unread} new</span> : null,
    },
    // There is no separate help centre, so support goes to the Contact page.
    { label: 'Help & Support', icon: HelpCircle, href: '/contact', badge: null },
  ];

  const passwordFields = [
    {
      id: 'pw-current', label: 'Current Password', key: 'currentPassword' as const, placeholder: 'Enter current password',
      shown: showCurrentPassword, toggle: () => setShowCurrentPassword(!showCurrentPassword), hint: undefined,
    },
    {
      id: 'pw-new', label: 'New Password', key: 'newPassword' as const, placeholder: 'Enter new password',
      shown: showNewPassword, toggle: () => setShowNewPassword(!showNewPassword),
      hint: 'Must be 8+ characters with uppercase, lowercase, and number',
    },
    {
      id: 'pw-confirm', label: 'Confirm New Password', key: 'confirmPassword' as const, placeholder: 'Confirm new password',
      shown: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword), hint: undefined,
    },
  ];

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="profile" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
          {/* Header */}
          <div className="dk-app-top">
            <div className="dk-app-top-l">
              <button
                type="button"
                className="dk-view-btn dk-app-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon />
              </button>
              <button type="button" className="dk-view-btn" onClick={() => router.back()} aria-label="Back">
                <BackIcon />
              </button>
              <h1>Profile</h1>
            </div>
            <div className="dk-app-actions">
              <button
                type="button"
                className="dk-view-btn"
                style={{ position: 'relative' }}
                onClick={() => router.push(NOTIFICATIONS_HREF)}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Bell size={16} aria-hidden="true" />
                {unread > 0 && (
                  <span className="dk-count" aria-hidden="true">
                    {unread > 99 ? '99+' : clientNotificationCounts?.unread}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* User Info hero: name + email, stats in the notch */}
          <div style={{ marginTop: 4 }}>
            <NotchHero flush
              tone="dark"
              behind="var(--dk-n-100)"
              notchWide
              notchHeight={120}
              notchLabel="Your reservation stats"
              notch={
                <div className="dk-stats" style={{ gap: '16px 28px' }}>
                  <div className="dk-stat"><b>{userStats.totalReservations}</b><span>Total Reservations</span></div>
                  <div className="dk-stat"><b>{userStats.completedReservations}</b><span>Completed</span></div>
                  <div className="dk-stat"><b>{userStats.activeReservations}</b><span>Active</span></div>
                  <div className="dk-stat"><b>₱{userStats.totalSpent.toLocaleString()}</b><span>Total Spent</span></div>
                </div>
              }
            >
              <div className="dk-row" style={{ gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  className="dk-avatar"
                  style={{ width: 80, height: 80, fontSize: 28, overflow: 'hidden' }}
                >
                  {user?.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote profile photo
                    <img
                      src={user.profilePicture}
                      alt={user.firstName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : initials ? (
                    <span aria-hidden="true">{initials}</span>
                  ) : (
                    <User size={36} aria-hidden="true" />
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 className="dk-h2" style={{ overflowWrap: 'anywhere' }}>
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p style={{ marginTop: 6, color: 'rgba(255,255,255,.85)', overflowWrap: 'anywhere' }}>{user?.email}</p>
                </div>
              </div>
            </NotchHero>
          </div>

          <div className="dk-app-section dk-stack lg">
            {/* Profile Settings */}
            <div className="dk-panel">
              <div className="dk-panel-head" style={{ flexWrap: 'wrap' }}>
                <h3 className="dk-panel-title">Profile Settings</h3>
                <div className="dk-row wrap" style={{ gap: 8 }}>
                  {/* Change Password Button */}
                  {user?.loginMethod !== 'facebook' && (
                    <button
                      type="button"
                      className="dk-btn dk-btn-outline-dark plain"
                      onClick={() => setShowPasswordModal(true)}
                    >
                      <Lock size={16} aria-hidden="true" />
                      Change Password
                    </button>
                  )}

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="dk-btn dk-btn-outline-dark plain"
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
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="dk-btn dk-btn-red plain"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        aria-busy={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} aria-hidden="true" />
                            Save
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="dk-btn dk-btn-outline-dark plain"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit size={16} aria-hidden="true" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="dk-fgrid">
                <Field id="profile-first-name" label="First Name">
                  <input
                    id="profile-first-name"
                    type="text"
                    className="dk-input"
                    value={profileSettings.firstName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                    autoComplete="given-name"
                  />
                </Field>

                <Field id="profile-last-name" label="Last Name">
                  <input
                    id="profile-last-name"
                    type="text"
                    className="dk-input"
                    value={profileSettings.lastName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                    autoComplete="family-name"
                  />
                </Field>

                {/* Email - Always disabled */}
                <Field id="profile-email" label="Email" hint="Email cannot be changed">
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dk-n-500)' }} />
                    <input
                      id="profile-email"
                      type="email"
                      className="dk-input"
                      style={{ paddingLeft: 42 }}
                      value={profileSettings.email}
                      disabled
                      placeholder="your.email@example.com"
                      aria-describedby="profile-email-msg"
                    />
                  </div>
                </Field>

                {/* Phone */}
                <Field id="profile-phone" label="Phone Number">
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dk-n-500)' }} />
                    <input
                      id="profile-phone"
                      type="tel"
                      className="dk-input"
                      style={{ paddingLeft: 42 }}
                      value={profileSettings.phone}
                      onChange={(e) => setProfileSettings(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="+63 900 000 0000"
                      autoComplete="tel"
                    />
                  </div>
                </Field>

                {/* Login Method Indicator */}
                {user?.loginMethod === 'facebook' && (
                  <div className="dk-alert full dk-row" style={{ gap: 8 }}>
                    <Shield size={16} aria-hidden="true" />
                    Connected with Facebook
                  </div>
                )}
              </div>
            </div>

            {/* Phone Number Prompt - Show when user has no phone */}
            {!user?.phone && (
              <div className="dk-panel muted">
                <div className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <span className="dk-empty-icon" style={{ width: 44, height: 44, margin: 0, flex: 'none' }} aria-hidden="true">
                    <Phone size={18} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="dk-h4">Add Your Phone Number</h3>
                    <p className="dk-small dk-muted" style={{ marginTop: 4 }}>
                      Enable SMS notifications for your orders and reservations. Stay updated with real-time alerts!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="dk-btn dk-btn-red block"
                  style={{ marginTop: 18 }}
                  onClick={startAddingPhone}
                >
                  <Phone size={16} aria-hidden="true" />
                  Add Phone Number Now
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <nav className="dk-panel flush" aria-label="Account shortcuts">
              <div className="dk-list">
                {quickActions.map(({ label, icon: Icon, href, badge }) => (
                  <button
                    key={href}
                    type="button"
                    className="dk-list-row"
                    style={rowBtnStyle}
                    onClick={() => router.push(href)}
                  >
                    <span className="dk-row" style={{ gap: 12 }}>
                      <Icon size={20} style={{ color: 'var(--dk-red)' }} aria-hidden="true" />
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
                      {badge}
                    </span>
                    <ChevronRight size={18} style={{ color: 'var(--dk-n-400)' }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </nav>

            {/* Sign Out Button */}
            <button
              type="button"
              className="dk-btn dk-btn-outline-dark block"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={18} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </section>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <>
          <div className="dk-scrim" aria-hidden="true" />
          <div className="dk-modal" role="dialog" aria-modal="true" aria-labelledby="profile-success-title">
            <div className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="dk-empty-icon" style={modalIconStyle} aria-hidden="true"><CheckIcon size={18} /></span>
              <div>
                <h3 id="profile-success-title" className="dk-h3" style={{ fontSize: 20 }}>Success!</h3>
                <p className="dk-small dk-muted" style={{ marginTop: 4 }}>{modalMessage}</p>
              </div>
            </div>
            <button
              type="button"
              className="dk-btn dk-btn-red block"
              style={{ marginTop: 24 }}
              onClick={() => setShowSuccessModal(false)}
            >
              OK
            </button>
          </div>
        </>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <>
          <div className="dk-scrim" aria-hidden="true" style={{ zIndex: 92 }} />
          <div className="dk-modal" role="alertdialog" aria-modal="true" aria-labelledby="profile-error-title" style={{ zIndex: 93 }}>
            <div className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="dk-empty-icon" style={modalIconStyle} aria-hidden="true"><AlertIcon size={22} /></span>
              <div>
                <h3 id="profile-error-title" className="dk-h3" style={{ fontSize: 20 }}>Error</h3>
                <p className="dk-small dk-muted" style={{ marginTop: 4 }}>{modalMessage}</p>
              </div>
            </div>
            <button
              type="button"
              className="dk-btn dk-btn-red block"
              style={{ marginTop: 24 }}
              onClick={() => setShowErrorModal(false)}
            >
              OK
            </button>
          </div>
        </>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <>
          <div className="dk-scrim" aria-hidden="true" />
          <div className="dk-modal" role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">
            <div className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="dk-empty-icon" style={modalIconStyle} aria-hidden="true"><Shield size={20} /></span>
              <div>
                <h3 id="pw-modal-title" className="dk-h3" style={{ fontSize: 20 }}>Change Password</h3>
                <p className="dk-small dk-muted" style={{ marginTop: 4 }}>Update your account password</p>
              </div>
            </div>

            {/* Password Form */}
            <div className="dk-stack" style={{ marginTop: 22 }}>
              {passwordFields.map((f) => (
                <Field key={f.id} id={f.id} label={f.label} hint={f.hint}>
                  <div className="dk-pw-wrap">
                    <input
                      id={f.id}
                      type={f.shown ? 'text' : 'password'}
                      className="dk-input"
                      value={passwordForm[f.key]}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      autoComplete={f.key === 'currentPassword' ? 'current-password' : 'new-password'}
                      aria-describedby={f.hint ? `${f.id}-msg` : undefined}
                    />
                    <button
                      type="button"
                      className="dk-pw-toggle"
                      onClick={f.toggle}
                      aria-label={f.shown ? 'Hide password' : 'Show password'}
                      aria-pressed={f.shown}
                    >
                      {f.shown ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>
                </Field>
              ))}
            </div>

            <div className="dk-row" style={{ marginTop: 24, gap: 10 }}>
              <button
                type="button"
                className="dk-btn dk-btn-outline-dark plain"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dk-btn dk-btn-red plain"
                style={{ flex: 1 }}
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                aria-busy={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                    <span className="hidden sm:inline">Updating...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    <Shield size={16} aria-hidden="true" />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          <div className="dk-scrim" aria-hidden="true" />
          <div className="dk-modal" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc">
            <div className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="dk-empty-icon" style={modalIconStyle} aria-hidden="true"><LogOut size={20} /></span>
              <div>
                <h3 id="logout-title" className="dk-h3" style={{ fontSize: 20 }}>Confirm Sign Out</h3>
                <p id="logout-desc" className="dk-small dk-muted" style={{ marginTop: 4 }}>Are you sure you want to sign out of your account?</p>
              </div>
            </div>
            <div className="dk-row" style={{ marginTop: 24, gap: 10 }}>
              <button
                type="button"
                className="dk-btn dk-btn-outline-dark plain"
                style={{ flex: 1 }}
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dk-btn dk-btn-red plain"
                style={{ flex: 1 }}
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                    <span className="hidden sm:inline">Signing out...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} aria-hidden="true" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
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
