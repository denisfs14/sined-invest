-- ─── SINED Invest — Admin & User Profiles ────────────────────────────────────
-- Run in Supabase SQL editor.

create table if not exists user_profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  full_name              text,
  email                  text,
  role                   text not null default 'user' check (role in ('user','admin')),
  plan                   text not null default 'free'  check (plan in ('free','simple','advanced')),
  billing_status         text not null default 'inactive' check (billing_status in ('active','inactive','trial','canceled','past_due')),
  is_active              boolean not null default true,
  manual_plan_override   boolean not null default false,
  special_access         boolean not null default false,
  access_expires_at      timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles for each row execute function public.touch_updated_at();

alter table user_profiles enable row level security;

drop policy if exists "users_read_own"         on user_profiles;
drop policy if exists "users_update_own_safe"  on user_profiles;
drop policy if exists "admins_read_all"         on user_profiles;
drop policy if exists "admins_update_all"       on user_profiles;

create policy "users_read_own"        on user_profiles for select using (auth.uid() = id);
create policy "users_update_own_safe" on user_profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins_read_all"       on user_profiles for select using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.role = 'admin'));
create policy "admins_update_all"     on user_profiles for update using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.role = 'admin'));

-- Backfill existing users
insert into user_profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1))
from auth.users on conflict (id) do nothing;

-- To make yourself admin:
--   update user_profiles set role = 'admin' where email = 'your@email.com';
