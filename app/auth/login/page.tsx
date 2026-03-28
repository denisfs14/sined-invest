'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { signIn } from '@/services/auth.service';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { t }  = useT();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const updated = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('updated') === '1';

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.navy,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 20% 50%, rgba(23,68,192,.15) 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 20%, rgba(201,168,76,.08) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      {/* Main card */}
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: `linear-gradient(135deg, ${C.blue}, #2563EB)`,
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: `0 0 0 1px ${C.gold}44, 0 8px 32px rgba(23,68,192,.4)`,
          }}>
            <TrendingUp size={26} color={C.white} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px' }}>
            <span style={{ color: C.goldL }}>SINED</span> Invest
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginTop: '4px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Know what to buy next
          </div>
        </div>

        {/* Updated banner */}
        {updated && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#047857', fontWeight: '600', textAlign: 'center' }}>
            ✓ Senha atualizada com sucesso
          </div>
        )}

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '20px', padding: '32px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: C.white, marginBottom: '6px' }}>
            {t('auth.sign_in')}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginBottom: '28px' }}>
            {t('auth.have_account')}
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '6px' }}>
                {t('auth.email')}
              </label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: '10px', color: C.white, fontSize: '14px',
                  fontFamily: 'var(--font)', outline: 'none',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '6px' }}>
                {t('auth.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 44px 12px 16px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: '10px', color: C.white, fontSize: '14px',
                    fontFamily: 'var(--font)', outline: 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <Link href="/auth/reset-password" style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
                {t('auth.forgot_password')}
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: C.red }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(201,168,76,.5)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
              color: C.navy, border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font)',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : `0 4px 20px ${C.gold}44`,
            }}>
              {loading ? `${t('auth.sign_in')}…` : t('auth.sign_in')}
            </button>
          </form>

          {/* Sign up link */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>
            {t('auth.no_account')}{' '}
            <Link href="/auth/signup" style={{ color: C.goldL, fontWeight: '600', textDecoration: 'none' }}>
              {t('auth.sign_up')}
            </Link>
          </div>
        </div>

        {/* Legal links — inside the maxWidth container, below card */}
        <div style={{
          marginTop: '28px',
          display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {[
            { href: '/legal/terms',   key: 'auth.terms' },
            { href: '/legal/privacy', key: 'auth.privacy' },
            { href: '/legal/risk',    key: 'risks' },
            { href: '/methodology',   key: 'how_it_works' },
          ].map(({ href, key }) => (
            <a key={href} href={href} style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>
              {key === 'risks' ? 'Riscos' : key === 'how_it_works' ? 'Como Funciona' : t(key)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
