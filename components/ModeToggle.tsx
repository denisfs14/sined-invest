'use client';

import { useRouter } from 'next/navigation';
import { Zap, BarChart2, Lock } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { getUpgradeUrl } from '@/lib/plans';
import { C } from '@/components/ui';

interface ModeToggleProps {
  compact?: boolean;   // slim version for header
}

export function ModeToggle({ compact = false }: ModeToggleProps) {
  const { mode, setMode, planData } = useApp();
  const router = useRouter();

  function handleAdvancedClick() {
    if (planData.canAdv) {
      setMode('advanced');
    } else {
      // Redirect to upgrade page with advanced target
      router.push(getUpgradeUrl('advanced_mode', 'advanced'));
    }
  }

  function handleSimpleClick() {
    setMode('simple');
  }

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        background: 'rgba(255,255,255,.06)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: '8px', padding: '3px',
      }}>
        <ToggleBtn
          label="Simple"
          icon={<Zap size={11} />}
          active={mode === 'simple'}
          onClick={handleSimpleClick}
          compact
        />
        <ToggleBtn
          label="Advanced"
          icon={planData.canAdv ? <BarChart2 size={11} /> : <Lock size={11} />}
          active={mode === 'advanced'}
          onClick={handleAdvancedClick}
          locked={!planData.canAdv}
          compact
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
        Modo de visualização
      </div>
      <div style={{
        display: 'flex', gap: '6px',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: '12px', padding: '4px',
      }}>
        <ToggleBtn
          label="Simple Mode"
          sublabel="Decisões rápidas"
          icon={<Zap size={14} />}
          active={mode === 'simple'}
          onClick={handleSimpleClick}
        />
        <ToggleBtn
          label="Advanced Mode"
          sublabel={planData.canAdv ? 'Análise completa' : 'Upgrade necessário'}
          icon={planData.canAdv ? <BarChart2 size={14} /> : <Lock size={14} />}
          active={mode === 'advanced'}
          onClick={handleAdvancedClick}
          locked={!planData.canAdv}
        />
      </div>
    </div>
  );
}

// ─── Internal tab button ──────────────────────────────────────────────────────
function ToggleBtn({
  label, sublabel, icon, active, onClick, locked = false, compact = false,
}: {
  label: string; sublabel?: string; icon: React.ReactNode;
  active: boolean; onClick: () => void; locked?: boolean; compact?: boolean;
}) {
  const isGold = label.toLowerCase().includes('advanced');

  const activeBg    = isGold
    ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}11)`
    : 'rgba(255,255,255,.1)';
  const activeColor = isGold ? C.goldL : C.white;
  const inactiveColor = 'rgba(255,255,255,.35)';

  if (compact) {
    return (
      <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        background: active ? (isGold ? `${C.gold}22` : 'rgba(255,255,255,.12)') : 'transparent',
        color: active ? activeColor : inactiveColor,
        fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font)',
        transition: 'all .15s',
      }}>
        {icon}
        {label}
        {locked && !active && (
          <span style={{ fontSize: '8px', background: `${C.gold}33`, color: C.goldL, padding: '1px 4px', borderRadius: '4px', fontWeight: '800' }}>
            PRO
          </span>
        )}
      </button>
    );
  }

  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
      background: active ? activeBg : 'transparent',
      border: active ? `1px solid ${isGold ? C.gold + '33' : 'rgba(255,255,255,.1)'}` : '1px solid transparent',
      transition: 'all .15s', fontFamily: 'var(--font)',
      gap: '4px',
    }}>
      <div style={{ color: active ? activeColor : inactiveColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: '800', color: active ? activeColor : inactiveColor }}>
          {label}
        </span>
        {locked && (
          <span style={{ fontSize: '9px', background: `${C.gold}33`, color: C.goldL, padding: '1px 5px', borderRadius: '4px', fontWeight: '800', marginLeft: '2px' }}>
            PRO
          </span>
        )}
      </div>
      {sublabel && (
        <span style={{ fontSize: '10px', color: active ? (isGold ? `${C.goldL}99` : 'rgba(255,255,255,.5)') : 'rgba(255,255,255,.2)', textAlign: 'center', lineHeight: '1.3' }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}
