// ─── Supabase admin client (service role) ────────────────────────────────────
// ONLY use in API routes and server-side code.
// The service-role key bypasses RLS — never expose to the browser.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — required for webhook DB writes');
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export interface ProfileBillingUpdate {
  plan?:                   'free' | 'simple' | 'advanced';
  billing_status?:         'active' | 'inactive' | 'trial' | 'canceled' | 'past_due';
  stripe_customer_id?:     string | null;
  stripe_subscription_id?: string | null;
  access_expires_at?:      string | null;
  is_active?:              boolean;
}

// ─── updateProfileBilling (by user id) ───────────────────────────────────────
// Returns { updated: true } when no DB error occurred.
// NOTE: we do NOT rely on `count` because Supabase JS v2 returns count=null
// unless the PostgREST server is specifically configured to return count headers.
// Instead: no error = success. A separate SELECT verifies the row exists.
export async function updateProfileBilling(
  userId: string,
  updates: ProfileBillingUpdate,
): Promise<{ updated: boolean }> {
  console.log(`[db] updateProfileBilling id=${userId}`, JSON.stringify(updates));

  // Verify the row actually exists before updating
  const { data: existing } = await getAdmin()
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    console.error(`[db] USER NOT FOUND — no user_profiles row for id=${userId}`);
    return { updated: false };
  }

  const { error } = await getAdmin()
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error(`[db] updateProfileBilling FAILED for id=${userId}:`, error.message, error.details);
    throw new Error(`DB update failed for user ${userId}: ${error.message}`);
  }

  console.log(`[db] ✓ updateProfileBilling success for id=${userId} plan=${updates.plan} status=${updates.billing_status}`);
  return { updated: true };
}

// ─── updateProfileBillingByEmail (email fallback) ────────────────────────────
export async function updateProfileBillingByEmail(
  email: string,
  updates: ProfileBillingUpdate,
): Promise<{ updated: boolean; userId: string | null }> {
  console.log(`[db] updateProfileBillingByEmail email=${email}`, JSON.stringify(updates));

  const { data: profile } = await getAdmin()
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    console.error(`[db] USER NOT FOUND by email=${email}`);
    return { updated: false, userId: null };
  }

  const { error } = await getAdmin()
    .from('user_profiles')
    .update(updates)
    .eq('email', email);

  if (error) {
    console.error(`[db] updateProfileBillingByEmail FAILED for email=${email}:`, error.message);
    throw new Error(`DB update by email failed: ${error.message}`);
  }

  console.log(`[db] ✓ updateProfileBillingByEmail success email=${email} id=${profile.id} plan=${updates.plan}`);
  return { updated: true, userId: profile.id };
}

// ─── getProfileById ───────────────────────────────────────────────────────────
export async function getProfileById(
  userId: string,
): Promise<{ id: string; plan: string; billing_status: string; stripe_customer_id: string | null; manual_plan_override: boolean; special_access: boolean; role: string } | null> {
  const { data, error } = await getAdmin()
    .from('user_profiles')
    .select('id, plan, billing_status, stripe_customer_id, manual_plan_override, special_access, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) { console.error('[db] getProfileById error:', error.message); return null; }
  return data;
}

// ─── getProfileByStripeCustomer ───────────────────────────────────────────────
export async function getProfileByStripeCustomer(
  customerId: string,
): Promise<{ id: string; plan: string; email: string | null; manual_plan_override: boolean; special_access: boolean; role: string } | null> {
  const { data, error } = await getAdmin()
    .from('user_profiles')
    .select('id, plan, email, manual_plan_override, special_access, role')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) { console.error('[db] getProfileByStripeCustomer error:', error.message); return null; }
  return data;
}

// ─── getProfileByEmail ────────────────────────────────────────────────────────
export async function getProfileByEmail(
  email: string,
): Promise<{ id: string; plan: string; stripe_customer_id: string | null; manual_plan_override: boolean; special_access: boolean; role: string } | null> {
  const { data, error } = await getAdmin()
    .from('user_profiles')
    .select('id, plan, stripe_customer_id, manual_plan_override, special_access, role')
    .eq('email', email)
    .maybeSingle();
  if (error) { console.error('[db] getProfileByEmail error:', error.message); return null; }
  return data;
}

// ─── extractStripeId ──────────────────────────────────────────────────────────
// Safely extract a string ID from a Stripe field that may be string | object | null.
// session.subscription is typed as string | Stripe.Subscription | null in SDK v5+.
// If Stripe returns an expanded object, we extract .id from it.
export function extractStripeId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return (value as { id: string }).id;
  }
  console.warn('[db] extractStripeId: unexpected value type:', typeof value);
  return null;
}
