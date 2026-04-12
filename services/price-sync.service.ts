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

// ─── Raw dividend data from provider ─────────────────────────────────────────
interface RawDividend {
  paymentDate:   string;          // ISO date YYYY-MM-DD
  exDate:        string | null;   // may be absent from provider
  amountPerUnit: number;          // per-share value (canonical)
  source:        string;
}

// ─── brapi — try dividends endpoint (paid plan) ───────────────────────────────
async function fetchBrapiDividends(ticker: string): Promise<RawDividend[]> {
  try {
    const res = await fetch(
      `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&dividends=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      logger.warn(`[brapi] HTTP ${res.status} for ${ticker}`);
      return [];
    }
    const data   = await res.json();
    const result = data?.results?.[0];
    const divs   = result?.dividendsData?.cashDividends ?? [];

    const mapped = divs
      .filter((d: Record<string, unknown>) => (d.value || d.rate) && d.paymentDate)
      .map((d: Record<string, unknown>) => ({
        paymentDate:   String(d.paymentDate).slice(0, 10),
        exDate:        d.approvedOn
          ? String(d.approvedOn).slice(0, 10)
          : d.lastDatePrior
          ? String(d.lastDatePrior).slice(0, 10)
          : null,
        amountPerUnit: Number(d.value ?? d.rate ?? 0),
        source:        'brapi',
      }));

    console.log(`[brapi] ${ticker}: ${mapped.length} dividend events`);
    return mapped;
  } catch {
    return [];
  }
}

// ─── Yahoo Finance via our own server-side proxy ───────────────────────────────
// Previously used allorigins.win as a CORS proxy — this was unreliable and
// frequently returned empty/error responses, silently killing the pipeline.
// Now we call our own Next.js API route which fetches Yahoo Finance server-side
// with no CORS restrictions and proper headers.
async function fetchYahooDividends(ticker: string): Promise<RawDividend[]> {
  try {
    const res = await fetch(`/api/dividends?ticker=${encodeURIComponent(ticker)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      logger.error(`[yahoo-proxy] /api/dividends returned ${res.status} for ${ticker}`);
      return [];
    }
    const data = await res.json();

    if (!data.dividends || data.dividends.length === 0) {
      if (data.error) {
        logger.error(`[yahoo-proxy] Error for ${ticker}: ${data.error}`);
      } else {
        logger.warn(`[yahoo-proxy] No dividends found for ${ticker}`);
      }
      return [];
    }

    console.log(`[yahoo-proxy] ${ticker}: ${data.dividends.length} events from Yahoo Finance`);

    return data.dividends.map((d: { exDate: string; paymentDate: string; amountPerUnit: number }) => ({
      paymentDate:   d.paymentDate,
      exDate:        d.exDate,   // Yahoo 'date' field IS the ex-date
      amountPerUnit: d.amountPerUnit,
      source:        'yahoo',
    }));
  } catch (e) {
    logger.error(`[yahoo-proxy] Fetch error for ${ticker}:`, e);
    return [];
  }
}

// ─── Estimate payment date from ex-date ──────────────────────────────────────
// FIIs: typically pay 5 business days (≈7 calendar days) after ex-date
// Stocks: typically 30 calendar days after ex-date
// Without asset type info, use a conservative 5-day estimate.
function estimatePaymentDate(exDateStr: string): string {
  const d = new Date(exDateStr);
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

// ─── Determine event status from dates ───────────────────────────────────────
// Uses precise lifecycle:
//   announced → ex_date in future → user not yet entitled
//   entitled  → ex_date passed, payment_date in future → user IS entitled
//   paid      → payment_date passed → user should have received it
function deriveStatus(exDate: string | null, paymentDate: string): string {
  const now         = new Date();
  now.setHours(0, 0, 0, 0);
  const payDt = new Date(paymentDate);
  payDt.setHours(0, 0, 0, 0);

  if (payDt < now) {
    return 'paid'; // payment date has passed — treat as received
  }

  if (exDate) {
    const exDt = new Date(exDate);
    exDt.setHours(0, 0, 0, 0);
    if (exDt < now) {
      return 'entitled'; // ex-date passed, not yet paid
    }
    return 'announced'; // ex-date in future
  }

  // No ex_date known — can only go by payment date
  return 'expected'; // legacy fallback
}

// ─── Main sync dividends function ─────────────────────────────────────────────
export async function syncDividends(
  assets: Asset[],
  portfolioId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let   synced = 0;

  const eligible = assets.filter(a =>
    a.active && !a.ticker.toLowerCase().startsWith('tesouro')
  );

  const now    = new Date();
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 13);
  const future = new Date(now); future.setMonth(future.getMonth() + 3);

  for (const asset of eligible) {
    try {
      // Get current holdings quantity (best proxy we have for qty on ex-date)
      const { data: holding } = await supabase
        .from('holdings').select('quantity').eq('asset_id', asset.id).maybeSingle();
      const currentQty = holding?.quantity ?? 0;
      if (currentQty <= 0) continue;

      // Fetch existing events to avoid duplication
      // Dedup key: (asset_id, ex_date, payment_date) — not just payment_date
      const { data: existing } = await supabase
        .from('dividend_events')
        .select('ex_date, payment_date')
        .eq('asset_id', asset.id);

      const existingKeys = new Set(
        (existing ?? []).map((e: { ex_date: string | null; payment_date: string }) =>
          `${e.ex_date ?? 'null'}|${e.payment_date}`
        )
      );

      // Fetch from providers — brapi first, Yahoo fallback
      console.log(`[syncDividends] Fetching ${asset.ticker} via brapi...`);
      let raws: RawDividend[] = await fetchBrapiDividends(asset.ticker);

      if (raws.length === 0) {
        console.log(`[syncDividends] brapi returned 0 for ${asset.ticker}, trying Yahoo Finance proxy...`);
        raws = await fetchYahooDividends(asset.ticker);
      }

      if (raws.length === 0) {
        logger.warn(`[syncDividends] Both providers returned 0 dividends for ${asset.ticker}`);
        continue;
      }

      console.log(`[syncDividends] ${asset.ticker}: ${raws.length} raw events from provider`);

      const toInsert = [];
      for (const raw of raws) {
        if (!raw.amountPerUnit || raw.amountPerUnit <= 0) continue;

        const payDt = new Date(raw.paymentDate);
        if (payDt < cutoff || payDt > future) continue;

        // Dedup check using composite key
        const key = `${raw.exDate ?? 'null'}|${raw.paymentDate}`;
        if (existingKeys.has(key)) continue;

        const status = deriveStatus(raw.exDate, raw.paymentDate);

        // expected_amount = amount_per_unit × quantity
        // We use current qty as the best available proxy.
        // qty_is_snapshot=false signals this is current qty, not a historical snapshot.
        const expectedTotal = Math.round(raw.amountPerUnit * currentQty * 100) / 100;

        // received_amount is ONLY set when status is 'paid' — never assume received otherwise
        const receivedAmount = status === 'paid' ? expectedTotal : 0;

        // ex_date_estimated: true when we inferred ex_date from Yahoo's 'date' field
        // (Yahoo's 'date' in the dividends event IS the ex-date, so it's NOT estimated)
        // It IS estimated when we computed it from paymentDate for brapi without exDate
        const exDateEstimated = raw.source === 'brapi' && raw.exDate === null;

        toInsert.push({
          asset_id:            asset.id,
          portfolio_id:        portfolioId,
          ex_date:             raw.exDate,
          payment_date:        raw.paymentDate,
          amount_per_unit:     raw.amountPerUnit,
          quantity_on_ex_date: currentQty,
          expected_amount:     expectedTotal,
          received_amount:     receivedAmount,
          status,
          data_source:         raw.source,
          ex_date_estimated:   exDateEstimated,
          qty_is_snapshot:     false,   // we used current qty, not a historical snapshot
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

  console.log(`[syncDividends] Done — synced: ${synced}, errors: ${errors.length}`, errors.length ? errors : '');
  return { synced, errors };
}

// ─── Re-evaluate status for existing events ───────────────────────────────────
// Call this to update stale 'expected'/'entitled' events after their dates pass.
// Run this on app load or dividend page open.
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
    // When transitioning to 'paid', set received_amount if not already set
    if (newStatus === 'paid') {
      update.received_amount = ev.expected_amount;
    }

    await supabase
      .from('dividend_events')
      .update(update)
      .eq('id', ev.id);
  }
}
