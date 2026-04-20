/**
 * Capacitor Router - Client-side routing handler for Capacitor apps
 * This script intercepts navigation and handles routing for static exports
 */

(function() {
  'use strict';

  // Only run in Capacitor environment
  if (typeof window === 'undefined') return;

  // Check if we're in Capacitor
  const isCapacitor = window.Capacitor !== undefined ||
                      window.location.protocol === 'capacitor:' ||
                      window.location.protocol === 'https:' && window.location.hostname === 'localhost';

  if (!isCapacitor) {
    console.log('[Router] Not in Capacitor environment, skipping');
    return;
  }

  console.log('[Capacitor Router] Initializing...');

  // Store original pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // Route mapping - maps URL patterns to their base HTML file
  const routeMap = {
    // Client routes
    '^/client/product/[^/]+/?$': '/client/product/',

    // Admin routes
    '^/admin/products/[^/]+/?$': '/admin/products/',
    '^/admin/reservations/[^/]+/?$': '/admin/reservations/',
    '^/admin/products/form\\?': '/admin/products/form/',

  };

  // Function to find matching route
  function findRoute(path) {
    for (const [pattern, basePath] of Object.entries(routeMap)) {
      const regex = new RegExp(pattern);
      if (regex.test(path)) {
        return basePath;
      }
    }
    return null;
  }

  // Store the current path for client components to read
  function storeRequestedPath(path) {
    try {
      sessionStorage.setItem('_capacitor_requested_path', path);
      sessionStorage.setItem('_capacitor_timestamp', Date.now().toString());
      console.log('[Router] Stored requested path:', path);
    } catch (e) {
      console.error('[Router] Failed to store path:', e);
    }
  }

  // Intercept history.pushState
  history.pushState = function(state, title, url) {
    console.log('[Router] pushState called:', url);

    if (url && typeof url === 'string') {
      const path = url.startsWith('/') ? url : new URL(url, window.location.href).pathname;
      const matchedRoute = findRoute(path);

      if (matchedRoute) {
        console.log('[Router] Matched route, storing path:', path);
        storeRequestedPath(path);
      }
    }

    return originalPushState.apply(this, arguments);
  };

  // Intercept history.replaceState
  history.replaceState = function(state, title, url) {
    console.log('[Router] replaceState called:', url);

    if (url && typeof url === 'string') {
      const path = url.startsWith('/') ? url : new URL(url, window.location.href).pathname;
      const matchedRoute = findRoute(path);

      if (matchedRoute) {
        console.log('[Router] Matched route, storing path:', path);
        storeRequestedPath(path);
      }
    }

    return originalReplaceState.apply(this, arguments);
  };

  // Handle initial page load
  window.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    console.log('[Router] DOMContentLoaded, current path:', currentPath);

    const matchedRoute = findRoute(currentPath);

    if (matchedRoute && currentPath !== matchedRoute) {
      console.log('[Router] Need to redirect from', currentPath, 'to', matchedRoute);
      storeRequestedPath(currentPath);

      // Give Next.js a moment to initialize
      setTimeout(function() {
        console.log('[Router] Executing redirect');
        window.location.href = matchedRoute;
      }, 100);
    }
  });

  // Listen for popstate (back/forward navigation)
  window.addEventListener('popstate', function(event) {
    console.log('[Router] popstate event:', window.location.pathname);
    const currentPath = window.location.pathname;
    const matchedRoute = findRoute(currentPath);

    if (matchedRoute && currentPath !== matchedRoute) {
      storeRequestedPath(currentPath);
    }
  });

  console.log('[Capacitor Router] Initialized successfully');
})();
