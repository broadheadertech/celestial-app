'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { isValidEmail } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import SafeAreaProvider, { useSafeArea } from '@/components/provider/SafeAreaProvider';

// Login Content Component
function LoginContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { loginWithEmail, isLoading } = useAuth();
  const { isMobileApp } = useSafeArea();

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
      <div className="min-h-screen flex items-center justify-center bg-black safe-area-container">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-6"></div>
          <div className="loading-dots mb-4">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="text-gray-400 animate-float">Loading...</p>
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

  // const handleFacebookLogin = async () => {
  //   setErrors({});
  //   // Facebook OAuth doesn't work with static export
  //   setErrors({ general: 'Facebook login is not available in mobile app. Please use email/password.' });
  // };

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
      {/* Header - Fixed position with safe area top */}
      <div className="ml-2 sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
          <button
            onClick={handleBackToOnboarding}
            className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12"
            aria-label="Back to Onboarding"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-white">Sign In</h1>
          <div className="w-11 sm:w-12" />
        </div>
      </div>

      {/* Main Content - Scrollable with safe area padding */}
      <div className="flex-1 overflow-y-auto safe-area-horizontal">
        <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
              Welcome Back!
            </h2>
            <p className="text-sm sm:text-base text-muted">
              Sign in to access your aquatic paradise
            </p>
          </div>

          {/* Login Form */}
          <Card className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {errors.general && (
                <div className="p-3 sm:p-4 rounded-lg bg-error/10 border border-error/20 animate-shake">
                  <p className="text-error text-xs sm:text-sm leading-relaxed">
                    {errors.general}
                  </p>
                </div>
              )}

              <div className="space-y-4 sm:space-y-5">
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
                    className="absolute right-3 sm:right-4 top-9 sm:top-10 p-1 text-muted-dark hover:text-white active:scale-95 transition-all touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="w-full mt-6 sm:mt-8 h-12 sm:h-14 text-base sm:text-lg font-medium active:scale-98 transition-transform"
                size="lg"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            {/* <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-background text-muted">
                  or continue with
                </span>
              </div>
            </div> */}

            {/* Facebook Login Button */}
            {/* <Button
              onClick={handleFacebookLogin}
              loading={isLoading}
              disabled={isLoading}
              className="w-full bg-[#1877F2] hover:bg-[#166FE5] border-[#1877F2] text-white hover:text-white h-12 sm:h-14 active:scale-98 transition-transform"
              size="lg"
            >
              {isLoading ? (
                'Connecting...'
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm sm:text-base">Continue with Facebook</span>
                </div>
              )}
            </Button> */}
          </Card>

          {/* Footer Links with safe area bottom padding */}
          <div className="text-center pb-6 sm:pb-8 safe-area-inset-bottom">
            <p className="text-xs sm:text-sm text-muted">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/auth/register')}
                className="text-primary hover:underline font-medium active:opacity-80 transition-opacity touch-manipulation"
              >
                Sign Upa
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component with SafeAreaProvider
export default function LoginPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <LoginContent />
    </SafeAreaProvider>
  );
}