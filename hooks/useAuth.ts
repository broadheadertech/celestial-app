"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { RegisterData, User } from "@/types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function useAuth() {
  const {
    login,
    logout,
    setLoading,
    initializeGuestSession,
    user,
    isAuthenticated,
    isLoading,
  } = useAuthStore();
  const router = useRouter();

  // Initialize guest session on mount if not authenticated
  useEffect(() => {
    if (!user && !isAuthenticated) {
      initializeGuestSession();
    }
  }, [user, isAuthenticated, initializeGuestSession]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);

        const result = await convex.mutation(api.services.auth.login, {
          email: email.toLowerCase(),
          password,
        });

        if (!result?.success || !result.user) {
          throw new Error(result?.message || "Invalid email or password");
        }

        login(result.user);
        setLoading(false);
        return result;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, login],
  );

  const registerWithEmail = useCallback(
    async (data: RegisterData & { password: string }) => {
      try {
        setLoading(true);

        const result = await convex.mutation(api.services.auth.register, {
          email: data.email.toLowerCase(),
          password: data.password,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim(),
          role: "client",
        });

        if (!result?.success) {
          throw new Error(result?.message || "Registration failed");
        }

        // Auto-login after registration
        if (result.user) {
          login(result.user);
          router.push("/client/dashboard");
        }

        setLoading(false);
        return result.user as User;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, login, router],
  );

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, logout, router]);

  return {
    // Combined auth state
    user,
    isAuthenticated,
    isLoading,

    // Auth methods
    loginWithEmail,
    registerWithEmail,
    logout: handleLogout,

    // Store methods
    setLoading,
    initializeGuestSession,
  };
}
