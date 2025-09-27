import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip linting during `next build` so we can produce mobile assets without refactoring
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Some typed routes still rely on incremental fixes; allow the build to proceed for Capacitor packaging
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => 'celestial-app-build',
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // For mobile/Expo compatibility
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  skipTrailingSlashRedirect: true,
  };

export default nextConfig;
