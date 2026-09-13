import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  eslint: {
    // Many legacy lint errors remain (no-explicit-any etc.); run `npm run lint` separately.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors now fail the build.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
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
    dangerouslyAllowSVG: true,
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
