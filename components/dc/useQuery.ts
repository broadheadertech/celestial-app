'use client';

import { useSyncExternalStore } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';

const noopSubscribe = () => () => {};

/** false while React hydrates the prerendered HTML, true for every render after that. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Storefront version of Convex `useQuery`. Prerendered pages are exported with queries still
 * loading, but hydration runs in chunks and a query result can arrive over the websocket
 * in between; a component that then hydrates with data wouldn't match the static HTML
 * (React error #418). Reporting "loading" until hydration finishes keeps them identical.
 */
export const useQuery = ((...args: unknown[]) => {
  const result = (useConvexQuery as (...a: unknown[]) => unknown)(...args);
  return useHydrated() ? result : undefined;
}) as typeof useConvexQuery;
