'use client';

import { useAuth } from '@/hooks/useAuth';

export function AuthInitializer() {
  // This hook handles all the authentication logic
  useAuth();

  return null; // This component doesn't render anything
}