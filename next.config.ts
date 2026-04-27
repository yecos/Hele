import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests for development preview
  allowedDevOrigins: [
    '*.space.z.ai',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/seed/**',
      },
    ],
  },
  // Serverless-compatible settings for Vercel
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
