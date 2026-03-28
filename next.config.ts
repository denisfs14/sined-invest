import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // NOTE: output:'export' removed — API routes are required for Stripe webhook + checkout.
  // Deploy to a Node.js host (Vercel, Railway, Render) not a static CDN.
  //
  // trailingSlash: true  ← REMOVED. This caused HTTP 308 redirects on API routes.
  // Stripe POSTs to /api/stripe/webhook (no slash). With trailingSlash:true, Next.js
  // redirected that to /api/stripe/webhook/ with a 308 — Stripe does not follow
  // POST redirects, so the webhook was never delivered and user plans never updated.
  images: { unoptimized: true },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default nextConfig;
