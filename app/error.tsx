'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConvexError } from 'convex/values';
import { useAuthStore } from '@/store/auth';

/** Recognizes the auth failures thrown by convex/lib/authz.ts. */
function authErrorCode(error: Error): 'UNAUTHENTICATED' | 'FORBIDDEN' | null {
  if (error instanceof ConvexError) {
    const code = (error.data as { code?: string } | undefined)?.code;
    if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') return code;
  }
  // Fallback for errors that lost their class on the way here.
  const msg = error.message || '';
  if (msg.includes('UNAUTHENTICATED') || msg.includes('Please sign in')) return 'UNAUTHENTICATED';
  if (msg.includes('FORBIDDEN') || msg.includes("don't have permission")) return 'FORBIDDEN';
  return null;
}

/**
 * App-wide error boundary. A page whose data needs a signed-in (or staff) user sends the
 * visitor to the login page instead of showing a crash screen.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const code = authErrorCode(error);

  useEffect(() => {
    if (!code) {
      console.error(error);
      return;
    }
    // A stale or revoked session: clear it so the login page starts clean.
    if (code === 'UNAUTHENTICATED') useAuthStore.getState().logout();
    router.replace('/auth/login');
  }, [code, error, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 16px',
        textAlign: 'center',
        fontFamily: "'Geist', system-ui, sans-serif",
      }}
    >
      {code ? (
        <p style={{ fontSize: 14, opacity: 0.7 }}>Redirecting to sign in…</p>
      ) : (
        <>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong loading this page.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={reset} className="b b-primary">
              Try again
            </button>
            <button type="button" onClick={() => router.replace('/')} className="b">
              Go home
            </button>
          </div>
        </>
      )}
    </div>
  );
}
