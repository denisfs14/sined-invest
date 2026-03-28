// ─── Plan types — SINED Invest ────────────────────────────────────────────────
// Single source of truth for plan and mode types.
// Business logic lives in /lib/plan-access.ts

export type Plan = 'FREE' | 'SIMPLE' | 'ADVANCED';

export type Mode = 'simple' | 'advanced';

export interface UserPlan {
  plan:      Plan;
  mode:      Mode;
  isDemo:    boolean;  // FREE plan
  canSimple: boolean;  // SIMPLE or ADVANCED
  canAdv:    boolean;  // ADVANCED only
}
