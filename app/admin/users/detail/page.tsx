'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { adminFetchUser, adminUpdateUser } from '@/services/admin.service';
import { getBillingStatusColor } from '@/lib/access-control';
import type { UserProfile } from '@/lib/access-control';
import { C } from '@/components/ui';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
      {children}
    </div>
  );
}

const IS: React.CSSProperties = {
  padding: '10px 14px', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px',
  color: C.white, fontSize: '13px', fontFamily: 'var(--font)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

export default function AdminUserDetailPage() {
  const params = useSearchParams();
  const id     = params.get('id') ?? '';
  const router = useRouter();

  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [form,    setForm]    = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState('');

  useEffect(() => {
    if (!id) { router.replace('/admin/users'); return; }
    adminFetchUser(id).then(u => {
      setUser(u);
      if (u) setForm({
        role:                 u.role,
        plan:                 u.plan,
        billing_status:       u.billing_status,
        is_active:            u.is_active,
        manual_plan_override: u.manual_plan_override,
        special_access:       u.special_access,
        access_expires_at:    u.access_expires_at ?? '',
        notes:                u.notes ?? '',
      });
      setLoading(false);
    });
  }, [id, router]);

  async function save() {
    setSaving(true);
    try {
      await adminUpdateUser(id, form);
      setToast('Salvo com sucesso ✓');
      setTimeout(() => setToast(''), 3000);
    } catch (e) { setToast(`Erro: ${e}`); }
    setSaving(false);
  }

  function set<K extends keyof UserProfile>(key: K, val: UserProfile[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  if (loading) return <div style={{ padding: '32px', color: 'rgba(255,255,255,.4)', fontSize: '13px' }}>Carregando…</div>;
  if (!user)   return <div style={{ padding: '32px', color: '#F87171', fontSize: '13px' }}>Usuário não encontrado</div>;

  return (
    <div style={{ padding: '32px', color: C.white, maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/admin/users" style={{ color: 'rgba(255,255,255,.3)', textDecoration: 'none', display: 'flex' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: C.white }}>{user.email}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>{user.full_name} · ID: {user.id.slice(0, 8)}…</div>
        </div>
      </div>

      {toast && (
        <div style={{ background: toast.includes('Erro') ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${toast.includes('Erro') ? '#FECACA' : '#BBF7D0'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: toast.includes('Erro') ? '#DC2626' : '#047857', marginBottom: '20px', fontWeight: '600' }}>
          {toast}
        </div>
      )}

      {/* Read-only account info */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Informações da Conta</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[['Email', user.email ?? '—'], ['Nome', user.full_name ?? '—'], ['Criado', new Date(user.created_at).toLocaleString('pt-BR')], ['Atualizado', new Date(user.updated_at).toLocaleString('pt-BR')], ['Stripe Customer', user.stripe_customer_id ?? '—'], ['Stripe Sub', user.stripe_subscription_id ?? '—']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>{l}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.65)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '18px' }}>Controle de Acesso</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="Role">
            <select value={form.role ?? 'user'} onChange={e => set('role', e.target.value as 'user'|'admin')} style={IS as React.CSSProperties}>
              <option value="user">user</option><option value="admin">admin</option>
            </select>
          </Field>
          <Field label="Plano">
            <select value={form.plan ?? 'free'} onChange={e => set('plan', e.target.value as UserProfile['plan'])} style={IS as React.CSSProperties}>
              <option value="free">free</option><option value="simple">simple</option><option value="advanced">advanced</option>
            </select>
          </Field>
          <Field label="Billing Status">
            <select value={form.billing_status ?? 'inactive'} onChange={e => set('billing_status', e.target.value as UserProfile['billing_status'])} style={{ ...IS, color: getBillingStatusColor(form.billing_status ?? 'inactive') } as React.CSSProperties}>
              <option value="inactive">inactive</option><option value="active">active</option>
              <option value="trial">trial</option><option value="canceled">canceled</option><option value="past_due">past_due</option>
            </select>
          </Field>
          <Field label="Acesso expira em">
            <input type="datetime-local" value={(form.access_expires_at ?? '').slice(0, 16)} onChange={e => set('access_expires_at', e.target.value || null)} style={IS as React.CSSProperties} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginTop: '14px' }}>
          {([['is_active','Conta Ativa',form.is_active],['manual_plan_override','Override Manual',form.manual_plan_override],['special_access','Acesso Especial',form.special_access]] as [keyof UserProfile, string, boolean][]).map(([key, label, val]) => (
            <button key={key} onClick={() => set(key, !val as UserProfile[typeof key])} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${val ? 'rgba(74,222,128,.3)' : 'rgba(255,255,255,.1)'}`, background: val ? 'rgba(74,222,128,.08)' : 'rgba(255,255,255,.04)', color: val ? '#4ADE80' : 'rgba(255,255,255,.4)', fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font)', cursor: 'pointer' }}>
              {val ? '● ' : '○ '}{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Notas Admin</div>
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Notas internas…"
          style={{ ...IS, resize: 'vertical', minHeight: '72px' } as React.CSSProperties} />
      </div>

      <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#EF4444', border: 'none', borderRadius: '10px', color: C.white, fontSize: '13px', fontWeight: '800', fontFamily: 'var(--font)', cursor: saving ? 'wait' : 'pointer' }}>
        <Save size={14} /> {saving ? 'Salvando…' : 'Salvar Alterações'}
      </button>
    </div>
  );
}
