'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowLeft, Zap, Star, Shield, CheckCircle } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { useApp } from '@/lib/app-context';
import { bridgePlan } from '@/lib/plan-access';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

const COMPARISON_KEYS = [
  'upgrade.feat_assets', 'upgrade.feat_engine', 'upgrade.feat_best_opp',
  'upgrade.feat_window', 'upgrade.feat_calendar', 'upgrade.feat_prices',
  'upgrade.feat_trades', 'upgrade.feat_history', 'upgrade.feat_pnl',
  'upgrade.feat_projection', 'upgrade.feat_timing', 'upgrade.feat_export',
  'upgrade.feat_multi', 'upgrade.feat_support',
] as const;

type CellValue = boolean | string;
const COMPARISON_VALUES: [CellValue, CellValue, CellValue][] = [
  ['limited', 'unlimited', 'unlimited'],
  ['preview', 'full',      'full'],
  [false,      true,        true],
  [false,      true,        true],
  ['summary',  'full',      'full'],
  [false,      true,        true],
  [false,      true,        true],
  [false,      '6months',   'unlimited'],
  [false,      false,       true],
  [false,      false,       true],
  [false,      false,       true],
  [false,      false,       true],
  [false,      false,       true],
  [false,      false,       true],
];

const ICONS = [Shield, Zap, Star];

export default function UpgradePage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const { planData } = useApp();
  const { t } = useT();
  const userPlan   = bridgePlan(planData.plan);
  const isAdvanced = userPlan === 'advanced';

  // ── Advanced users: show active-plan status, no purchase flow ────────────
  if (isAdvanced) {
    return (
      <div style={{ minHeight: '100vh', background: C.navy, fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>
        {/* Nav */}
        <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
            <ArrowLeft size={14} /> {t('upgrade.back_to_dashboard')}
          </Link>
          <div style={{ fontSize: '14px', fontWeight: '800', color: C.goldL }}>
            SINED <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: '400' }}>Invest</span>
          </div>
          <div style={{ width: '80px' }} />
        </div>

        {/* Active plan status */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: `${C.gold}22`, border: `2px solid ${C.gold}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={32} color={C.goldL} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: C.goldL, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
              {t('upgrade.advanced_badge')}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: C.white, letterSpacing: '-0.8px', marginBottom: '12px', lineHeight: '1.2' }}>
              {t('upgrade.advanced_active_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', marginBottom: '32px' }}>
              {t('upgrade.advanced_active_desc')}
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: C.navy, padding: '13px 28px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', boxShadow: `0 4px 20px ${C.gold}44` }}>
                {t('upgrade.go_to_dashboard')} →
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Free / Simple users: show purchase flow ───────────────────────────────
  function CellValue({ value }: { value: CellValue }) {
    if (value === true)         return <Check size={16} color={C.green} />;
    if (value === false)        return <X size={16} color="rgba(255,255,255,.15)" />;
    // Translate the string values
    const translated = t(`upgrade.cell_${value}`);
    return <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.6)' }}>{translated !== `upgrade.cell_${value}` ? translated : String(value)}</span>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.navy, fontFamily: 'var(--font)' }}>

      {/* Nav */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
          <ArrowLeft size={14} /> {t('upgrade.back_to_dashboard')}
        </Link>
        <div style={{ fontSize: '14px', fontWeight: '800', color: C.goldL }}>
          SINED <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: '400' }}>Invest</span>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${C.gold}22`, border: `1px solid ${C.gold}44`, borderRadius: '20px', padding: '5px 16px', marginBottom: '24px' }}>
          <Star size={11} color={C.goldL} fill={C.goldL} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: C.goldL, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{t('upgrade.hero_badge')}</span>
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: '800', color: C.white, letterSpacing: '-1.5px', marginBottom: '16px', lineHeight: '1.15' }}>
          {t('upgrade.hero_title_1')}<br /><span style={{ color: C.goldL }}>{t('upgrade.hero_title_2')}</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', maxWidth: '440px', margin: '0 auto' }}
          dangerouslySetInnerHTML={{ __html: t('upgrade.hero_subtitle') }}
        />
      </div>

      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: '12px', padding: '4px', display: 'flex', border: '1px solid rgba(255,255,255,.08)' }}>
          {(['monthly', 'yearly'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: '8px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              background: billing === b ? C.white : 'transparent',
              color: billing === b ? C.navy : 'rgba(255,255,255,.4)',
              fontSize: '13px', fontWeight: '700', transition: 'all .15s',
            }}>
              {b === 'monthly' ? t('upgrade.billing_monthly') : (
                <span>{t('upgrade.billing_yearly')} <span style={{ fontSize: '10px', background: C.green, color: 'white', padding: '1px 6px', borderRadius: '20px', fontWeight: '800', marginLeft: '4px' }}>-20%</span></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '80px' }}>
        {PLANS.map((plan, idx) => {
          const Icon      = ICONS[idx];
          const isSimple  = plan.id === 'simple';
          const isAdv     = plan.id === 'advanced';
          const isCurrent = userPlan === plan.id;
          const price     = billing === 'yearly' ? plan.priceYearly : plan.price;

          const cardBg      = isSimple ? C.white : isAdv ? 'linear-gradient(160deg, #0d1b35, #1a2f5e)' : 'rgba(255,255,255,.04)';
          const textColor   = isSimple ? C.navy : C.white;
          const subColor    = isSimple ? C.blue : isAdv ? C.goldL : 'rgba(255,255,255,.3)';
          const borderStyle = isSimple ? `2px solid ${C.blue}` : isAdv ? `1px solid ${C.gold}44` : '1px solid rgba(255,255,255,.08)';
          const btnBg       = isCurrent ? 'rgba(255,255,255,.06)' : isSimple ? `linear-gradient(135deg, ${C.blue}, #2563EB)` : isAdv ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(255,255,255,.08)';
          const btnColor    = isCurrent ? 'rgba(255,255,255,.3)' : isSimple ? C.white : isAdv ? C.navy : 'rgba(255,255,255,.5)';
          const featureColor = isSimple ? C.gray600 : 'rgba(255,255,255,.6)';
          const checkColor   = isAdv ? C.goldL : C.green;
          const iconColor    = isSimple ? C.blue : isAdv ? C.gold : 'rgba(255,255,255,.25)';

          return (
            <div key={plan.id} style={{ background: cardBg, border: borderStyle, borderRadius: '20px', padding: '28px 24px', position: 'relative', boxShadow: isSimple ? `0 12px 48px ${C.blue}30` : isAdv ? `0 12px 48px ${C.gold}18` : 'none' }}>
              {isSimple && <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: C.blue, color: C.white, fontSize: '10px', fontWeight: '800', padding: '4px 16px', borderRadius: '20px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>⚡ {t('upgrade.badge_popular')}</div>}
              {isAdv    && <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: C.navy, fontSize: '10px', fontWeight: '800', padding: '4px 16px', borderRadius: '20px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>★ {t('upgrade.badge_pro')}</div>}

              <div style={{ marginBottom: '20px' }}>
                <Icon size={22} color={iconColor} fill={isAdv ? C.gold : 'none'} style={{ marginBottom: '12px', display: 'block' }} />
                <div style={{ fontSize: '18px', fontWeight: '800', color: textColor, marginBottom: '4px' }}>{plan.name}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: subColor, marginBottom: '14px' }}>{t(`upgrade.tagline_${plan.id}`)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: textColor, letterSpacing: '-1px' }}>{price}</span>
                  {plan.id !== 'free' && <span style={{ fontSize: '11px', color: isSimple ? C.gray400 : 'rgba(255,255,255,.3)' }}>{billing === 'yearly' ? t('upgrade.per_mo_annual') : t('upgrade.per_mo')}</span>}
                </div>
              </div>

              <button disabled={isCurrent} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '800', marginBottom: '22px', background: btnBg, color: btnColor, boxShadow: isSimple && !isCurrent ? `0 4px 16px ${C.blue}44` : 'none' }}>
                {isCurrent ? t('upgrade.current_plan') : t(`upgrade.cta_${plan.id}`)}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: featureColor, lineHeight: '1.5' }}>
                    <Check size={13} color={checkColor} style={{ flexShrink: 0, marginTop: '2px' }} /> {f}
                  </li>
                ))}
                {plan.limitations?.map(l => (
                  <li key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,.2)', lineHeight: '1.5' }}>
                    <X size={13} color="rgba(255,255,255,.15)" style={{ flexShrink: 0, marginTop: '2px' }} /> {l}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div style={{ maxWidth: '900px', margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: '17px', fontWeight: '800', color: C.white }}>{t('upgrade.comparison_title')}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ padding: '12px 28px', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('upgrade.comparison_feature')}</div>
            {['Free', 'Simple', 'Advanced'].map((p, i) => (
              <div key={p} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '800', textAlign: 'center', color: i === 0 ? 'rgba(255,255,255,.25)' : i === 1 ? '#93C5FD' : C.goldL }}>{p}</div>
            ))}
          </div>
          {COMPARISON_KEYS.map((key, i) => {
            const [free, simple, advanced] = COMPARISON_VALUES[i];
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < COMPARISON_KEYS.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                <div style={{ padding: '13px 28px', fontSize: '13px', color: 'rgba(255,255,255,.55)' }}>{t(key)}</div>
                <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CellValue value={free} /></div>
                <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CellValue value={simple} /></div>
                <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CellValue value={advanced} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust */}
      <div style={{ maxWidth: '900px', margin: '0 auto 80px', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {(['trust_secure', 'trust_cancel', 'trust_support'] as const).map(key => (
          <div key={key} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '22px', marginBottom: '10px' }}>{t(`upgrade.${key}_icon`)}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.white, marginBottom: '6px' }}>{t(`upgrade.${key}_title`)}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', lineHeight: '1.6' }}>{t(`upgrade.${key}_desc`)}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 24px 60px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', marginBottom: '12px' }}>
          {t('upgrade.footer_note')}
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          {(['footer_terms', 'footer_privacy', 'footer_how'] as const).map(key => (
            <Link key={key} href={t(`upgrade.${key}_href`)} style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', textDecoration: 'none' }}>{t(`upgrade.${key}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
