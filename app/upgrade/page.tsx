'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowLeft, Zap, Star, Shield } from 'lucide-react';
import { PLANS, getUserPlan } from '@/lib/plans';
import { C } from '@/components/ui';

const COMPARISON: [string, string|boolean, string|boolean, string|boolean][] = [
  ['Ativos na carteira',            'Limitado',  'Ilimitados', 'Ilimitados'],
  ['Motor de recomendação',         'Preview',   'Completo',   'Completo'],
  ['Melhor oportunidade do mês',    false,        true,         true],
  ['Janela de aporte inteligente',  false,        true,         true],
  ['Calendário de proventos',       'Resumido',  'Completo',   'Completo'],
  ['Sincronização de preços',       false,        true,         true],
  ['Registrar compras e vendas',    false,        true,         true],
  ['Histórico de simulações',       false,       '6 meses',   'Ilimitado'],
  ['Análise P&L detalhada',         false,        false,        true],
  ['Projeção de renda mensal',      false,        false,        true],
  ['Timing insights avançados',     false,        false,        true],
  ['Exportação PDF / Excel',        false,        false,        true],
  ['Múltiplas carteiras',           false,        false,        true],
  ['Suporte prioritário',           false,        false,        true],
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)  return <Check size={16} color={C.green} />;
  if (value === false) return <X size={16} color="rgba(255,255,255,.15)" />;
  return <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.6)' }}>{value}</span>;
}

const ICONS = [Shield, Zap, Star];

export default function UpgradePage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const userPlan = getUserPlan();

  return (
    <div style={{ minHeight: '100vh', background: C.navy, fontFamily: 'var(--font)' }}>

      {/* Nav */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
          <ArrowLeft size={14} /> Dashboard
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
          <span style={{ fontSize: '11px', fontWeight: '700', color: C.goldL, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Escolha seu modo</span>
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: '800', color: C.white, letterSpacing: '-1.5px', marginBottom: '16px', lineHeight: '1.15' }}>
          Invista com mais<br /><span style={{ color: C.goldL }}>inteligência</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', maxWidth: '440px', margin: '0 auto' }}>
          O motor calcula o que, quanto e quantas cotas comprar. <strong style={{ color: 'rgba(255,255,255,.6)' }}>Simple Mode</strong> resolve 90% dos casos. <strong style={{ color: C.goldL }}>Advanced Mode</strong> dá o controle total.
        </p>
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
              {b === 'monthly' ? 'Mensal' : (
                <span>Anual <span style={{ fontSize: '10px', background: C.green, color: 'white', padding: '1px 6px', borderRadius: '20px', fontWeight: '800', marginLeft: '4px' }}>-20%</span></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '80px' }}>
        {PLANS.map((plan, idx) => {
          const Icon       = ICONS[idx];
          const isSimple   = plan.id === 'simple';
          const isAdvanced = plan.id === 'advanced';
          const isFree     = plan.id === 'free';
          const isCurrent  = userPlan === plan.id;
          const price      = billing === 'yearly' ? plan.priceYearly : plan.price;

          const cardBg     = isSimple ? C.white : isAdvanced ? 'linear-gradient(160deg, #0d1b35, #1a2f5e)' : 'rgba(255,255,255,.04)';
          const textColor  = isSimple ? C.navy : C.white;
          const subColor   = isSimple ? C.blue : isAdvanced ? C.goldL : 'rgba(255,255,255,.3)';
          const borderStyle = isSimple ? `2px solid ${C.blue}` : isAdvanced ? `1px solid ${C.gold}44` : '1px solid rgba(255,255,255,.08)';
          const btnBg      = isCurrent ? 'rgba(255,255,255,.06)' : isSimple ? `linear-gradient(135deg, ${C.blue}, #2563EB)` : isAdvanced ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(255,255,255,.08)';
          const btnColor   = isCurrent ? 'rgba(255,255,255,.3)' : isSimple ? C.white : isAdvanced ? C.navy : 'rgba(255,255,255,.5)';
          const featureColor = isSimple ? C.gray600 : 'rgba(255,255,255,.6)';
          const checkColor   = isAdvanced ? C.goldL : C.green;
          const iconColor    = isSimple ? C.blue : isAdvanced ? C.gold : 'rgba(255,255,255,.25)';

          return (
            <div key={plan.id} style={{ background: cardBg, border: borderStyle, borderRadius: '20px', padding: '28px 24px', position: 'relative', boxShadow: isSimple ? `0 12px 48px ${C.blue}30` : isAdvanced ? `0 12px 48px ${C.gold}18` : 'none' }}>

              {isSimple && <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: C.blue, color: C.white, fontSize: '10px', fontWeight: '800', padding: '4px 16px', borderRadius: '20px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>⚡ Mais Popular</div>}
              {isAdvanced && <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: C.navy, fontSize: '10px', fontWeight: '800', padding: '4px 16px', borderRadius: '20px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>★ Nível Pro</div>}

              <div style={{ marginBottom: '20px' }}>
                <Icon size={22} color={iconColor} fill={isAdvanced ? C.gold : 'none'} style={{ marginBottom: '12px', display: 'block' }} />
                <div style={{ fontSize: '18px', fontWeight: '800', color: textColor, marginBottom: '4px' }}>{plan.name}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: subColor, marginBottom: '14px' }}>{plan.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: textColor, letterSpacing: '-1px' }}>{price}</span>
                  {plan.id !== 'free' && <span style={{ fontSize: '11px', color: isSimple ? C.gray400 : 'rgba(255,255,255,.3)' }}>{billing === 'yearly' ? '/mês · anual' : '/mês'}</span>}
                </div>
              </div>

              <button disabled={isCurrent} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '800', marginBottom: '22px', background: btnBg, color: btnColor, boxShadow: isSimple && !isCurrent ? `0 4px 16px ${C.blue}44` : 'none' }}>
                {isCurrent ? 'Plano atual' : plan.cta}
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
            <div style={{ fontSize: '17px', fontWeight: '800', color: C.white }}>Comparação completa</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ padding: '12px 28px', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recurso</div>
            {['Free', 'Simple', 'Advanced'].map((p, i) => (
              <div key={p} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '800', textAlign: 'center', color: i === 0 ? 'rgba(255,255,255,.25)' : i === 1 ? '#93C5FD' : C.goldL }}>{p}</div>
            ))}
          </div>
          {COMPARISON.map(([label, free, simple, advanced], i) => (
            <div key={String(label)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
              <div style={{ padding: '13px 28px', fontSize: '13px', color: 'rgba(255,255,255,.55)' }}>{label}</div>
              <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Cell value={free} /></div>
              <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Cell value={simple} /></div>
              <div style={{ padding: '13px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Cell value={advanced} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div style={{ maxWidth: '900px', margin: '0 auto 80px', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          ['🔒', 'Pagamento seguro', 'Stripe com SSL. Dados de cartão nunca armazenados.'],
          ['↩️', 'Cancele quando quiser', 'Sem fidelidade. Cancele em 1 clique.'],
          ['🇧🇷', 'Suporte em português', 'Equipe brasileira via e-mail em horário comercial.'],
        ].map(([icon, title, desc]) => (
          <div key={String(title)} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '22px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.white, marginBottom: '6px' }}>{title}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', lineHeight: '1.6' }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 24px 60px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', marginBottom: '12px' }}>
          Planos pagos em breve · Interesse antecipado: contato@sinedtech.com
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          {[['Termos', '/legal/terms'], ['Privacidade', '/legal/privacy'], ['Como funciona', '/methodology']].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
      </div>

    </div>
  );
}
