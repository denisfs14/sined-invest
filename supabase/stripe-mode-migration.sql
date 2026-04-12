-- ─── SINED Invest — App Config Table ────────────────────────────────────────
-- Stores global application configuration flags.
-- SAFE: only key/value pairs — never stores secrets.
-- Run in Supabase SQL editor after admin-migration.sql.

create table if not exists app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Auto-update timestamp
create or replace function public.touch_app_config_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists app_config_updated_at on app_config;
create trigger app_config_updated_at
  before update on app_config
  for each row execute function public.touch_app_config_updated_at();

-- RLS: only admin users can read or write app_config
alter table app_config enable row level security;

drop policy if exists "admins_read_config"  on app_config;
drop policy if exists "admins_write_config" on app_config;

create policy "admins_read_config"
  on app_config for select
  using (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

create policy "admins_write_config"
  on app_config for all
  using (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- Seed default values
insert into app_config (key, value)
values ('stripe_mode', 'test')
on conflict (key) do nothing;

-- ─── Usage notes ──────────────────────────────────────────────────────────────
-- stripe_mode: 'test' | 'live'
--   Controls which set of Stripe env vars the server uses.
--   Keys are NEVER stored here — they live in Vercel environment variables:
--     STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE
--     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
--     STRIPE_WEBHOOK_SECRET_TEST / STRIPE_WEBHOOK_SECRET_LIVE
--     STRIPE_PRICE_SIMPLE_TEST  / STRIPE_PRICE_SIMPLE_LIVE
--     STRIPE_PRICE_ADVANCED_TEST / STRIPE_PRICE_ADVANCED_LIVE
