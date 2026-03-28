'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { C } from '@/components/ui';

const attempts: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec  = attempts[key];
  if (!rec || now > rec.resetAt) { attempts[key] = { count: 1, resetAt: now + 60_000 }; return true; }
  if (rec.count >= 3) return false;
  rec.count++;
  return true;
}

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!checkRateLimit(`reset:${email}`)) {
      setError('Muitas tentativas. Aguarde 1 minuto.');
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
    } catch {}
    // Always show success to prevent user enumeration
    setSent(true);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '52px', height: '52px', background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 0 0 1px ${C.gold}44` }}>
            <TrendingUp size={22} color={C.white} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.white }}><span style={{ color: C.goldL }}>SINED</span> Invest</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '20px', padding: '36px 32px' }}>
          {!sent ? (
            <>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.white, marginBottom: '6px' }}>Recuperar senha</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '28px', lineHeight: '1.6' }}>Digite seu e-mail para receber o link de recuperação.</p>
              {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#FCA5A5' }}>{error}</div>}
              <form onSubmit={handle}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '8px' }}>E-MAIL</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="rgba(255,255,255,.3)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                      style={{ width: '100%', padding: '13px 16px 13px 40px', background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: '10px', color: C.white, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(201,168,76,.5)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: '10px', color: C.navy, fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                  {loading ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(34,197,94,.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Mail size={24} color={C.green} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: C.white, marginBottom: '10px' }}>Verifique seu e-mail</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', lineHeight: '1.7' }}>Se esse e-mail estiver cadastrado, você receberá um link em instantes. Verifique também o spam.</p>
            </div>
          )}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/auth/login" style={{ color: 'rgba(255,255,255,.4)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={13} /> Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
