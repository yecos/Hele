import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    // TODO: Fix all TypeScript errors and set this to false
    // Tracking: docs/bitacora.md BUG-001
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'tmdb.org',
      },
    ],
  },
};

export default nextConfig;
