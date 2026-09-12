'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ConvexProvider as ConvexReactProvider, ConvexReactClient } from 'convex/react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Validate Convex URL
if (!CONVEX_URL || CONVEX_URL === '') {
  console.error('CRITICAL ERROR: NEXT_PUBLIC_CONVEX_URL is not set!');
  console.error('Please check your .env.local file and ensure NEXT_PUBLIC_CONVEX_URL is properly configured.');
}

const convex = new ConvexReactClient(CONVEX_URL || '');
// Separate client for minting auth tokens, so token fetches never wait on the auth they provide.
const tokenClient = new ConvexHttpClient(CONVEX_URL || 'https://invalid.convex.cloud');

let authedToken: string | undefined;

/**
 * Keeps the Convex client's auth in step with the session token in the auth store.
 * The backend identifies callers from these JWTs (convex/lib/authz.ts), not from args.
 */
function syncConvexAuth(sessionToken: string | undefined) {
  if (sessionToken === authedToken) return;
  const previous = authedToken;
  authedToken = sessionToken;

  // Revoke the old server session on logout or account switch.
  if (previous) {
    tokenClient.mutation(api.services.session.logout, { sessionToken: previous }).catch(() => {});
  }

  if (!sessionToken) {
    convex.clearAuth();
    return;
  }

  convex.setAuth(async () => {
    try {
      const jwt = await tokenClient.action(api.services.session.issueToken, { sessionToken });
      if (jwt === null && useAuthStore.getState().sessionToken === sessionToken) {
        // Session expired, revoked, or the account was deactivated.
        useAuthStore.getState().logout();
      }
      return jwt;
    } catch {
      return null; // network trouble: stay signed in locally, retry on next fetch
    }
  });
}

interface ConvexProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Logins from before server sessions existed have a user but no token — sign them out.
    const state = useAuthStore.getState();
    if (state.user && !state.sessionToken) state.logout();

    // Set auth before any page renders a query, then follow login/logout.
    syncConvexAuth(useAuthStore.getState().sessionToken);
    const unsubscribe = useAuthStore.subscribe((s) => syncConvexAuth(s.sessionToken));

    // Give Convex client time to initialize
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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
