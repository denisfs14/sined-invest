'use client';

import { useT } from '@/lib/i18n';
import { UpgradeBanner, FeatureTeaser } from '@/components/ui/PlanGate';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/lib/app-context';
import { PurchaseSimulation } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/format';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  Button, Badge, TickerBadge, EmptyState, Toast, C,
} from '@/components/ui';

export default function HistoryPage() {
  const { t } = useT();
  const { history, clearHistory } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, msg: '' });

  function notify(msg: string) {
    setToast({ visible: true, msg });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  function handleClear() {
    if (!confirm('Limpar todo o histórico?')) return;
    clearHistory();
    setExpanded(null);
    notify(t('history.cleared_ok'));
  }

  return (
    <>
      <PageHeader
        title={t('history.title')}
        subtitle={`${history.length} simulaç${history.length !== 1 ? 'ões' : 'ão'} salva${history.length !== 1 ? 's' : ''}`}
        action={history.length > 0 && (
          <Button variant="danger" size="sm" onClick={handleClear}>
            <Trash2 size={13} /> Limpar
          </Button>
        )}
      />
      <PageContent>
        <UpgradeBanner message="Simple Mode — Histórico de 6 meses" targetPlan="simple" feature="history:6months" />
        <FeatureTeaser feature="history:6months" title={t('history.pro_title')} description={t('history.pro_desc')} />
        {history.length === 0 ? (
          <Card>
            <EmptyState
              icon="🕐" title="Nenhuma simulação salva"
              description='Calcule e salve um aporte na aba "Aportar"'
              action={<Link href="/contribution"><Button variant="primary" size="sm">Calcular Aporte</Button></Link>}
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((sim, idx) => (
              <SimCard
                key={sim.id}
                sim={sim}
                index={idx}
                expanded={expanded === sim.id}
                onToggle={() => setExpanded(expanded === sim.id ? null : sim.id)}
              />
            ))}
          </div>
        )}
      </PageContent>
      <Toast message={toast.msg} visible={toast.visible} />
    </>
  );
}

function SimCard({ sim, index, expanded, onToggle }: {
  sim: PurchaseSimulation; index: number; expanded: boolean; onToggle: () => void;
}) {
  const redCount = sim.items?.filter(i => i.asset?.is_red).length ?? 0;

  return (
    <Card className="animate-fade">
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '18px 24px', fontFamily: 'var(--font)',
        borderBottom: expanded ? `1px solid ${C.gray100}` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: C.navy, borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '800', color: C.goldL,
            fontFamily: 'var(--mono)', flexShrink: 0,
          }}>
            #{index + 1}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: C.gray800 }}>
              Aporte de {formatCurrency(sim.total_amount)}
            </div>
            <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>
              {formatDateTime(sim.created_at)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Badge color="blue">{sim.items?.length ?? 0} ativo{sim.items?.length !== 1 ? 's' : ''}</Badge>
          {redCount > 0 && <Badge color="red">🔴 {redCount}</Badge>}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: C.gray400, marginBottom: '2px' }}>Sobra</div>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: '800', color: C.green, fontSize: '15px' }}>
              {formatCurrency(sim.leftover)}
            </span>
          </div>
          <div style={{ color: C.gray400 }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {expanded && sim.items && sim.items.length > 0 && (
        <div style={{ padding: '16px 24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sim.items.map((item, i) => item.asset && (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: item.asset.is_red ? '#FEF2F2' : C.gray50,
                borderRadius: '10px',
                border: `1px solid ${item.asset.is_red ? '#FECACA' : C.gray200}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '26px', height: '26px', background: C.navy, color: C.goldL,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '800', fontFamily: 'var(--mono)', flexShrink: 0,
                  }}>{i + 1}</span>
                  <TickerBadge ticker={item.asset.ticker} />
                  {item.asset.is_red && <Badge color="red">🔴</Badge>}
                  <span style={{ fontSize: '12px', color: C.gray500 }}>{item.asset.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                  {[
                    { label: 'Alocado', value: formatCurrency(item.allocated_amount) },
                    { label: 'Cotas',   value: String(item.quantity) },
                    { label: 'Sobra',   value: formatCurrency(item.leftover), dim: true },
                  ].map(({ label, value, dim }) => (
                    <div key={label}>
                      <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: '600' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px', color: dim ? C.gray400 : C.gray800 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
            {[
              { label: 'Total do Aporte', value: formatCurrency(sim.total_amount), color: C.blue },
              { label: 'Investido',       value: formatCurrency(sim.total_amount - sim.leftover), color: C.green },
              { label: 'Sobra de Caixa',  value: formatCurrency(sim.leftover),     color: C.gold },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: C.white, border: `1px solid ${C.gray200}`,
                borderTop: `3px solid ${color}`, borderRadius: '9px', padding: '12px 14px',
              }}>
                <div style={{ fontSize: '10px', color: C.gray400, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '800', color: C.gray800 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
