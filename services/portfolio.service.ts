'use client';

import {
  Asset, AssetClass, DividendEvent, Holding,
  Portfolio, PurchaseSimulation, StrategySettings
} from '@/types';
import {
  DEMO_ASSETS, DEMO_CLASSES, DEMO_DIVIDENDS,
  DEMO_HOLDINGS, DEMO_PORTFOLIO, DEMO_STRATEGY
} from '@/lib/demo-data';
import { uid } from '@/utils/format';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const K = {
  assets:    'si_assets',
  classes:   'si_classes',
  holdings:  'si_holdings',
  portfolio: 'si_portfolio',
  strategy:  'si_strategy',
  history:   'si_history',
  dividends: 'si_dividends',
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Init demo data ───────────────────────────────────────────────────────────
export function initDemoData(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(K.assets)) {
    save(K.assets,    DEMO_ASSETS);
    save(K.classes,   DEMO_CLASSES);
    save(K.holdings,  DEMO_HOLDINGS);
    save(K.portfolio, DEMO_PORTFOLIO);
    save(K.strategy,  DEMO_STRATEGY);
    save(K.history,   []);
    save(K.dividends, DEMO_DIVIDENDS);
  }
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export function getPortfolio(): Portfolio {
  return load(K.portfolio, DEMO_PORTFOLIO);
}

// ─── Classes ──────────────────────────────────────────────────────────────────
export function getClasses(): AssetClass[] { return load(K.classes, DEMO_CLASSES); }

export function addClass(data: Omit<AssetClass, 'id'>): AssetClass {
  const item: AssetClass = { id: uid(), ...data };
  save(K.classes, [...getClasses(), item]);
  return item;
}

export function deleteClass(id: string): void {
  save(K.classes, getClasses().filter(c => c.id !== id));
  save(K.assets, getAssets().map(a => a.asset_class_id === id ? { ...a, asset_class_id: null } : a));
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export function getAssets(): Asset[] { return load(K.assets, DEMO_ASSETS); }

export function addAsset(data: Omit<Asset, 'id'>, holding: { quantity: number; avg_price: number }): Asset {
  const item: Asset = { id: uid(), ...data };
  save(K.assets, [...getAssets(), item]);
  const h = getHoldings();
  h[item.id] = holding;
  save(K.holdings, h);
  return item;
}

export function updateAsset(id: string, data: Partial<Asset>, holding?: { quantity: number; avg_price: number }): void {
  save(K.assets, getAssets().map(a => a.id === id ? { ...a, ...data } : a));
  if (holding !== undefined) {
    const h = getHoldings();
    h[id] = holding;
    save(K.holdings, h);
  }
}

export function deleteAsset(id: string): void {
  save(K.assets, getAssets().filter(a => a.id !== id));
  const h = getHoldings();
  delete h[id];
  save(K.holdings, h);
}

export function toggleRedFlag(id: string): void {
  save(K.assets, getAssets().map(a => a.id === id ? { ...a, is_red: !a.is_red } : a));
}

// ─── Holdings ─────────────────────────────────────────────────────────────────
export function getHoldings(): Record<string, { quantity: number; avg_price: number }> {
  return load(K.holdings, DEMO_HOLDINGS);
}

// ─── Strategy ─────────────────────────────────────────────────────────────────
export function getStrategy(): StrategySettings { return load(K.strategy, DEMO_STRATEGY); }

export function updateStrategy(data: Partial<StrategySettings>): StrategySettings {
  const updated = { ...getStrategy(), ...data };
  save(K.strategy, updated);
  return updated;
}

// ─── Simulations ──────────────────────────────────────────────────────────────
export function getHistory(): PurchaseSimulation[] { return load(K.history, []); }

export function saveSimulation(sim: Omit<PurchaseSimulation, 'id' | 'created_at'>): PurchaseSimulation {
  const item: PurchaseSimulation = { id: uid(), created_at: new Date().toISOString(), ...sim };
  save(K.history, [item, ...getHistory()]);
  return item;
}

export function clearHistory(): void { save(K.history, []); }

// ─── Dividends ────────────────────────────────────────────────────────────────
export function getDividends(): DividendEvent[] { return load(K.dividends, DEMO_DIVIDENDS); }

export function addDividend(data: Omit<DividendEvent, 'id'>): DividendEvent {
  const item: DividendEvent = { id: uid(), ...data };
  save(K.dividends, [...getDividends(), item]);
  return item;
}

export function updateDividend(id: string, data: Partial<DividendEvent>): void {
  save(K.dividends, getDividends().map(d => d.id === id ? { ...d, ...data } : d));
}

export function deleteDividend(id: string): void {
  save(K.dividends, getDividends().filter(d => d.id !== id));
}
