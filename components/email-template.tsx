/**
 * Legacy Email Template Component
 * 
 * NOTE: This component is kept for reference but is NOT actively used.
 * The actual email templates used in production are:
 * - components/emails/PasswordResetEmail.tsx
 * - components/emails/WelcomeEmail.tsx
 * 
 * These templates are rendered to HTML strings in convex/services/email.ts
 * and sent via Convex Actions (not Next.js API routes, due to static export).
 */

import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export function EmailTemplate({ firstName }: EmailTemplateProps) {
  return (
    <div>
      <h1>Welcome, {firstName}!</h1>
    </div>
  );
}