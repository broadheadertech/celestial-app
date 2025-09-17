import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Additional middleware logic if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow auth pages and API routes
        if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
          return true;
        }

        // Admin routes require admin role
        if (pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }

        // Control panel requires admin or super_admin role
        if (pathname.startsWith('/control_panel')) {
          return token?.role === 'admin' || token?.role === 'super_admin';
        }

        // Client dashboard requires authentication
        if (pathname.startsWith('/client/dashboard')) {
          return !!token;
        }

        // Allow all other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};