// ─── SINED Invest — 3-Tier Plan System ───────────────────────────────────────
// FREE     → Demo experience, strong upgrade prompts
// SIMPLE   → Core features, clean decisions (volume tier)
// ADVANCED → Full power, deep analytics (premium tier)
//
// To activate billing: replace getUserPlan() with Supabase subscription lookup.

export type Plan = 'free' | 'simple' | 'advanced';

// ─── Mode concept ─────────────────────────────────────────────────────────────
// Plans map to "modes" shown in the UI
export type Mode = 'demo' | 'simple' | 'advanced';

export function getPlanMode(plan: Plan): Mode {
  if (plan === 'free')     return 'demo';
  if (plan === 'simple')   return 'simple';
  return 'advanced';
}

export const MODE_LABELS: Record<Mode, { name: string; tagline: string; color: string }> = {
  demo:     { name: 'Demo',          tagline: 'Experimente o sistema',          color: '#64748b' },
  simple:   { name: 'Simple Mode',   tagline: 'Decisões rápidas e assertivas',  color: '#1748c0' },
  advanced: { name: 'Advanced Mode', tagline: 'Controle total e análise profunda', color: '#c9a84c' },
};

// ─── Plan config ──────────────────────────────────────────────────────────────
export interface PlanConfig {
  id:           Plan;
  mode:         Mode;
  name:         string;
  badge:        string;
  price:        string;
  priceYearly:  string;
  color:        string;
  tagline:      string;
  description:  string;
  cta:          string;
  features:     string[];
  limitations?: string[];
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free', mode: 'demo',
    name: 'Free', badge: 'FREE',
    price: 'Free', priceYearly: 'Free',
    color: '#64748b',
    tagline: 'Experimente sem compromisso',
    description: 'Acesso limitado para conhecer o sistema antes de assinar.',
    cta: 'Get started free',
    features: [
      'Dashboard com dados parciais',
      'Preços em tempo real (limitado)',
      'Ver recomendação do mês (sem detalhes)',
      'Calendário de proventos (resumido)',
    ],
    limitations: [
      'Dados bloqueados após preview',
      'Sem motor de recomendação completo',
      'Sem análise por classe',
      'Sem histórico de simulações',
    ],
  },
  {
    id: 'simple', mode: 'simple',
    name: 'Simple', badge: 'SIMPLE',
    price: '$5/month', priceYearly: '$4/month',
    color: '#1748c0',
    tagline: 'Decisões rápidas e assertivas',
    description: 'Tudo que você precisa para aportar com inteligência. Simples e eficaz.',
    cta: 'Get Simple',
    features: [
      'Carteira ilimitada de ativos',
      'Motor de recomendação completo',
      'Melhor oportunidade do mês',
      'Janela de aporte inteligente',
      'Calendário completo de proventos',
      'Sincronização de preços',
      'Histórico de 6 meses',
      'Marcação automática de vermelhos',
    ],
  },
  {
    id: 'advanced', mode: 'advanced',
    name: 'Advanced', badge: 'ADVANCED',
    price: '$12/month', priceYearly: '$10/month',
    color: '#c9a84c',
    tagline: 'Controle total e análise profunda',
    description: 'Para quem quer o máximo do sistema. Analytics, exportações e visão completa.',
    cta: 'Get Advanced',
    features: [
      'Tudo do Simple',
      'Análise P&L por ativo e classe',
      'Projeção de renda mensal (12m)',
      'Timing insights avançados',
      'Estratégia por classe detalhada',
      'Exportação de relatórios PDF/Excel',
      'Histórico ilimitado',
      'Múltiplas carteiras',
      'Suporte prioritário',
    ],
  },
];

// ─── Feature gates ────────────────────────────────────────────────────────────
// Maps feature key → minimum plan required to access.
export const FEATURE_GATES: Record<string, Plan> = {
  // Simple tier — core features
  'portfolio:full':             'simple',
  'recommendation:full':        'simple',
  'contribution:calculate':     'simple',
  'dividends:calendar-full':    'simple',
  'prices:sync':                'simple',
  'history:6months':            'simple',
  'operations:register':        'simple',

  // Advanced tier — deep analytics
  'analysis:pnl':               'advanced',
  'insights:income-projection': 'advanced',
  'insights:timing-advanced':   'advanced',
  'strategy:advanced':          'advanced',
  'export:reports':             'advanced',
  'history:unlimited':          'advanced',
  'portfolio:multiple':         'advanced',
};

const PLAN_RANK: Record<Plan, number> = { free: 0, simple: 1, advanced: 2 };

// ─── Access check ─────────────────────────────────────────────────────────────
export function canAccess(userPlan: Plan, feature: string): boolean {
  const required = FEATURE_GATES[feature];
  if (!required) return true;
  return PLAN_RANK[userPlan] >= PLAN_RANK[required];
}

export const hasAccess = canAccess;

// ─── Current user plan ────────────────────────────────────────────────────────
// TODO: Replace with Supabase lookup when Stripe is integrated:
//   const { data } = await supabase.from('subscriptions')
//     .select('plan').eq('user_id', userId).eq('status', 'active').maybeSingle();
//   return (data?.plan as Plan) ?? 'free';
export function getUserPlan(): Plan {
  return 'free'; // beta: all users are free
}

// ─── Upgrade URL ──────────────────────────────────────────────────────────────
export function getUpgradeUrl(feature?: string, targetPlan?: Plan): string {
  const params = new URLSearchParams();
  if (feature)    params.set('ref', feature);
  if (targetPlan) params.set('plan', targetPlan);
  const qs = params.toString();
  return qs ? `/upgrade?${qs}` : '/upgrade';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS.find(p => p.id === plan)!;
}

export function getRequiredPlan(feature: string): Plan | null {
  return FEATURE_GATES[feature] ?? null;
}

export function getNextPlan(current: Plan): Plan | null {
  if (current === 'free')    return 'simple';
  if (current === 'simple')  return 'advanced';
  return null;
}
