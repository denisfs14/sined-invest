'use client';

import Link from 'next/link';
import { Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { DividendEvent, StrategySettings } from '@/types';
import { calculateContributionWindow } from '@/lib/calculations/dividend-calendar';
import { formatCurrency, formatDate } from '@/utils/format';
import { C, Button } from '@/components/ui';

interface Props {
  dividends: DividendEvent[];
  strategy:  StrategySettings;
  compact?:  boolean;
}

export function BestBuyWindow({ dividends, strategy, compact = false }: Props) {
  const win = calculateContributionWindow(dividends, strategy.contribution_timing_mode, 0);

  const isReady   = win.ready;
  const hasData   = dividends.length > 0;

  // Colors & icons
  const bg     = isReady
    ? `linear-gradient(135deg, ${C.navy}, ${C.navy2})`
    : hasData
    ? 'linear-gradient(135deg, #1C1917, #292524)'
    : `linear-gradient(135deg, #1e293b, #0f172a)`;

  const label  = isReady ? '✦ Janela de Aporte'
    : hasData  ? '⏳ Aguardando Proventos'
    : '📊 Configure seus proventos';

  const title  = isReady
    ? 'Momento ideal para aportar'
    : hasData
    ? `Aguardando ${formatCurrency(win.total_pending)}`
    : 'Registre proventos para ativar a janela';

  if (compact) {
    return (
      <div style={{
        background: bg, borderRadius: '12px', padding: '14px 18px',
        border: `1px solid ${isReady ? C.gold + '44' : 'rgba(255,255,255,.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isReady
            ? <Zap size={16} color={C.goldL} />
            : <Clock size={16} color="rgba(255,255,255,.4)" />}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.white, marginTop: '2px' }}>{title}</div>
          </div>
        </div>
        {isReady && (
          <Link href="/contribution">
            <Button variant="gold" size="sm">Aportar →</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: bg, borderRadius: '16px', padding: '20px 24px',
      border: `1px solid ${isReady ? C.gold + '44' : 'transparent'}`,
      marginBottom: '24px',
    }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
            {label}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: C.white, letterSpacing: '-0.3px', lineHeight: '1.3' }}>
            {title}
          </div>
          {win.last_payment_date && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
              Último pagamento: {formatDate(win.last_payment_date)}
            </div>
          )}
        </div>
        <Link href="/contribution" style={{ flexShrink: 0 }}>
          <Button variant="gold" size="sm">Aportar →</Button>
        </Link>
      </div>

      {/* Stats */}
      {hasData && (
        <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '14px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Recebido</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: C.green, fontFamily: 'var(--mono)' }}>
              {formatCurrency(win.total_received)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Pendente</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: C.amber, fontFamily: 'var(--mono)' }}>
              {formatCurrency(win.total_pending)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Esperado</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: 'rgba(255,255,255,.6)', fontFamily: 'var(--mono)' }}>
              {formatCurrency(win.total_expected)}
            </div>
          </div>
        </div>
      )}

      {!hasData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <AlertCircle size={13} color="rgba(255,255,255,.3)" />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>
            Vá em <strong style={{ color: 'rgba(255,255,255,.5)' }}>Proventos</strong> para registrar ou buscar dividendos
          </span>
        </div>
      )}
    </div>
  );
}
