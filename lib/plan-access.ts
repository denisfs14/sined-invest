// ─── Plan Access — SINED Invest ──────────────────────────────────────────────
// Centralized feature gating logic.
// Import this wherever you need to check feature access.
//
// Usage:
//   import { hasAccess } from '@/lib/plan-access';
//   if (hasAccess(plan, 'advanced_mode')) { ... }

import { Plan, UserPlan } from '@/types/plan';

// ─── Feature registry ─────────────────────────────────────────────────────────
// Maps feature key → minimum plan required.
// Keep all feature keys here — never scatter gate logic across components.
export const FEATURES = {
  // Available to all (ungated)
  dashboard_basic:       null,
  prices_realtime:       null,

  // Simple plan minimum
  simple_mode:           'SIMPLE',
  portfolio_full:        'SIMPLE',
  recommendation_full:   'SIMPLE',
  contribution_calc:     'SIMPLE',
  dividends_full:        'SIMPLE',
  history_6months:       'SIMPLE',
  operations_register:   'SIMPLE',
  extended_data:         'SIMPLE',

  // Advanced plan only
  advanced_mode:         'ADVANCED',
  full_insights:         'ADVANCED',
  analysis_pnl:          'ADVANCED',
  income_projection:     'ADVANCED',
  timing_advanced:       'ADVANCED',
  export_reports:        'ADVANCED',
  history_unlimited:     'ADVANCED',
  portfolio_multiple:    'ADVANCED',
} as const;

export type Feature = keyof typeof FEATURES;

// ─── Plan rank ────────────────────────────────────────────────────────────────
const RANK: Record<Plan, number> = { FREE: 0, SIMPLE: 1, ADVANCED: 2 };

// ─── hasAccess ────────────────────────────────────────────────────────────────
// Core gating function — the single place to check feature access.
export function hasAccess(plan: Plan, feature: Feature): boolean {
  const required = FEATURES[feature];
  if (!required) return true;                        // ungated feature
  return RANK[plan] >= RANK[required as Plan];
}

// ─── getUserPlanData ──────────────────────────────────────────────────────────
// Returns a structured object with all access flags pre-computed.
// Replace the body with a Supabase lookup when Stripe goes live.
export function getUserPlanData(rawPlan?: string): UserPlan {
  // Normalize plan string (case-insensitive, default FREE)
  const plan = normalizeplan(rawPlan);

  return {
    plan,
    mode:      plan === 'ADVANCED' ? 'advanced' : 'simple',
    isDemo:    plan === 'FREE',
    canSimple: plan === 'SIMPLE' || plan === 'ADVANCED',
    canAdv:    plan === 'ADVANCED',
  };
}

function normalizeplan(raw?: string): Plan {
  if (!raw) return 'FREE';
  const up = raw.toUpperCase();
  if (up === 'SIMPLE')   return 'SIMPLE';
  if (up === 'ADVANCED') return 'ADVANCED';
  return 'FREE';
}

// ─── Bridge to legacy lib/plans.ts ───────────────────────────────────────────
// Keeps backward compatibility with existing components that use the old API.
export function bridgePlan(newPlan: Plan): import('@/lib/plans').Plan {
  if (newPlan === 'SIMPLE')   return 'simple';
  if (newPlan === 'ADVANCED') return 'advanced';
  return 'free';
}
