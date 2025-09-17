import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log('Middleware check', {
          pathname: req.nextUrl.pathname,
          hasToken: !!token,
          tokenRole: token?.role,
          tokenProvider: token?.provider,
        });
        // Allow access to auth pages and API routes
        if (req.nextUrl.pathname.startsWith('/auth') ||
            req.nextUrl.pathname.startsWith('/api/auth')) {
          return true;
        }

        // For protected routes, check if user is authenticated
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }

        if (req.nextUrl.pathname.startsWith('/client/dashboard')) {
          return !!token;
        }

        // Allow access to public routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
