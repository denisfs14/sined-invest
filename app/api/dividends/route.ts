// ─── app/api/dividends/route.ts ───────────────────────────────────────────────
// GET /api/dividends?ticker=ITSA4
//
// Server-side proxy to Yahoo Finance for B3 dividend data.
// Running server-side means:
//   - No CORS issues (the browser never touches finance.yahoo.com directly)
//   - No unreliable third-party proxy (allorigins.win was the old approach)
//   - Correct User-Agent and Accept headers that Yahoo Finance expects
//
// Returns an array of DividendRecord objects.

import { NextRequest, NextResponse } from 'next/server';

export interface DividendRecord {
  ticker:        string;
  paymentDate:   string;   // YYYY-MM-DD (estimated: ex-date + 5 days)
  exDate:        string;   // YYYY-MM-DD (from Yahoo 'date' field — this IS the ex-date)
  amountPerUnit: number;
  source:        'yahoo';
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: 'ticker param required' }, { status: 400 });
  }

  // Yahoo Finance uses .SA suffix for B3 (Bovespa) stocks
  const symbol  = `${ticker}.SA`;
  const now     = Math.floor(Date.now() / 1000);
  const yearAgo = now - 365 * 24 * 3600;
  const future  = now + 90  * 24 * 3600;

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?events=dividends&interval=1mo&period1=${yearAgo}&period2=${future}`;

  console.log(`[dividends-api] Fetching Yahoo Finance for ${symbol}`);

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; SINED-Invest/1.0)',
        'Accept':          'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Next.js 15: opt out of caching so we always get fresh data
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[dividends-api] Yahoo returned ${res.status} for ${symbol}: ${text.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}`, dividends: [] },
        { status: 200 } // Return 200 with empty array so caller can fall through gracefully
      );
    }

    const data = await res.json();

    // Yahoo Finance dividends event structure:
    // { chart: { result: [{ events: { dividends: { "timestamp": { date, amount } } } }] } }
    const divEvents: Record<string, { date: number; amount: number }> =
      data?.chart?.result?.[0]?.events?.dividends ?? {};

    const records: DividendRecord[] = Object.values(divEvents)
      .filter(d => d.amount > 0)
      .map(d => {
        // In Yahoo Finance, 'date' in the dividends event IS the ex-date (data com)
        const exDate = new Date(d.date * 1000).toISOString().slice(0, 10);
        // Estimate payment date: B3 typically pays ~5 business days after ex-date
        const paymentDate = estimatePaymentDate(exDate);
        return {
          ticker,
          exDate,
          paymentDate,
          amountPerUnit: d.amount,
          source: 'yahoo' as const,
        };
      })
      .sort((a, b) => a.exDate.localeCompare(b.exDate));

    console.log(`[dividends-api] ${ticker}: found ${records.length} dividend events`);
    return NextResponse.json({ ticker, dividends: records });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dividends-api] Error fetching ${ticker}:`, msg);
    return NextResponse.json({ error: msg, dividends: [] }, { status: 200 });
  }
}

/**
 * Estimates B3 payment date from ex-date.
 * FIIs typically pay within ~5 calendar days after ex-date.
 * Stocks typically ~30 calendar days.
 * We use 5 days as a conservative estimate for all types.
 */
function estimatePaymentDate(exDateStr: string): string {
  const d = new Date(exDateStr);
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}
