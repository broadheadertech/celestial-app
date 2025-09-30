'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { isValidEmail } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { loginWithEmail, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = () => {
      const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
      const isFirstVisit = !hasCompletedOnboarding;

      // If it's the first visit and we haven't redirected yet, go to onboarding
      if (isFirstVisit && !hasRedirected && !isAuthenticated) {
        setHasRedirected(true);
        router.push('/onboarding');
        return;
      }

      // If user is authenticated, redirect to appropriate dashboard
      if (isAuthenticated && user && !hasRedirected) {
        const role = user.role;
        const path = role === 'admin' ? '/admin/dashboard' :
                     role === 'super_admin' ? '/control_panel' :
                     '/client/dashboard';
        setHasRedirected(true);
        router.push(path);
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated, router, hasRedirected]);

  // Show loading while determining redirect
  if (hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setErrors({});
    setIsSubmitting(true);

    try {
      await loginWithEmail(formData.email, formData.password);
      // Redirect will be handled by useEffect after login
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid email or password';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookLogin = async () => {
    setErrors({});
    // Facebook OAuth doesn't work with static export
    setErrors({ general: 'Facebook login is not available in mobile app. Please use email/password.' });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBackToOnboarding = () => {
    // Allow users to go back to onboarding if needed
    localStorage.removeItem('onboarding_completed');
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-br from-background to-background-dark">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackToOnboarding}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
          title="Back to Onboarding"
        >
          <span className="text-white text-sm">←</span>
        </button>
        <h1 className="text-xl font-semibold text-white">Sign In</h1>
        <div className="w-10" />
      </div>

      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
        <p className="text-muted">Sign in to access your aquatic paradise</p>
      </div>

      {/* Login Form */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20">
                <p className="text-error text-sm">{errors.general}</p>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              error={errors.email}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                error={errors.password}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-muted-dark hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted">or continue with</span>
            </div>
          </div>

          {/* Facebook Login Button */}
          <Button
            onClick={handleFacebookLogin}
            loading={isLoading}
            disabled={isLoading}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] border-[#1877F2] text-white hover:text-white"
            size="lg"
          >
            {isLoading ? (
              'Connecting...'
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </div>
            )}
          </Button>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-primary hover:underline font-medium"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
