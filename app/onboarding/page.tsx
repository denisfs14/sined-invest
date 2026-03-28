'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Target, DollarSign, BarChart2, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { C } from '@/components/ui';

type Goal = 'income' | 'growth' | 'dividends' | 'balanced';

const GOALS = [
  { id: 'dividends' as Goal, icon: DollarSign,  label: 'Renda com Dividendos', desc: 'Foco em FIIs e ações que pagam proventos mensais' },
  { id: 'growth'    as Goal, icon: TrendingUp,  label: 'Crescimento Patrimonial', desc: 'Ações de crescimento e valorização no longo prazo' },
  { id: 'income'    as Goal, icon: Target,       label: 'Renda Passiva Total', desc: 'Combinar dividendos com valorização constante' },
  { id: 'balanced'  as Goal, icon: BarChart2,    label: 'Carteira Balanceada', desc: 'Mix de FIIs, ações, renda fixa e proteção' },
];

const STEPS = [
  { id: 1, label: 'Bem-vindo'  },
  { id: 2, label: 'Objetivo'   },
  { id: 3, label: 'Pronto!'    },
];

export default function OnboardingPage() {
  const router  = useRouter();
  const [step, setStep]     = useState(1);
  const [goal, setGoal]     = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);

  async function finish() {
    setLoading(true);
    try {
      // Save goal to user metadata
      await supabase.auth.updateUser({ data: { investment_goal: goal, onboarded: true } });
    } catch {}
    router.push('/dashboard');
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%', maxWidth: '520px',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: s.id === step ? '32px' : '8px', height: '8px', borderRadius: '4px', background: s.id <= step ? C.goldL : 'rgba(255,255,255,.15)', transition: 'all .3s' }} />
            </div>
          ))}
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div style={card}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '72px', height: '72px', background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 0 1px ${C.gold}44, 0 12px 40px rgba(23,68,192,.4)` }}>
                <TrendingUp size={32} color={C.white} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: C.white, marginBottom: '8px' }}>
                Bem-vindo ao <span style={{ color: C.goldL }}>SINED</span> Invest
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,.5)', lineHeight: '1.7' }}>
                Seu motor inteligente de decisão para investimentos na B3.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { icon: '🎯', text: 'Recomenda exatamente o que comprar a cada aporte' },
                { icon: '📅', text: 'Acompanha seus proventos e dividendos automaticamente' },
                { icon: '📊', text: 'Monitora sua carteira com preços em tempo real' },
                { icon: '⚡', text: 'Motor de decisão baseado na sua estratégia pessoal' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setStep(2)} style={{ width: '100%', padding: '15px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: '12px', color: C.navy, fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font)' }}>
              Começar <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2 — Goal */}
        {step === 2 && (
          <div style={card}>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, marginBottom: '8px' }}>Qual é seu principal objetivo?</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', lineHeight: '1.6' }}>
                Isso personaliza as recomendações do motor de decisão para seu perfil.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {GOALS.map(({ id, icon: Icon, label, desc }) => {
                const selected = goal === id;
                return (
                  <button key={id} onClick={() => setGoal(id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: selected ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.04)', border: `1.5px solid ${selected ? C.goldL : 'rgba(255,255,255,.08)'}`, borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s', fontFamily: 'var(--font)' }}>
                    <div style={{ width: '40px', height: '40px', background: selected ? `rgba(201,168,76,.15)` : 'rgba(255,255,255,.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={selected ? C.goldL : 'rgba(255,255,255,.4)'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: selected ? C.goldL : C.white, marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', lineHeight: '1.5' }}>{desc}</div>
                    </div>
                    {selected && <CheckCircle size={16} color={C.goldL} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep(3)} disabled={!goal} style={{ width: '100%', padding: '15px', background: !goal ? 'rgba(201,168,76,.3)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: '12px', color: C.navy, fontWeight: '800', fontSize: '15px', cursor: !goal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font)' }}>
              Continuar <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3 — Ready */}
        {step === 3 && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={36} color={C.green} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: C.white, marginBottom: '12px' }}>Tudo pronto!</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: '1.8', marginBottom: '32px' }}>
              Sua conta está configurada. O próximo passo é importar sua carteira ou adicionar seus ativos manualmente.<br/><br/>
              <span style={{ color: C.goldL, fontWeight: '600' }}>Dica:</span> Use <strong style={{ color: 'rgba(255,255,255,.8)' }}>Carteira → Importar</strong> para subir o arquivo do Status Invest.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={finish} disabled={loading} style={{ width: '100%', padding: '15px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: '12px', color: C.navy, fontWeight: '800', fontSize: '15px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {loading ? 'Carregando...' : 'Ir para o Dashboard →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
