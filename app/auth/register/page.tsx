'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import AuthShell from '@/components/dc/kit/AuthShell';
import { CheckIcon, CrossIcon, EyeIcon, EyeOffIcon } from '@/components/dc/kit/icons';
import { isValidEmail, isValidPhone, validatePassword } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

function RegisterContent() {
  const router = useRouter();
  const { registerWithEmail } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = validatePassword(formData.password);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setErrors({});
    setIsSubmitting(true);

    try {
      await registerWithEmail({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const field = (
    id: keyof FormData,
    label: string,
    input: React.InputHTMLAttributes<HTMLInputElement>,
    toggle?: { shown: boolean; onToggle: () => void },
  ) => (
    <div className="dk-field">
      <label htmlFor={`r-${id}`}>{label} <span className="dk-req">*</span></label>
      <div className={toggle ? 'dk-pw-wrap' : undefined}>
        <input
          id={`r-${id}`}
          className="dk-input"
          value={formData[id]}
          onChange={(e) => handleInputChange(id, e.target.value)}
          aria-invalid={!!errors[id] || undefined}
          aria-describedby={errors[id] ? `r-${id}-err` : undefined}
          required
          {...input}
        />
        {toggle && (
          <button
            type="button"
            className="dk-pw-toggle"
            onClick={toggle.onToggle}
            aria-label={toggle.shown ? 'Hide password' : 'Show password'}
            aria-pressed={toggle.shown}
          >
            {toggle.shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {errors[id] && <p id={`r-${id}-err`} className="dk-err">{errors[id]}</p>}
    </div>
  );

  return (
    <AuthShell
      register
      title={<>Join Dragon<br />Cave</>}
      tagline={currentStep === 1 ? 'Tell us about yourself' : 'Create your secure password'}
      onBack={() => (window.history.length > 1 ? router.back() : router.push('/'))}
      card={
        <>
          <div className="dk-reg-head">
            <h2>Create account</h2>
            <div className="dk-stepper" aria-label={`Step ${currentStep} of 2`}>
              {currentStep === 2 ? (
                <button type="button" className="on" onClick={handleBack} aria-label="Back to step 1">1</button>
              ) : (
                <span className="on" aria-current="step">1</span>
              )}
              <i aria-hidden="true" />
              <span className={currentStep === 2 ? 'on' : undefined} aria-current={currentStep === 2 ? 'step' : undefined}>2</span>
            </div>
          </div>
          <p className="dk-sub">Welcome back, let&apos;s get you to the water.</p>

          <form onSubmit={currentStep === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="dk-auth-form">
            {currentStep === 1 && (
              <fieldset>
                <legend className="sr-only">About you</legend>
                <div className="dk-two">
                  {field('firstName', 'First name', { placeholder: 'Juan', autoComplete: 'given-name' })}
                  {field('lastName', 'Last name', { placeholder: 'Dela cruz', autoComplete: 'family-name' })}
                </div>
                {field('email', 'Email', { type: 'email', placeholder: 'Juan@example.com', autoComplete: 'email' })}
                {field('phone', 'Phone number', { type: 'tel', placeholder: '+63 or 09 followed by 9 digits', autoComplete: 'tel' })}
              </fieldset>
            )}

            {currentStep === 2 && (
              <fieldset>
                <legend className="sr-only">Password</legend>
                {field(
                  'password',
                  'Password',
                  { type: showPassword ? 'text' : 'password', placeholder: 'At least 8 characters', autoComplete: 'new-password' },
                  { shown: showPassword, onToggle: () => setShowPassword(!showPassword) },
                )}

                {/* Password Requirements */}
                {formData.password && (
                  <ul className="dk-req-list" aria-label="Password Requirements">
                    {[
                      { check: formData.password.length >= 8, text: 'At least 8 characters' },
                      { check: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
                      { check: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
                      { check: /\d/.test(formData.password), text: 'One number' },
                    ].map((requirement, index) => (
                      <li key={index} className={requirement.check ? 'ok' : undefined}>
                        {requirement.check ? <CheckIcon /> : <CrossIcon />}
                        {requirement.text}
                      </li>
                    ))}
                  </ul>
                )}

                {field(
                  'confirmPassword',
                  'Confirm password',
                  { type: showConfirmPassword ? 'text' : 'password', placeholder: 'Repeat your password', autoComplete: 'new-password' },
                  { shown: showConfirmPassword, onToggle: () => setShowConfirmPassword(!showConfirmPassword) },
                )}
              </fieldset>
            )}

            {errors.general && <p className="dk-form-msg" role="alert">{errors.general}</p>}

            {currentStep === 1 ? (
              <button type="submit" className="dk-btn dk-btn-red">Continue</button>
            ) : (
              <button type="submit" className="dk-btn dk-btn-red" disabled={isSubmitting || !passwordValidation.isValid} aria-busy={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </form>
        </>
      }
      below={
        <p className="dk-auth-alt">
          Already have an account? <Link href="/auth/login">Sign In</Link>
        </p>
      }
    />
  );
}

// Main Export with SafeAreaProvider
export default function RegisterPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <RegisterContent />
    </SafeAreaProvider>
  );
}