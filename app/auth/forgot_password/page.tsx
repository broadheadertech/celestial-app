'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isValidEmail } from '@/lib/utils';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import AuthShell from '@/components/dc/kit/AuthShell';

// Forgot Password Content Component — same split layout as Sign in / Register (AuthShell).
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
      // Convex wraps server errors as "[Request ID: …] Server Error\nUncaught Error: <message>\n at …".
      const raw = error instanceof Error ? error.message : '';
      const message = raw.match(/Uncaught (?:Convex)?Error: ([^\n]+)/)?.[1]?.trim() || 'Failed to send reset email. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <AuthShell
      title={<>Forgot<br />Password?</>}
      tagline="No worries! We'll send you a reset link."
      onBack={handleBackToLogin}
      card={
        emailSent ? (
          <>
            <h2>Check your email</h2>
            <p className="dk-sub">We&apos;ve sent a password reset link to:</p>
            <p className="dk-sent-to">{email}</p>
            <div className="dk-alert" style={{ marginTop: 20 }}>
              <strong style={{ color: 'var(--dk-black)' }}>Next steps</strong>
              <ol className="dk-steps-list">
                <li>Open your email inbox</li>
                <li>Look for an email from &quot;Dragon Cave Inventory&quot;</li>
                <li>Click the &quot;Reset Your Password&quot; button</li>
                <li>You&apos;ll be redirected to create a new password</li>
              </ol>
            </div>
            <p className="dk-hint" style={{ marginTop: 14 }}>
              <strong>Didn&apos;t receive the email?</strong> Check your spam folder or wait a few minutes.
              The reset link will expire in 1 hour for security purposes.
            </p>
            <div className="dk-auth-form">
              <button
                type="button"
                className="dk-btn dk-btn-red"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setError('');
                }}
              >
                Send Another Email
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Reset password</h2>
            <p className="dk-sub">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="dk-auth-form" noValidate>
              <div className="dk-field">
                <label htmlFor="fp-email">Email Address <span className="dk-req">*</span></label>
                <input
                  id="fp-email"
                  className="dk-input"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'fp-email-err' : undefined}
                  required
                />
                {error && <p id="fp-email-err" className="dk-err" role="alert">{error}</p>}
              </div>

              <button type="submit" className="dk-btn dk-btn-red" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )
      }
      below={
        <p className="dk-auth-alt">
          Remember your password? <Link href="/auth/login">Back to Login</Link>
        </p>
      }
    />
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
