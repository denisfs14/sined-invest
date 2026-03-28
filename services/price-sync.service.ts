'use client';
import { logger } from '@/utils/logger';

import { supabase } from '@/lib/supabase/client';
import { Asset } from '@/types';

const BRAPI_TOKEN = 'jzAgNYE1VFcMNXMuhkfzwh';
const BRAPI_BASE  = 'https://brapi.dev/api';

// ─── Sync prices via brapi free tier ─────────────────────────────────────────
export async function syncPrices(assets: Asset[]): Promise<{
  updated: number;
  failed: string[];
  quoteMap: Record<string, { price: number; changePct: number; change: number }>;
}> {
  const active = assets.filter(a => a.active);
  if (active.length === 0) return { updated: 0, failed: [], quoteMap: {} };

  const quoteMap: Record<string, { price: number; changePct: number; change: number }> = {};
  const failed: string[] = [];
  let updated = 0;

  for (let i = 0; i < active.length; i += 20) {
    const chunk   = active.slice(i, i + 20);
    const symbols = chunk.map(a => a.ticker).join(',');
    try {
      const res  = await fetch(`${BRAPI_BASE}/quote/${symbols}?token=${BRAPI_TOKEN}`, { cache: 'no-store' });
      if (!res.ok) { chunk.forEach(a => failed.push(a.ticker)); continue; }
      const data = await res.json();

      for (const q of (data?.results ?? [])) {
        if (!q.regularMarketPrice) continue;
        quoteMap[q.symbol] = {
          price:     q.regularMarketPrice,
          changePct: q.regularMarketChangePercent ?? 0,
          change:    q.regularMarketChange ?? 0,
        };
        const asset = chunk.find(a => a.ticker === q.symbol);
        if (!asset) continue;

        const { data: h } = await supabase
          .from('holdings').select('avg_price').eq('asset_id', asset.id).maybeSingle();
        const avgPM = h?.avg_price ?? 0;
        const isRed = avgPM > 0 && q.regularMarketPrice < avgPM;

        const { error } = await supabase
          .from('assets').update({ current_price: q.regularMarketPrice, is_red: isRed }).eq('id', asset.id);
        if (!error) updated++;
        else failed.push(asset.ticker);
      }
    } catch (e) {
      logger.error('syncPrices error:', e);
      chunk.forEach(a => failed.push(a.ticker));
    }
  }
  return { updated, failed, quoteMap };
}

// ─── Fetch dividends via brapi with dividends=true ───────────────────────────
// Note: requires paid plan for dividends=true
// Alternative: use the /api/quote/{ticker}?dividends=true endpoint
// which IS included in some brapi plans at lower tiers
async function fetchBrapiDividends(ticker: string): Promise<{ paymentDate: string; value: number }[]> {
  try {
    // Try with dividends=true - works on some plans
    const res = await fetch(
      `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&dividends=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data   = await res.json();
    const result = data?.results?.[0];
    const divs   = result?.dividendsData?.cashDividends ?? [];

    return divs
      .filter((d: Record<string, unknown>) => (d.value || d.rate) && d.paymentDate)
      .map((d: Record<string, unknown>) => ({
        paymentDate: String(d.paymentDate).slice(0, 10),
        value: Number(d.value ?? d.rate ?? 0),
      }));
  } catch {
    return [];
  }
}

// ─── Fetch dividends via allorigin CORS proxy → Yahoo Finance ─────────────────
// Uses allorigins.win as a free CORS proxy to bypass browser restrictions
async function fetchYahooDividends(ticker: string): Promise<{ paymentDate: string; value: number }[]> {
  try {
    const symbol  = `${ticker}.SA`;
    const now     = Math.floor(Date.now() / 1000);
    const yearAgo = now - 365 * 24 * 3600;
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?events=dividends&interval=1mo&period1=${yearAgo}&period2=${now}`;

    // Use allorigins as CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
    const res      = await fetch(proxyUrl, { cache: 'no-store' });
    if (!res.ok) return [];

    const proxy = await res.json();
    const data  = JSON.parse(proxy.contents ?? '{}');
    const divs  = data?.chart?.result?.[0]?.events?.dividends ?? {};

    return Object.values(divs).map((d: unknown) => {
      const div = d as { date: number; amount: number };
      return {
        paymentDate: new Date(div.date * 1000).toISOString().slice(0, 10),
        value: div.amount,
      };
    });
  } catch (e) {
    logger.error(`Yahoo/allorigins error for ${ticker}:`, e);
    return [];
  }
}

// ─── Main sync dividends function ────────────────────────────────────────────
export async function syncDividends(
  assets: Asset[],
  portfolioId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let   synced = 0;

  const eligible = assets.filter(a =>
    a.active && !a.ticker.toLowerCase().startsWith('tesouro')
  );

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const future = new Date();
  future.setMonth(future.getMonth() + 3);

  for (const asset of eligible) {
    try {
      const { data: holding } = await supabase
        .from('holdings').select('quantity').eq('asset_id', asset.id).maybeSingle();
      const qty = holding?.quantity ?? 0;
      if (qty <= 0) continue;

      const { data: existing } = await supabase
        .from('dividend_events').select('payment_date').eq('asset_id', asset.id);
      const existingDates = new Set(
        (existing ?? []).map((e: { payment_date: string }) => e.payment_date)
      );

      // Try brapi first (works if plan supports it), fallback to Yahoo Finance via proxy
      let divs = await fetchBrapiDividends(asset.ticker);
      if (divs.length === 0) {
        divs = await fetchYahooDividends(asset.ticker);
      }

      if (divs.length === 0) {
        // No dividends found for this asset (could be ETF or no data)
        continue;
      }

      const toInsert = [];
      for (const d of divs) {
        const dt = new Date(d.paymentDate);
        if (dt < cutoff || dt > future) continue;
        if (existingDates.has(d.paymentDate)) continue;
        if (!d.value || d.value <= 0) continue;

        const total  = Math.round(d.value * qty * 100) / 100;
        const isPast = dt <= new Date();

        toInsert.push({
          asset_id:        asset.id,
          portfolio_id:    portfolioId,
          ex_date:         d.paymentDate,
          payment_date:    d.paymentDate,
          expected_amount: total,
          received_amount: isPast ? total : 0,
          status:          isPast ? 'received' : 'expected',
        });
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('dividend_events').insert(toInsert);
        if (!error) synced += toInsert.length;
        else errors.push(`${asset.ticker}: ${error.message}`);
      }
    } catch (e) {
      errors.push(`${asset.ticker}: ${e}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { synced, errors };
}
