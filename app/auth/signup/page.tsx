'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { signUp } from '@/services/auth.service';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const { t }  = useT();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Senha deve ter pelo menos 8 caracteres'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name);
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.navy,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 20% 50%, rgba(23,68,192,.15) 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 20%, rgba(201,168,76,.08) 0%, transparent 50%)` }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '56px', height: '56px', background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 0 1px ${C.gold}44, 0 8px 32px rgba(23,68,192,.4)` }}>
            <TrendingUp size={26} color={C.white} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px' }}>
            <span style={{ color: C.goldL }}>SINED</span> Invest
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginTop: '4px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Know what to buy next
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '20px', padding: '32px' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: C.white, marginBottom: '6px' }}>
            {t('auth.sign_up')}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginBottom: '28px' }}>
            {t('auth.no_account')}
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '6px' }}>
                Nome
              </label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', color: C.white, fontSize: '14px', fontFamily: 'var(--font)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '6px' }}>
                {t('auth.email')}
              </label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', color: C.white, fontSize: '14px', fontFamily: 'var(--font)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '6px' }}>
                {t('auth.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 44px 12px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', color: C.white, fontSize: '14px', fontFamily: 'var(--font)', outline: 'none' }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: C.red }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(201,168,76,.5)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: C.navy, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font)', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : `0 4px 20px ${C.gold}44` }}>
              {loading ? `${t('auth.sign_up')}…` : t('auth.sign_up')}
            </button>

            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', textAlign: 'center', lineHeight: '1.6' }}>
              {t('auth.terms_agree')}{' '}
              <Link href="/legal/terms" style={{ color: 'rgba(255,255,255,.45)', textDecoration: 'underline' }}>{t('auth.terms')}</Link>
              {' '}{t('auth.and')}{' '}
              <Link href="/legal/privacy" style={{ color: 'rgba(255,255,255,.45)', textDecoration: 'underline' }}>{t('auth.privacy')}</Link>
            </div>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>
            {t('auth.have_account')}{' '}
            <Link href="/auth/login" style={{ color: C.goldL, fontWeight: '600', textDecoration: 'none' }}>
              {t('auth.sign_in')}
            </Link>
          </div>
        </div>

        {/* Legal footer — inside container, anchored below card */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[{ href: '/legal/terms', label: t('auth.terms') }, { href: '/legal/privacy', label: t('auth.privacy') }, { href: '/legal/risk', label: 'Riscos' }].map(({ href, label }) => (
            <a key={href} href={href} style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>{label}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
