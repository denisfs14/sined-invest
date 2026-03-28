import { DividendEvent, ContributionWindow, ContributionTimingMode } from '@/types';

// ─── Analyse dividend events for the month ────────────────────────────────────
export function calculateContributionWindow(
  events: DividendEvent[],
  mode: ContributionTimingMode,
  manualAmount: number
): ContributionWindow {
  const now = new Date();

  // Filter to current + near-future events, sort by payment_date
  const sorted = [...events].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  const thisMonth = sorted.filter(e => {
    const d = new Date(e.payment_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const total_expected = thisMonth.reduce((s, e) => s + e.expected_amount, 0);
  const total_received = thisMonth
    .filter(e => e.status === 'received')
    .reduce((s, e) => s + (e.received_amount || e.expected_amount), 0);
  const total_pending  = thisMonth
    .filter(e => e.status === 'expected' || e.status === 'pending')
    .reduce((s, e) => s + e.expected_amount, 0);

  // Next upcoming payments (future)
  const next_payments = sorted
    .filter(e => new Date(e.payment_date) > now && e.status !== 'canceled')
    .slice(0, 5);

  // Last payment of the month
  const lastPayment = thisMonth.length > 0
    ? thisMonth[thisMonth.length - 1]
    : null;

  let suggested_date: string | null = null;
  let ready = false;

  switch (mode) {
    case 'after_last_payment': {
      if (lastPayment) {
        suggested_date = lastPayment.payment_date;
        ready = new Date(lastPayment.payment_date) <= now &&
          (lastPayment.status === 'received' || lastPayment.status === 'expected');
      } else {
        ready = true; // no dividends this month, can contribute anytime
      }
      break;
    }

    case 'current_received_only': {
      ready = total_received > 0;
      suggested_date = now.toISOString();
      break;
    }

    case 'after_percentage_received': {
      // Ready when at least 80% received
      const pct = total_expected > 0 ? (total_received / total_expected) * 100 : 100;
      ready = pct >= 80;
      suggested_date = lastPayment?.payment_date ?? null;
      break;
    }

    case 'fixed_date': {
      // Always ready on fixed_date mode
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getStatusLabel(status: DividendEvent['status']): string {
  const map: Record<DividendEvent['status'], string> = {
    expected: 'Esperado',
    received: 'Recebido',
    pending:  'Pendente',
    canceled: 'Cancelado',
  };
  return map[status] ?? status;
}

export function getStatusColor(status: DividendEvent['status']): string {
  const map: Record<DividendEvent['status'], string> = {
    expected: '#D97706',
    received: '#059669',
    pending:  '#1B4FD8',
    canceled: '#94A3B8',
  };
  return map[status] ?? '#94A3B8';
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
