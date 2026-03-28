// ─── Supabase admin client (service role) — lazy singleton ───────────────────
// ONLY use in API routes and server-side code.
// The service-role key bypasses RLS — never expose to the browser.
// Lazy: throws only at call time (not build time) if env vars are missing.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to server-side env vars.');
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

// Proxy so callers write `supabaseAdmin.from(...)` naturally
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getAdmin() as unknown as Record<string, unknown>)[prop as string];
  },
});

// ─── Typed helpers ────────────────────────────────────────────────────────────
export interface ProfileBillingUpdate {
  plan?:                   'free' | 'simple' | 'advanced';
  billing_status?:         'active' | 'inactive' | 'trial' | 'canceled' | 'past_due';
  stripe_customer_id?:     string | null;
  stripe_subscription_id?: string | null;
  access_expires_at?:      string | null;
  is_active?:              boolean;
}

export async function updateProfileBilling(
  userId: string,
  updates: ProfileBillingUpdate,
): Promise<void> {
  const { error } = await getAdmin()
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);
  if (error) {
    console.error('[supabase-admin] updateProfileBilling error:', error);
    throw error;
  }
}

export async function getProfileByStripeCustomer(
  customerId: string,
): Promise<{ id: string; plan: string; manual_plan_override: boolean; special_access: boolean; role: string } | null> {
  const { data, error } = await getAdmin()
    .from('user_profiles')
    .select('id, plan, manual_plan_override, special_access, role')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) { console.error('[supabase-admin] getProfileByStripeCustomer error:', error); return null; }
  return data;
}

export async function getProfileByEmail(
  email: string,
): Promise<{ id: string; stripe_customer_id: string | null } | null> {
  const { data, error } = await getAdmin()
    .from('user_profiles')
    .select('id, stripe_customer_id')
    .eq('email', email)
    .maybeSingle();
  if (error) return null;
  return data;
}
