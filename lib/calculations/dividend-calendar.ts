import { DividendEvent, ContributionWindow, ContributionTimingMode } from '@/types';

// ─── Status helpers ───────────────────────────────────────────────────────────
// Normalize legacy status values to the canonical lifecycle
export function isPaid(status: DividendEvent['status']): boolean {
  return status === 'paid' || status === 'received';
}

export function isEntitled(status: DividendEvent['status']): boolean {
  // Entitled = ex-date passed regardless of whether payment arrived
  return status === 'entitled' || status === 'paid' || status === 'received' || status === 'pending';
}

export function isPending(status: DividendEvent['status']): boolean {
  // Pending = entitled but not yet paid
  return status === 'entitled' || status === 'pending';
}

export function isAnnounced(status: DividendEvent['status']): boolean {
  return status === 'announced' || status === 'expected';
}

export function isCanceled(status: DividendEvent['status']): boolean {
  return status === 'canceled';
}

// ─── Contribution window calculation ─────────────────────────────────────────
export function calculateContributionWindow(
  events: DividendEvent[],
  mode: ContributionTimingMode,
  manualAmount: number
): ContributionWindow {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filter to non-canceled events, sort by payment_date
  const sorted = [...events]
    .filter(e => !isCanceled(e.status))
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

  const thisMonth = sorted.filter(e => {
    const d = new Date(e.payment_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // total_expected: all non-canceled events this month
  const total_expected = thisMonth.reduce((s, e) => s + e.expected_amount, 0);

  // total_received: ONLY events where payment was confirmed (paid/received status)
  // Use received_amount if set, otherwise expected_amount for paid events
  const total_received = thisMonth
    .filter(e => isPaid(e.status))
    .reduce((s, e) => {
      // If received_amount is explicitly set and > 0, use it
      // Otherwise fall back to expected_amount (best estimate)
      const amount = e.received_amount > 0 ? e.received_amount : e.expected_amount;
      return s + amount;
    }, 0);

  // total_pending: entitled (ex-date passed) but NOT yet paid
  const total_pending = thisMonth
    .filter(e => isPending(e.status) || isAnnounced(e.status))
    .reduce((s, e) => s + e.expected_amount, 0);

  // Next upcoming payments (payment_date in the future, not canceled)
  const next_payments = sorted
    .filter(e => new Date(e.payment_date) > now && !isCanceled(e.status))
    .slice(0, 5);

  // Last payment event of the month (by payment_date)
  const lastPayment = thisMonth.length > 0 ? thisMonth[thisMonth.length - 1] : null;

  let suggested_date: string | null = null;
  let ready = false;

  switch (mode) {
    case 'after_last_payment': {
      if (lastPayment) {
        suggested_date = lastPayment.payment_date;
        // Ready when last payment date has passed AND it's paid/entitled
        const payDt = new Date(lastPayment.payment_date);
        payDt.setHours(0, 0, 0, 0);
        ready = payDt <= now && isEntitled(lastPayment.status);
      } else {
        ready = true; // no dividends this month — can contribute anytime
      }
      break;
    }

    case 'current_received_only': {
      // Ready only when at least some payment confirmed as paid
      ready = total_received > 0;
      suggested_date = now.toISOString();
      break;
    }

    case 'after_percentage_received': {
      // Ready when at least 80% of expected has been paid
      const pct = total_expected > 0 ? (total_received / total_expected) * 100 : 100;
      ready = pct >= 80;
      suggested_date = lastPayment?.payment_date ?? null;
      break;
    }

    case 'fixed_date': {
      ready = true;
      suggested_date = now.toISOString();
      break;
    }
  }

  return {
    mode,
    suggested_date,
    last_payment_date: lastPayment?.payment_date ?? null,
    total_expected,
    total_received,
    total_pending,
    next_payments,
    ready,
  };
}

// ─── Status labels ────────────────────────────────────────────────────────────
export function getStatusLabel(status: DividendEvent['status']): string {
  const map: Record<string, string> = {
    announced: 'Anunciado',
    entitled:  'A Receber',
    paid:      'Pago',
    expected:  'Esperado',   // legacy
    received:  'Recebido',   // legacy
    pending:   'Pendente',   // legacy
    canceled:  'Cancelado',
  };
  return map[status] ?? status;
}

export function getStatusColor(status: DividendEvent['status']): string {
  if (isPaid(status))     return '#059669';
  if (isPending(status))  return '#1B4FD8';
  if (isAnnounced(status))return '#D97706';
  if (isCanceled(status)) return '#94A3B8';
  return '#D97706';
}

export function getTimingModeLabel(mode: ContributionTimingMode): string {
  const map: Record<ContributionTimingMode, string> = {
    after_last_payment:          'Após último pagamento do mês',
    after_percentage_received:   'Após 80% dos proventos recebidos',
    current_received_only:       'Apenas com proventos já recebidos',
    fixed_date:                  'Data fixa',
  };
  return map[mode] ?? mode;
}
