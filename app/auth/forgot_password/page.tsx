'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { isValidEmail } from '@/lib/utils';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

// Forgot Password Content Component
function ForgotPasswordContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const requestPasswordReset = useMutation(api.services.auth.requestPasswordReset);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    } else if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset({ email: email.toLowerCase() });
      
      if (result.success) {
        setEmailSent(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  // Success state
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
        {/* Header */}
        <div className="ml-2 sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
            <button
              onClick={handleBackToLogin}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12"
              aria-label="Back to Login"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Reset Password</h1>
            <div className="w-11 sm:w-12" />
          </div>
        </div>

        {/* Success Content */}
        <div className="flex-1 overflow-y-auto safe-area-horizontal">
          <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full">
            <div className="text-center mb-8 sm:mb-10">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-float">
                  <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Check Your Email 📧
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed mb-4">
                We&apos;ve sent a password reset link to:
              </p>
              <p className="text-base sm:text-lg text-white font-medium mb-6 break-all">
                {email}
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  <strong className="text-white">Next steps:</strong><br />
                  1. Open your email inbox<br />
                  2. Look for an email from &quot;Celestial Drakon Aquatics&quot;<br />
                  3. Click the &quot;Reset Your Password&quot; button<br />
                  4. You&apos;ll be redirected to create a new password
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted-dark">
                <strong>Didn&apos;t receive the email?</strong> Check your spam folder or wait a few minutes.
              </p>
            </div>

            <Card className="mb-6">
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setError('');
                  }}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-medium bg-primary hover:bg-primary/90 text-white rounded-lg transition-all active:scale-98 touch-manipulation"
                >
                  Send Another Email
                </button>
                
                <button
                  onClick={handleBackToLogin}
                  className="w-full text-sm sm:text-base text-primary hover:text-primary/80 font-medium transition-colors touch-manipulation active:opacity-80"
                >
                  Back to Login
                </button>
              </div>
            </Card>

            <div className="text-center pb-6 sm:pb-8 safe-area-inset-bottom">
              <p className="text-xs sm:text-sm text-muted-dark">
                ⏰ The reset link will expire in 1 hour for security purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
      {/* Header - Fixed position with safe area top */}
      <div className="ml-2 sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
          <button
            onClick={handleBackToLogin}
            className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12"
            aria-label="Back to Login"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-white">Reset Password</h1>
          <div className="w-11 sm:w-12" />
        </div>
      </div>

      {/* Main Content - Scrollable with safe area padding */}
      <div className="flex-1 overflow-y-auto safe-area-horizontal">
        <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
              Forgot Password?
            </h2>
            <p className="text-sm sm:text-base text-muted">
              No worries! Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {/* Reset Form */}
          <Card className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {error && (
                <div className="p-3 sm:p-4 rounded-lg bg-error/10 border border-error/20 animate-shake">
                  <p className="text-error text-xs sm:text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (error) setError('');
                }}
                error={error}
                required
              />

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="w-full mt-6 sm:mt-8 h-12 sm:h-14 text-base sm:text-lg font-medium active:scale-98 transition-transform"
                size="lg"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </Card>

          {/* Footer Links with safe area bottom padding */}
          <div className="text-center pb-6 sm:pb-8 safe-area-inset-bottom">
            <p className="text-xs sm:text-sm text-muted">
              Remember your password?{' '}
              <button
                onClick={handleBackToLogin}
                className="text-primary hover:underline font-medium active:opacity-80 transition-opacity touch-manipulation"
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component with SafeAreaProvider
export default function ForgotPasswordPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ForgotPasswordContent />
    </SafeAreaProvider>
  );
}
