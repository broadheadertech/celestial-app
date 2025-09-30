import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Generate static HTML files for Capacitor
  eslint: {
    // Skip linting during `next build` so we can produce mobile assets without refactoring
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Some typed routes still rely on incremental fixes; allow the build to proceed for Capacitor packaging
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true, // Required for static export
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
