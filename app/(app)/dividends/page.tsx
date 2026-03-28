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

  function handleEdit(d: DividendEvent) { setEditTarget(d); setShowModal(true); }
  function handleClose() { setEditTarget(undefined); setShowModal(false); }

  return (
    <>
      <PageHeader
        title={t('dividends.title')}
        subtitle="Calendário de dividendos e janela de aporte"
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" loading={syncing} onClick={async () => {
              setSyncing(true);
              notify('Buscando proventos via Yahoo Finance...');
              try {
                const res = await syncDividendsNow();
                if (res.synced > 0) {
                  notify(`✓ ${res.synced} proventos importados automaticamente`);
                } else if (res.errors.length > 0) {
                  notify(`⚠️ Erros em ${res.errors.length} ativo(s). Verifique o console.`);
                } else {
                  notify('Nenhum provento novo encontrado');
                }
              } catch { notify('Erro ao buscar proventos'); }
              setSyncing(false);
            }}>
              🔄 {syncing ? 'Buscando...' : 'Buscar Proventos'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
              <Plus size={13} /> Registrar
            </Button>
          </div>
        }
      />
      <PageContent>

        {/* Stats */}
        <div className='prov-stat-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Esperado este mês" value={formatCurrency(totalExpected)} accent={C.blue} />
          <StatCard label="Recebido este mês"  value={formatCurrency(totalReceived)} color={C.green} accent={C.green} />
          <StatCard label="Pendente este mês"  value={formatCurrency(totalPending)}  color={totalPending > 0 ? C.amber : C.green} accent={C.amber} />
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
                title="Nenhum provento registrado"
                description="Registre dividendos, JCP e rendimentos de FIIs para ativar a janela inteligente de aporte"
                action={<Button variant="primary" size="sm" onClick={() => setShowModal(true)}>+ Registrar</Button>}
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
                  <span>Ativo</span>
                  <span>Data Ex</span>
                  <span>Pagamento</span>
                  <span>Esperado</span>
                  <span>Recebido</span>
                  <span>Status</span>
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
                          if (confirm('Remover este provento?')) { deleteDividend(ev.id); notify('Provento removido'); }
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
