'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Edit3,
  Save,
  RefreshCw
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useToastHelpers } from '@/components/ui/ToastManager';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import Field from '@/components/dc/kit/Field';
import { BackIcon, EyeIcon, EyeOffIcon, MenuIcon } from '@/components/dc/kit/icons';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { success, error } = useToastHelpers();

  // Convex mutations
  const updateProfile = useMutation(api.services.auth.updateProfile);
  const changePassword = useMutation(api.services.auth.changePassword);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Handle redirects in useEffect (client-side only)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    if (user?.role === 'super_admin') {
      router.push('/admin/dashboard');
      return;
    }
  }, [isAuthenticated, user?.role, router]);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Validation errors
  const [profileErrors, setProfileErrors] = useState<{[key: string]: string}>({});
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});

  // Show loading while checking auth
  if (!isAuthenticated || user?.role === 'admin' || user?.role === 'super_admin') {
    return (
      <div className="dk dk-member">
        <div className="dk-member-empty" role="status" style={{ margin: 24 }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const validateProfile = () => {
    const errors: {[key: string]: string} = {};

    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (profileData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (profileData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (profileData.phone && profileData.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9]{10,15}$/;
      if (!phoneRegex.test(profileData.phone.trim().replace(/[\s\-\(\)]/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: {[key: string]: string} = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await updateProfile({
        userId: user._id as Id<'users'>,
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        phone: profileData.phone.trim() || undefined,
      });
      if (result.success && result.user) {
        updateUser(result.user);
      }

      success('Profile Updated', 'Your profile has been updated successfully!');
      router.back();
    } catch (err) {
      console.error('Profile update error:', err);
      error('Update Failed', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    if (!user) return;

    setIsLoading(true);
    try {
      await changePassword({
        userId: user._id as Id<'users'>,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      success('Password Changed', 'Your password has been updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setActiveTab('profile');
    } catch (err) {
      console.error('Password change error:', err);
      error('Change Failed', 'Failed to change password. Please verify your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
    }
  };

  type ProfileKey = 'firstName' | 'lastName' | 'email' | 'phone';
  const setProfileField = (key: ProfileKey, value: string) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
    if (profileErrors[key]) {
      setProfileErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  type PasswordKey = 'currentPassword' | 'newPassword' | 'confirmPassword';
  const setPasswordField = (key: PasswordKey, value: string) => {
    setPasswordData(prev => ({ ...prev, [key]: value }));
    if (passwordErrors[key]) {
      setPasswordErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const passwordFields: {
    key: PasswordKey;
    id: string;
    label: string;
    placeholder: string;
    shown: boolean;
    which: 'current' | 'new' | 'confirm';
  }[] = [
    { key: 'currentPassword', id: 'edit-pw-current', label: 'Current Password', placeholder: 'Enter your current password', shown: showCurrentPassword, which: 'current' },
    { key: 'newPassword', id: 'edit-pw-new', label: 'New Password', placeholder: 'Enter your new password', shown: showNewPassword, which: 'new' },
    { key: 'confirmPassword', id: 'edit-pw-confirm', label: 'Confirm New Password', placeholder: 'Confirm your new password', shown: showConfirmPassword, which: 'confirm' },
  ];

  const describe = (id: string, err?: string) => (err ? `${id}-msg` : undefined);

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
              <h1>Edit Profile</h1>
            </div>
          </div>

          <div className="dk-app-section" style={{ maxWidth: 760 }}>
            {/* Tab Navigation */}
            <div className="dk-tabs" role="tablist" aria-label="Edit profile sections">
              <button
                type="button"
                role="tab"
                id="tab-profile"
                className="dk-chip"
                aria-selected={activeTab === 'profile'}
                aria-controls="panel-profile"
                onClick={() => setActiveTab('profile')}
              >
                Profile Info
              </button>
              <button
                type="button"
                role="tab"
                id="tab-password"
                className="dk-chip"
                aria-selected={activeTab === 'password'}
                aria-controls="panel-password"
                onClick={() => setActiveTab('password')}
              >
                Change Password
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="dk-stack lg" style={{ marginTop: 20 }}>
                {/* Profile Picture */}
                <div className="dk-panel">
                  <div className="dk-row wrap" style={{ gap: 20 }}>
                    <span className="dk-avatar" style={{ width: 80, height: 80 }} aria-hidden="true">
                      <User size={36} />
                    </span>
                    <button type="button" className="dk-btn dk-btn-outline-dark plain">
                      <Edit3 size={16} aria-hidden="true" />
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="dk-panel">
                  <div className="dk-fgrid">
                    <Field id="edit-first-name" label="First Name" error={profileErrors.firstName}>
                      <input
                        id="edit-first-name"
                        type="text"
                        className="dk-input"
                        value={profileData.firstName}
                        onChange={(e) => setProfileField('firstName', e.target.value)}
                        placeholder="Enter your first name"
                        autoComplete="given-name"
                        aria-invalid={!!profileErrors.firstName}
                        aria-describedby={describe('edit-first-name', profileErrors.firstName)}
                      />
                    </Field>

                    <Field id="edit-last-name" label="Last Name" error={profileErrors.lastName}>
                      <input
                        id="edit-last-name"
                        type="text"
                        className="dk-input"
                        value={profileData.lastName}
                        onChange={(e) => setProfileField('lastName', e.target.value)}
                        placeholder="Enter your last name"
                        autoComplete="family-name"
                        aria-invalid={!!profileErrors.lastName}
                        aria-describedby={describe('edit-last-name', profileErrors.lastName)}
                      />
                    </Field>

                    <Field id="edit-email" label="Email Address" error={profileErrors.email} full>
                      <input
                        id="edit-email"
                        type="email"
                        className="dk-input"
                        value={profileData.email}
                        onChange={(e) => setProfileField('email', e.target.value)}
                        placeholder="Enter your email"
                        // auth.updateProfile doesn't support changing the email address
                        disabled
                        aria-invalid={!!profileErrors.email}
                        aria-describedby={describe('edit-email', profileErrors.email)}
                      />
                    </Field>

                    <Field id="edit-phone" label="Phone Number" optional="(Optional)" error={profileErrors.phone} full>
                      <input
                        id="edit-phone"
                        type="tel"
                        className="dk-input"
                        value={profileData.phone}
                        onChange={(e) => setProfileField('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                        aria-invalid={!!profileErrors.phone}
                        aria-describedby={describe('edit-phone', profileErrors.phone)}
                      />
                    </Field>

                    <div className="full">
                      <button
                        type="button"
                        className="dk-btn dk-btn-red block"
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        aria-busy={isLoading}
                      >
                        {isLoading
                          ? <RefreshCw size={18} className="animate-spin" aria-hidden="true" />
                          : <Save size={18} aria-hidden="true" />}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div id="panel-password" role="tabpanel" aria-labelledby="tab-password" className="dk-panel" style={{ marginTop: 20 }}>
                <div className="dk-stack">
                  {passwordFields.map((f) => (
                    <Field key={f.id} id={f.id} label={f.label} error={passwordErrors[f.key]}>
                      <div className="dk-pw-wrap">
                        <input
                          id={f.id}
                          type={f.shown ? 'text' : 'password'}
                          className="dk-input"
                          value={passwordData[f.key]}
                          onChange={(e) => setPasswordField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          autoComplete={f.key === 'currentPassword' ? 'current-password' : 'new-password'}
                          aria-invalid={!!passwordErrors[f.key]}
                          aria-describedby={describe(f.id, passwordErrors[f.key])}
                        />
                        <button
                          type="button"
                          className="dk-pw-toggle"
                          onClick={() => togglePasswordVisibility(f.which)}
                          aria-label={f.shown ? 'Hide password' : 'Show password'}
                          aria-pressed={f.shown}
                        >
                          {f.shown ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                        </button>
                      </div>
                    </Field>
                  ))}

                  <div className="dk-alert">
                    <h4 style={{ fontSize: 14, color: 'var(--dk-black)' }}>Password Requirements:</h4>
                    <ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 6 }}>
                      <li>At least 8 characters long</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="dk-btn dk-btn-red block"
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading
                      ? <RefreshCw size={18} className="animate-spin" aria-hidden="true" />
                      : <Save size={18} aria-hidden="true" />}
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
