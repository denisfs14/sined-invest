'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { adminListUsers, UserProfile } from '@/services/admin.service';

const PLAN_COLOR: Record<string, string> = { free: '#64748B', simple: '#1748c0', advanced: '#C9A84C' };
const STATUS_COLOR: Record<string, string> = { active: '#059669', inactive: '#DC2626', trial: '#D97706', canceled: '#94A3B8', past_due: '#7C2D12' };

export default function AdminUsers() {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    adminListUsers(search || undefined)
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>Users</h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>{users.length} users</div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search email or name…"
            style={{ paddingLeft: '34px', paddingRight: '12px', height: '36px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '240px', fontFamily: 'var(--font)' }}
          />
        </div>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Name', 'Email', 'Role', 'Plan', 'Billing', 'Active', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px', background: '#F8FAFC' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0F172A' }}>{u.full_name || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: u.role === 'admin' ? '#EFF6FF' : '#F8FAFC', color: u.role === 'admin' ? '#1748c0' : '#64748B', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: PLAN_COLOR[u.plan] ?? '#64748B', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{u.plan}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: `${STATUS_COLOR[u.billing_status] ?? '#94A3B8'}18`, color: STATUS_COLOR[u.billing_status] ?? '#94A3B8', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                    {u.billing_status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: u.is_active ? '#059669' : '#DC2626', fontWeight: '700', fontSize: '11px' }}>
                    {u.is_active ? '✓' : '✗'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '12px' }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link href={`/admin/users/detail?id=${u.id}`} style={{ display: 'flex', alignItems: 'center', color: '#1748c0', textDecoration: 'none' }}>
                    Edit <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
