'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp, AlertCircle, CalendarDays, Zap,
  RefreshCw, ChevronDown, ChevronRight, ArrowRight,
  BookOpen, ShieldAlert, Target, Clock, Flame, Timer,
} from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { Asset, AssetClass } from '@/types';
import { calculateContributionWindow } from '@/lib/calculations/dividend-calendar';
import { formatCurrency, formatPercent, formatDate, daysFromNow, formatRelativeTime, formatQuantity } from '@/utils/format';
import {
  StatCard, Card, CardHeader, CardBody, Badge, TickerBadge,
  EmptyState, PageHeader, PageContent, PercentBar, Button, C,
} from '@/components/ui';
import { UpgradeBanner } from '@/components/ui/PlanGate';
import { useT } from '@/lib/i18n';
import { ModeToggle } from '@/components/ModeToggle';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = '14px', r = '6px' }: { w?: string; h?: string; r?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  );
}

export default function DashboardPage() {
  const {
    assets, holdingsMap, classes, history, strategy,
    dividends, loading, syncPricesNow, priceMap,
    mode, planData,
  } = useApp();

  const { t, locale } = useT();
  // Convert i18n locale to date locale string
  const dateLocale = locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';

  const [syncing,  setSyncing]  = useState(false);
  const [syncMsg,  setSyncMsg]  = useState('');
  const lastSyncRef = useRef<Date | null>(null); // ref, not state — avoids re-render

  // ── Guards ────────────────────────────────────────────────────────────────
  const isFetching   = useRef(false);  // prevent concurrent requests
  const hasSynced    = useRef(false);  // first-load flag
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async (silent = false) => {
    // Guard: skip if already fetching or no assets
    if (isFetching.current || assets.length === 0) return;
    isFetching.current = true;
    if (!silent) { setSyncing(true); setSyncMsg(t('dashboard.sync_updating')); }
    try {
      const res = await syncPricesNow();
      lastSyncRef.current = new Date(); // ref update — no re-render
      if (!silent) {
        setSyncMsg(t('dashboard.sync_updated', { count: res.updated }));
        setTimeout(() => setSyncMsg(''), 4000);
      }
    } catch {
      if (!silent) setSyncMsg(t('dashboard.sync_error'));
    } finally {
      isFetching.current = false;
      if (!silent) setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  // ── Auto-refresh: 30s active tab, 5min hidden tab ─────────────────────────
  useEffect(() => {
    if (loading || assets.length === 0) return;

    // Initial sync on first load
    if (!hasSynced.current) {
      hasSynced.current = true;
      runSync(true);
    }

    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = document.hidden ? 5 * 60_000 : 30_000;
      intervalRef.current = setInterval(() => {
        if (!document.hidden) runSync(true);
      }, interval);
    }

    startPolling();

    // Page Visibility API — pause/slow when tab is hidden
    function onVisibilityChange() {
      if (!document.hidden) {
        // Tab became visible — sync immediately then restart normal interval
        runSync(true);
      }
      startPolling();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, assets.length]);

  // ── Derived values ────────────────────────────────────────────────────────
  const totalValue = useMemo(
    () => assets.reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0),
    [assets, holdingsMap]
  );

  const redAssets = useMemo(() => assets.filter(a => a.is_red && a.active), [assets]);

  const window = useMemo(
    () => calculateContributionWindow(dividends, strategy?.contribution_timing_mode ?? 'after_last_payment', 0),
    [dividends, strategy]
  );

  const lastSim = history[0];

  const thisMonthDivs = useMemo(() => {
    const now = new Date();
    return dividends
      .filter(d => {
        const dt = new Date(d.payment_date);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((s, d) => s + (d.received_amount || d.expected_amount || 0), 0);
  }, [dividends]);

  const upcomingDivs = useMemo(() =>
    dividends
      .filter(d => { const days = daysFromNow(d.payment_date); return days >= 0 && days <= 60 && d.status !== 'received'; })
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
      .slice(0, 4),
    [dividends]
  );

  const { totalPL, totalCost } = useMemo(() => {
    let cost = 0, pl = 0;
    assets.filter(a => a.active).forEach(a => {
      const h = holdingsMap[a.id]; const qty = h?.quantity ?? 0; const pm = h?.avg_price ?? 0;
      const price = priceMap[a.ticker]?.price ?? a.current_price;
      cost += qty * pm; pl += qty * (price - pm);
    });
    return { totalPL: pl, totalCost: cost };
  }, [assets, holdingsMap, priceMap]);

  const isEmpty = !loading && assets.length === 0;

  // ── Date used for ex-div comparisons ─────────────────────────────────────
  // No state — each memo computes fresh Date() inline to avoid stale closures
  // and prevent unnecessary re-renders from a time-ticker.

  // ── Nearest upcoming ex-dividend (within 14 days) — "buy before" trigger ──
  const nextExDiv = useMemo(() => {
    const _now = new Date(); // fresh Date() — no state dep, no re-render trigger
    const candidates = dividends
      .filter(d => {
        if (!d.ex_date) return false;
        const diff = Math.ceil((new Date(d.ex_date).getTime() - _now.getTime()) / 86_400_000);
        return diff >= 0 && diff <= 14;
      })
      .sort((a, b) => new Date(a.ex_date).getTime() - new Date(b.ex_date).getTime());
    if (candidates.length === 0) return null;
    const ev       = candidates[0];
    const asset    = assets.find(a => a.id === ev.asset_id);
    const daysLeft = Math.max(0, Math.ceil((new Date(ev.ex_date).getTime() - _now.getTime()) / 86_400_000));
    const buyDeadline = new Date(ev.ex_date);
    buyDeadline.setDate(buyDeadline.getDate() - 1);
    return { ev, asset, daysLeft, buyDeadline };
  }, [dividends, assets]); // no 'now' dep — avoids re-render on timer tick

  // ── What to do decision ────────────────────────────────────────────────────
  const decision = useMemo(() => {
    if (isEmpty) return null;
    if (window.ready) return { type: 'aportar', label: t('dashboard.decision_contribute'), desc: window.total_received > 0 ? `${formatCurrency(window.total_received)} ${t('dashboard.decision_dividends_avail')}` : t('dashboard.decision_window_open'), urgent: true };
    if (redAssets.length > 0) return { type: 'oportunidade', label: redAssets.length === 1 ? t('dashboard.decision_red_assets', { count: redAssets.length }) : t('dashboard.decision_red_assets_pl', { count: redAssets.length }), desc: t('dashboard.decision_priority_pm'), urgent: false };
    if (upcomingDivs.length > 0) { const days = daysFromNow(upcomingDivs[0].payment_date); return { type: 'aguardar', label: t('dashboard.decision_wait', { days }), desc: t('dashboard.decision_next_div', { date: formatDate(upcomingDivs[0].payment_date) }), urgent: false }; }
    return { type: 'ok', label: t('dashboard.decision_healthy'), desc: t('dashboard.decision_no_alerts'), urgent: false };
  }, [isEmpty, window, redAssets, upcomingDivs, t]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={mode === 'advanced' ? t('dashboard.subtitle_advanced') : t('dashboard.subtitle_simple')}
        action={
          <div className="page-header-actions">
            {syncMsg && <span style={{ fontSize: '11px', color: C.green, fontWeight: '600', opacity: 0.8 }}>{syncMsg}</span>}
            <ModeToggle compact />
            <Button variant="secondary" size="sm" onClick={() => runSync(false)} loading={syncing}>
              <RefreshCw size={13} /> {t('dashboard.sync_prices')}
            </Button>
            <Link href="/contribution">
              <Button variant="gold" size="sm"><Zap size={13} /> {t('dashboard.contribute_btn')}</Button>
            </Link>
          </div>
        }
      />

      <PageContent>

        {/* ══════════════════════════════════════════════════════════════════════
            EMERGENCY: Buy Before banner — shown when ex-div ≤ 3 days
            This is the first thing the user sees. Cannot be ignored.
        ══════════════════════════════════════════════════════════════════════ */}
        {!isEmpty && !loading && nextExDiv && nextExDiv.daysLeft <= 3 && (
          <Link href="/contribution" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
            <div style={{
              background: nextExDiv.daysLeft === 0
                ? `linear-gradient(135deg, #7F1D1D, #991B1B)`
                : `linear-gradient(135deg, #78350F, #92400E)`,
              borderRadius: '16px', padding: '20px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '20px', flexWrap: 'wrap',
              boxShadow: '0 8px 32px rgba(0,0,0,.25)',
              border: '1px solid rgba(253,230,138,.3)',
              animation: 'urgencyPulse 2s ease-in-out infinite',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ fontSize: '28px', flexShrink: 0 }}>
                  {nextExDiv.daysLeft === 0 ? '🚨' : nextExDiv.daysLeft === 1 ? '🔥' : '⚡'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#FDE68A', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {nextExDiv.daysLeft === 0 ? t('dashboard.banner_urgency_today') : `Data ex-dividendo em ${nextExDiv.daysLeft} dia${nextExDiv.daysLeft > 1 ? 's' : ''}`}
                    </span>
                    <span style={{ background: 'rgba(253,230,138,.2)', border: '1px solid rgba(253,230,138,.4)', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: '800', color: '#FDE68A' }}>
                      Urgente
                    </span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                    {t('dashboard.buy_ticker_before', { ticker: nextExDiv.asset?.ticker ?? '—', date: nextExDiv.buyDeadline.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' }) })}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)', marginTop: '3px' }}>
                    {t('dashboard.to_receive_div', { amount: formatCurrency(nextExDiv.ev.expected_amount), date: formatDate(nextExDiv.ev.ex_date) })}
                  </div>
                </div>
              </div>
              <div style={{ background: '#FDE68A', color: '#78350F', padding: '11px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
                {t('dashboard.banner_cta_btn')}
              </div>
            </div>
          </Link>
        )}
        {isEmpty && !loading && (
          <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1a2f5e)`, borderRadius: '20px', padding: '32px', marginBottom: '24px', border: `1px solid ${C.gold}33` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>🚀 Começando</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, marginBottom: '8px', letterSpacing: '-0.5px' }}>Bem-vindo ao SINED Invest</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', marginBottom: '24px', lineHeight: '1.7', maxWidth: '500px' }}>
              {t('dashboard.welcome_desc', { what: t('dashboard.welcome_what'), how_much: t('dashboard.welcome_how_much'), how_many: t('dashboard.welcome_how_many') })}
            </div>
            <div className="onboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { n: '1', title: t('dashboard.onboard_import_title'), desc: t('dashboard.onboard_import_desc'), href: '/portfolio' },
                { n: '2', title: t('dashboard.onboard_strategy_title'), desc: 'Defina % por classe de ativo e quantos comprar em cada.', href: '/strategy' },
                { n: '3', title: t('dashboard.onboard_calc_title'), desc: t('dashboard.onboard_calc_desc'), href: '/contribution' },
              ].map(({ n, title, desc, href }) => (
                <Link key={n} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,.08)', height: '100%' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: C.gold, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', marginBottom: '10px' }}>{n}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.white, marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', lineHeight: '1.6' }}>{desc}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/portfolio"><Button variant="gold" size="sm">{t('dashboard.onboard_import_btn')} <ArrowRight size={13} /></Button></Link>
              <Link href="/methodology" target="_blank"><Button variant="ghost" size="sm" style={{ color: 'rgba(255,255,255,.5)', borderColor: 'rgba(255,255,255,.1)' }}><BookOpen size={13} /> Como funciona</Button></Link>
            </div>
          </div>
        )}

        {/* ── UPGRADE BANNER ──────────────────────────────────────────────────── */}
        {!isEmpty && planData.isDemo && (
          <UpgradeBanner message={t("dashboard.subtitle_simple")} feature="recommendation:full" targetPlan="simple" />
        )}

        {/* ── EX-DIV NOTICE (4–14 days) — below emergency zone ────────────────── */}
        {!isEmpty && !loading && nextExDiv && nextExDiv.daysLeft >= 4 && nextExDiv.daysLeft <= 14 && (
          <Link href="/contribution" style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', padding: '12px 20px',
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderLeft: `4px solid #F59E0B`,
              borderRadius: '12px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <Timer size={15} color="#92400E" style={{ flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>
                    {t('dashboard.buy_ticker_short', { ticker: nextExDiv.asset?.ticker ?? '—', date: nextExDiv.buyDeadline.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) })}
                  </span>
                  <span style={{ fontSize: '12px', color: '#92400E', opacity: 0.7, marginLeft: '8px' }}>
                    {t('dashboard.notice_receive_amount', { amount: formatCurrency(nextExDiv.ev.expected_amount), days: nextExDiv.daysLeft })}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#92400E', background: '#FEF3C7', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('dashboard.notice_days_remaining', { days: nextExDiv.daysLeft })}
              </div>
            </div>
          </Link>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SIMPLE MODE — "What should I do this month?" answer
        ══════════════════════════════════════════════════════════════════════ */}
        {!isEmpty && mode === 'simple' && !loading && decision && (
          <div className="decision-block" style={{ marginBottom: '20px' }}>

            {/* Primary decision card */}
            <div style={{
              background: decision.urgent
                ? `linear-gradient(135deg, ${C.navy}, #1a2f5e)`
                : `linear-gradient(135deg, #1e293b, #0f172a)`,
              borderRadius: '20px',
              border: `1px solid ${decision.urgent ? C.gold + '55' : 'rgba(255,255,255,.08)'}`,
              padding: '28px 32px',
              marginBottom: '12px',
              boxShadow: decision.urgent ? `0 8px 40px ${C.gold}18` : 'none',
            }}>
              {/* "Buy Before" urgency — shown when ex-div is imminent */}
              {nextExDiv && nextExDiv.daysLeft <= 7 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '20px', padding: '4px 12px' }}>
                    <Timer size={11} color="#92400E" />
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#92400E', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {t('dashboard.banner_buy_label', { ticker: nextExDiv.asset?.ticker ?? '—', date: nextExDiv.buyDeadline.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) })} · {t('dashboard.badge_days', { n: nextExDiv.daysLeft })} {t('dashboard.days_remaining')}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '10px', fontWeight: '700', color: decision.urgent ? C.gold : 'rgba(255,255,255,.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  ✦ {t('dashboard.what_to_do')}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  {/* Value label */}
                  {decision.type === 'aportar' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${C.green}22`, border: `1px solid ${C.green}44`, borderRadius: '20px', padding: '3px 10px', marginBottom: '10px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.green }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: C.green, letterSpacing: '1px', textTransform: 'uppercase' }}>Timing Ideal</span>
                    </div>
                  )}
                  {decision.type === 'oportunidade' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(252,165,165,.15)', border: '1px solid rgba(252,165,165,.3)', borderRadius: '20px', padding: '3px 10px', marginBottom: '10px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FCA5A5' }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#FCA5A5', letterSpacing: '1px', textTransform: 'uppercase' }}>Alta Oportunidade</span>
                    </div>
                  )}
                  {decision.type === 'aguardar' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${C.amber}22`, border: `1px solid ${C.amber}44`, borderRadius: '20px', padding: '3px 10px', marginBottom: '10px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.amber }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: C.amber, letterSpacing: '1px', textTransform: 'uppercase' }}>Aguardar Provento</span>
                    </div>
                  )}
                  {decision.type === 'ok' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.08)', borderRadius: '20px', padding: '3px 10px', marginBottom: '10px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>Sem Urgência</span>
                    </div>
                  )}
                  <div style={{ fontSize: '26px', fontWeight: '800', color: C.white, letterSpacing: '-0.8px', marginBottom: '6px' }}>
                    {nextExDiv && nextExDiv.daysLeft <= 7
                      ? t('dashboard.buy_ticker_short', { ticker: nextExDiv.asset?.ticker ?? '—', date: nextExDiv.buyDeadline.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) })
                      : decision.label}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.5', marginBottom: '8px' }}>
                    {nextExDiv && nextExDiv.daysLeft <= 7
                      ? t('dashboard.to_receive_short', { amount: formatCurrency(nextExDiv.ev.expected_amount), date: formatDate(nextExDiv.ev.ex_date) })
                      : decision.desc}
                  </div>
                  {/* Expected outcome */}
                  {nextExDiv && nextExDiv.daysLeft <= 7 && (
                    <div style={{ fontSize: '12px', color: '#FDE68A', fontWeight: '700' }}>
                      {t('dashboard.outcome_receive_fmt', { amount: formatCurrency(nextExDiv.ev.expected_amount) })}
                    </div>
                  )}
                  {!nextExDiv && decision.type === 'aportar' && lastSim?.items?.length > 0 && (
                    <div style={{ fontSize: '12px', color: C.goldL, fontWeight: '600' }}>
                      {t('dashboard.outcome_buy_fmt', { tickers: lastSim.items.slice(0,3).map((i: {asset?: {ticker?: string}}) => i.asset?.ticker).filter(Boolean).join(', '), more: lastSim.items.length > 3 ? t('dashboard.outcome_more', { n: lastSim.items.length - 3 }) : '' })}
                    </div>
                  )}
                  {!nextExDiv && decision.type === 'oportunidade' && (
                    <div style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: '600' }}>
                      {t('dashboard.outcome_reduce_pm_txt')}
                    </div>
                  )}
                </div>
                <Link href="/contribution">
                  <Button variant="gold" size="sm" style={{ fontSize: '14px', padding: '12px 24px', flexShrink: 0 }}>
                    <Zap size={14} /> {t('dashboard.calculate_btn')}
                  </Button>
                </Link>
              </div>

              {/* Inline stats strip */}
              <div style={{ display: 'flex', gap: '28px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.07)', flexWrap: 'wrap' }}>
                {[
                  { label: t('dashboard.strip_patrimony'), value: formatCurrency(totalValue), color: C.white },
                  { label: t('dashboard.strip_dividends_month'), value: formatCurrency(thisMonthDivs), color: thisMonthDivs > 0 ? C.green : 'rgba(255,255,255,.35)' },
                  { label: t('dashboard.strip_red'), value: String(redAssets.length), color: redAssets.length > 0 ? '#FCA5A5' : C.green },
                  ...(nextExDiv && nextExDiv.daysLeft <= 7
                    ? [{ label: `Ex-div em ${nextExDiv.daysLeft}d`, value: formatCurrency(nextExDiv.ev.expected_amount), color: '#FDE68A' }]
                    : window.ready
                    ? [{ label: t('dashboard.strip_window'), value: t('dashboard.strip_window_open'), color: C.goldL }]
                    : [{ label: t('dashboard.strip_next_contribution'), value: window.total_pending > 0 ? t('dashboard.strip_waiting_amount', { amount: formatCurrency(window.total_pending) }) : '—', color: 'rgba(255,255,255,.35)' }]
                  ),
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color, fontFamily: 'var(--mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action cards row — what / why / when */}
            <div className="action-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>

              {/* Card 1 — Top Opportunity */}
              <Link href="/contribution" style={{ textDecoration: 'none' }}>
                <div style={{ background: redAssets.length > 0 ? '#FFF5F5' : C.white, border: `1.5px solid ${redAssets.length > 0 ? '#FECACA' : C.gray200}`, borderRadius: '16px', padding: '18px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                  {redAssets.length > 0 && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#FEE2E2', color: C.red, fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Alta Oportunidade</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Target size={13} color={redAssets.length > 0 ? C.red : C.gray400} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: redAssets.length > 0 ? C.red : C.gray400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dashboard.opportunity')}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: redAssets.length > 0 ? C.red : C.gray400, marginBottom: '6px' }}>
                    {redAssets.length > 0 ? redAssets.length === 1 ? t('dashboard.decision_red_assets', { count: redAssets.length }) : t('dashboard.decision_red_assets_pl', { count: redAssets.length }) : 'Nenhum'}
                  </div>
                  <div style={{ fontSize: '12px', color: C.gray600, lineHeight: '1.5', marginBottom: '6px' }}>
                    {redAssets.length > 0
                      ? t('dashboard.card_opp_discount')
                      : t('dashboard.card_all_above_pm')}
                  </div>
                  {redAssets.length > 0 && (
                    <div style={{ fontSize: '11px', fontWeight: '600', color: C.red }}>
                      {t('dashboard.card_calc_now_arrow')}
                    </div>
                  )}
                </div>
              </Link>

              {/* Card 2 — Buy Window */}
              <Link href="/contribution" style={{ textDecoration: 'none' }}>
                <div style={{ background: window.ready ? `linear-gradient(135deg, ${C.navy}F0, #1a2f5eF0)` : C.white, border: `1.5px solid ${window.ready ? C.gold + '55' : C.gray200}`, borderRadius: '16px', padding: '18px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                  {window.ready && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: `${C.gold}33`, color: C.goldL, fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Timing Ideal</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Zap size={13} color={window.ready ? C.goldL : C.gray400} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: window.ready ? C.goldL : C.gray400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dashboard.buy_window')}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: window.ready ? C.white : C.gray400, marginBottom: '6px' }}>
                    {window.ready ? t('dashboard.strip_window_open') : t('dashboard.waiting_label')}
                  </div>
                  <div style={{ fontSize: '12px', color: window.ready ? 'rgba(255,255,255,.5)' : C.gray500, lineHeight: '1.5', marginBottom: '6px' }}>
                    {window.ready
                      ? t('dashboard.card_window_desc', { amount: formatCurrency(window.total_received) })
                      : window.total_pending > 0
                      ? t('dashboard.card_waiting_amount', { amount: formatCurrency(window.total_pending) })
                      : t('dashboard.card_register_proventos')}
                  </div>
                  {window.ready && (
                    <div style={{ fontSize: '11px', fontWeight: '600', color: C.goldL }}>
                      {t('dashboard.card_contribute_now_arrow')}
                    </div>
                  )}
                </div>
              </Link>

              {/* Card 3 — Next Dividend with buy-before urgency */}
              <Link href="/dividends" style={{ textDecoration: 'none' }}>
                {nextExDiv ? (
                  // Ex-dividend coming — show buy-before urgency
                  <div style={{
                    background: nextExDiv.daysLeft <= 3 ? '#FFF7ED' : C.white,
                    border: `1.5px solid ${nextExDiv.daysLeft <= 3 ? '#FDE68A' : nextExDiv.daysLeft <= 7 ? '#FED7AA' : C.gray200}`,
                    borderRadius: '16px', padding: '18px', height: '100%', position: 'relative', overflow: 'hidden',
                  }}>
                    {/* Urgency badge */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: nextExDiv.daysLeft <= 3 ? '#FEF3C7' : '#FFF7ED', color: '#92400E', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Flame size={8} color="#92400E" />
                      {nextExDiv.daysLeft === 0 ? t('dashboard.badge_today') : t('dashboard.badge_days', { n: nextExDiv.daysLeft })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <Timer size={13} color="#92400E" />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '1px' }}>Data Ex-Dividendo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: C.navy, marginBottom: '6px' }}>
                      {nextExDiv.asset?.ticker ?? t('dashboard.dividend_label')}
                    </div>
                    <div style={{ fontSize: '12px', color: C.gray600, lineHeight: '1.5', marginBottom: '8px' }}>
                      Ex-div: <strong>{formatDate(nextExDiv.ev.ex_date)}</strong>
                      {' · '}{formatCurrency(nextExDiv.ev.expected_amount)} esperados
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: nextExDiv.daysLeft <= 3 ? '#92400E' : C.blue, background: nextExDiv.daysLeft <= 3 ? '#FEF3C7' : '#EFF6FF', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                      {t('dashboard.card_buy_before_cta', { date: nextExDiv.buyDeadline.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) })}
                    </div>
                  </div>
                ) : upcomingDivs.length > 0 ? (
                  // No imminent ex-div but have upcoming payments
                  <div style={{ background: C.white, border: `1.5px solid ${C.gray200}`, borderRadius: '16px', padding: '18px', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <Clock size={13} color={C.gray400} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dashboard.next_dividend')}</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: C.navy, marginBottom: '6px' }}>
                      em {daysFromNow(upcomingDivs[0].payment_date)}d
                    </div>
                    <div style={{ fontSize: '12px', color: C.gray600, lineHeight: '1.5' }}>
                      {assets.find(a => a.id === upcomingDivs[0].asset_id)?.ticker && (
                        <strong>{assets.find(a => a.id === upcomingDivs[0].asset_id)?.ticker} · </strong>
                      )}
                      {formatCurrency(upcomingDivs[0].expected_amount)} · {formatDate(upcomingDivs[0].payment_date)}
                    </div>
                  </div>
                ) : (
                  // No upcoming dividends
                  <div style={{ background: C.white, border: `1.5px solid ${C.gray200}`, borderRadius: '16px', padding: '18px', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <Clock size={13} color={C.gray400} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dashboard.next_dividend')}</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: C.gray300, marginBottom: '6px' }}>—</div>
                    <div style={{ fontSize: '12px', color: C.gray400, lineHeight: '1.5' }}>
                      {t('dashboard.card_register_ex_dates')}
                    </div>
                  </div>
                )}
              </Link>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            BOTH MODES — KPI cards
        ══════════════════════════════════════════════════════════════════════ */}
        {mode === 'advanced' && (
          <div className="stat-cards-grid kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} style={{ borderTop: `3px solid ${C.gray200}` }}>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Sk h="11px" w="60%" /><Sk h="28px" w="80%" /><Sk h="11px" w="50%" />
                </div>
              </Card>
            )) : (<>
              <StatCard label={t('dashboard.kpi_patrimony')} value={formatCurrency(totalValue)} sub={`${assets.length} ativo${assets.length !== 1 ? 's' : ''}`} accent={C.gold} icon={<TrendingUp size={15} />} />
              <StatCard label={t('dashboard.kpi_dividends_month')} value={formatCurrency(thisMonthDivs)} sub={`${dividends.filter(d => { const dt = new Date(d.payment_date); const n = new Date(); return dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear(); }).length} evento${dividends.length !== 1 ? 's' : ''}`} color={thisMonthDivs > 0 ? C.green : undefined} accent={C.green} icon={<CalendarDays size={15} />} />
              <StatCard label={t('dashboard.kpi_red_assets')} value={String(redAssets.length)} sub={t('dashboard.kpi_priority_note')} color={redAssets.length > 0 ? C.red : C.green} accent={redAssets.length > 0 ? C.red : C.green} icon={<AlertCircle size={15} />} />
              <StatCard label={t('dashboard.result_total')} value={`${totalPL >= 0 ? '+' : ''}${formatCurrency(totalPL)}`} sub={totalCost > 0 ? `${((totalPL / totalCost) * 100).toFixed(1)}% sobre custo` : '—'} color={totalPL >= 0 ? C.green : C.red} accent={totalPL >= 0 ? C.green : C.red} icon={<TrendingUp size={15} />} />
            </>)}
          </div>
        )}

        {/* ── ADVANCED: Income projection ────────────────────────────────────── */}
        {!isEmpty && mode === 'advanced' && planData.canAdv && thisMonthDivs > 0 && (
          <div style={{ background: '#FFFBEB', border: `1px solid ${C.gold}44`, borderLeft: `4px solid ${C.gold}`, borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{t('dashboard.adv_income_label')}</div>
                {thisMonthDivs / totalValue * 1200 > 8 && (
                  <div style={{ background: `${C.green}22`, border: `1px solid ${C.green}44`, borderRadius: '20px', padding: '2px 8px', fontSize: '9px', fontWeight: '800', color: C.green, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {t('dashboard.high_yield_badge')}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '13px', color: C.gray600, marginBottom: '2px' }}>{t('dashboard.adv_income_desc')}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '800', color: C.gold }}>
                {formatCurrency(thisMonthDivs * 12)}<span style={{ fontSize: '12px', color: C.gray400, fontFamily: 'var(--font)', fontWeight: '500', marginLeft: '8px' }}>/ano estimado</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: C.gray400, marginBottom: '2px' }}>Este mês</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: '700', color: C.green }}>{formatCurrency(thisMonthDivs)}</div>
            </div>
          </div>
        )}

        {/* ── ADVANCED MODE TEASER — blurred real data preview ─────────────────── */}
        {!isEmpty && mode === 'simple' && (
          <AdvancedModeLockTeaser
            totalValue={totalValue}
            thisMonthDivs={thisMonthDivs}
            classes={classes}
            assets={assets}
            holdingsMap={holdingsMap}
            totalPL={totalPL}
          />
        )}

        {/* ── BEST BUY WINDOW ─────────────────────────────────────────────────── */}
        {!isEmpty && mode === 'advanced' && (
          <div style={{
            background: window.ready ? `linear-gradient(135deg, ${C.navy}, #1a2f5e)` : `linear-gradient(135deg, #1C1917, #292524)`,
            borderRadius: '16px', padding: '20px 24px', border: `1px solid ${window.ready ? C.gold + '44' : 'rgba(255,255,255,.06)'}`, marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: window.total_expected > 0 ? '16px' : '0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {window.ready ? t('dashboard.window_open_label') : t('dashboard.window_waiting_label')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: C.white, letterSpacing: '-0.3px', lineHeight: '1.3' }}>
                  {window.ready ? t('dashboard.window_ideal') : dividends.length === 0 ? t('dashboard.window_configure') : t('dashboard.strip_waiting_amount', { amount: formatCurrency(window.total_pending) })}
                </div>
                {window.last_payment_date && (<div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>{t('dashboard.window_last_payment', { date: formatDate(window.last_payment_date) })}</div>)}
              </div>
              <Link href="/contribution" style={{ flexShrink: 0 }}><Button variant="gold" size="sm">{t('dashboard.contribute_btn')} →</Button></Link>
            </div>
            {window.total_expected > 0 && (
              <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '14px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Recebido', value: formatCurrency(window.total_received), color: C.green },
                  { label: 'Pendente', value: formatCurrency(window.total_pending), color: C.amber },
                  { label: 'Esperado total', value: formatCurrency(window.total_expected), color: 'rgba(255,255,255,.5)' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color, fontFamily: 'var(--mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADVANCED: Middle row ─────────────────────────────────────────────── */}
        {!isEmpty && mode === 'advanced' && (
          <div className="dash-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Allocation */}
            <Card>
              <CardHeader action={<Link href="/portfolio"><Button variant="ghost" size="sm">{t('dashboard.view_portfolio_btn')}</Button></Link>}>Alocação por Classe</CardHeader>
              <CardBody>
                {classes.length === 0 ? <EmptyState icon="📂" title={t('dashboard.no_classes_title')} description={t('dashboard.no_classes_desc')} /> : classes.map(cls => {
                  const val = assets.filter(a => a.asset_class_id === cls.id).reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0);
                  const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                  return (
                    <div key={cls.id} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: C.gray700 }}>{cls.name}</span>
                        <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                          <span style={{ color: C.gray400 }}>{formatCurrency(val)}</span>
                          <span style={{ color: C.blue, fontWeight: '700' }}>{formatPercent(pct)}</span>
                        </div>
                      </div>
                      <PercentBar value={pct} max={cls.target_percentage > 0 ? cls.target_percentage + 10 : 100} />
                    </div>
                  );
                })}
              </CardBody>
            </Card>
            <RedAssetsCard redAssets={redAssets} holdingsMap={holdingsMap} classes={classes} totalValue={totalValue} />
          </div>
        )}

        {/* ── UPCOMING DIVIDENDS ───────────────────────────────────────────────── */}
        {!isEmpty && upcomingDivs.length > 0 && mode === 'advanced' && (
          <Card style={{ marginBottom: '20px' }}>
            <CardHeader action={<Link href="/dividends"><Button variant="ghost" size="sm">{t('dashboard.upcoming_div_link')}</Button></Link>}>{t('dashboard.upcoming_div_title')}</CardHeader>
            <CardBody style={{ padding: '0 24px 16px' }}>
              {upcomingDivs.map(ev => {
                const asset = assets.find(a => a.id === ev.asset_id);
                const days  = daysFromNow(ev.payment_date);
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.gray50}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {asset && <TickerBadge ticker={asset.ticker} />}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray700 }}>{asset?.name || ev.asset_id}</div>
                        <div style={{ fontSize: '11px', color: C.gray400 }}>Pagamento: {formatDate(ev.payment_date)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Badge color={days <= 7 ? 'amber' : 'blue'}>{days === 0 ? t('dashboard.today_label') : `em ${days}d`}</Badge>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px', color: C.green }}>{formatCurrency(ev.expected_amount)}</div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        )}

        {/* ── LAST RECOMMENDATION ─────────────────────────────────────────────── */}
        {!isEmpty && (
          <Card>
            <CardHeader action={<Link href="/contribution"><Button variant="gold" size="sm">{t('dashboard.new_contribution')}</Button></Link>}>
              {mode === 'advanced' ? t('dashboard.last_recommendation') : `📋 ${t('dashboard.last_recommendation')}`}
            </CardHeader>
            <CardBody>
              {!lastSim || !lastSim.items || lastSim.items.length === 0 ? (
                <EmptyState icon="💡" title={t('dashboard.no_rec_title')} description={t('dashboard.no_rec_desc')}
                  action={<Link href="/contribution"><Button variant="primary" size="sm"><Zap size={13} /> {t('dashboard.calculate_btn')}</Button></Link>} />
              ) : (<>
                <div style={{ fontSize: '12px', color: C.gray400, marginBottom: '16px' }}>
                  {formatDate(lastSim.created_at)} · {lastSim.items.length === 1 ? t('dashboard.red_asset_count', { count: lastSim.items.length }) : t('dashboard.red_asset_count_pl', { count: lastSim.items.length })} · {formatCurrency(lastSim.total_amount)}
                </div>
                {lastSim.items.slice(0, mode === 'simple' ? 3 : 5).map((item, i) => {
                  const asset = item.asset;
                  if (!asset) return null;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.gray50}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '22px', height: '22px', background: C.navy, color: C.goldL, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', fontFamily: 'var(--mono)', flexShrink: 0 }}>{i + 1}</span>
                        <TickerBadge ticker={asset.ticker} />
                        {asset.is_red && <Badge color="red">🔴</Badge>}
                        {mode === 'advanced' && <span style={{ fontSize: '12px', color: C.gray500 }}>{asset.name}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: C.gray400 }}>Cotas</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px' }}>
                            {formatQuantity(item.quantity, item.asset?.ticker ?? '', null)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: C.gray400 }}>Valor</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px', color: C.blue }}>{formatCurrency(item.allocated_amount)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {lastSim.items.length > (mode === 'simple' ? 3 : 5) && (
                  <div style={{ padding: '10px 0', fontSize: '12px', color: C.gray400, textAlign: 'center' }}>
                    {t('dashboard.more_items', { count: lastSim.items.length - (mode === 'simple' ? 3 : 5) })} · <Link href="/contribution" style={{ color: C.blue, textDecoration: 'none' }}>{t('dashboard.recalculate_link')}</Link>
                  </div>
                )}
                {lastSim.leftover > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F0FDF4', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>💵 Sobra de caixa</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: '800', color: C.green }}>{formatCurrency(lastSim.leftover)}</span>
                  </div>
                )}
                {planData.isDemo && mode === 'simple' && (
                  <div style={{ marginTop: '16px', padding: '14px 18px', background: `linear-gradient(135deg, #EFF6FF, #F0F9FF)`, border: `1px solid ${C.blue}22`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: C.blue, marginBottom: '3px' }}>Salve esta simulação no Simple Mode</div>
                      <div style={{ fontSize: '11px', color: C.gray500 }}>Histórico de 6 meses · Registre compras · Rastreie sua evolução</div>
                    </div>
                    <Link href="/upgrade?ref=operations:register&plan=simple" style={{ flexShrink: 0 }}>
                      <Button variant="primary" size="sm" style={{ whiteSpace: 'nowrap' }}>Assinar Simple →</Button>
                    </Link>
                  </div>
                )}
              </>)}
            </CardBody>
          </Card>
        )}

        {/* ── TRUST BAR ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '10px 16px', background: '#F8FAFC', border: `1px solid ${C.gray200}`, borderRadius: '10px', marginTop: '20px', fontSize: '11px', color: C.gray400 }}>
          <ShieldAlert size={13} color={C.gray400} />
          <span>{t('dashboard.trust_bar')}</span>
          <Link href="/methodology" target="_blank" style={{ color: C.blue, textDecoration: 'none', fontWeight: '600' }}>{t('dashboard.how_it_works')}</Link>
          <Link href="/legal/risk" target="_blank" style={{ color: C.gray400, textDecoration: 'none' }}>{t('dashboard.risks')}</Link>
        </div>

      </PageContent>
    </>
  );
}

// ─── Advanced Mode Lock Teaser — real data, blurred ──────────────────────────
function AdvancedModeLockTeaser({ totalValue, thisMonthDivs, classes, assets, holdingsMap, totalPL }: {
  totalValue: number;
  thisMonthDivs: number;
  classes: AssetClass[];
  assets: Asset[];
  holdingsMap: Record<string, { quantity: number; avg_price: number }>;
  totalPL: number;
}) {
  const { t, locale } = useT();
  // Compute real allocation data to show blurred
  const topClass = useMemo(() => {
    let best = { name: '—', pct: 0 };
    classes.forEach(cls => {
      const val = assets.filter(a => a.asset_class_id === cls.id)
        .reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0);
      const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
      if (pct > best.pct) best = { name: cls.name, pct };
    });
    return best;
  }, [classes, assets, holdingsMap, totalValue]);

  const projectedAnnual = thisMonthDivs * 12;
  const yieldPct        = totalValue > 0 ? (thisMonthDivs / totalValue) * 100 : 0;

  const items = [
    { label: t('dashboard.lock_top_class'), val: topClass.pct > 0 ? `${topClass.name} · ${topClass.pct.toFixed(1)}%` : 'Configure classes' },
    { label: t('dashboard.lock_income_12m'), val: projectedAnnual > 0 ? formatCurrency(projectedAnnual) : 'R$ ?,???' },
    { label: t('dashboard.lock_yield_avg'), val: yieldPct > 0 ? `${yieldPct.toFixed(2)}% / mês` : '??.??%' },
  ];

  // STRUCTURAL FIX for layout shift:
  // Both the blurred background and the overlay are position:absolute.
  // The outer container has a FIXED height (not min-height) so it NEVER
  // changes size regardless of data changes or re-renders.
  return (
    <div style={{
      position: 'relative',
      height: '224px',           /* fixed — never changes on re-render */
      marginBottom: '20px',
      marginTop: '4px',
      borderRadius: '16px',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Blurred background data — position:absolute so it doesn't affect height */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4,
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', flex: 1 }}>
          {items.map(({ label, val }) => (
            <div key={label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '9px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: C.navy }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFBEB', border: `1px solid ${C.gold}44`, borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '9px', color: C.gold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{t('dashboard.lock_pnl_total')}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: totalPL >= 0 ? C.green : C.red, fontFamily: 'var(--mono)' }}>{totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{t('dashboard.lock_by_class_lbl')}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: C.gray600 }}>{classes.length}</div>
          </div>
        </div>
      </div>

      {/* Lock overlay — position:absolute, fills the fixed-height parent */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(248,250,252,.82)', backdropFilter: 'blur(2px)',
      }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: '340px' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
            {t('dashboard.lock_title_inner')}
          </div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy, marginBottom: '6px', letterSpacing: '-0.3px' }}>
            {t('dashboard.lock_subtitle_inner')}
          </div>
          <div style={{ fontSize: '11px', color: C.gray500, lineHeight: '1.6', marginBottom: '14px' }}>
            <strong>{t('dashboard.lock_features')}</strong><br />
            {t('dashboard.lock_features2')}
          </div>
          <Link href="/upgrade?ref=advanced_mode&plan=ADVANCED">
            <Button variant="gold" size="sm" style={{ fontSize: '12px', padding: '9px 20px', boxShadow: `0 4px 16px ${C.gold}44` }}>
              {t('dashboard.lock_btn_inner')}
            </Button>
          </Link>
          <div style={{ fontSize: '10px', color: C.gray400, marginTop: '8px' }}>{t('dashboard.lock_price_inner')}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Red Assets Card (Advanced Mode only) ────────────────────────────────────
function RedAssetsCard({ redAssets, holdingsMap, classes, totalValue }: {
  redAssets: Asset[]; holdingsMap: Record<string, { quantity: number; avg_price: number }>;
  classes: AssetClass[]; totalValue: number;
}) {
  const { t, locale } = useT();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map: Record<string, { id: string; name: string; assets: Asset[] }> = {};
    classes.forEach(c => { map[c.id] = { id: c.id, name: c.name, assets: [] }; });
    map['__none__'] = { id: '__none__', name: t('dashboard.no_class_name'), assets: [] };
    redAssets.forEach(a => { const key = a.asset_class_id && map[a.asset_class_id] ? a.asset_class_id : '__none__'; map[key].assets.push(a); });
    return Object.values(map).filter(g => g.assets.length > 0);
  }, [redAssets, classes]);

  return (
    <Card>
      <CardHeader action={<Badge color="red">{redAssets.length === 1 ? t('dashboard.red_asset_count', { count: redAssets.length }) : t('dashboard.red_asset_count_pl', { count: redAssets.length })}</Badge>}>🔴 Ativos Vermelhos</CardHeader>
      <CardBody style={{ padding: '0 24px 16px' }}>
        {redAssets.length === 0
          ? <EmptyState icon="✅" title={`${t('dashboard.everything_ok')} ${t('dashboard.all_healthy')}`} description={t('dashboard.no_assets_below_pm')} />
          : groups.map(group => {
            const isOpen = !collapsed[group.id];
            const gVal = group.assets.reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0);
            const gPct = totalValue > 0 ? (gVal / totalValue) * 100 : 0;
            return (
              <div key={group.id} style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${C.gray100}`, marginBottom: '8px' }}>
                <button onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FEF2F2', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: isOpen ? `1px solid #FECACA` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOpen ? <ChevronDown size={14} color={C.red} /> : <ChevronRight size={14} color={C.red} />}
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.red }}>{group.name}</span>
                    <span style={{ background: '#FEE2E2', color: C.red, fontSize: '11px', fontWeight: '700', padding: '1px 8px', borderRadius: '20px' }}>{group.assets.length}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: C.red, fontWeight: '700' }}>{formatPercent(gPct)}</span>
                </button>
                {isOpen && group.assets.map((a, idx) => {
                  const val = (holdingsMap[a.id]?.quantity ?? 0) * a.current_price;
                  const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                  const pm  = holdingsMap[a.id]?.avg_price ?? 0;
                  const diff = pm > 0 ? ((a.current_price - pm) / pm) * 100 : null;
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderBottom: idx < group.assets.length - 1 ? `1px solid ${C.gray50}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.red, flexShrink: 0 }} />
                        <TickerBadge ticker={a.ticker} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
                        {diff !== null && <span style={{ fontSize: '11px', fontWeight: '700', color: diff >= 0 ? C.green : C.red, background: diff >= 0 ? '#DCFCE7' : '#FEE2E2', padding: '2px 7px', borderRadius: '20px' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>}
                        <div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '700' }}>{formatCurrency(a.current_price)}</div>
                          <div style={{ fontSize: '11px', color: C.gray400 }}>{formatPercent(pct)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </CardBody>
    </Card>
  );
}
