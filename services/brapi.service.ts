'use client';
import { logger } from '@/utils/logger';

const BRAPI_TOKEN = 'jzAgNYE1VFcMNXMuhkfzwh';
const BASE_URL    = 'https://brapi.dev/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrapiQuote {
  symbol:                      string;
  regularMarketPrice:          number;
  regularMarketChangePercent:  number;
  regularMarketChange:         number;
  regularMarketPreviousClose:  number;
  regularMarketOpen:           number;
  regularMarketVolume:         number;
  logourl?:                    string;
  shortName?:                  string;
  longName?:                   string;
  currency:                    string;
}

export interface BrapiDividend {
  symbol:       string;
  paymentDate:  string;    // "YYYY-MM-DD"
  declarationDate?: string;
  recordDate?:  string;
  value:        number;    // value per share
  type?:        string;    // "JRS CAPITAL PROPRIO", "DIVIDENDO", etc.
}

// ─── Quote — fetch current prices ────────────────────────────────────────────

export async function fetchQuotes(tickers: string[]): Promise<BrapiQuote[]> {
  if (tickers.length === 0) return [];

  // brapi allows up to 50 tickers per request
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 50) {
    chunks.push(tickers.slice(i, i + 50));
  }

  const results: BrapiQuote[] = [];

  for (const chunk of chunks) {
    try {
      const symbols = chunk.join(',');
      const res     = await fetch(
        `${BASE_URL}/quote/${symbols}?token=${BRAPI_TOKEN}&fundamental=false`,
        { cache: 'no-store' }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.results) results.push(...data.results);
    } catch (e) {
      logger.error('brapi quote error:', e);
    }
  }

  return results;
}

// ─── Dividends — fetch dividend history for a ticker ──────────────────────────

export async function fetchDividends(ticker: string): Promise<BrapiDividend[]> {
  try {
    const res  = await fetch(
      `${BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN}&dividends=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const raw  = data?.results?.[0]?.dividendsData?.cashDividends ?? [];

    return raw
      .filter((d: { paymentDate?: string; value?: number }) => d.paymentDate && d.value)
      .map((d: { paymentDate: string; declarationDate?: string; value: number; label?: string }) => ({
        symbol:          ticker,
        paymentDate:     d.paymentDate.slice(0, 10),
        declarationDate: d.declarationDate?.slice(0, 10),
        value:           d.value,
        type:            d.label ?? 'DIVIDENDO',
      }));
  } catch (e) {
    logger.error(`brapi dividends error for ${ticker}:`, e);
    return [];
  }
}

// ─── Fetch dividends for multiple tickers ────────────────────────────────────

export async function fetchAllDividends(tickers: string[]): Promise<BrapiDividend[]> {
  const all: BrapiDividend[] = [];
  // Fetch sequentially to avoid rate limits
  for (const ticker of tickers) {
    const divs = await fetchDividends(ticker);
    all.push(...divs);
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));
  }
  return all;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function buildQuoteMap(quotes: BrapiQuote[]): Record<string, BrapiQuote> {
  const map: Record<string, BrapiQuote> = {};
  quotes.forEach(q => { map[q.symbol] = q; });
  return map;
}
