'use client';

import Link from 'next/link';
import { Lock, ArrowRight, Sparkles, Zap } from 'lucide-react';
import {
  Plan, canAccess, getUpgradeUrl,
  getPlanConfig, getNextPlan, getPlanMode, MODE_LABELS,
} from '@/lib/plans';
import { bridgePlan } from '@/lib/plan-access';
import { useApp } from '@/lib/app-context';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

// ─── Helper: get lowercase plan from context planData ────────────────────────
function useCurrentPlan(): Plan {
  const { planData } = useApp();
  return bridgePlan(planData.plan);
}

// ─── PlanGate — hard lock on feature access ───────────────────────────────────
interface GateProps {
  feature:      string;
  children:     React.ReactNode;
  compact?:     boolean;
  blurContent?: boolean;
  targetPlan?:  Plan;
}

export function PlanGate({ feature, children, compact = false, blurContent = false, targetPlan }: GateProps) {
  const userPlan = useCurrentPlan();
  if (canAccess(userPlan, feature)) return <>{children}</>;

  const next       = targetPlan ?? getNextPlan(userPlan);
  const nextCfg    = next ? getPlanConfig(next) : null;
  const upgradeUrl = getUpgradeUrl(feature, next ?? undefined);

  if (compact) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>{children}</span>
        <Link href={upgradeUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          background: nextCfg?.id === 'advanced'
            ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})`
            : `linear-gradient(135deg, ${C.blue}, #2563EB)`,
          color: nextCfg?.id === 'advanced' ? C.navy : C.white,
          padding: '2px 8px', borderRadius: '20px',
          fontSize: '10px', fontWeight: '800', textDecoration: 'none', letterSpacing: '.5px',
        }}>
          <Lock size={8} /> {nextCfg?.badge ?? 'UPGRADE'}
        </Link>
      </span>
    );
  }

  const isAdvanced  = next === 'advanced';
  const accentColor = isAdvanced ? C.gold : C.blue;
  const accentBg    = isAdvanced ? `${C.gold}15` : '#EFF6FF';
  const btnBg       = isAdvanced
    ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})`
    : `linear-gradient(135deg, ${C.blue}, #2563EB)`;
  const btnColor = isAdvanced ? C.navy : C.white;

  return (
    <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
      {blurContent && (
        <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.3 }}>
          {children}
        </div>
      )}
      <div style={{
        ...(blurContent ? { position: 'absolute', inset: 0, backdropFilter: 'blur(2px)' } : {}),
        background: blurContent ? 'rgba(255,255,255,.85)' : accentBg,
        border: `1px solid ${accentColor}22`,
        borderRadius: '14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${accentColor}18`, border: `1px solid ${accentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Lock size={22} color={accentColor} />
        </div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: accentColor, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
          {nextCfg ? `${nextCfg.badge} — ${MODE_LABELS[getPlanMode(nextCfg.id)].tagline}` : 'Upgrade required'}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '800', color: C.gray800, marginBottom: '8px' }}>
          {nextCfg?.name === 'Simple' ? 'Simple Mode feature' : 'Advanced Mode feature'}
        </div>
        <div style={{ fontSize: '13px', color: C.gray500, marginBottom: '24px', maxWidth: '280px', lineHeight: '1.65' }}>
          {nextCfg?.description ?? 'Upgrade to access this feature.'}
        </div>
        <Link href={upgradeUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: btnBg, color: btnColor,
          padding: '12px 24px', borderRadius: '10px',
          fontSize: '13px', fontWeight: '800', textDecoration: 'none',
          boxShadow: `0 4px 20px ${accentColor}33`,
        }}>
          {nextCfg?.cta ?? 'See plans'} <ArrowRight size={14} />
        </Link>
        <div style={{ fontSize: '11px', color: C.gray400, marginTop: '12px' }}>
          {nextCfg?.price} · Cancel anytime
        </div>
      </div>
    </div>
  );
}

// ─── UpgradeBanner — slim contextual CTA ─────────────────────────────────────
export function UpgradeBanner({ message, feature, targetPlan }: {
  message?: string; feature?: string; targetPlan?: Plan;
}) {
  const userPlan = useCurrentPlan();
  const next     = targetPlan ?? getNextPlan(userPlan);
  if (!next) return null; // already on top plan — show nothing

  const nextCfg    = getPlanConfig(next);
  const upgradeUrl = getUpgradeUrl(feature, next);
  const isAdvanced = next === 'advanced';
  const accentColor = isAdvanced ? C.gold : C.blue;
  const modeLabel  = MODE_LABELS[getPlanMode(next)];

  return (
    <Link href={upgradeUrl} style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
      <div style={{
        background: isAdvanced
          ? `linear-gradient(135deg, ${C.navy}, #1a2f5e)`
          : `linear-gradient(135deg, #1e3a8a, #1e40af)`,
        border: `1px solid ${accentColor}33`,
        borderRadius: '12px', padding: '13px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdvanced ? <Sparkles size={15} color={C.goldL} /> : <Zap size={15} color="#93C5FD" />}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: isAdvanced ? C.goldL : '#93C5FD' }}>
              {message ?? `${modeLabel.name} — ${modeLabel.tagline}`}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginTop: '1px' }}>
              {nextCfg.price} · {nextCfg.features.slice(0, 2).join(' · ')}
            </div>
          </div>
        </div>
        <div style={{
          background: isAdvanced
            ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})`
            : `linear-gradient(135deg, ${C.blue}, #2563EB)`,
          color: isAdvanced ? C.navy : C.white,
          padding: '7px 14px', borderRadius: '8px',
          fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {nextCfg.cta} →
        </div>
      </div>
    </Link>
  );
}

// ─── FeatureTeaser — inline contextual upsell ────────────────────────────────
export function FeatureTeaser({ feature, title, description }: {
  feature: string; title: string; description: string;
}) {
  const userPlan = useCurrentPlan();
  if (canAccess(userPlan, feature)) return null;

  const next        = getNextPlan(userPlan);
  const nextCfg     = next ? getPlanConfig(next) : null;
  const upgradeUrl  = getUpgradeUrl(feature, next ?? undefined);
  const isAdvanced  = next === 'advanced';
  const accentColor = isAdvanced ? C.gold : C.blue;
  const accentBg    = isAdvanced ? `${C.gold}10` : '#EFF6FF';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px', marginTop: '12px',
      background: accentBg, border: `1px solid ${accentColor}22`, borderRadius: '12px',
    }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Lock size={14} color={accentColor} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: accentColor, marginBottom: '2px' }}>
          {title} {nextCfg && <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.7 }}>— {nextCfg.badge}</span>}
        </div>
        <div style={{ fontSize: '11px', color: C.gray500, lineHeight: '1.5' }}>{description}</div>
      </div>
      <Link href={upgradeUrl} style={{ fontSize: '11px', fontWeight: '800', color: accentColor, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Unlock →
      </Link>
    </div>
  );
}

// ─── ModeBadge — shows current mode in UI ────────────────────────────────────
export function ModeBadge() {
  const userPlan = useCurrentPlan();
  const mode = getPlanMode(userPlan);
  const cfg  = MODE_LABELS[mode];
  return (
    <span style={{
      fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
      padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase',
      background: mode === 'demo'   ? C.gray100
                : mode === 'simple' ? '#EFF6FF'
                : `${C.gold}22`,
      color:      mode === 'demo'   ? C.gray500
                : mode === 'simple' ? C.blue
                : C.gold,
    }}>
      {mode === 'demo' ? 'DEMO' : cfg.name}
    </span>
  );
}

export const PlanBadge = ModeBadge;
