import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // NOTE: output:'export' removed — API routes are required for Stripe webhook + checkout.
  // Deploy to a Node.js host (Vercel, Railway, Render) not a static CDN.
  trailingSlash: true,
  images: { unoptimized: true },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default nextConfig;
