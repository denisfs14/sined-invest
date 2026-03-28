// ─── SINED Invest — Centralized Access Control ────────────────────────────────
// Single source of truth for all access decisions.
// Import these helpers instead of scattering access logic across components.

export interface UserProfile {
  id:                    string;
  full_name:             string | null;
  email:                 string | null;
  role:                  'user' | 'admin';
  plan:                  'free' | 'simple' | 'advanced';
  billing_status:        'active' | 'inactive' | 'trial' | 'canceled' | 'past_due';
  is_active:             boolean;
  manual_plan_override:  boolean;
  special_access:        boolean;
  access_expires_at:     string | null;
  stripe_customer_id:    string | null;
  stripe_subscription_id:string | null;
  notes:                 string | null;
  created_at:            string;
  updated_at:            string;
}

// ─── Role checks ──────────────────────────────────────────────────────────────
export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.role === 'admin';
}

export function canManageAdmin(profile: UserProfile | null): boolean {
  return isAdmin(profile);
}

// ─── Access checks ────────────────────────────────────────────────────────────
// A user has active access when:
// 1. They are admin (always full access)
// 2. They have a paid billing status (active or trial)
// 3. They have manual_plan_override = true
// 4. They have special_access = true
// 5. Their access_expires_at is in the future (or null = no expiry)
export function hasActiveAccess(profile: UserProfile | null): boolean {
  if (!profile)               return false;
  if (!profile.is_active)     return false;
  if (isAdmin(profile))       return true;
  if (profile.special_access) return true;
  if (profile.manual_plan_override) return true;

  // Check expiry
  if (profile.access_expires_at) {
    if (new Date(profile.access_expires_at) < new Date()) return false;
  }

  return ['active', 'trial'].includes(profile.billing_status);
}

// ─── Plan access ──────────────────────────────────────────────────────────────
export function canAccessPlan(
  profile: UserProfile | null,
  requiredPlan: 'free' | 'simple' | 'advanced'
): boolean {
  if (!profile || !profile.is_active) return false;
  if (isAdmin(profile))               return true;
  if (profile.special_access)         return true;
  if (profile.manual_plan_override)   return true;

  const rank: Record<string, number> = { free: 0, simple: 1, advanced: 2 };
  return rank[profile.plan] >= rank[requiredPlan];
}

// ─── Plan display ─────────────────────────────────────────────────────────────
export function getEffectivePlan(
  profile: UserProfile | null
): 'free' | 'simple' | 'advanced' {
  if (!profile)               return 'free';
  if (isAdmin(profile))       return 'advanced';
  if (profile.special_access) return 'advanced';
  if (!profile.is_active)     return 'free';
  return profile.plan;
}

// ─── Billing status helpers ───────────────────────────────────────────────────
export function getBillingStatusLabel(status: UserProfile['billing_status']): string {
  const labels: Record<UserProfile['billing_status'], string> = {
    active:   'Active',
    inactive: 'Inactive',
    trial:    'Trial',
    canceled: 'Canceled',
    past_due: 'Past Due',
  };
  return labels[status] ?? status;
}

export function getBillingStatusColor(status: UserProfile['billing_status']): string {
  const colors: Record<UserProfile['billing_status'], string> = {
    active:   '#059669',
    inactive: '#94A3B8',
    trial:    '#1748c0',
    canceled: '#DC2626',
    past_due: '#D97706',
  };
  return colors[status] ?? '#94A3B8';
}
