'use client';
import { logger } from '@/utils/logger';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Asset, AssetClass, DividendEvent, Operation, CashEvent, Portfolio, PurchaseSimulation, StrategySettings } from '@/types';
import { supabase } from '@/lib/supabase/client';
import * as db from '@/services/supabase.service';
import { syncRedFlags, fetchOperations, fetchCashBalance, fetchCashEvents } from '@/services/supabase.service';
import { syncPrices, syncDividends } from '@/services/price-sync.service';
import { getUserPlanData } from '@/lib/plan-access';
import type { Plan, Mode, UserPlan } from '@/types/plan';

interface AppState {
  user: User | null;
  portfolio: Portfolio | null;
  assets: Asset[];
  classes: AssetClass[];
  holdingsMap: Record<string, { quantity: number; avg_price: number }>;
  strategy: StrategySettings | null;
  history: PurchaseSimulation[];
  dividends: DividendEvent[];
  operations: Operation[];
  cashBalance: number;
  cashEvents: CashEvent[];
  priceMap: Record<string, { price: number; changePct: number; change: number }>;
  lastPriceSync: string | null;
  loading: boolean;
  authLoading: boolean;
  // Plan & mode
  planData:   UserPlan;
  mode:       Mode;
}

interface AppActions {
  refresh: () => Promise<void>;
  addAsset: (d: Omit<Asset, 'id'>, h: { quantity: number; avg_price: number }) => Promise<void>;
  updateAsset: (id: string, d: Partial<Asset>, h?: { quantity: number; avg_price: number }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  toggleRed: (id: string) => Promise<void>;
  addClass: (d: Omit<AssetClass, 'id'>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  updateClass: (id: string, data: Partial<AssetClass>) => Promise<void>;
  updateStrategy: (d: Partial<StrategySettings>) => Promise<void>;
  saveSimulation: (s: Omit<PurchaseSimulation, 'id' | 'created_at'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  addDividend: (d: Omit<DividendEvent, 'id'>) => Promise<void>;
  updateDividend: (id: string, d: Partial<DividendEvent>) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  syncRed: () => Promise<void>;
  syncPricesNow: () => Promise<{ updated: number; failed: string[] }>;
  syncDividendsNow: () => Promise<{ synced: number; errors: string[] }>;
  resetPortfolio: () => Promise<void>;
  resetSystem: () => Promise<void>;
  executeBuy: (assetId: string, qty: number, price: number) => Promise<void>;
  executeSell: (assetId: string, qty: number, price: number) => Promise<void>;
  withdrawCash: (amount: number) => Promise<void>;
  depositCash: (amount: number, description: string) => Promise<void>;
  // Mode control
  setMode: (mode: Mode) => void;
}

const Ctx = createContext<(AppState & AppActions) | null>(null);

const EMPTY: AppState = {
  user: null, portfolio: null,
  assets: [], classes: [], holdingsMap: {},
  strategy: null, history: [], dividends: [],
  operations: [], cashBalance: 0, cashEvents: [],
  priceMap: {}, lastPriceSync: null,
  loading: false, authLoading: true,
  planData: getUserPlanData(), mode: 'simple',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [mode, setModeState] = useState<Mode>('simple');

  const loadData = useCallback(async (u: User) => {
    setState(s => ({ ...s, loading: true }));
    try {
      // Get single portfolio — never creates duplicate thanks to fixed service
      const portfolio = await db.getOrCreatePortfolio(u.id);

      const [assets, classes, holdingsMap, strategy, history, dividends, operations, cashBalance, cashEvents] = await Promise.all([
        db.fetchAssets(portfolio.id),
        db.fetchClasses(portfolio.id),
        db.fetchHoldings(portfolio.id),
        db.fetchStrategy(portfolio.id),
        db.fetchHistory(portfolio.id),
        db.fetchDividends(portfolio.id),
        db.fetchOperations(portfolio.id),
        db.fetchCashBalance(portfolio.id),
        db.fetchCashEvents(portfolio.id),
      ]);

      // Auto-sync red flags based on price vs avg_price
      try { await syncRedFlags(portfolio.id); } catch {}

      // Reload assets after sync
      const syncedAssets = await db.fetchAssets(portfolio.id);

      const planData = getUserPlanData(u.user_metadata?.plan);
      setState({
        user: u, portfolio,
        assets: syncedAssets, classes, holdingsMap,
        strategy, history, dividends,
        operations, cashBalance, cashEvents,
        priceMap: {}, lastPriceSync: null,
        loading: false, authLoading: false,
        planData, mode: planData.mode,
      });
    } catch (e) {
      logger.error('loadData error:', e);
      setState(s => ({ ...s, loading: false, authLoading: false }));
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadData(user);
  }, [loadData]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadData(session.user);
      } else {
        setState(s => ({ ...s, authLoading: false }));
      }
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadData(session.user);
      } else {
        setState({ ...EMPTY, authLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const actions: AppActions = {
    refresh,
    addAsset:       async (d, h)     => { await db.insertAsset(d, h);              await refresh(); },
    updateAsset:    async (id, d, h) => { await db.updateAssetDB(id, d, h);        await refresh(); },
    deleteAsset:    async (id)       => { await db.removeAsset(id);                await refresh(); },
    toggleRed:      async (id)       => { const a = state.assets.find(x => x.id === id); if (a) { await db.toggleRedDB(id, a.is_red); await refresh(); } },
    addClass:       async (d)        => { await db.insertClass(d);                 await refresh(); },
    deleteClass:    async (id)       => { await db.removeClass(id);                await refresh(); },
    updateClass:    async (id, data)  => { await db.updateClassDB(id, data);         await refresh(); },
    updateStrategy: async (d)        => { if (state.strategy) { await db.updateStrategyDB(state.strategy.id, d); await refresh(); } },
    saveSimulation: async (s)        => { await db.insertSimulation(s);            await refresh(); },
    clearHistory:   async ()         => { if (state.portfolio) { await db.clearHistoryDB(state.portfolio.id); await refresh(); } },
    addDividend:    async (d)        => { await db.insertDividend(d);              await refresh(); },
    updateDividend: async (id, d)    => { await db.updateDividendDB(id, d);        await refresh(); },
    deleteDividend: async (id)       => { await db.removeDividend(id);             await refresh(); },
    syncRed:        async ()          => { if (state.portfolio) { await syncRedFlags(state.portfolio.id); await refresh(); } },
    syncPricesNow:  async ()          => { const res = await syncPrices(state.assets); setState(s => ({ ...s, priceMap: res.quoteMap, lastPriceSync: new Date().toISOString() })); await refresh(); return res; },
    syncDividendsNow: async ()        => { if (!state.portfolio) return { synced: 0, errors: [] }; const res = await syncDividends(state.assets, state.portfolio.id); await refresh(); return res; },
    resetPortfolio:   async ()        => { if (state.portfolio) { await db.resetPortfolio(state.portfolio.id); await refresh(); } },
    resetSystem:      async ()          => { if (!state.portfolio) return; await db.resetPortfolio(state.portfolio.id); await refresh(); },
    executeBuy:     async (assetId, qty, price) => { await db.executeBuy(assetId, qty, price); await refresh(); },
    executeSell:    async (assetId, qty, price) => { if (state.portfolio) { await db.executeSell(assetId, state.portfolio.id, qty, price); await refresh(); } },
    withdrawCash:   async (amount) => { if (state.portfolio) { const cur = await db.fetchCashBalance(state.portfolio.id); await db.upsertCashBalance(state.portfolio.id, Math.max(0, cur - amount)); await db.insertCashEvent({ portfolio_id: state.portfolio.id, type: 'withdrawal', amount, description: 'Saque / Retirada' }); await refresh(); } },
    depositCash:    async (amount, description) => { if (state.portfolio) { const cur = await db.fetchCashBalance(state.portfolio.id); await db.upsertCashBalance(state.portfolio.id, cur + amount); await db.insertCashEvent({ portfolio_id: state.portfolio.id, type: 'deposit', amount, description }); await refresh(); } },
    setMode: (m: Mode) => setModeState(m),
  };

  return <Ctx.Provider value={{ ...state, mode, ...actions }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
