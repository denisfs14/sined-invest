'use client';

import { RecommendationResult } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import { Badge, TickerBadge, C } from '@/components/ui';

export function RecommendationDisplay({ result }: { result: RecommendationResult }) {
  if (result.error) {
    return (
      <div style={{
        background: '#FEF2F2', border: `1px solid #FECACA`,
        borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <span style={{ fontSize: '28px' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: '700', color: C.red, fontSize: '14px' }}>Sem recomendação</div>
          <div style={{ fontSize: '13px', color: '#991B1B', marginTop: '3px' }}>{result.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {result.items.map((item, i) => (
        <div key={item.asset.id} className={`animate-fade rec-item ${item.is_red ? 'rec-item-red' : ''}`} style={{
          background: C.white,
          border: `1px solid ${item.is_red ? '#FECACA' : C.gray200}`,
          borderLeft: `4px solid ${item.is_red ? C.red : C.blue}`,
          borderRadius: '14px',
          padding: '18px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        }}>
          {/* Left */}
          <div className="rec-item-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '34px', height: '34px', flexShrink: 0,
              background: item.is_red ? C.red : C.navy,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '800', color: C.white,
              fontFamily: 'var(--mono)',
            }}>{i + 1}</div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <TickerBadge ticker={item.asset.ticker} />
                {item.is_red && <Badge color="red">🔴 Vermelho</Badge>}
              </div>
              <div style={{ fontSize: '12px', color: C.gray500 }}>
                {item.asset.name || '—'}
                {' · '}
                <span style={{ fontFamily: 'var(--mono)' }}>
                  {formatPercent(item.asset.current_percentage)} atual → {formatPercent(item.new_percentage)} após aporte
                </span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="rec-item-right" style={{ display: 'flex', gap: '28px', textAlign: 'right', flexShrink: 0 }}>
            <Metric label="Investir" value={formatCurrency(item.spent)} sub={`de ${formatCurrency(item.allocated_amount)}`} />
            <Metric label="Cotas" value={item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(3)} sub={`× ${formatCurrency(item.asset.current_price)}`} highlight />
            <Metric label="Sobra" value={formatCurrency(item.leftover)} sub="neste ativo" dim />
          </div>
        </div>
      ))}

      {/* Leftover total */}
      <div style={{
        marginTop: '6px',
        background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
        border: '1px solid #BBF7D0', borderRadius: '14px',
        padding: '18px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#047857' }}>💵 Sobra de Caixa Total</div>
          <div style={{ fontSize: '12px', color: '#6EE7B7', marginTop: '2px' }}>
            Não alocado em cotas inteiras — manter em conta
          </div>
        </div>
        <div style={{
          fontSize: '28px', fontWeight: '800', fontFamily: 'var(--mono)',
          color: result.total_leftover > 100 ? C.amber : C.green, letterSpacing: '-1px',
        }}>
          {formatCurrency(result.total_leftover)}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
        {[
          { label: 'Disponível', value: formatCurrency(result.total_available), color: C.blue },
          { label: 'Investido', value: formatCurrency(result.total_invested), color: C.green },
          { label: 'Patrimônio atual', value: formatCurrency(result.portfolio_total), color: C.gold },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.white, border: `1px solid ${C.gray200}`,
            borderTop: `3px solid ${color}`,
            borderRadius: '10px', padding: '13px 16px',
          }}>
            <div style={{ fontSize: '10px', color: C.gray400, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: C.gray800, fontFamily: 'var(--mono)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, highlight, dim }: {
  label: string; value: string; sub?: string; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{
        fontSize: highlight ? '22px' : '16px', fontWeight: '800',
        color: dim ? C.gray300 : C.gray800,
        fontFamily: 'var(--mono)', letterSpacing: '-0.5px',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: C.gray400, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}
