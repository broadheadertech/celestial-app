'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (attempted) return;

    setAttempted(true);

    // Get the current path
    const currentPath = window.location.pathname;

    // Check if we're on a dynamic route that should exist
    const dynamicRoutePatterns = [
      /^\/client\/product\/.+/,
      /^\/admin\/products\/.+/,
      /^\/admin\/reservations\/.+/,
    ];

    const isDynamicRoute = dynamicRoutePatterns.some(pattern => pattern.test(currentPath));

    if (isDynamicRoute) {
      // Force a hard reload to trigger proper client-side routing
      window.location.href = currentPath;
    } else if (currentPath !== '/404' && currentPath !== '/not-found') {
      // For other paths, try router navigation
      router.push(currentPath);
    }
  }, [router, attempted]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
        <p className="text-white font-medium">Loading...</p>
      </div>
    </div>
  );
}
