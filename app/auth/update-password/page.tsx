'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { C } from '@/components/ui';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8)    { setError('Senha deve ter pelo menos 8 caracteres'); return; }
    if (password !== confirm)    { setError('Senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push('/auth/login?updated=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar senha');
    } finally { setLoading(false); }
  }

  const inputWrap: React.CSSProperties = { position: 'relative', marginBottom: '16px' };

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '52px', height: '52px', background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <TrendingUp size={22} color={C.white} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.white }}><span style={{ color: C.goldL }}>SINED</span> Invest</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '20px', padding: '36px 32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.white, marginBottom: '6px' }}>Nova senha</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '28px' }}>Escolha uma senha forte com pelo menos 8 caracteres.</p>
          {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#FCA5A5' }}>{error}</div>}
          <form onSubmit={handle}>
            {([['NOVA SENHA', password, setPassword], ['CONFIRMAR SENHA', confirm, setConfirm]] as const).map(([label, val, set]) => (
              <div key={String(label)} style={inputWrap}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: '8px' }}>{label}</label>
                <Lock size={15} color="rgba(255,255,255,.3)" style={{ position: 'absolute', left: '14px', bottom: '14px' }} />
                <input type={showPw ? 'text' : 'password'} required value={val} onChange={e => set(e.target.value as never)}
                  style={{ width: '100%', padding: '13px 44px 13px 40px', background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: '10px', color: C.white, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                {label === 'NOVA SENHA' && (
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: '14px', bottom: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '8px', background: loading ? 'rgba(201,168,76,.5)' : `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: '10px', color: C.navy, fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
