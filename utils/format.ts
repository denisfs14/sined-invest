export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatMonthYear(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function daysFromNow(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// ─── Relative time ────────────────────────────────────────────────────────────
export function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10)  return 'agora mesmo';
  if (diff < 60)  return `${diff}s atrás`;
  const mins = Math.floor(diff / 60);
  if (mins < 60)  return `${mins}min atrás`;
  return `${Math.floor(mins / 60)}h atrás`;
}

// ─── Fixed income detection ───────────────────────────────────────────────────
// Fixed income assets (Tesouro Direto, CDB, LCI, LCA, etc.) can have fractional
// quantities. All other assets (stocks, FIIs, ETFs, BDRs) must show whole numbers.
const FIXED_INCOME_TICKER_PATTERNS = [
  /^TESOURO/i,
  /^LFT/i,   // Selic
  /^NTN/i,   // IPCA+, prefixado
  /^LTN/i,   // Prefixado
  /^LCI/i,
  /^LCA/i,
  /^CDB/i,
  /^CRI/i,
  /^CRA/i,
  /^DEBENTURE/i,
  /^LIG/i,
];

const FIXED_INCOME_CLASS_PATTERNS = [
  /renda.?fixa/i,
  /fixed.?income/i,
  /tesouro/i,
  /cr[ée]dito/i,
  /privado/i,
];

export function isFixedIncome(ticker: string, className?: string | null): boolean {
  if (FIXED_INCOME_TICKER_PATTERNS.some(p => p.test(ticker))) return true;
  if (className && FIXED_INCOME_CLASS_PATTERNS.some(p => p.test(className))) return true;
  return false;
}

// ─── Quantity formatting ──────────────────────────────────────────────────────
// Fixed income: up to 3 decimal places. Others: integer only.
export function formatQuantity(qty: number, ticker: string, className?: string | null): string {
  if (isFixedIncome(ticker, className)) {
    // Show up to 3 decimal places, stripping trailing zeros
    const s = qty.toFixed(3);
    return s.replace(/\.?0+$/, '') || '0';
  }
  // Non-fixed-income: always whole number
  return String(Math.round(qty));
}
