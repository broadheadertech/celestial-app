'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ConvexProvider as ConvexReactProvider, ConvexReactClient } from 'convex/react';
import { ConvexHttpClient } from 'convex/browser';
import { usePathname } from 'next/navigation';
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

// Wire auth at module load in the browser — before any component renders or subscribes to a
// query — so pages never fire a request without the signed-in user's token. The auth store
// rehydrates from localStorage synchronously when it's created, so its state is ready here.
if (typeof window !== 'undefined') {
  const state = useAuthStore.getState();
  // Logins from before server sessions existed have a user but no token — sign them out.
  if (state.user && !state.sessionToken) state.logout();
  syncConvexAuth(useAuthStore.getState().sessionToken);
  useAuthStore.subscribe((s) => syncConvexAuth(s.sessionToken));
}

/**
 * Public storefront pages render immediately (so the exported HTML has real content for
 * first paint and search engines). They don't read persisted state during render. All other
 * routes (admin, client app, auth, account, checkout) wait for mount, because they read
 * localStorage-backed stores while rendering and would otherwise mismatch on hydration.
 */
const PUBLIC_PATHS = new Set(['/', '/catalog', '/cave', '/shop', '/visit', '/contact', '/about', '/journal', '/journal/article', '/specimen-detail', '/track']);

interface ConvexProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  const pathname = usePathname();
  const normalized = (pathname || '/').replace(/\/+$/, '') || '/';
  // /specimen/<slug> is rewritten (vercel.json) to the prerendered /specimen-detail page, so it
  // must be treated the same or the first client render won't match the static HTML.
  const isPublic = PUBLIC_PATHS.has(normalized) || normalized.startsWith('/specimen/');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => setIsReady(true), []);

  // Show loading until mounted (non-public routes only)
  if (!isReady && !isPublic) {
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
