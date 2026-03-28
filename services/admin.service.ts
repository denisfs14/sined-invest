'use client';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/access-control';

export async function adminFetchUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function adminFetchUser(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

export async function adminUpdateUser(
  id: string,
  updates: Partial<Pick<UserProfile,
    'role' | 'plan' | 'billing_status' | 'is_active' |
    'manual_plan_override' | 'special_access' | 'access_expires_at' | 'notes'>>
): Promise<void> {
  const { error } = await supabase.from('user_profiles').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
  return data as UserProfile | null;
}

export interface AdminStats {
  total: number; active: number; inactive: number;
  free: number; simple: number; advanced: number;
  trial: number; specialAccess: number; admins: number;
}

export async function adminFetchStats(users: UserProfile[]): Promise<AdminStats> {
  return {
    total:         users.length,
    active:        users.filter(u => u.is_active).length,
    inactive:      users.filter(u => !u.is_active).length,
    free:          users.filter(u => u.plan === 'free').length,
    simple:        users.filter(u => u.plan === 'simple').length,
    advanced:      users.filter(u => u.plan === 'advanced').length,
    trial:         users.filter(u => u.billing_status === 'trial').length,
    specialAccess: users.filter(u => u.special_access).length,
    admins:        users.filter(u => u.role === 'admin').length,
  };
}
