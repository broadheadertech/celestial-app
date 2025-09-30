"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // For static export with Capacitor, redirect directly to login
    // The AuthInitializer will handle authentication state
    router.replace("/auth/login");
  }, [router]);

  // Return null - no loading screen
  return null;
}
