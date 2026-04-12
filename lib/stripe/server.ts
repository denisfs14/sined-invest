// ─── Stripe server SDK — lazy singleton ──────────────────────────────────────
// ONLY import this in server components and API route handlers.
// Never import in 'use client' files — STRIPE_SECRET_KEY must stay server-side.
//
// Lazy initialization: the Stripe client is created on first call, not at module
// load time. This allows the Next.js build to succeed even when STRIPE_SECRET_KEY
// is not set in the build environment (it only needs to be set at runtime).

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to your environment variables.');
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  return _stripe;
}

// ─── Plan / price helpers ─────────────────────────────────────────────────────
export type BillingPlan = 'simple' | 'advanced';

export function getPriceId(plan: BillingPlan, yearly = false): string {
  if (yearly) {
    const key = plan === 'simple'
      ? process.env.STRIPE_PRICE_SIMPLE_YEARLY
      : process.env.STRIPE_PRICE_ADVANCED_YEARLY;
    if (key) return key;
  }
  const key = plan === 'simple'
    ? process.env.STRIPE_PRICE_SIMPLE
    : process.env.STRIPE_PRICE_ADVANCED;
  if (!key) {
    throw new Error(`Price ID not configured for plan: ${plan}. Set STRIPE_PRICE_${plan.toUpperCase()} in env.`);
  }
  return key;
}

export function planFromPriceId(priceId: string): BillingPlan | null {
  if (priceId === process.env.STRIPE_PRICE_SIMPLE ||
      priceId === process.env.STRIPE_PRICE_SIMPLE_YEARLY) {
    return 'simple';
  }
  if (priceId === process.env.STRIPE_PRICE_ADVANCED ||
      priceId === process.env.STRIPE_PRICE_ADVANCED_YEARLY) {
    return 'advanced';
  }
  return null;
}
