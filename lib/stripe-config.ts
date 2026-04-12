// ─── lib/stripe-config.ts ────────────────────────────────────────────────────
// SERVER-SIDE ONLY — never import this in 'use client' files.
// Reads stripe_mode from app_config and returns the correct Stripe credentials
// for that environment.  Keys come from Vercel env vars — never from the DB.

import { createClient } from '@supabase/supabase-js';

export type StripeMode = 'test' | 'live';

export interface StripeConfig {
  mode:              StripeMode;
  secretKey:         string;
  publishableKey:    string;
  webhookSecret:     string;
  priceIdSimple:     string;
  priceIdAdvanced:   string;
}

// ─── Read current mode from DB ────────────────────────────────────────────────
// Uses the Supabase service-role key so it bypasses RLS (this is server-only).
async function readStripeModeFromDB(): Promise<StripeMode> {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !svcKey) {
    console.warn('[stripe-config] SUPABASE_SERVICE_ROLE_KEY missing — defaulting to test mode');
    return 'test';
  }

  const admin = createClient(url, svcKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'stripe_mode')
    .maybeSingle();

  if (error || !data) {
    console.warn('[stripe-config] Failed to read stripe_mode from DB — defaulting to test:', error?.message);
    return 'test';
  }

  return data.value === 'live' ? 'live' : 'test';
}

// ─── Build config for a given mode ───────────────────────────────────────────
function buildConfig(mode: StripeMode): StripeConfig {
  const suffix = mode === 'live' ? 'LIVE' : 'TEST';

  const secretKey       = process.env[`STRIPE_SECRET_KEY_${suffix}`]         ?? '';
  const publishableKey  = process.env[`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_${suffix}`] ?? '';
  const webhookSecret   = process.env[`STRIPE_WEBHOOK_SECRET_${suffix}`]     ?? '';
  const priceIdSimple   = process.env[`STRIPE_PRICE_SIMPLE_${suffix}`]       ?? '';
  const priceIdAdvanced = process.env[`STRIPE_PRICE_ADVANCED_${suffix}`]     ?? '';

  if (!secretKey) {
    console.error(`[stripe-config] STRIPE_SECRET_KEY_${suffix} is not set in environment variables`);
  }

  return { mode, secretKey, publishableKey, webhookSecret, priceIdSimple, priceIdAdvanced };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns Stripe config based on current stripe_mode in app_config table. */
export async function getStripeConfig(): Promise<StripeConfig> {
  const mode = await readStripeModeFromDB();
  return buildConfig(mode);
}

/** Returns Stripe config for a given mode without hitting the DB. */
export function getStripeConfigForMode(mode: StripeMode): StripeConfig {
  return buildConfig(mode);
}
