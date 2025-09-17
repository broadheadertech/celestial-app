'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Edit3,
  Save,
  X,
  AlertCircle,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  // Redirect admins and super_admins to their respective dashboards
  if (user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

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

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Validation errors
  const [profileErrors, setProfileErrors] = useState<{[key: string]: string}>({});
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});

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

    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('Profile updated successfully!');
      router.back();
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setActiveTab('profile');
    } catch (error) {
      alert('Failed to change password. Please try again.');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Edit Profile</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 rounded-lg text-center transition-colors ${
                activeTab === 'profile'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-3 rounded-lg text-center transition-colors ${
                activeTab === 'password'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Picture */}
            <Card className="p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <Button variant="outline" size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            </Card>

            {/* Profile Form */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(value) => {
                        setProfileData(prev => ({ ...prev, firstName: value }));
                        if (profileErrors.firstName) {
                          setProfileErrors(prev => ({ ...prev, firstName: '' }));
                        }
                      }}
                      error={profileErrors.firstName}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Input
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(value) => {
                        setProfileData(prev => ({ ...prev, lastName: value }));
                        if (profileErrors.lastName) {
                          setProfileErrors(prev => ({ ...prev, lastName: '' }));
                        }
                      }}
                      error={profileErrors.lastName}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(value) => {
                    setProfileData(prev => ({ ...prev, email: value }));
                    if (profileErrors.email) {
                      setProfileErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  error={profileErrors.email}
                  placeholder="Enter your email"
                />

                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  value={profileData.phone}
                  onChange={(value) => {
                    setProfileData(prev => ({ ...prev, phone: value }));
                    if (profileErrors.phone) {
                      setProfileErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                  error={profileErrors.phone}
                  placeholder="Enter your phone number"
                />

                <Button
                  onClick={handleSaveProfile}
                  loading={isLoading}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(value) => {
                    setPasswordData(prev => ({ ...prev, currentPassword: value }));
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                    }
                  }}
                  error={passwordErrors.currentPassword}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-9 text-muted"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(value) => {
                    setPasswordData(prev => ({ ...prev, newPassword: value }));
                    if (passwordErrors.newPassword) {
                      setPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                    }
                  }}
                  error={passwordErrors.newPassword}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-9 text-muted"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(value) => {
                    setPasswordData(prev => ({ ...prev, confirmPassword: value }));
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  error={passwordErrors.confirmPassword}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-9 text-muted"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">Password Requirements:</h4>
                <ul className="text-sm text-primary space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• One uppercase letter</li>
                  <li>• One lowercase letter</li>
                  <li>• One number</li>
                </ul>
              </div>

              <Button
                onClick={handleChangePassword}
                loading={isLoading}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="w-5 h-5 mr-2" />
                {isLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
