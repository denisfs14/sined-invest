'use client';
import { supabase } from '@/lib/supabase/client';

export interface UserProfile {
  id:                   string;
  full_name:            string;
  email:                string;
  role:                 'user' | 'admin';
  plan:                 'free' | 'simple' | 'advanced';
  billing_status:       'active' | 'inactive' | 'trial' | 'canceled' | 'past_due';
  is_active:            boolean;
  manual_plan_override: boolean;
  special_access:       boolean;
  access_expires_at:    string | null;
  notes:                string | null;
  created_at:           string;
  updated_at:           string;
  last_sign_in_at:      string | null;
  email_verified:       boolean;
}

// ─── Access helpers ────────────────────────────────────────────────────────
export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.role === 'admin';
}

export function hasActiveAccess(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.manual_plan_override || profile.special_access) return true;
  if (profile.access_expires_at && new Date(profile.access_expires_at) < new Date()) return false;
  return profile.billing_status === 'active' || profile.billing_status === 'trial';
}

export function canAccessPlan(profile: UserProfile | null, requiredPlan: 'free' | 'simple' | 'advanced'): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  if (profile.special_access || profile.manual_plan_override) return true;
  if (!hasActiveAccess(profile)) return requiredPlan === 'free';
  const rank = { free: 0, simple: 1, advanced: 2 };
  return rank[profile.plan] >= rank[requiredPlan];
}

export function canManageAdmin(profile: UserProfile | null): boolean {
  return isAdmin(profile);
}

// ─── Get current user profile ─────────────────────────────────────────────
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

// ─── Admin: list all users ────────────────────────────────────────────────
export async function adminListUsers(search?: string): Promise<UserProfile[]> {
  let query = supabase
    .from('admin_user_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as UserProfile[];
}

// ─── Admin: get single user ───────────────────────────────────────────────
export async function adminGetUser(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('admin_user_view')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserProfile | null;
}

// ─── Admin: update user profile ───────────────────────────────────────────
export type AdminUpdatePayload = Partial<Pick<UserProfile,
  'role' | 'plan' | 'billing_status' | 'is_active' |
  'manual_plan_override' | 'special_access' | 'access_expires_at' | 'notes'
>>;

export async function adminUpdateUser(userId: string, updates: AdminUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);

  // Sync plan to user_metadata so the app reads it immediately
  if (updates.plan) {
    await supabase.auth.admin?.updateUserById?.(userId, {
      user_metadata: { plan: updates.plan },
    });
  }
}

// ─── Admin: stats ─────────────────────────────────────────────────────────
export interface AdminStats {
  total:         number;
  active:        number;
  free:          number;
  simple:        number;
  advanced:      number;
  inactive:      number;
  trial:         number;
  specialAccess: number;
}

export async function adminGetStats(): Promise<AdminStats> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('plan, billing_status, is_active, special_access');
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    total:         rows.length,
    active:        rows.filter(r => r.is_active && (r.billing_status === 'active' || r.billing_status === 'trial')).length,
    free:          rows.filter(r => r.plan === 'free').length,
    simple:        rows.filter(r => r.plan === 'simple').length,
    advanced:      rows.filter(r => r.plan === 'advanced').length,
    inactive:      rows.filter(r => !r.is_active || r.billing_status === 'inactive').length,
    trial:         rows.filter(r => r.billing_status === 'trial').length,
    specialAccess: rows.filter(r => r.special_access).length,
  };
}
