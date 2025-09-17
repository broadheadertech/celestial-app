"use client";

import { useSession, signIn, signOut, getSession } from 'next-auth/react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { RegisterData, User } from '@/types';
import type { Session } from 'next-auth';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convexClient = new ConvexHttpClient(convexUrl);

type Role = User['role'];

interface SessionUserFields {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
  facebookId?: string;
  profilePicture?: string;
  loginMethod?: 'email' | 'facebook';
  createdAt?: number;
  updatedAt?: number;
}

type ExtendedSession = Session & {
  user?: SessionUserFields;
  userId?: string;
  facebookId?: string;
  role?: Role;
  loginMethod?: 'email' | 'facebook';
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export function useAuth() {
  const { data: session, status } = useSession();
  const login = useAuthStore((state) => state.login);
  const initializeGuestSession = useAuthStore((state) => state.initializeGuestSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  // Sync NextAuth session with auth store
  useEffect(() => {
    if (status === 'loading') return;

    const extendedSession = session as ExtendedSession | null;

    if (extendedSession?.user && extendedSession.userId) {
      // Check if user is already logged in to prevent infinite loop
      if (!user || user._id !== extendedSession.userId) {
        const sessionUser = extendedSession.user;
        const sessionUserId = extendedSession.userId || sessionUser.id;

        if (!sessionUserId) {
          console.warn('Session user missing identifier, skipping sync');
          return;
        }

        const syncedUser: User = {
          _id: sessionUserId,
          email:
            sessionUser.email ||
            `facebook_${extendedSession.facebookId ?? sessionUser.id ?? 'user'}@facebook.local`,
          firstName:
            sessionUser.firstName ||
            (sessionUser.name ? sessionUser.name.split(' ')[0] : undefined) ||
            'Facebook',
          lastName:
            sessionUser.lastName ||
            (sessionUser.name ? sessionUser.name.split(' ').slice(1).join(' ') : undefined) ||
            'User',
          role: sessionUser.role || 'client',
          isActive: sessionUser.isActive ?? true,
          facebookId: extendedSession.facebookId || sessionUser.facebookId || undefined,
          profilePicture: sessionUser.profilePicture || sessionUser.image || undefined,
          loginMethod: sessionUser.loginMethod || 'facebook',
          createdAt: sessionUser.createdAt ?? Date.now(),
          updatedAt: sessionUser.updatedAt ?? Date.now(),
        };

        login(syncedUser);
      }
    } else if (!session && !user) {
      // No NextAuth session and no user - initialize guest session if not already done
      if (!isAuthenticated) {
        console.log('No session, initializing guest session');
        initializeGuestSession();
      }
    }
  }, [session, status, login, initializeGuestSession, user, isAuthenticated]);

  const loginWithFacebook = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Starting Facebook login...');

      // Simple Facebook login with automatic redirect
      const result = await signIn('facebook', {
        callbackUrl: '/client/dashboard'
      });

      if (result?.error) {
        console.error('Facebook login failed:', result.error);
        throw new Error('Facebook login failed');
      }

      return result;
    } catch (error) {
      console.error('Facebook login error:', error);
      setLoading(false);
      throw error;
    }
    // Don't set loading to false here as redirect should happen
  }, [setLoading]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);

      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      const sessionResult = (await getSession()) as ExtendedSession | null;

      if (!sessionResult?.role || !sessionResult.user) {
        throw new Error('Unable to determine user session');
      }

      const redirectPath = sessionResult.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
      router.push(redirectPath);

      return sessionResult;
    } catch (error) {
      console.error('Email login error:', error);
      throw error instanceof Error ? error : new Error('Login failed');
    } finally {
      setLoading(false);
    }
  }, [setLoading, router]);

  const registerWithEmail = useCallback(async (data: RegisterData & { password: string }) => {
    try {
      setLoading(true);

      const result = await convexClient.mutation(api.services.auth.register, {
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim(),
        role: 'client',
      });

      if (!result?.success || !result.user) {
        throw new Error(result?.message || 'Registration failed');
      }

      const signInResult = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      router.push('/client/dashboard');

      return result.user as User;
    } catch (error) {
      console.error('Registration error:', error);
      throw error instanceof Error ? error : new Error('Registration failed');
    } finally {
      setLoading(false);
    }
  }, [setLoading, router]);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await signOut({ callbackUrl: '/', redirect: false });
      logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, logout, router]);

  return {
    // NextAuth state
    session,
    sessionStatus: status,
    isNextAuthLoading: status === 'loading',

    // Combined auth state
    user,
    isAuthenticated,
    isLoading: isLoading || status === 'loading',

    // Auth methods
    loginWithFacebook,
    loginWithEmail,
    registerWithEmail,
    logout: handleLogout,

    // Auth store methods
    setLoading,
    initializeGuestSession,
  };
}
