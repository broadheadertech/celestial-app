import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  eslint: {
    // Lint errors now fail the build (warnings don't). Next only lints app/pages/components/lib/src
    // by default, so list every source directory explicitly.
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "lib", "hooks", "store", "convex"],
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
