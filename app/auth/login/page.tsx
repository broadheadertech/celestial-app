'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import AuthShell from '@/components/dc/kit/AuthShell';
import { EyeIcon, EyeOffIcon } from '@/components/dc/kit/icons';

// Login Content Component
function LoginContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { loginWithEmail } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Signed-in users go straight to their dashboard.
  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected) {
      // Associates land on the client app for now; their dedicated performance/KPI
      // view (e.g. /associate/dashboard) will replace this branch once it's built.
      const path = user.role === 'admin' || user.role === 'super_admin'
        ? '/admin/dashboard'
        : '/client/dashboard';
      setHasRedirected(true);
      router.push(path);
    }
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

  const handleBack = () => {
    // Return to where the user came from, or the storefront home when opened directly.
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <AuthShell
      title={<>Welcome<br />Back!</>}
      tagline="Sign in to access your aquatic paradise"
      onBack={handleBack}
      card={
        <>
          <h2>Sign in</h2>
          <p className="dk-sub">Welcome back, let&apos;s get you to the water.</p>
          <form onSubmit={handleSubmit} className="dk-auth-form">
            <div className="dk-field">
              <label htmlFor="l-email">Email <span className="dk-req">*</span></label>
              <input
                id="l-email"
                className="dk-input"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                aria-invalid={!!errors.email || undefined}
                aria-describedby={errors.email ? 'l-email-err' : undefined}
                required
              />
              {errors.email && <p id="l-email-err" className="dk-err">{errors.email}</p>}
            </div>

            <div className="dk-field">
              <div className="dk-lbl-row">
                <label htmlFor="l-pass">Password <span className="dk-req">*</span></label>
                <button type="button" onClick={() => router.push('/auth/forgot_password')}>Forgot Password?</button>
              </div>
              <div className="dk-pw-wrap">
                <input
                  id="l-pass"
                  className="dk-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  aria-invalid={!!errors.password || undefined}
                  aria-describedby={errors.password ? 'l-pass-err' : undefined}
                  required
                />
                <button
                  type="button"
                  className="dk-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && <p id="l-pass-err" className="dk-err">{errors.password}</p>}
            </div>

            {errors.general && <p className="dk-form-msg" role="alert">{errors.general}</p>}

            <button type="submit" className="dk-btn dk-btn-red" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <hr className="dk-auth-divider" />
        </>
      }
      below={
        <p className="dk-auth-alt">
          Don&apos;t have an account? <Link href="/auth/register">Sign Up</Link>
        </p>
      }
    />
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