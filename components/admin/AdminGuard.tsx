'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';

const STAFF_ROLES = ['admin', 'super_admin'];

/**
 * Blocks /admin/* for anyone who isn't an active admin or super admin.
 *
 * Access is decided by `session.me`, which the server resolves from the verified session
 * JWT — nothing in localStorage can fake it. Nothing under the guard (sidebar, top bar,
 * page) renders until the check passes. This is the UX layer; the Convex functions
 * enforce the same rule themselves.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, sessionToken, logout, updateUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Static export: the first client render must match the build-time HTML (no user).
  useEffect(() => setMounted(true), []);

  const me = useQuery(api.services.session.me, mounted && sessionToken ? {} : 'skip');

  const status: 'checking' | 'allowed' | 'guest' | 'forbidden' = !mounted
    ? 'checking'
    : !user || !sessionToken
      ? 'guest'
      : me === undefined
        ? 'checking'
        : me === null
          ? 'guest' // session revoked/expired, or account deactivated
          : STAFF_ROLES.includes(me.role)
            ? 'allowed'
            : 'forbidden';

  useEffect(() => {
    if (status === 'guest') {
      if (user) logout();
      router.replace('/auth/login');
    } else if (status === 'forbidden') {
      router.replace('/');
    }
  }, [status, user, logout, router]);

  // Keep the cached role in sync if it was changed server-side.
  useEffect(() => {
    if (me && user && me.role !== user.role) {
      updateUser({ role: me.role });
    }
  }, [me, user, updateUser]);

  if (status !== 'allowed') {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ background: 'var(--bg)', color: 'var(--ink-3)' }}
      >
        {status === 'checking' ? 'Checking access…' : 'Redirecting…'}
      </div>
    );
  }

  return <>{children}</>;
}
