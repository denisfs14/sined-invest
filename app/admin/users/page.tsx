'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { adminFetchUsers, adminUpdateUser } from '@/services/admin.service';
import type { UserProfile } from '@/lib/access-control';
import { getBillingStatusColor, getBillingStatusLabel } from '@/lib/access-control';
import { C } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function AdminUsersPage() {
  const { t } = useT();
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [toast,   setToast]   = useState('');

  useEffect(() => {
    adminFetchUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    );
  }, [users, query]);

  async function quickUpdate(id: string, updates: Partial<UserProfile>) {
    setSaving(id);
    try {
      await adminUpdateUser(id, updates);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      setToast(t('admin.saved_ok'));
      setTimeout(() => setToast(''), 2000);
    } catch (e) { setToast(`Erro: ${e}`); }
    setSaving(null);
  }

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255,255,255,.02)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <div style={{ padding: '32px', color: C.white }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px' }}>Usuários</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>{users.length} total</div>
        </div>
        {toast && <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ADE80' }}>{toast}</div>}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <Search size={14} color="rgba(255,255,255,.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text" placeholder={t('admin.users_search')}
          value={query} onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', boxSizing: 'border-box', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', color: C.white, fontSize: '13px', fontFamily: 'var(--font)', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>{t('admin.loading')}</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <TH>{t('admin.col_email')}</TH>
                <TH>{t('admin.col_role')}</TH>
                <TH>{t('admin.col_plan')}</TH>
                <TH>{t('admin.col_billing')}</TH>
                <TH>{t('admin.col_active')}</TH>
                <TH>{t('admin.col_special')}</TH>
                <TH>{t('admin.col_since')}</TH>
                <TH>{t('admin.col_actions')}</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const isSaving = saving === u.id;
                const rowBg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)';
                return (
                  <tr key={u.id} style={{ background: rowBg, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', color: C.white }}>{u.email}</div>
                      {u.full_name && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>{u.full_name}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={u.role} disabled={isSaving}
                        onChange={e => quickUpdate(u.id, { role: e.target.value as 'user' | 'admin' })}
                        style={{ background: u.role === 'admin' ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: u.role === 'admin' ? '#FCA5A5' : 'rgba(255,255,255,.6)', fontSize: '12px', fontWeight: '700', padding: '4px 8px', fontFamily: 'var(--font)', cursor: 'pointer' }}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={u.plan} disabled={isSaving}
                        onChange={e => quickUpdate(u.id, { plan: e.target.value as UserProfile['plan'] })}
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: 'rgba(255,255,255,.7)', fontSize: '12px', fontWeight: '700', padding: '4px 8px', fontFamily: 'var(--font)', cursor: 'pointer', textTransform: 'uppercase' }}>
                        <option value="free">free</option>
                        <option value="simple">simple</option>
                        <option value="advanced">advanced</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={u.billing_status} disabled={isSaving}
                        onChange={e => quickUpdate(u.id, { billing_status: e.target.value as UserProfile['billing_status'] })}
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: getBillingStatusColor(u.billing_status), fontSize: '12px', fontWeight: '700', padding: '4px 8px', fontFamily: 'var(--font)', cursor: 'pointer' }}>
                        <option value="inactive">inactive</option>
                        <option value="active">active</option>
                        <option value="trial">trial</option>
                        <option value="canceled">canceled</option>
                        <option value="past_due">past_due</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => quickUpdate(u.id, { is_active: !u.is_active })} disabled={isSaving}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '11px', fontWeight: '700', background: u.is_active ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)', color: u.is_active ? '#4ADE80' : '#F87171' }}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => quickUpdate(u.id, { special_access: !u.special_access })} disabled={isSaving}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '11px', fontWeight: '700', background: u.special_access ? 'rgba(196,181,253,.15)' : 'rgba(255,255,255,.06)', color: u.special_access ? '#C4B5FD' : 'rgba(255,255,255,.3)' }}>
                        {u.special_access ? '★ On' : '○ Off'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/users/detail?id=${u.id}`}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: 'rgba(255,255,255,.5)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          Detalhes <ChevronRight size={11} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
