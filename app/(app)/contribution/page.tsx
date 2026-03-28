'use client';

import { useState, useMemo, useEffect } from 'react';
import { Zap, Save, Info } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useT } from '@/lib/i18n';
import { calculatePurchaseRecommendation } from '@/lib/calculations/recommendation-engine';
import { calculateContributionWindow } from '@/lib/calculations/dividend-calendar';
import { RecommendationResult } from '@/types';
import { RecommendationDisplay } from '@/components/RecommendationDisplay';
import {
  PageHeader, PageContent, Card, CardBody, Button,
  EmptyState, Toast, Badge, C,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ContributionPage() {
  const { t } = useT();
    const { assets, classes, holdingsMap, strategy, portfolio, dividends, saveSimulation, mode, planData } = useApp();

  const [amount, setAmount]     = useState(() => {
    try { return sessionStorage.getItem('sined_aporte_amount') || ''; } catch { return ''; }
  });
  const [divs, setDivs]         = useState(() => {
    try { return sessionStorage.getItem('sined_aporte_divs') || ''; } catch { return ''; }
  });
  const [divsAutoFilled, setDivsAutoFilled] = useState(false);
  const [result, setResult]     = useState<RecommendationResult | null>(null);
  const [running, setRunning]   = useState(false);
  const [toast, setToast]       = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });

  const window = useMemo(
    () => calculateContributionWindow(dividends, strategy.contribution_timing_mode, 0),
    [dividends, strategy.contribution_timing_mode]
  );

  // Total received this month from dividend_events
  const monthlyDivsReceived = useMemo(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    return dividends
      .filter(d => {
        if (d.status !== 'received') return false;
        const dt = new Date(d.payment_date);
        return dt.getMonth() === month && dt.getFullYear() === year;
      })
      .reduce((s, d) => s + (d.received_amount || d.expected_amount || 0), 0);
  }, [dividends]);

  // Auto-fill proventos field with monthly received amount (once, if not manually set)
  useEffect(() => {
    if (monthlyDivsReceived > 0 && !divsAutoFilled) {
      const saved = sessionStorage.getItem('sined_aporte_divs');
      if (!saved) {
        const val = String(Math.round(monthlyDivsReceived * 100) / 100);
        setDivs(val);
        setDivsAutoFilled(true);
      }
    }
  }, [monthlyDivsReceived, divsAutoFilled]);

  const totalAvailable = (parseFloat(amount) || 0) + (parseFloat(divs) || 0);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  function saveToSession(field: string, val: string) {
    try { sessionStorage.setItem(`sined_aporte_${field}`, val); } catch {}
  }

  function run() {
    if (totalAvailable <= 0) return notify(t('contribution.invalid_amount'), 'error');
    if (assets.length === 0) return notify(t('contribution.no_assets'), 'error');
    setRunning(true);
    setTimeout(() => {
      const res = calculatePurchaseRecommendation({ assets, classes, holdingsMap, totalAvailable, strategy });
      setResult(res);
      setRunning(false);
    }, 200);
  }

  function save() {
    if (!result || result.items.length === 0) return notify('Nada para salvar', 'error');
    saveSimulation({
      portfolio_id: portfolio.id,
      total_amount: result.total_available,
      leftover: result.total_leftover,
      items: result.items.map((item, i) => ({
        id: `item-${i}`,
        simulation_id: '',
        asset_id: item.asset.id,
        allocated_amount: item.allocated_amount,
        quantity: item.quantity,
        leftover: item.leftover,
        asset: item.asset,
      })),
    });
    notify('Simulação salva no histórico ✓');
  }

  return (
    <>
      <PageHeader
        title={t('contribution.title')}
        subtitle={t('contribution.subtitle')}
        action={result && result.items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={save}>
            <Save size={13} /> {t('contribution.save_sim_btn')}
          </Button>
        )}
      />
      <PageContent>

        {/* Contribution window status — what / why / when */}
        {window && (
          <div style={{
            background: window.ready ? `linear-gradient(135deg, ${C.navy}, #1a2f5e)` : '#FFF7ED',
            borderRadius: '14px', padding: '16px 24px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            border: window.ready ? `1px solid ${C.gold}44` : '1px solid #FED7AA',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ fontSize: '20px' }}>{window.ready ? '✦' : '⏳'}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: window.ready ? C.goldL : C.amber }}>
                    {window.ready ? t('contribution.window_ideal') : t('contribution.window_waiting')}
                  </div>
                  {window.ready && (
                    <div style={{ background: `${C.green}22`, border: `1px solid ${C.green}44`, borderRadius: '20px', padding: '1px 8px', fontSize: '9px', fontWeight: '800', color: C.green, letterSpacing: '1px', textTransform: 'uppercase' }}>Timing Ideal</div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: window.ready ? 'rgba(255,255,255,.4)' : '#92400E', lineHeight: '1.5' }}>
                  {window.ready
                    ? `${formatCurrency(window.total_received)} recebidos este mês · Aportar agora maximiza o capital disponível`
                    : window.last_payment_date
                    ? `Aguardando ${formatCurrency(window.total_pending)} — previsto ${formatDate(window.last_payment_date)}`
                    : 'Registre proventos em Proventos para ativar a janela inteligente'}
                </div>
              </div>
            </div>
            <Badge color={window.ready ? 'green' : 'amber'}>
              {window.ready ? t('contribution.window_ready') : `Pendente: ${formatCurrency(window.total_pending)}`}
            </Badge>
          </div>
        )}

        {/* Input box - dark hero */}
        <div style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)`,
          borderRadius: '20px', padding: '36px',
          marginBottom: '28px',
          border: `1px solid ${C.gold}22`,
          boxShadow: `0 20px 60px rgba(10,22,40,.25)`,
        }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
              {t('contribution.engine_label')}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px' }}>
              {t('contribution.what_to_buy')}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
              {t('contribution.enter_value')}
            </div>
          </div>

          <div className="contribution-inputs" style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
            {/* Aporte Mensal */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '9px' }}>
                {t('contribution.monthly_contribution')}
              </div>
              <input
                type="number" min="0" step="0.01" placeholder="5000.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); saveToSession('amount', e.target.value); }}
                style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: '12px', padding: '14px 18px', color: C.white, fontSize: '20px', fontWeight: '700', fontFamily: 'var(--mono)', outline: 'none', transition: 'border-color .15s' }}
                onFocus={e => (e.target.style.borderColor = C.goldL)}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.12)')}
              />
            </div>

            {/* Proventos / Extras — auto-filled from this month's received dividends */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  {t('contribution.dividends_extras')}
                </div>
                {monthlyDivsReceived > 0 && (
                  <div style={{
                    fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
                    background: 'rgba(201,168,76,.2)', color: C.goldL, letterSpacing: '.5px',
                  }}>
                    Auto {formatCurrency(monthlyDivsReceived)}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={divs}
                  onChange={e => { setDivs(e.target.value); setDivsAutoFilled(true); saveToSession('divs', e.target.value); }}
                  style={{ width: '100%', background: divs && parseFloat(divs) > 0 ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.07)', border: `1.5px solid ${divs && parseFloat(divs) > 0 ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.12)'}`, borderRadius: '12px', padding: '14px 18px', color: C.white, fontSize: '20px', fontWeight: '700', fontFamily: 'var(--mono)', outline: 'none', transition: 'all .15s' }}
                  onFocus={e => (e.target.style.borderColor = C.goldL)}
                  onBlur={e  => (e.target.style.borderColor = divs && parseFloat(divs) > 0 ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.12)')}
                />
                {monthlyDivsReceived > 0 && divs !== String(Math.round(monthlyDivsReceived * 100) / 100) && (
                  <button
                    onClick={() => { const v = String(Math.round(monthlyDivsReceived * 100) / 100); setDivs(v); saveToSession('divs', v); }}
                    title="Restaurar valor automático"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(201,168,76,.2)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: C.goldL, fontSize: '10px', fontWeight: '700' }}
                  >
                    ↺ Auto
                  </button>
                )}
              </div>
              {monthlyDivsReceived > 0 && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', marginTop: '5px' }}>
                  Recebido esse mês · Edite se divergente
                </div>
              )}
            </div>

            <button
              onClick={run}
              disabled={running}
              className="contribution-calc-btn"
              style={{
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                color: C.navy,
                border: 'none',
                padding: '15px 28px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '800',
                fontFamily: 'var(--font)',
                cursor: running ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                boxShadow: `0 4px 20px ${C.gold}55`,
              }}
            >
              <Zap size={16} />
              {running ? t('contribution.calculating') : t('contribution.calculate_btn')}
            </button>
          </div>

          {/* Info strip */}
          {totalAvailable > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Global params */}
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: t('contribution.total_available'), value: formatCurrency(totalAvailable), color: C.white },
                  { label: 'Limite máximo',    value: `${strategy.max_percentage}%`, color: '#93C5FD' },
                  { label: 'Prioridade',       value: strategy.prioritize_red ? 'Vermelhos' : 'Menor %', color: strategy.prioritize_red ? '#FCA5A5' : '#93C5FD' },
                  { label: 'Modo',             value: classes.some(c => (c.contribution_percentage || 0) > 0) ? 'Por Classe' : 'Global', color: '#86EFAC' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: 'var(--mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Class breakdown */}
              {classes.some(c => (c.contribution_percentage || 0) > 0) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {classes.filter(c => (c.contribution_percentage || 0) > 0).map(c => (
                    <div key={c.id} style={{ background: 'rgba(255,255,255,.08)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)', fontWeight: '600' }}>{c.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: C.goldL, fontFamily: 'var(--mono)' }}>{c.contribution_percentage}%</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>Top {c.top_n || 1}</span>
                      <span style={{ fontSize: '12px', color: C.goldL, fontFamily: 'var(--mono)', fontWeight: '700' }}>= {formatCurrency((c.contribution_percentage / 100) * totalAvailable)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        {result ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: C.gray800, letterSpacing: '-0.3px' }}>
                📋 Recomendação de Compra
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge color="blue">
                  {result.items.length} ativo{result.items.length !== 1 ? 's' : ''} selecionado{result.items.length !== 1 ? 's' : ''}
                </Badge>
                <Button variant="gold" size="sm" onClick={save}>
                  <Save size={13} /> Salvar
                </Button>
              </div>
            </div>
            <RecommendationDisplay result={result} />
          </div>
        ) : (
          <Card>
            <CardBody>
              <EmptyState
                icon="🧮"
                title="Pronto para calcular"
                description={assets.length === 0
                  ? 'Adicione ativos à carteira antes de calcular'
                  : 'Informe o aporte acima e clique em Calcular'}
              />
            </CardBody>
          </Card>
        )}
      </PageContent>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  );
}
