-- ─── SINED Invest — Stripe Webhook Migration ─────────────────────────────────
-- Run AFTER admin-migration.sql in the Supabase SQL editor.
-- This enables the webhook handler to update user_profiles without RLS conflicts.

-- ── 1. Service-role bypass for webhook ────────────────────────────────────────
-- The Stripe webhook uses the service-role key which bypasses RLS by default.
-- No additional policy needed — supabaseAdmin client already has full access.
-- This comment is intentional: do NOT add "update any user" as an anon policy.

-- ── 2. Idempotency table — prevent duplicate webhook processing ───────────────
-- Stripe may deliver webhooks more than once. This table prevents duplicate updates.
create table if not exists stripe_webhook_events (
  id         text primary key,    -- Stripe event ID (evt_xxx)
  type       text not null,
  processed_at timestamptz not null default now()
);

-- Auto-clean events older than 30 days (keep table small)
create or replace function clean_old_webhook_events()
returns void language plpgsql as $$
begin
  delete from stripe_webhook_events where processed_at < now() - interval '30 days';
end;
$$;

-- ── 3. Index for fast customer lookup ─────────────────────────────────────────
-- The webhook looks up users by stripe_customer_id frequently
create index if not exists user_profiles_stripe_customer_idx
  on user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ── 4. Index for subscription lookup ─────────────────────────────────────────
create index if not exists user_profiles_stripe_sub_idx
  on user_profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ── 5. Verify columns exist (they should from admin-migration.sql) ────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'user_profiles' and column_name = 'stripe_customer_id'
  ) then
    alter table user_profiles add column stripe_customer_id text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'user_profiles' and column_name = 'stripe_subscription_id'
  ) then
    alter table user_profiles add column stripe_subscription_id text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'user_profiles' and column_name = 'access_expires_at'
  ) then
    alter table user_profiles add column access_expires_at timestamptz;
  end if;
end;
$$;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- After running this, configure your Stripe dashboard:
-- 1. Webhooks → Add endpoint → https://your-domain.com/api/stripe/webhook
-- 2. Select events: checkout.session.completed, invoice.payment_succeeded,
--    invoice.payment_failed, customer.subscription.updated,
--    customer.subscription.deleted
-- 3. Copy the signing secret → set as STRIPE_WEBHOOK_SECRET env var
