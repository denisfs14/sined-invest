'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { signIn } from '@/services/auth.service';
import { C } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const updated = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('updated') === '1';

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.navy,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 20% 50%, rgba(23,68,192,.15) 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 20%, rgba(201,168,76,.08) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: `linear-gradient(135deg, ${C.blue}, #2563EB)`,
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: `0 0 0 1px ${C.gold}44, 0 8px 32px rgba(23,68,192,.4)`,
          }}>
            <TrendingUp size={28} color={C.goldL} strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: C.white, letterSpacing: '-0.6px' }}>
            SINED <span style={{ color: C.goldL }}>Invest</span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginTop: '4px', letterSpacing: '1px' }}>
            KNOW WHAT TO BUY NEXT
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '20px',
          padding: '36px',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: C.white, letterSpacing: '-0.4px' }}>
              Entrar na conta
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
              Acesse sua carteira e recomendações
            </div>
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.4)', letterSpacing: '.5px', display: 'block', marginBottom: '8px' }}>
                E-MAIL
              </label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{
                  width: '100%', padding: '13px 16px',
                  background: 'rgba(255,255,255,.06)',
                  border: '1.5px solid rgba(255,255,255,.1)',
                  borderRadius: '10px',
                  color: C.white, fontSize: '14px',
                  fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color .15s',
                }}
                onFocus={e => (e.target.style.borderColor = C.goldL)}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.4)', letterSpacing: '.5px', display: 'block', marginBottom: '8px' }}>
                SENHA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '13px 48px 13px 16px',
                    background: 'rgba(255,255,255,.06)',
                    border: '1.5px solid rgba(255,255,255,.1)',
                    borderRadius: '10px',
                    color: C.white, fontSize: '14px',
                    fontFamily: 'var(--font)', outline: 'none',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = C.goldL)}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,.3)', padding: '4px',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: C.red,
              }}>
                {error}
              </div>
            )}

            {/* Forgot password */}
        <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-10px' }}>
          <Link href="/auth/reset-password" style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Esqueceu a senha?
          </Link>
        </div>

        {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(201,168,76,.5)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                color: C.navy, border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '800',
                fontFamily: 'var(--font)', cursor: loading ? 'wait' : 'pointer',
                transition: 'all .15s', marginTop: '4px',
                boxShadow: loading ? 'none' : `0 4px 20px ${C.gold}44`,
              }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>
            Não tem conta?{' '}
            <Link href="/auth/signup" style={{ color: C.goldL, fontWeight: '600', textDecoration: 'none' }}>
              Criar conta grátis
            </Link>
          </div>
        </div>
      </div>
      {/* Legal links */}
      <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { href: '/legal/terms',   label: 'Termos de Uso' },
          { href: '/legal/privacy', label: 'Privacidade' },
          { href: '/legal/risk',    label: 'Riscos' },
          { href: '/methodology',   label: 'Como Funciona' },
        ].map(({ href, label }) => (
          <a key={href} href={href} style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>{label}</a>
        ))}
      </div>
    </div>
  );
}
