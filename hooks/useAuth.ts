"use client";

import { useSession, signIn, signOut } from 'next-auth/react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { RegisterData, User } from '@/types';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function useAuth() {
  const { data: session, status } = useSession();
  const {
    login,
    logout,
    setLoading,
    initializeGuestSession,
    user,
    isAuthenticated,
    isLoading
  } = useAuthStore();
  const router = useRouter();

  // Sync NextAuth session with Zustand store
  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      const sessionUser = session.user as any;

      // Create user object for Zustand store
      const storeUser: User = {
        _id: sessionUser.id,
        email: sessionUser.email!,
        firstName: sessionUser.firstName || sessionUser.name?.split(' ')[0] || 'User',
        lastName: sessionUser.lastName || sessionUser.name?.split(' ').slice(1).join(' ') || '',
        role: sessionUser.role || 'client',
        isActive: true,
        loginMethod: 'facebook',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (!user || user._id !== sessionUser.id) {
        login(storeUser);
      }
    } else if (status === 'unauthenticated') {
      if (user) {
        logout();
      }
      initializeGuestSession();
    }
  }, [session, status, user, login, logout, initializeGuestSession]);

  const loginWithFacebook = useCallback(async () => {
    try {
      setLoading(true);
      const result = await signIn('facebook', {
        callbackUrl: '/client/dashboard',
      });
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
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
        throw new Error('Invalid email or password');
      }

      // Wait for session to update
      setTimeout(() => {
        const role = (session?.user as any)?.role;
        const redirectPath = role === 'admin' ? '/admin/dashboard' :
                           role === 'super_admin' ? '/control_panel' :
                           '/client/dashboard';
        router.push(redirectPath);
      }, 100);

      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [setLoading, router, session]);

  const registerWithEmail = useCallback(async (data: RegisterData & { password: string }) => {
    try {
      setLoading(true);

      const result = await convex.mutation(api.services.auth.register, {
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim(),
        role: 'client',
      });

      if (!result?.success) {
        throw new Error(result?.message || 'Registration failed');
      }

      // Auto-login after registration
      await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      router.push('/client/dashboard');
      return result.user as User;
    } catch (error) {
      setLoading(false);
      throw error;
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

    // Store methods
    setLoading,
    initializeGuestSession,
  };
}