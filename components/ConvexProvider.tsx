'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ConvexProvider as ConvexReactProvider, ConvexReactClient } from 'convex/react';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Validate Convex URL
if (!CONVEX_URL || CONVEX_URL === '') {
  console.error('CRITICAL ERROR: NEXT_PUBLIC_CONVEX_URL is not set!');
  console.error('Please check your .env.local file and ensure NEXT_PUBLIC_CONVEX_URL is properly configured.');
}

const convex = new ConvexReactClient(CONVEX_URL || '');

interface ConvexProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Give Convex client time to initialize
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while Convex initializes
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error if URL is missing
  if (!CONVEX_URL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-red-500 text-xl font-bold mb-2">Configuration Error</h2>
            <p className="text-white mb-4">
              The Convex URL is not configured. Please contact the administrator.
            </p>
            <p className="text-white/60 text-sm">
              Error: NEXT_PUBLIC_CONVEX_URL is missing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConvexReactProvider client={convex}>
      {children}
    </ConvexReactProvider>
  );
}
