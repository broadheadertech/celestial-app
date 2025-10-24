"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import SafeAreaProvider, { useSafeArea } from '@/components/provider/SafeAreaProvider';

// Reset Password Content Component
function ResetPasswordContent() {
  const router = useRouter();
  const { isMobileApp } = useSafeArea();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const resetPassword = useMutation(api.services.auth.resetPassword);
  
  // Verify token on component mount
  const tokenVerification = useQuery(
    api.services.auth.verifyResetToken,
    token ? { token } : "skip"
  );

  useEffect(() => {
    if (tokenVerification) {
      setTokenValid(tokenVerification.valid);
      if (tokenVerification.valid && tokenVerification.email) {
        setUserEmail(tokenVerification.email);
      } else if (!tokenVerification.valid) {
        setError(tokenVerification.message || "Invalid or expired reset token");
      }
    }
  }, [tokenVerification]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!token) {
        throw new Error("Invalid reset token");
      }

      const validationError = validatePassword(password);
      if (validationError) {
        throw new Error(validationError);
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      await resetPassword({ token, newPassword: password });
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength();

  // Loading state while verifying token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted">Verifying reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
        <div className="sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
            <button
              onClick={() => router.push("/auth/forgot_password")}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12"
              aria-label="Back to Forgot Password"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Invalid Token</h1>
            <div className="w-11 sm:w-12" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto safe-area-horizontal">
          <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full min-h-full flex items-center">
            <div className="w-full">
              <div className="glass-morphism rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-error/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-error" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
                  Invalid or Expired Link
                </h2>
                <p className="text-sm sm:text-base text-muted text-center mb-6">
                  {error || "This password reset link is invalid or has expired. Please request a new one."}
                </p>

                <button
                  onClick={() => router.push("/auth/forgot_password")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/50 active:scale-98 touch-manipulation"
                >
                  Request New Reset Link
                </button>
              </div>

              <div className="pb-6 safe-area-inset-bottom"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
        {/* Header - Fixed position with safe area top */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12"
              aria-label="Go to Login"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Success</h1>
            <div className="w-11 sm:w-12" />
          </div>
        </div>

        {/* Main Content - Scrollable with safe area padding */}
        <div className="flex-1 overflow-y-auto safe-area-horizontal">
          <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full min-h-full flex items-center">
            <div className="w-full">
              <div className="glass-morphism rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center animate-pulse-ring">
                    <CheckCircle className="w-12 h-12 text-success" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
                  Password Reset Successfully
                </h2>
                <p className="text-sm sm:text-base text-muted text-center mb-6 sm:mb-8">
                  Your password has been changed. Redirecting to login...
                </p>

                <button
                  onClick={() => router.push("/auth/login")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/50 active:scale-98 touch-manipulation"
                >
                  Continue to Login
                </button>
              </div>

              <div className="pb-6 safe-area-inset-bottom"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
      {/* Header - Fixed position with safe area top */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-background to-background-dark/95 backdrop-blur-sm border-b border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 safe-area-horizontal">
          <button
            onClick={() => router.push("/auth/forgot_password")}
            className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 group"
            aria-label="Back to Forgot Password"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-white">Reset Password</h1>
          <div className="w-11 sm:w-12" />
        </div>
      </div>

      {/* Main Content - Scrollable with safe area padding */}
      <div className="flex-1 overflow-y-auto safe-area-horizontal">
        <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full">
          <div className="glass-morphism rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Reset Your Password
              </h2>
              <p className="text-sm sm:text-base text-muted mb-2">
                Enter your new password below
              </p>
              {userEmail && (
                <p className="text-xs sm:text-sm text-primary font-medium">
                  {userEmail}
                </p>
              )}
            </div>

            <div className="space-y-5 sm:space-y-6">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-dark" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-secondary border border-white/10 text-foreground placeholder-muted-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-dark hover:text-muted transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-dark hover:text-muted transition-colors" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Bar */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength
                              ? passwordStrength <= 2
                                ? "bg-error"
                                : passwordStrength <= 3
                                ? "bg-warning"
                                : "bg-success"
                              : "bg-secondary"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted">
                      {passwordStrength <= 2 && "Weak password"}
                      {passwordStrength === 3 && "Medium password"}
                      {passwordStrength >= 4 && "Strong password"}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-dark" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-secondary border border-white/10 text-foreground placeholder-muted-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-dark hover:text-muted transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-dark hover:text-muted transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-secondary/50 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground font-semibold">Password requirements:</p>
                </div>
                <ul className="text-xs text-muted space-y-1.5 ml-6">
                  <li className={`flex items-center gap-2 transition-colors ${password.length >= 8 ? "text-success" : ""}`}>
                    <span className={password.length >= 8 ? "text-success" : "text-muted-dark"}>
                      {password.length >= 8 ? "✓" : "○"}
                    </span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 transition-colors ${/[A-Z]/.test(password) ? "text-success" : ""}`}>
                    <span className={/[A-Z]/.test(password) ? "text-success" : "text-muted-dark"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"}
                    </span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 transition-colors ${/[a-z]/.test(password) ? "text-success" : ""}`}>
                    <span className={/[a-z]/.test(password) ? "text-success" : "text-muted-dark"}>
                      {/[a-z]/.test(password) ? "✓" : "○"}
                    </span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 transition-colors ${/[0-9]/.test(password) ? "text-success" : ""}`}>
                    <span className={/[0-9]/.test(password) ? "text-success" : "text-muted-dark"}>
                      {/[0-9]/.test(password) ? "✓" : "○"}
                    </span>
                    One number
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-error">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !token}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-primary/50 active:scale-98 touch-manipulation"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </div>
          </div>

          {/* Bottom spacing for safe area */}
          <div className="pb-6 safe-area-inset-bottom"></div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component with SafeAreaProvider
export default function ResetPasswordPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ResetPasswordContent />
    </SafeAreaProvider>
  );
}