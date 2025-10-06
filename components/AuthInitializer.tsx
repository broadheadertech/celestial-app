"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function AuthInitializer() {
  const { initializeGuestSession, user } = useAuthStore();

  // Initialize guest session if no user is logged in
  useEffect(() => {
    if (!user) {
      initializeGuestSession();
    }
  }, [user, initializeGuestSession]);

  return null; // This component doesn't render anything
}
