/**
 * Dividend Reconciliation Utility — Dev/Admin Only
 *
 * This is NOT user-facing. Use it to debug mismatches between
 * SINED Invest totals and a benchmark like Status Invest.
 *
 * Usage (browser console on any app page):
 *   import('/lib/calculations/dividend-reconcile').then(m => m.reconcileReport(window.__SINED_ASSETS__, window.__SINED_DIVIDENDS__))
 *
 * Or call reconcileDividendDebug(assets, dividends, holdingsMap) directly.
 */

import type { DividendEvent, Asset } from '@/types';
import { isPaid, isPending, isAnnounced, isEntitled } from './dividend-calendar';

export interface AssetReconcileRow {
  ticker:               string;
  assetId:              string;
  eventsTotal:          number;
  // Per-event detail
  events: {
    id:                 string;
    exDate:             string | null;
    paymentDate:        string;
    amountPerUnit:      number;
    qtyOnExDate:        number;
    expectedAmount:     number;
    receivedAmount:     number;
    status:             string;
    dataSource:         string;
    exDateEstimated:    boolean;
    qtyIsSnapshot:      boolean;
    // Derived
    isEntitled:         boolean;
    isPaid:             boolean;
    isPending:          boolean;
  }[];
  // Aggregates
  totalExpected:        number;
  totalEntitled:        number;   // ex-date passed, user should receive
  totalPaid:            number;   // payment date passed
  totalPending:         number;   // entitled but not yet paid
  // Data quality flags
  hasEstimatedExDate:   boolean;
  hasNonSnapshotQty:    boolean;
  hasMissingExDate:     boolean;
}

export interface ReconcileReport {
  generatedAt:    string;
  assetCount:     number;
  eventCount:     number;
  grandTotals: {
    expected:     number;
    entitled:     number;
    paid:         number;
    pending:      number;
  };
  dataQuality: {
    eventsWithEstimatedExDate:  number;
    eventsWithCurrentQty:       number;    // not a snapshot
    eventsWithMissingExDate:    number;
    eventsWithZeroAmount:       number;
  };
  rows:           AssetReconcileRow[];
  // Human-readable summary for copy-pasting into comparison with Status Invest
  summaryText:    string;
}

export function buildReconcileReport(
  assets: Asset[],
  dividends: DividendEvent[],
  holdingsMap: Record<string, { quantity: number; avg_price: number }>
): ReconcileReport {
  const now = new Date();
  const rows: AssetReconcileRow[] = [];

  const assetMap = new Map(assets.map(a => [a.id, a]));

  // Group events by asset
  const byAsset = new Map<string, DividendEvent[]>();
  for (const ev of dividends) {
    if (!byAsset.has(ev.asset_id)) byAsset.set(ev.asset_id, []);
    byAsset.get(ev.asset_id)!.push(ev);
  }

  for (const [assetId, events] of byAsset) {
    const asset   = assetMap.get(assetId);
    const ticker  = asset?.ticker ?? assetId;
    const holding = holdingsMap[assetId];

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );

    let totalExpected  = 0;
    let totalEntitled  = 0;
    let totalPaid      = 0;
    let totalPending   = 0;
    let hasEstimatedEx = false;
    let hasNonSnap     = false;
    let hasMissingEx   = false;

    const eventRows = sortedEvents.map(ev => {
      const amtPerUnit  = (ev as unknown as Record<string, number>).amount_per_unit ?? 0;
      const qtyOnEx     = (ev as unknown as Record<string, number>).quantity_on_ex_date ?? holding?.quantity ?? 0;
      const qtySnap     = (ev as unknown as Record<string, boolean>).qty_is_snapshot ?? false;
      const exEstimated = (ev as unknown as Record<string, boolean>).ex_date_estimated ?? false;
      const src         = (ev as unknown as Record<string, string>).data_source ?? 'unknown';

      const entitled = isEntitled(ev.status);
      const paid     = isPaid(ev.status);
      const pending  = isPending(ev.status);

      totalExpected += ev.expected_amount;
      if (entitled) totalEntitled += ev.expected_amount;
      if (paid)     totalPaid     += ev.received_amount > 0 ? ev.received_amount : ev.expected_amount;
      if (pending)  totalPending  += ev.expected_amount;

      if (exEstimated)     hasEstimatedEx = true;
      if (!qtySnap)        hasNonSnap     = true;
      if (!ev.ex_date)     hasMissingEx   = true;

      return {
        id:              ev.id,
        exDate:          ev.ex_date,
        paymentDate:     ev.payment_date,
        amountPerUnit:   amtPerUnit,
        qtyOnExDate:     qtyOnEx,
        expectedAmount:  ev.expected_amount,
        receivedAmount:  ev.received_amount,
        status:          ev.status,
        dataSource:      src,
        exDateEstimated: exEstimated,
        qtyIsSnapshot:   qtySnap,
        isEntitled:      entitled,
        isPaid:          paid,
        isPending:       pending,
      };
    });

    rows.push({
      ticker,
      assetId,
      eventsTotal:       sortedEvents.length,
      events:            eventRows,
      totalExpected,
      totalEntitled,
      totalPaid,
      totalPending,
      hasEstimatedExDate: hasEstimatedEx,
      hasNonSnapshotQty:  hasNonSnap,
      hasMissingExDate:   hasMissingEx,
    });
  }

  // Grand totals
  const grandTotals = rows.reduce((acc, r) => ({
    expected:  acc.expected  + r.totalExpected,
    entitled:  acc.entitled  + r.totalEntitled,
    paid:      acc.paid      + r.totalPaid,
    pending:   acc.pending   + r.totalPending,
  }), { expected: 0, entitled: 0, paid: 0, pending: 0 });

  const allEvents = dividends;
  const dataQuality = {
    eventsWithEstimatedExDate:  allEvents.filter(e => (e as unknown as Record<string, boolean>).ex_date_estimated).length,
    eventsWithCurrentQty:       allEvents.filter(e => !(e as unknown as Record<string, boolean>).qty_is_snapshot).length,
    eventsWithMissingExDate:    allEvents.filter(e => !e.ex_date).length,
    eventsWithZeroAmount:       allEvents.filter(e => e.expected_amount <= 0).length,
  };

  // Text summary for manual comparison with Status Invest
  const fmt = (n: number) => `R$ ${n.toFixed(2)}`;
  const lines = [
    `=== SINED Invest — Dividend Reconciliation Report ===`,
    `Generated: ${now.toLocaleString('pt-BR')}`,
    `Assets: ${rows.length} | Events: ${allEvents.length}`,
    ``,
    `GRAND TOTALS:`,
    `  Expected (all events):     ${fmt(grandTotals.expected)}`,
    `  Entitled (ex-date passed): ${fmt(grandTotals.entitled)}`,
    `  Paid (payment date passed):${fmt(grandTotals.paid)}`,
    `  Pending (entitled, unpaid):${fmt(grandTotals.pending)}`,
    ``,
    `DATA QUALITY FLAGS:`,
    `  Estimated ex-dates:        ${dataQuality.eventsWithEstimatedExDate}`,
    `  Using current qty (not snapshot): ${dataQuality.eventsWithCurrentQty}`,
    `  Missing ex-date:           ${dataQuality.eventsWithMissingExDate}`,
    `  Zero-amount events:        ${dataQuality.eventsWithZeroAmount}`,
    ``,
    `PER-ASSET BREAKDOWN:`,
    ...rows.map(r => [
      `  ${r.ticker.padEnd(12)} events=${r.eventsTotal} expected=${fmt(r.totalExpected)} entitled=${fmt(r.totalEntitled)} paid=${fmt(r.totalPaid)}${r.hasMissingExDate ? ' ⚠️ missing_ex_date' : ''}${r.hasNonSnapshotQty ? ' ⚠️ current_qty_used' : ''}`,
    ]).flat(),
    ``,
    `COMPARISON INSTRUCTIONS:`,
    `  1. Open Status Invest and navigate to each ticker's dividend history`,
    `  2. Compare "Valor por Cota" with amountPerUnit above`,
    `  3. Compare "Data Com" with exDate above`,
    `  4. Compare "Data Pagamento" with paymentDate above`,
    `  5. Multiply "Valor por Cota" × your qty to get expected total`,
    `  6. Flag discrepancies: if SI shows different per-unit, update the event manually`,
    ``,
    `NOTE: Quantities marked ⚠️ current_qty_used may be inaccurate if you traded`,
    `after the ex-date. Update quantity_on_ex_date manually for precision.`,
  ];

  return {
    generatedAt:  now.toISOString(),
    assetCount:   rows.length,
    eventCount:   allEvents.length,
    grandTotals,
    dataQuality,
    rows,
    summaryText:  lines.join('\n'),
  };
}

// ─── Print report to console ──────────────────────────────────────────────────
export function printReconcileReport(
  assets: Asset[],
  dividends: DividendEvent[],
  holdingsMap: Record<string, { quantity: number; avg_price: number }>
): void {
  const report = buildReconcileReport(assets, dividends, holdingsMap);
  console.group('[SINED] Dividend Reconciliation Report');
  console.log(report.summaryText);
  console.log('Full report object:', report);
  console.groupEnd();
}
