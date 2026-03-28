# SINED Invest

**Investment portfolio intelligence — Know what to buy next.**

A full-stack SaaS investment management platform built with Next.js, Supabase, and TypeScript. Features a recommendation engine that calculates what, how much, and how many shares to buy on each contribution.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Market Data | brapi.dev (prices), Yahoo Finance via proxy (dividends) |
| Deployment | Static export → any static host (SiteGround, Vercel, etc.) |

---

## Project Structure

```
/app
  /(app)/          — authenticated app pages
    dashboard/     — main dashboard with KPIs and buy window
    portfolio/     — asset management + P&L table
    contribution/  — recommendation engine
    dividends/     — dividend calendar
    operations/    — buy/sell/cash management
    strategy/      — engine configuration per class
    history/       — simulation history
    settings/      — account & security
  /auth/           — login, signup, reset-password, update-password
  /legal/          — terms, privacy, risk disclosure
  /methodology/    — how the engine works (public page)
  /onboarding/     — first-time user flow

/components
  /layout/         — AppShell, Sidebar (desktop + mobile)
  /modals/         — AssetModal, DividendModal, ImportModal
  /ui/             — design system (Button, Card, Modal, StatCard, etc.)
  /ui/PlanGate.tsx — plan gating (Free/Pro/Elite), UpgradeBanner, PlanBadge
  BestBuyWindow.tsx
  RecommendationDisplay.tsx

/lib
  app-context.tsx          — global React context + all actions
  plans.ts                 — plan/feature gating (Stripe-ready)
  /calculations/
    recommendation-engine.ts  — core buy engine
    dividend-calendar.ts      — contribution window logic
  /supabase/client.ts
  demo-data.ts

/services
  supabase.service.ts      — all Supabase DB operations
  auth.service.ts          — authentication helpers
  price-sync.service.ts    — brapi + Yahoo Finance sync
  brapi.service.ts         — brapi.dev client

/hooks
  useDebounce.ts
  useLocalStorage.ts
  useMediaQuery.ts

/types/index.ts            — all TypeScript interfaces
/utils/format.ts           — formatCurrency, formatDate, etc.
/middleware.ts             — route protection via Supabase SSR
```

---

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_BRAPI_TOKEN=your-brapi-token-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up Supabase

Create these tables in Supabase (SQL Editor):

```sql
-- Core tables (apply RLS policy to each)
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text default 'Carteira Principal',
  created_at timestamptz default now()
);

create table asset_classes (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade,
  name text not null,
  target_percentage numeric default 0,
  contribution_percentage numeric default 0,
  top_n int default 1
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade,
  asset_class_id uuid references asset_classes,
  ticker text not null,
  name text,
  current_price numeric default 0,
  target_percentage numeric default 0,
  max_percentage numeric default 15,
  is_red boolean default false,
  active boolean default true
);

create table holdings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets on delete cascade unique,
  quantity numeric default 0,
  avg_price numeric default 0
);

create table strategy_settings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade unique,
  top_n int default 3,
  max_percentage numeric default 15,
  prioritize_red boolean default true,
  fallback_to_lowest boolean default true,
  round_shares boolean default true,
  contribution_timing_mode text default 'after_last_payment'
);

create table purchase_simulations (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade,
  total_amount numeric,
  leftover numeric default 0,
  created_at timestamptz default now()
);

create table purchase_simulation_items (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid references purchase_simulations on delete cascade,
  asset_id uuid references assets,
  allocated_amount numeric,
  quantity numeric,
  leftover numeric default 0
);

create table dividend_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets on delete cascade,
  portfolio_id uuid references portfolios on delete cascade,
  ex_date date,
  payment_date date,
  expected_amount numeric default 0,
  received_amount numeric default 0,
  status text default 'expected'
);

create table operations (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade,
  asset_id uuid references assets on delete cascade,
  type text not null,
  status text default 'executed',
  quantity numeric not null,
  unit_price numeric not null,
  total_value numeric not null,
  executed_at timestamptz default now(),
  created_at timestamptz default now()
);

create table cash_balance (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade unique,
  amount numeric default 0,
  updated_at timestamptz default now()
);

create table cash_events (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios on delete cascade,
  type text not null,
  amount numeric not null,
  description text,
  created_at timestamptz default now()
);

-- RLS: enable on all tables and create owner policy
-- Replace 'table_name' with each table name above
alter table portfolios enable row level security;
create policy "owner" on portfolios for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- For tables with portfolio_id:
alter table asset_classes enable row level security;
create policy "owner" on asset_classes for all
  using (portfolio_id in (select id from portfolios where user_id = auth.uid()))
  with check (portfolio_id in (select id from portfolios where user_id = auth.uid()));

-- Repeat for: assets, strategy_settings, purchase_simulations,
-- dividend_events, operations, cash_balance, cash_events

-- For holdings (linked via assets):
alter table holdings enable row level security;
create policy "owner" on holdings for all
  using (asset_id in (
    select a.id from assets a
    join portfolios p on p.id = a.portfolio_id
    where p.user_id = auth.uid()
  ))
  with check (asset_id in (
    select a.id from assets a
    join portfolios p on p.id = a.portfolio_id
    where p.user_id = auth.uid()
  ));

-- purchase_simulation_items (linked via simulations):
alter table purchase_simulation_items enable row level security;
create policy "owner" on purchase_simulation_items for all
  using (simulation_id in (
    select id from purchase_simulations
    where portfolio_id in (select id from portfolios where user_id = auth.uid())
  ));
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Build for Production

```bash
npm run build
```

Output goes to `/out` — static files ready to upload.

### Deploy to SiteGround / Apache

1. `npm run build`
2. Upload contents of `/out` to subdomain root
3. The `.htaccess` file (auto-generated) handles SPA routing

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `NEXT_PUBLIC_BRAPI_TOKEN` | ✅ | brapi.dev token (free tier = prices only) |
| `NEXT_PUBLIC_APP_URL` | Optional | Full app URL |
| `NEXT_PUBLIC_APP_NAME` | Optional | App display name |

---

## Plan System (Monetization-Ready)

Plans are defined in `lib/plans.ts`. All users are `free` by default.

**To gate a feature:**
```tsx
import { PlanGate } from '@/components/ui/PlanGate';
<PlanGate feature="export:reports">
  <ExportButton />
</PlanGate>
```

**To integrate Stripe:** update `getUserPlan()` in `lib/plans.ts` to check a `subscriptions` table.

**Defined plans:** Free · Pro (R$29/mês) · Elite (R$79/mês)

---

## Key Routes

| Route | Auth | Description |
|---|---|---|
| `/dashboard` | ✅ | KPIs, buy window, red assets, last recommendation |
| `/portfolio` | ✅ | Assets, P&L, import from Status Invest |
| `/contribution` | ✅ | Recommendation engine |
| `/dividends` | ✅ | Dividend calendar + auto-sync |
| `/operations` | ✅ | Register buys/sells, cash balance |
| `/strategy` | ✅ | Configure engine, classes, danger zone |
| `/settings` | ✅ | Password, plan, delete account |
| `/methodology` | Public | How the engine works |
| `/legal/terms` | Public | Terms of Use |
| `/legal/privacy` | Public | Privacy Policy |
| `/legal/risk` | Public | Risk Disclosure |
| `/onboarding` | ✅ | First-time user flow |

---

## License

Proprietary — SINED Technologies LLC. All rights reserved.
