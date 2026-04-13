'use client';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase/client';
import { Asset } from '@/types';

// Use env instead of hardcoded token
const BRAPI_TOKEN = process.env.NEXT_PUBLIC_BRAPI_TOKEN ?? '';
const BRAPI_BASE = 'https://brapi.dev/api';

// ─── Sync prices via brapi free tier ─────────────────────────────────────────
export async function syncPrices(assets: Asset[]): Promise<{
  updated: number;
  failed: string[];
  quoteMap: Record<string, { price: number; changePct: number; change: number }>;
}> {
  const active = assets.filter((a) => a.active);
  if (active.length === 0) return { updated: 0, failed: [], quoteMap: {} };

  const quoteMap: Record<string, { price: number; changePct: number; change: number }> = {};
  const failed: string[] = [];
  let updated = 0;

  for (let i = 0; i < active.length; i += 20) {
    const chunk = active.slice(i, i + 20);
    const symbols = chunk.map((a) => a.ticker).join(',');

    try {
      const res = await fetch(`${BRAPI_BASE}/quote/${symbols}?token=${BRAPI_TOKEN}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        chunk.forEach((a) => failed.push(a.ticker));
        continue;
      }

      const data = await res.json();

      for (const q of data?.results ?? []) {
        if (!q.regularMarketPrice) continue;

        quoteMap[q.symbol] = {
          price: q.regularMarketPrice,
          changePct: q.regularMarketChangePercent ?? 0,
          change: q.regularMarketChange ?? 0,
        };

        const asset = chunk.find((a) => a.ticker === q.symbol);
        if (!asset) continue;

        const { data: h } = await supabase
          .from('holdings')
          .select('avg_price')
          .eq('asset_id', asset.id)
          .maybeSingle();

        const avgPM = h?.avg_price ?? 0;
        const isRed = avgPM > 0 && q.regularMarketPrice < avgPM;

        const { error } = await supabase
          .from('assets')
          .update({ current_price: q.regularMarketPrice, is_red: isRed })
          .eq('id', asset.id);

        if (!error) updated++;
        else failed.push(asset.ticker);
      }
    } catch (e) {
      logger.error('syncPrices error:', e);
      chunk.forEach((a) => failed.push(a.ticker));
    }
  }

  return { updated, failed, quoteMap };
}

// ─── Raw dividend data from provider ─────────────────────────────────────────
interface RawDividend {
  paymentDate: string;
  exDate: string | null;
  amountPerUnit: number;
  source: string;
}

// ─── Fetch dividends via internal API ────────────────────────────────────────
async function fetchDividendsApi(ticker: string): Promise<RawDividend[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://invest.sinedtech.com';

    const res = await fetch(`${appUrl}/api/dividends?ticker=${encodeURIComponent(ticker)}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      logger.warn(`[dividends-api] HTTP ${res.status} for ${ticker}`);
      return [];
    }

    const data = await res.json();
    const divs = data?.dividends ?? [];

    return divs.map(
      (d: {
        paymentDate?: string;
        exDate?: string | null;
        amountPerUnit?: number;
        source?: string;
      }) => ({
        paymentDate: d.paymentDate?.slice(0, 10) ?? '',
        exDate: d.exDate?.slice(0, 10) ?? null,
        amountPerUnit: d.amountPerUnit ?? 0,
        source: d.source ?? 'api',
      })
    );
  } catch (e) {
    logger.error(`[dividends-api] Fetch error for ${ticker}:`, e);
    return [];
  }
}

// ─── Determine event status ──────────────────────────────────────────────────
function deriveStatus(exDate: string | null, paymentDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const payDt = new Date(paymentDate);
  payDt.setHours(0, 0, 0, 0);

  if (payDt < now) return 'paid';

  if (exDate) {
    const exDt = new Date(exDate);
    exDt.setHours(0, 0, 0, 0);

    if (exDt < now) return 'entitled';
    return 'announced';
  }

  return 'expected';
}

// ─── Main sync dividends ─────────────────────────────────────────────────────
export async function syncDividends(
  assets: Asset[],
  portfolioId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const eligible = assets.filter(
    (a) => a.active && !a.ticker.toLowerCase().startsWith('tesouro')
  );

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 13);

  const future = new Date(now);
  future.setMonth(future.getMonth() + 3);

  for (const asset of eligible) {
    try {
      const { data: holding } = await supabase
        .from('holdings')
        .select('quantity')
        .eq('asset_id', asset.id)
        .maybeSingle();

      const currentQty = holding?.quantity ?? 0;
      if (currentQty <= 0) continue;

      const { data: existing } = await supabase
        .from('dividend_events')
        .select('ex_date, payment_date')
        .eq('asset_id', asset.id);

      const existingKeys = new Set(
        (existing ?? []).map((e: { ex_date: string | null; payment_date: string }) => {
          return `${e.ex_date ?? 'null'}|${e.payment_date}`;
        })
      );

      const raws = await fetchDividendsApi(asset.ticker);
      if (raws.length === 0) continue;

      const toInsert: Array<Record<string, unknown>> = [];

      for (const raw of raws) {
        if (!raw.amountPerUnit || raw.amountPerUnit <= 0) continue;

        const payDt = new Date(raw.paymentDate);
        if (payDt < cutoff || payDt > future) continue;

        const key = `${raw.exDate ?? 'null'}|${raw.paymentDate}`;
        if (existingKeys.has(key)) continue;

        const status = deriveStatus(raw.exDate, raw.paymentDate);
        const expectedTotal = Math.round(raw.amountPerUnit * currentQty * 100) / 100;
        const receivedAmount = status === 'paid' ? expectedTotal : 0;

        toInsert.push({
          asset_id: asset.id,
          portfolio_id: portfolioId,
          ex_date: raw.exDate,
          payment_date: raw.paymentDate,
          amount_per_unit: raw.amountPerUnit,
          quantity_on_ex_date: currentQty,
          expected_amount: expectedTotal,
          received_amount: receivedAmount,
          status,
          data_source: raw.source,
          ex_date_estimated: raw.exDate === null,
          qty_is_snapshot: false,
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

    await new Promise((r) => setTimeout(r, 300));
  }

  logger.info?.(`[syncDividends] Done — synced: ${synced}, errors: ${errors.length}`);
  return { synced, errors };
}

// ─── Re-evaluate status for existing events ──────────────────────────────────
export async function reconcileDividendStatuses(portfolioId: string): Promise<void> {
  const { data: events } = await supabase
    .from('dividend_events')
    .select('id, ex_date, payment_date, status, expected_amount')
    .eq('portfolio_id', portfolioId)
    .in('status', ['expected', 'announced', 'entitled', 'pending']);

  if (!events || events.length === 0) return;

  for (const ev of events) {
    const newStatus = deriveStatus(ev.ex_date, ev.payment_date);
    if (newStatus === ev.status) continue;

    const update: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'paid') {
      update.received_amount = ev.expected_amount;
    }

    await supabase.from('dividend_events').update(update).eq('id', ev.id);
  }
}
