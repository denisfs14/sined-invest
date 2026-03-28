'use client';

import { useT } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { DividendEvent } from '@/types';
import { getStatusLabel, getStatusColor } from '@/lib/calculations/dividend-calendar';
import { formatCurrency, formatDate, isThisMonth } from '@/utils/format';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  StatCard, Button, Badge, TickerBadge,
  EmptyState, Toast, C,
} from '@/components/ui';
import { DividendModal } from '@/components/modals/DividendModal';

export default function DividendsPage() {
  const { t } = useT();
  const { assets, dividends, portfolio, addDividend, updateDividend, deleteDividend, syncDividendsNow } = useApp();

  const [syncing, setSyncing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DividendEvent | undefined>();
  const [toast, setToast] = useState({ visible: false, msg: '' });

  function notify(msg: string) {
    setToast({ visible: true, msg });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  // Stats
  const thisMonth = useMemo(() => dividends.filter(d => isThisMonth(d.payment_date)), [dividends]);
  const totalExpected = thisMonth.reduce((s, d) => s + d.expected_amount, 0);
  const totalReceived = thisMonth.filter(d => d.status === 'received').reduce((s, d) => s + (d.received_amount || d.expected_amount), 0);
  const totalPending  = thisMonth.filter(d => d.status === 'expected' || d.status === 'pending').reduce((s, d) => s + d.expected_amount, 0);

  // Sorted dividends
  const sorted = useMemo(
    () => [...dividends].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()),
    [dividends]
  );

  // Current-month detailed events (for the detailed section)
  const currentMonthEvents = useMemo(
    () => sorted.filter(d => isThisMonth(d.payment_date)),
    [sorted]
  );

  // Previous 6 months — summary totals only (NOT including current month)
  const sixMonthHistory = useMemo(() => {
    const now   = new Date();
    const months: { key: string; label: string; total: number; received: number; count: number }[] = [];

    for (let offset = 1; offset <= 6; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();

      const monthDivs = dividends.filter(div => {
        const pd = new Date(div.payment_date);
        return pd.getFullYear() === yr && pd.getMonth() === mo;
      });

      if (monthDivs.length === 0) continue;

      const total    = monthDivs.reduce((s, d) => s + (d.received_amount || d.expected_amount), 0);
      const received = monthDivs.filter(d => d.status === 'received').reduce((s, d) => s + (d.received_amount || d.expected_amount), 0);
      const label    = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      months.push({ key: `${yr}-${mo}`, label, total, received, count: monthDivs.length });
    }
    return months;
  }, [dividends]);

  function handleEdit(d: DividendEvent) { setEditTarget(d); setShowModal(true); }
  function handleClose() { setEditTarget(undefined); setShowModal(false); }

  return (
    <>
      <PageHeader
        title={t('dividends.title')}
        subtitle={t('dividends.subtitle')}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" loading={syncing} onClick={async () => {
              setSyncing(true);
              notify(t('dividends.syncing_yahoo'));
              try {
                const res = await syncDividendsNow();
                if (res.synced > 0) {
                  notify(t('dividends.synced_ok', { count: res.synced }));
                } else if (res.errors.length > 0) {
                  notify(t('dividends.sync_errors', { count: res.errors.length }));
                } else {
                  notify(t('dividends.none_found'));
                }
              } catch { notify(t('dividends.sync_error')); }
              setSyncing(false);
            }}>
              🔄 {syncing ? t('dividends.syncing_btn') : t('dividends.sync_btn')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
              <Plus size={13} /> {t('dividends.add_btn_short')}
            </Button>
          </div>
        }
      />
      <PageContent>

        {/* Stats */}
        <div className='prov-stat-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label={t('dividends.expected_month')} value={formatCurrency(totalExpected)} accent={C.blue} />
          <StatCard label={t('dividends.received_month')}  value={formatCurrency(totalReceived)} color={C.green} accent={C.green} />
          <StatCard label={t('dividends.pending_month')}  value={formatCurrency(totalPending)}  color={totalPending > 0 ? C.amber : C.green} accent={C.amber} />
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader action={
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={13} /> Novo
            </Button>
          }>
            📅 Calendário de Proventos
          </CardHeader>
          <CardBody style={{ padding: '0 24px 16px' }}>
            {sorted.length === 0 ? (
              <EmptyState
                icon="📅"
                title={t('dividends.empty_title')}
                description={t('dividends.empty_desc')}
                action={<Button variant="primary" size="sm" onClick={() => setShowModal(true)}>{`+ ${t('dividends.add_btn_short')}`}</Button>}
              />
            ) : (
              <div>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 110px 110px 110px 110px 100px',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: `1px solid ${C.gray200}`,
                  fontSize: '10px', fontWeight: '700', color: C.gray400,
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  <span>{t('dividends.col_asset')}</span>
                  <span>{t('dividends.col_ex_date')}</span>
                  <span>Pagamento</span>
                  <span>Esperado</span>
                  <span>Recebido</span>
                  <span>{t('dividends.col_status')}</span>
                  <span></span>
                </div>

                {sorted.map(ev => {
                  const asset = assets.find(a => a.id === ev.asset_id);
                  const statusColor = getStatusColor(ev.status);
                  const highlight = isThisMonth(ev.payment_date);
                  return (
                    <div key={ev.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 110px 110px 110px 110px 100px',
                      gap: '12px',
                      padding: '14px 0',
                      borderBottom: `1px solid ${C.gray50}`,
                      alignItems: 'center',
                      background: highlight ? 'transparent' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {asset
                          ? <TickerBadge ticker={asset.ticker} />
                          : <span style={{ fontSize: '12px', color: C.gray400 }}>—</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: C.gray500, fontFamily: 'var(--mono)' }}>
                        {ev.ex_date ? formatDate(ev.ex_date) : '—'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: C.gray700, fontFamily: 'var(--mono)' }}>
                        {formatDate(ev.payment_date)}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>
                        {formatCurrency(ev.expected_amount)}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: ev.received_amount > 0 ? C.green : C.gray300 }}>
                        {ev.received_amount > 0 ? formatCurrency(ev.received_amount) : '—'}
                      </span>
                      <span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: '600',
                          padding: '3px 9px', borderRadius: '20px',
                          background: statusColor + '18',
                          color: statusColor,
                        }}>
                          {getStatusLabel(ev.status)}
                        </span>
                      </span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleEdit(ev)} style={{ background: C.gray100, border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: C.gray600 }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => {
                          if (confirm(t('dividends.remove_confirm'))) { deleteDividend(ev.id); notify(t('dividends.removed_ok')); }
                        }} style={{ background: '#FEF2F2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: C.red }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── 6-Month Dividend History (summary only) ──────────────────── */}
        {sixMonthHistory.length > 0 && (
          <Card style={{ marginTop: '20px' }}>
            <CardHeader>📊 {t('dividends.history_title')}</CardHeader>
            <CardBody style={{ padding: '0 24px 8px' }}>
              {sixMonthHistory.map(({ key, label, total, received, count }) => {
                const pct = total > 0 ? Math.round((received / total) * 100) : 0;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0', borderBottom: `1px solid ${C.gray100}`,
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800, textTransform: 'capitalize' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '11px', color: C.gray400, marginTop: '2px' }}>
                        {count} {count !== 1 ? t('dividends.history_events_pl') : t('dividends.history_event')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      {/* Progress bar */}
                      <div style={{ width: '64px' }}>
                        <div style={{ height: '4px', background: C.gray100, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? C.green : C.amber, borderRadius: '2px', transition: 'width .3s' }} />
                        </div>
                        <div style={{ fontSize: '10px', color: C.gray400, marginTop: '3px', textAlign: 'right' }}>
                          {pct}%
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: received > 0 ? C.green : C.gray400, fontFamily: 'var(--mono)' }}>
                          {formatCurrency(received > 0 ? received : total)}
                        </div>
                        {received > 0 && received < total && (
                          <div style={{ fontSize: '10px', color: C.gray400, marginTop: '2px' }}>
                            {t('dividends.history_expected')}: {formatCurrency(total)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        )}

        {/* Quick mark received */}
        {sorted.filter(d => d.status === 'expected' || d.status === 'pending').length > 0 && (
          <Card style={{ marginTop: '20px' }}>
            <CardHeader>⏰ Pendentes de Confirmação</CardHeader>
            <CardBody style={{ padding: '0 24px 16px' }}>
              {sorted
                .filter(d => d.status === 'expected' || d.status === 'pending')
                .map(ev => {
                  const asset = assets.find(a => a.id === ev.asset_id);
                  return (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0', borderBottom: `1px solid ${C.gray50}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {asset && <TickerBadge ticker={asset.ticker} />}
                        <span style={{ fontSize: '13px', color: C.gray600 }}>
                          {formatDate(ev.payment_date)} · {formatCurrency(ev.expected_amount)}
                        </span>
                      </div>
                      <Button variant="secondary" size="xs" onClick={() => {
                        updateDividend(ev.id, { status: 'received', received_amount: ev.expected_amount });
                        notify(`${asset?.ticker} marcado como recebido`);
                      }}>
                        ✓ Marcar Recebido
                      </Button>
                    </div>
                  );
                })}
            </CardBody>
          </Card>
        )}

      </PageContent>

      <DividendModal
        open={showModal}
        onClose={handleClose}
        onSave={d => { addDividend(d); notify('Provento registrado'); }}
        onUpdate={(id, d) => { updateDividend(id, d); notify('Provento atualizado'); }}
        assets={assets}
        portfolioId={portfolio.id}
        edit={editTarget}
      />
      <Toast message={toast.msg} visible={toast.visible} />
    </>
  );
}
