// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface AssetClass {
  id: string;
  portfolio_id: string;
  name: string;
  target_percentage: number;
  contribution_percentage: number;  // % do aporte destinado a esta classe
  top_n: number;                    // top N ativos a comprar nesta classe
}

export interface Asset {
  id: string;
  portfolio_id: string;
  asset_class_id: string | null;
  ticker: string;
  name: string;
  target_percentage: number;
  max_percentage: number;
  current_price: number;
  is_red: boolean;
  active: boolean;
}

export interface Holding {
  id: string;
  asset_id: string;
  quantity: number;
  avg_price: number;
}

// ─── Contributions ────────────────────────────────────────────────────────────
export interface MonthlyContribution {
  id: string;
  portfolio_id: string;
  amount: number;
  dividends: number;
  total: number;
  created_at: string;
}

// ─── Simulations ──────────────────────────────────────────────────────────────
export interface PurchaseSimulation {
  id: string;
  portfolio_id: string;
  total_amount: number;
  leftover: number;
  created_at: string;
  items?: PurchaseSimulationItem[];
}

export interface PurchaseSimulationItem {
  id: string;
  simulation_id: string;
  asset_id: string;
  allocated_amount: number;
  quantity: number;
  leftover: number;
  asset?: Asset & { current_percentage?: number };
}

// ─── Strategy ─────────────────────────────────────────────────────────────────
export type ContributionTimingMode =
  | 'after_last_payment'
  | 'after_percentage_received'
  | 'current_received_only'
  | 'fixed_date';

export interface StrategySettings {
  id: string;
  portfolio_id: string;
  top_n: number;
  max_percentage: number;
  prioritize_red: boolean;
  fallback_to_lowest: boolean;
  round_shares: boolean;
  contribution_timing_mode: ContributionTimingMode;
}

// ─── Dividends ────────────────────────────────────────────────────────────────
export type DividendStatus = 'expected' | 'received' | 'pending' | 'canceled';

export interface DividendEvent {
  id: string;
  asset_id: string;
  portfolio_id: string;
  ex_date: string;
  payment_date: string;
  expected_amount: number;
  received_amount: number;
  status: DividendStatus;
  asset?: Asset;
}

// ─── Enriched / Computed ──────────────────────────────────────────────────────
export interface EnrichedAsset extends Asset {
  holding?: Holding;
  asset_class?: AssetClass;
  current_value: number;
  current_percentage: number;
  projected_percentage?: number;
}

export interface RecommendationItem {
  asset: EnrichedAsset;
  allocated_amount: number;
  quantity: number;
  spent: number;
  leftover: number;
  is_red: boolean;
  new_percentage: number;
}

export interface RecommendationResult {
  items: RecommendationItem[];
  total_available: number;
  total_invested: number;
  total_leftover: number;
  portfolio_total: number;
  contribution_window?: ContributionWindow;
  error?: string;
}

// ─── Dividend / Timing ────────────────────────────────────────────────────────
export interface ContributionWindow {
  mode: ContributionTimingMode;
  suggested_date: string | null;
  last_payment_date: string | null;
  total_expected: number;
  total_received: number;
  total_pending: number;
  next_payments: DividendEvent[];
  ready: boolean;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ─── Operations ───────────────────────────────────────────────────────────────

export type OperationType = 'buy' | 'sell';
export type OperationStatus = 'pending' | 'executed' | 'canceled';
export type CashEventType = 'sell_proceeds' | 'leftover' | 'withdrawal' | 'deposit';

export interface Operation {
  id: string;
  portfolio_id: string;
  asset_id: string;
  simulation_item_id?: string;   // linked to recommendation if from aporte
  type: OperationType;
  status: OperationStatus;
  quantity: number;
  unit_price: number;
  total_value: number;
  executed_at?: string;
  created_at: string;
  asset?: Asset;
}

export interface CashBalance {
  id: string;
  portfolio_id: string;
  amount: number;             // current balance
  updated_at: string;
}

export interface CashEvent {
  id: string;
  portfolio_id: string;
  type: CashEventType;
  amount: number;
  description: string;
  created_at: string;
}
