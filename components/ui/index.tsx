'use client';

import React from 'react';

// ─── Design tokens (inline, consistent with CSS vars) ─────────────────────────
export const C = {
  navy:     '#0A1628',
  navy2:    '#0F1E38',
  blue:     '#1744C0',
  blueL:    '#2563EB',
  gold:     '#C9A84C',
  goldL:    '#E8C96B',
  green:    '#059669',
  red:      '#DC2626',
  amber:    '#D97706',
  gray50:   '#F8FAFC',
  gray100:  '#F1F5F9',
  gray200:  '#E2E8F0',
  gray300:  '#CBD5E1',
  gray400:  '#94A3B8',
  gray500:  '#64748B',
  gray600:  '#475569',
  gray700:  '#334155',
  gray800:  '#1E293B',
  white:    '#FFFFFF',
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, className }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{
      background: C.white,
      borderRadius: '16px',
      border: `1px solid ${C.gray200}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.05), 0 6px 24px rgba(0,0,0,.04)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ children, action }: {
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: '20px 24px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: C.gray800, letterSpacing: '-0.2px' }}>
        {children}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, style }: {
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return <div style={{ padding: '16px 24px 24px', ...style }}>{children}</div>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, accent, icon }: {
  label: string; value: string; sub?: string;
  color?: string; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${accent || C.blue}` }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            {label}
          </span>
          {icon && <span style={{ color: C.gray300 }}>{icon}</span>}
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: color || C.gray800, letterSpacing: '-1px', fontFamily: 'var(--mono)', lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: '12px', color: C.gray400, marginTop: '6px' }}>{sub}</div>}
      </div>
    </Card>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
type BtnSize    = 'xs' | 'sm' | 'md';

const BV: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: C.blue,   color: C.white,   border: 'none' },
  gold:      { background: C.gold,   color: C.navy,    border: 'none' },
  secondary: { background: C.gray100, color: C.gray700, border: `1px solid ${C.gray200}` },
  ghost:     { background: 'transparent', color: C.gray500, border: `1px solid ${C.gray200}` },
  danger:    { background: '#FEF2F2', color: C.red,     border: `1px solid #FECACA` },
};

const BS: Record<BtnSize, React.CSSProperties> = {
  xs: { padding: '4px 10px', fontSize: '11px', borderRadius: '6px' },
  sm: { padding: '6px 14px', fontSize: '12px', borderRadius: '8px' },
  md: { padding: '10px 20px', fontSize: '13.5px', borderRadius: '10px' },
};

export function Button({ variant = 'primary', size = 'md', children, loading, style, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant; size?: BtnSize; loading?: boolean;
  }
) {
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      fontFamily: 'var(--font)', fontWeight: '600',
      cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
      opacity: props.disabled || loading ? 0.55 : 1,
      transition: 'all .15s', whiteSpace: 'nowrap',
      ...BV[variant], ...BS[size], ...style,
    }}>
      {loading ? '…' : children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = 'green' | 'red' | 'blue' | 'gold' | 'gray' | 'amber';

const BC: Record<BadgeColor, React.CSSProperties> = {
  green: { background: '#DCFCE7', color: C.green },
  red:   { background: '#FEE2E2', color: C.red },
  blue:  { background: '#DBEAFE', color: C.blue },
  gold:  { background: '#FEF9E7', color: C.gold },
  gray:  { background: C.gray100, color: C.gray500 },
  amber: { background: '#FEF3C7', color: C.amber },
};

export function Badge({ children, color = 'gray', style }: {
  children: React.ReactNode; color?: BadgeColor; style?: React.CSSProperties;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: '3px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600',
      ...BC[color], ...style,
    }}>
      {children}
    </span>
  );
}

export function TickerBadge({ ticker }: { ticker: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: C.navy, color: C.white,
      fontSize: '11px', fontWeight: '600',
      padding: '3px 8px', borderRadius: '5px',
      fontFamily: 'var(--mono)', letterSpacing: '.5px',
    }}>
      {ticker}
    </span>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      onClick={() => onChange(!value)}>
      <div style={{
        width: '42px', height: '24px',
        background: value ? C.green : C.gray200,
        borderRadius: '12px', position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '4px',
          left: value ? '22px' : '4px',
          width: '16px', height: '16px',
          background: C.white, borderRadius: '50%',
          transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }} />
      </div>
      {label && <span style={{ fontSize: '13px', color: C.gray600, fontWeight: '500' }}>{label}</span>}
    </div>
  );
}

// ─── PercentBar ───────────────────────────────────────────────────────────────
export function PercentBar({ value, max = 100, color }: {
  value: number; max?: number; color?: string;
}) {
  const fill = Math.min((value / (max || 100)) * 100, 100);
  const over = value > max;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '5px', background: C.gray100, borderRadius: '10px', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{
          height: '100%', width: `${fill}%`,
          background: color || (over ? C.red : C.blue),
          borderRadius: '10px', transition: 'width .4s ease',
        }} />
      </div>
      <span style={{
        fontSize: '12px', fontWeight: '500',
        color: over ? C.red : C.gray500,
        minWidth: '40px', textAlign: 'right',
        fontFamily: 'var(--mono)',
      }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '56px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '40px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: C.gray600 }}>{title}</div>
      {description && <div style={{ fontSize: '13px', color: C.gray400, maxWidth: '300px', lineHeight: '1.5' }}>{description}</div>}
      {action && <div style={{ marginTop: '14px' }}>{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, width = 540 }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(10,22,40,.7);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(6px);
          padding: 16px;
        }
        .modal-box {
          background: white; border-radius: 20px; padding: 28px;
          width: ${width}px; max-width: 95vw;
          box-shadow: 0 24px 80px rgba(0,0,0,.3);
          max-height: 90vh; overflow-y: auto;
        }
        @media (max-width: 768px) {
          .modal-overlay { align-items: flex-end; padding: 0; }
          .modal-box {
            width: 100% !important; max-width: 100% !important;
            border-radius: 24px 24px 0 0; padding: 24px 20px;
            max-height: 92vh;
          }
        }
      `}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box animate-scale" onClick={e => e.stopPropagation()}>
          {/* Drag handle for mobile */}
          <div style={{ width: '40px', height: '4px', background: '#E2E8F0', borderRadius: '2px', margin: '0 auto 20px', display: 'block' }} className="mobile-drag-handle" />
          <div style={{ marginBottom: subtitle ? '4px' : '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: C.gray800, letterSpacing: '-0.4px' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '13px', color: C.gray400, marginTop: '3px', marginBottom: '20px' }}>{subtitle}</div>}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', justifyContent: 'flex-end',
      marginTop: '28px', paddingTop: '20px', borderTop: `1px solid ${C.gray100}`,
    }}>
      {children}
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────
export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: C.gray600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  padding: '10px 13px', borderRadius: '9px',
  border: `1.5px solid ${C.gray200}`,
  fontFamily: 'var(--font)', fontSize: '13.5px',
  color: C.gray800, background: C.white, outline: 'none', width: '100%',
  transition: 'border-color .15s, box-shadow .15s',
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ ...inputBase, ...props.style }}
      onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px rgba(23,68,192,.1)`; }}
      onBlur={e  => { e.target.style.borderColor = C.gray200; e.target.style.boxShadow = 'none'; }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...inputBase, cursor: 'pointer', ...props.style }} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', visible }: {
  message: string; type?: 'success' | 'error' | 'info'; visible: boolean;
}) {
  const bg = type === 'success' ? C.green : type === 'error' ? C.red : C.blue;
  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px',
      background: bg, color: C.white,
      padding: '13px 22px', borderRadius: '12px',
      fontSize: '13px', fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0,0,0,.25)',
      transform: visible ? 'none' : 'translateY(80px)',
      opacity: visible ? 1 : 0,
      transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
      zIndex: 999, pointerEvents: 'none',
    }}>
      {type === 'success' ? '✓ ' : type === 'error' ? '⚠ ' : 'ℹ '}{message}
    </div>
  );
}

// ─── Page layout ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        .page-header { padding: 0 28px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
        .page-header-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        @media (max-width: 768px) {
          .page-header { height: auto !important; padding: 14px 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 10px; }
          .page-header-actions { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
          .page-header-actions > * { flex-shrink: 0; }
        }
      `}</style>
      <div className="page-header" style={{
        background: C.white, borderBottom: `1px solid ${C.gray200}`,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: C.gray800, letterSpacing: '-0.4px' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '12px', color: C.gray400, marginTop: '1px' }}>{subtitle}</div>}
        </div>
        {action && <div className="page-header-actions">{action}</div>}
      </div>
    </>
  );
}

export function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .page-content { padding: 28px; }
        @media (max-width: 768px) { .page-content { padding: 14px; } }
      `}</style>
      <div className="page-content stagger">{children}</div>
    </>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: '1px', background: C.gray100, ...style }} />;
}

// ─── Gold accent line ─────────────────────────────────────────────────────────
export function GoldLine() {
  return (
    <div style={{
      height: '2px',
      background: `linear-gradient(90deg, ${C.gold}, ${C.goldL}, transparent)`,
      borderRadius: '1px',
    }} />
  );
}
