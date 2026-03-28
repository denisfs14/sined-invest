'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { adminGetUser, adminUpdateUser, UserProfile, AdminUpdatePayload } from '@/services/admin.service';

const FL: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '6px' };
const FS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none', background: 'white' };
const FI: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' };

function Inner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const id      = params.get('id') ?? '';
  const [user,   setUser]   = useState<UserProfile | null>(null);
  const [form,   setForm]   = useState<AdminUpdatePayload>({});
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!id) { router.replace('/admin/users'); return; }
    adminGetUser(id).then(u => {
      if (!u) { router.replace('/admin/users'); return; }
      setUser(u);
      setForm({ role: u.role, plan: u.plan, billing_status: u.billing_status, is_active: u.is_active, manual_plan_override: u.manual_plan_override, special_access: u.special_access, access_expires_at: u.access_expires_at, notes: u.notes ?? '' });
    });
  }, [id, router]);

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try { await adminUpdateUser(id, form); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  function f<K extends keyof AdminUpdatePayload>(key: K, val: AdminUpdatePayload[K]) {
    setForm(p => ({ ...p, [key]: val }));
  }

  if (!user) return <div style={{ padding: '32px', color: '#94A3B8' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <Link href="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748B', textDecoration: 'none', fontSize: '13px', marginBottom: '24px' }}>
        <ArrowLeft size={13} /> Back to users
      </Link>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>{user.full_name || user.email}</h1>
        <div style={{ fontSize: '13px', color: '#94A3B8' }}>{user.email} · {user.id.slice(0, 8)}…</div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>Account Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[['Joined', new Date(user.created_at).toLocaleDateString()], ['Last login', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '—'], ['Email verified', user.email_verified ? '✓ Yes' : '✗ No']].map(([l, v]) => (
            <div key={String(l)}><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: '700' }}>{l}</div><div style={{ fontWeight: '600', color: '#0F172A' }}>{v}</div></div>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '20px' }}>Access Control</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div><label style={FL}>Role</label><select value={form.role} onChange={e => f('role', e.target.value as 'user' | 'admin')} style={FS}><option value="user">user</option><option value="admin">admin</option></select></div>
          <div><label style={FL}>Plan</label><select value={form.plan} onChange={e => f('plan', e.target.value as UserProfile['plan'])} style={FS}><option value="free">free</option><option value="simple">simple</option><option value="advanced">advanced</option></select></div>
          <div><label style={FL}>Billing Status</label><select value={form.billing_status} onChange={e => f('billing_status', e.target.value as UserProfile['billing_status'])} style={FS}>{['active','inactive','trial','canceled','past_due'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={FL}>Is Active</label><select value={String(form.is_active)} onChange={e => f('is_active', e.target.value === 'true')} style={FS}><option value="true">Yes</option><option value="false">No — suspended</option></select></div>
          <div><label style={FL}>Manual Override</label><select value={String(form.manual_plan_override)} onChange={e => f('manual_plan_override', e.target.value === 'true')} style={FS}><option value="false">No (billing-controlled)</option><option value="true">Yes (admin granted)</option></select></div>
          <div><label style={FL}>Special Access</label><select value={String(form.special_access)} onChange={e => f('special_access', e.target.value === 'true')} style={FS}><option value="false">No</option><option value="true">Yes (beta/promo)</option></select></div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={FL}>Access Expires At (blank = no expiry)</label>
          <input type="datetime-local" value={form.access_expires_at?.slice(0, 16) ?? ''} onChange={e => f('access_expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)} style={FI} />
        </div>
        <div><label style={FL}>Internal Notes</label><textarea value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} rows={3} style={{ ...FI, resize: 'vertical' } as React.CSSProperties} placeholder="Admin notes…" /></div>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
      {saved  && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', color: '#059669', fontSize: '13px', marginBottom: '16px' }}>✓ Saved</div>}

      <button onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 24px', background: saving ? '#94A3B8' : '#1748c0', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
        <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

export default function AdminUserDetail() {
  return <Suspense fallback={<div style={{ padding: '32px', color: '#94A3B8' }}>Loading…</div>}><Inner /></Suspense>;
}
