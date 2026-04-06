"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Give time for providers to initialize
    const timer = setTimeout(() => {
      setIsReady(true);
      router.replace("/auth/login");
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Dragon Cave Inventory...</p>
        </div>
      </div>
    );
  }

  return null;
}
