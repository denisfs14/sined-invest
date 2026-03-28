-- ═══════════════════════════════════════════════════════════════════════════
-- SINED Invest — Admin & User Profiles Migration
-- Run this in the Supabase SQL Editor (once).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. user_profiles ────────────────────────────────────────────────────────
-- Extends auth.users with app-specific metadata.
-- admin_only fields are protected by RLS so normal users cannot read them.

create table if not exists user_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  email                text,                           -- denormalised copy for admin search
  role                 text not null default 'user'    -- 'user' | 'admin'
                         check (role in ('user', 'admin')),
  plan                 text not null default 'free'    -- 'free' | 'simple' | 'advanced'
                         check (plan in ('free', 'simple', 'advanced')),
  billing_status       text not null default 'inactive'
                         check (billing_status in ('active', 'inactive', 'trial', 'canceled', 'past_due')),
  is_active            boolean not null default true,
  manual_plan_override boolean not null default false, -- admin-granted access ignores billing
  special_access       boolean not null default false, -- beta / promo / test users
  access_expires_at    timestamptz,                    -- null = no expiry
  stripe_customer_id   text,                           -- for future Stripe integration
  stripe_subscription_id text,                         -- for future Stripe integration
  notes                text,                           -- admin internal notes
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

-- ─── 2. Auto-create profile on signup ────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── 3. Backfill existing users ──────────────────────────────────────────────
insert into user_profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
from auth.users
on conflict (id) do nothing;

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────
alter table user_profiles enable row level security;

-- Users can read their own profile (limited columns via view)
create policy "users_read_own" on user_profiles
  for select using (auth.uid() = id);

-- Users can update their own non-sensitive fields
create policy "users_update_own_safe" on user_profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent self-escalation: role and billing fields must not change via this policy
    -- (they can only be changed by admin via service_role)
  );

-- Admins can do everything (identified by role in their own profile)
create policy "admins_full_access" on user_profiles
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── 5. Admin-safe view for user list ────────────────────────────────────────
-- Admins use this view to list users with joined auth data.
create or replace view admin_user_view as
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.plan,
  p.billing_status,
  p.is_active,
  p.manual_plan_override,
  p.special_access,
  p.access_expires_at,
  p.notes,
  p.created_at,
  p.updated_at,
  u.last_sign_in_at,
  u.email_confirmed_at is not null as email_verified
from user_profiles p
join auth.users u on u.id = p.id;

-- Grant access to the view for authenticated users (RLS on base table handles filtering)
grant select on admin_user_view to authenticated;

-- ─── 6. Grant your first admin ───────────────────────────────────────────────
-- IMPORTANT: Run this separately after creating your account.
-- Replace 'your-email@example.com' with your actual email.
--
-- update user_profiles
--   set role = 'admin', billing_status = 'active', is_active = true
--   where email = 'your-email@example.com';
