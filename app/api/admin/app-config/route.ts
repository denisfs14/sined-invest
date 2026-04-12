// ─── app/api/admin/app-config/route.ts ───────────────────────────────────────
// GET  /api/admin/app-config?key=stripe_mode  → { key, value }
// POST /api/admin/app-config                  body: { key, value }  → { ok: true }
//
// Admin-only: the Supabase RLS policy on app_config already enforces this,
// but we also validate the session on the server to prevent leaking error shapes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAdminSupabase() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, svcKey, { auth: { persistSession: false } });
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function isAdminUser(userId: string): Promise<boolean> {
  const admin = await getAdminSupabase();
  const { data } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key param required' }, { status: 400 });

  const admin = await getAdminSupabase();
  const { data, error } = await admin
    .from('app_config')
    .select('key, value, updated_at')
    .eq('key', key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ key, value: null });

  return NextResponse.json(data);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.key || body?.value === undefined) {
    return NextResponse.json({ error: 'body must contain key and value' }, { status: 400 });
  }

  // Validate allowed keys + values to prevent arbitrary writes
  const ALLOWED: Record<string, string[]> = {
    stripe_mode: ['test', 'live'],
  };

  if (!ALLOWED[body.key]) {
    return NextResponse.json({ error: `Unknown config key: ${body.key}` }, { status: 400 });
  }
  if (!ALLOWED[body.key].includes(body.value)) {
    return NextResponse.json({ error: `Invalid value for ${body.key}: ${body.value}` }, { status: 400 });
  }

  const admin = await getAdminSupabase();
  const { error } = await admin
    .from('app_config')
    .upsert({ key: body.key, value: body.value, updated_by: userId }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  console.log(`[app-config] Admin ${userId} set ${body.key} = ${body.value}`);
  return NextResponse.json({ ok: true, key: body.key, value: body.value });
}
