// ─── Supabase admin client (service role) ────────────────────────────────────
// ONLY use in API routes and server-side code.
// The service-role key bypasses RLS — never expose to the browser.
//
// IMPORTANT: Never use a Proxy wrapper around the Supabase client.
// Supabase methods rely on `this` binding internally; a Proxy breaks them.
// Always call getAdmin() and chain methods directly on the returned client.

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

// ─── Typed update payload ─────────────────────────────────────────────────────
export interface ProfileBillingUpdate {
  plan?:                   'free' | 'simple' | 'advanced';
  billing_status?:         'active' | 'inactive' | 'trial' | 'canceled' | 'past_due';
  stripe_customer_id?:     string | null;
  stripe_subscription_id?: string | null;
  access_expires_at?:      string | null;
  is_active?:              boolean;
}

// ─── updateProfileBilling (by user id) ───────────────────────────────────────
// Primary update path. Checks count to detect silent "0 rows updated" failures.
export async function updateProfileBilling(
  userId: string,
  updates: ProfileBillingUpdate,
): Promise<{ updated: boolean }> {
  console.log(`[supabase-admin] updateProfileBilling id=${userId}`, JSON.stringify(updates));

  const { error, count } = await getAdmin()
    .from('user_profiles')
    .update(updates, { count: 'exact' })
    .eq('id', userId);

  if (error) {
    console.error(`[supabase-admin] updateProfileBilling DB error for id=${userId}:`, error.message);
    throw new Error(`DB update failed for user ${userId}: ${error.message}`);
  }

  if (count === 0) {
    console.error(`[supabase-admin] USER NOT FOUND — updateProfileBilling matched 0 rows for id=${userId}`);
    return { updated: false };
  }

  console.log(`[supabase-admin] ✓ updated ${count} row(s) for id=${userId}`);
  return { updated: true };
}

// ─── updateProfileBillingByEmail (email fallback) ────────────────────────────
// Used when user_id is not available in webhook metadata (safety net).
export async function updateProfileBillingByEmail(
  email: string,
  updates: ProfileBillingUpdate,
): Promise<{ updated: boolean; userId: string | null }> {
  console.log(`[supabase-admin] updateProfileBillingByEmail email=${email}`, JSON.stringify(updates));

  // First find the user id so we can log it
  const { data: profile } = await getAdmin()
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    console.error(`[supabase-admin] USER NOT FOUND by email=${email}`);
    return { updated: false, userId: null };
  }

  const { error, count } = await getAdmin()
    .from('user_profiles')
    .update(updates, { count: 'exact' })
    .eq('email', email);

  if (error) {
    console.error(`[supabase-admin] updateProfileBillingByEmail DB error for email=${email}:`, error.message);
    throw new Error(`DB update by email failed: ${error.message}`);
  }

  if (count === 0) {
    console.error(`[supabase-admin] USER NOT FOUND — updateProfileBillingByEmail matched 0 rows for email=${email}`);
    return { updated: false, userId: null };
  }

  console.log(`[supabase-admin] ✓ updated by email=${email} id=${profile.id} rows=${count}`);
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
  if (error) { console.error('[supabase-admin] getProfileById error:', error); return null; }
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
  if (error) { console.error('[supabase-admin] getProfileByStripeCustomer error:', error); return null; }
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
  if (error) { console.error('[supabase-admin] getProfileByEmail error:', error); return null; }
  return data;
}
