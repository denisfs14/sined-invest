'use client';

import { supabase } from '@/lib/supabase/client';
import {
  Asset, AssetClass, DividendEvent, Operation, CashEvent,
  Portfolio, PurchaseSimulation, StrategySettings
} from '@/types';

// ─── Portfolio ────────────────────────────────────────────────────────────────
// Uses upsert to NEVER create duplicates
export async function getOrCreatePortfolio(userId: string): Promise<Portfolio> {
  // Always fetch first
  const { data: existing, error: fetchErr } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('id')
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // Only create if truly none exists
  const { data, error } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name: 'Carteira Principal' })
    .select()
    .single();

  if (error) {
    // Race condition — try fetching again
    const { data: retry } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (retry) return retry;
    throw error;
  }
  return data;
}

// ─── Asset Classes ────────────────────────────────────────────────────────────
export async function fetchClasses(portfolioId: string): Promise<AssetClass[]> {
  const { data, error } = await supabase
    .from('asset_classes').select('*').eq('portfolio_id', portfolioId).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function insertClass(data: Omit<AssetClass, 'id'>): Promise<AssetClass> {
  const { data: row, error } = await supabase
    .from('asset_classes').insert(data).select().single();
  if (error) throw error;
  return row;
}

export async function removeClass(id: string): Promise<void> {
  await supabase.from('assets').update({ asset_class_id: null }).eq('asset_class_id', id);
  const { error } = await supabase.from('asset_classes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function fetchAssets(portfolioId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets').select('*')
    .eq('portfolio_id', portfolioId)
    .eq('active', true)
    .order('ticker');
  if (error) throw error;
  return data ?? [];
}

export async function fetchHoldings(portfolioId: string): Promise<Record<string, { quantity: number; avg_price: number }>> {
  const { data, error } = await supabase
    .from('holdings')
    .select('asset_id, quantity, avg_price, assets!inner(portfolio_id)')
    .eq('assets.portfolio_id', portfolioId);
  if (error) throw error;

  const map: Record<string, { quantity: number; avg_price: number }> = {};
  (data ?? []).forEach((h: any) => {
    map[h.asset_id] = { quantity: h.quantity, avg_price: h.avg_price };
  });
  return map;
}

export async function insertAsset(
  assetData: Omit<Asset, 'id'>,
  holding: { quantity: number; avg_price: number }
): Promise<Asset> {
  const { data: asset, error } = await supabase
    .from('assets').insert(assetData).select().single();
  if (error) throw error;

  if (holding.quantity > 0) {
    await supabase.from('holdings').insert({
      asset_id: asset.id,
      quantity: holding.quantity,
      avg_price: holding.avg_price,
    });
  }
  return asset;
}

export async function updateAssetDB(
  id: string,
  assetData: Partial<Asset>,
  holding?: { quantity: number; avg_price: number }
): Promise<void> {
  const { error } = await supabase.from('assets').update(assetData).eq('id', id);
  if (error) throw error;

  if (holding !== undefined) {
    const { data: existing } = await supabase
      .from('holdings').select('id').eq('asset_id', id).maybeSingle();
    if (existing) {
      await supabase.from('holdings').update(holding).eq('asset_id', id);
    } else {
      await supabase.from('holdings').insert({ asset_id: id, ...holding });
    }
  }
}

export async function removeAsset(id: string): Promise<void> {
  await supabase.from('holdings').delete().eq('asset_id', id);
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleRedDB(id: string, currentValue: boolean): Promise<void> {
  const { error } = await supabase
    .from('assets').update({ is_red: !currentValue }).eq('id', id);
  if (error) throw error;
}

// Auto-sync red flag based on price vs avg_price
// is_red = true when current_price < avg_price (resultado negativo)
export async function syncRedFlags(portfolioId: string): Promise<void> {
  // Get all assets with their holdings
  const { data: assets } = await supabase
    .from('assets').select('id, current_price').eq('portfolio_id', portfolioId);
  const { data: holdings } = await supabase
    .from('holdings').select('asset_id, avg_price');

  if (!assets || !holdings) return;

  const holdingMap: Record<string, number> = {};
  holdings.forEach((h: { asset_id: string; avg_price: number }) => {
    holdingMap[h.asset_id] = h.avg_price;
  });

  // Update each asset's is_red based on comparison
  for (const asset of assets) {
    const avgPrice = holdingMap[asset.id];
    if (!avgPrice || avgPrice <= 0) continue;
    const isRed = asset.current_price < avgPrice; // preço dia abaixo do PM = vermelho
    await supabase.from('assets').update({ is_red: isRed }).eq('id', asset.id);
  }
}

// ─── Strategy ─────────────────────────────────────────────────────────────────
export async function fetchStrategy(portfolioId: string): Promise<StrategySettings> {
  const { data } = await supabase
    .from('strategy_settings').select('*')
    .eq('portfolio_id', portfolioId)
    .maybeSingle();

  if (data) return data;

  const defaults = {
    portfolio_id: portfolioId,
    top_n: 3,
    max_percentage: 15,
    prioritize_red: true,
    fallback_to_lowest: true,
    round_shares: true,
    contribution_timing_mode: 'after_last_payment',
  };
  const { data: created, error } = await supabase
    .from('strategy_settings').insert(defaults).select().single();
  if (error) throw error;
  return created;
}

export async function updateStrategyDB(id: string, data: Partial<StrategySettings>): Promise<void> {
  const { error } = await supabase.from('strategy_settings').update(data).eq('id', id);
  if (error) throw error;
}

// ─── Simulations ──────────────────────────────────────────────────────────────
export async function fetchHistory(portfolioId: string): Promise<PurchaseSimulation[]> {
  const { data, error } = await supabase
    .from('purchase_simulations')
    .select(`*, items:purchase_simulation_items(*, asset:assets(*))`)
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(s => ({ ...s, items: s.items ?? [] }));
}

export async function insertSimulation(
  sim: Omit<PurchaseSimulation, 'id' | 'created_at'>
): Promise<PurchaseSimulation> {
  const { data: row, error } = await supabase
    .from('purchase_simulations')
    .insert({ portfolio_id: sim.portfolio_id, total_amount: sim.total_amount, leftover: sim.leftover })
    .select().single();
  if (error) throw error;

  if (sim.items && sim.items.length > 0) {
    await supabase.from('purchase_simulation_items').insert(
      sim.items.map(item => ({
        simulation_id:    row.id,
        asset_id:         item.asset_id,
        allocated_amount: item.allocated_amount,
        quantity:         item.quantity,
        leftover:         item.leftover,
      }))
    );
  }
  return { ...row, items: sim.items };
}

export async function clearHistoryDB(portfolioId: string): Promise<void> {
  const { data: sims } = await supabase
    .from('purchase_simulations').select('id').eq('portfolio_id', portfolioId);
  if (sims && sims.length > 0) {
    await supabase.from('purchase_simulation_items')
      .delete().in('simulation_id', sims.map(s => s.id));
  }
  await supabase.from('purchase_simulations').delete().eq('portfolio_id', portfolioId);
}

// ─── Dividends ────────────────────────────────────────────────────────────────
export async function fetchDividends(portfolioId: string): Promise<DividendEvent[]> {
  const { data, error } = await supabase
    .from('dividend_events')
    .select('*, asset:assets(ticker, name)')
    .eq('portfolio_id', portfolioId)
    .order('payment_date');
  if (error) throw error;
  return data ?? [];
}

export async function insertDividend(data: Omit<DividendEvent, 'id'>): Promise<DividendEvent> {
  const { data: row, error } = await supabase
    .from('dividend_events').insert(data).select().single();
  if (error) throw error;
  return row;
}

export async function updateDividendDB(id: string, data: Partial<DividendEvent>): Promise<void> {
  const { error } = await supabase.from('dividend_events').update(data).eq('id', id);
  if (error) throw error;
}

export async function removeDividend(id: string): Promise<void> {
  const { error } = await supabase.from('dividend_events').delete().eq('id', id);
  if (error) throw error;
}

// ─── Asset Class extended update ──────────────────────────────────────────────
export async function updateClassDB(id: string, data: Partial<AssetClass>): Promise<void> {
  const { error } = await supabase.from('asset_classes').update(data).eq('id', id);
  if (error) throw error;
}

// ─── Operations ───────────────────────────────────────────────────────────────

export async function fetchOperations(portfolioId: string): Promise<Operation[]> {
  const { data, error } = await supabase
    .from('operations')
    .select('*, asset:assets(ticker, name, current_price)')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function insertOperation(op: Omit<Operation, 'id' | 'created_at'>): Promise<Operation> {
  const { data, error } = await supabase
    .from('operations')
    .insert(op)
    .select('*, asset:assets(ticker, name, current_price)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateOperationStatus(id: string, status: string, executedAt?: string): Promise<void> {
  const { error } = await supabase
    .from('operations')
    .update({ status, executed_at: executedAt ?? new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Cash Balance ─────────────────────────────────────────────────────────────

export async function fetchCashBalance(portfolioId: string): Promise<number> {
  const { data } = await supabase
    .from('cash_balance')
    .select('amount')
    .eq('portfolio_id', portfolioId)
    .maybeSingle();
  return data?.amount ?? 0;
}

export async function upsertCashBalance(portfolioId: string, amount: number): Promise<void> {
  const { data: existing } = await supabase
    .from('cash_balance')
    .select('id')
    .eq('portfolio_id', portfolioId)
    .maybeSingle();

  if (existing) {
    await supabase.from('cash_balance').update({ amount, updated_at: new Date().toISOString() }).eq('portfolio_id', portfolioId);
  } else {
    await supabase.from('cash_balance').insert({ portfolio_id: portfolioId, amount, updated_at: new Date().toISOString() });
  }
}

export async function fetchCashEvents(portfolioId: string): Promise<CashEvent[]> {
  const { data, error } = await supabase
    .from('cash_events')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function insertCashEvent(event: Omit<CashEvent, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('cash_events').insert(event);
}

// ─── Execute buy: update holding + recalculate PM ────────────────────────────
export async function executeBuy(
  assetId: string,
  quantity: number,
  unitPrice: number
): Promise<void> {
  // Get current holding
  const { data: holding } = await supabase
    .from('holdings')
    .select('id, quantity, avg_price')
    .eq('asset_id', assetId)
    .maybeSingle();

  if (holding) {
    // Recalculate weighted average price
    const oldTotal  = holding.quantity * holding.avg_price;
    const newTotal  = quantity * unitPrice;
    const newQty    = holding.quantity + quantity;
    const newAvgPM  = newQty > 0 ? (oldTotal + newTotal) / newQty : unitPrice;

    await supabase.from('holdings').update({
      quantity:  newQty,
      avg_price: Math.round(newAvgPM * 100) / 100,
    }).eq('asset_id', assetId);
  } else {
    // Create new holding
    await supabase.from('holdings').insert({
      asset_id:  assetId,
      quantity,
      avg_price: unitPrice,
    });
  }

  // Update current_price on asset
  await supabase.from('assets').update({ current_price: unitPrice }).eq('id', assetId);
}

// ─── Execute sell: subtract holding, remove if zero, add to cash ──────────────
export async function executeSell(
  assetId: string,
  portfolioId: string,
  quantity: number,
  unitPrice: number
): Promise<void> {
  const { data: holding } = await supabase
    .from('holdings')
    .select('id, quantity, avg_price')
    .eq('asset_id', assetId)
    .maybeSingle();

  if (!holding) throw new Error('Holding não encontrado');

  const newQty = Math.round((holding.quantity - quantity) * 1000) / 1000;

  if (newQty <= 0) {
    // Sold everything — remove holding and deactivate asset
    await supabase.from('holdings').delete().eq('asset_id', assetId);
    await supabase.from('assets').update({ active: false }).eq('id', assetId);
  } else {
    // Partial sell — just reduce quantity (PM stays the same)
    await supabase.from('holdings').update({ quantity: newQty }).eq('asset_id', assetId);
  }

  // Add proceeds to cash balance
  const saleValue  = Math.round(quantity * unitPrice * 100) / 100;
  const current    = await fetchCashBalance(portfolioId);
  await upsertCashBalance(portfolioId, Math.round((current + saleValue) * 100) / 100);

  // Record cash event
  await insertCashEvent({
    portfolio_id: portfolioId,
    type: 'sell_proceeds',
    amount: saleValue,
    description: `Venda de ${quantity} cotas`,
  });
}

// ─── Reset / Zerar sistema ────────────────────────────────────────────────────
export async function resetPortfolio(portfolioId: string): Promise<void> {
  // Delete in correct order (dependencies first)

  // 1. Simulation items
  const { data: sims } = await supabase
    .from('purchase_simulations').select('id').eq('portfolio_id', portfolioId);
  if (sims?.length) {
    await supabase.from('purchase_simulation_items')
      .delete().in('simulation_id', sims.map(s => s.id));
  }

  // 2. Simulations
  await supabase.from('purchase_simulations').delete().eq('portfolio_id', portfolioId);

  // 3. Operations
  await supabase.from('operations').delete().eq('portfolio_id', portfolioId);

  // 4. Cash events + balance
  await supabase.from('cash_events').delete().eq('portfolio_id', portfolioId);
  await supabase.from('cash_balance').delete().eq('portfolio_id', portfolioId);

  // 5. Dividend events
  await supabase.from('dividend_events').delete().eq('portfolio_id', portfolioId);

  // 6. Holdings (via assets)
  const { data: assets } = await supabase
    .from('assets').select('id').eq('portfolio_id', portfolioId);
  if (assets?.length) {
    await supabase.from('holdings')
      .delete().in('asset_id', assets.map(a => a.id));
  }

  // 7. Assets
  await supabase.from('assets').delete().eq('portfolio_id', portfolioId);

  // 8. Asset classes
  await supabase.from('asset_classes').delete().eq('portfolio_id', portfolioId);

  // 9. Strategy settings — reset to defaults
  await supabase.from('strategy_settings').update({
    top_n: 3,
    max_percentage: 15,
    prioritize_red: true,
    fallback_to_lowest: true,
    round_shares: true,
    contribution_timing_mode: 'after_last_payment',
  }).eq('portfolio_id', portfolioId);
}

// ─── Reset Portfolio ───────────────────────────────────────────────────────────
