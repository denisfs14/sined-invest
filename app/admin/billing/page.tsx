'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminListUsers, UserProfile } from '@/services/admin.service';

const SC: Record<string, { bg: string; text: string }> = {
  active:   { bg: '#F0FDF4', text: '#059669' },
  inactive: { bg: '#FEF2F2', text: '#DC2626' },
  trial:    { bg: '#FFFBEB', text: '#D97706' },
  canceled: { bg: '#F8FAFC', text: '#94A3B8' },
  past_due: { bg: '#FFF7ED', text: '#C2410C' },
};

export default function AdminBilling() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminListUsers().then(setUsers).finally(() => setLoading(false)); }, []);

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>Billing</h1>
      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>Manual billing status management</div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#92400E' }}>
        <strong>Manual mode:</strong> Stripe not yet integrated. Update billing status per user via the Users page.
      </div>

      {loading ? <div style={{ color: '#94A3B8' }}>Loading…</div> :
        ['active', 'trial', 'past_due', 'inactive', 'canceled'].map(status => {
          const group = users.filter(u => u.billing_status === status);
          if (!group.length) return null;
          const sc = SC[status] ?? { bg: '#F8FAFC', text: '#64748B' };
          return (
            <div key={status} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>{status}</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{group.length}</span>
              </div>
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                {group.map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < group.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{u.email} · {u.plan}</div>
                    </div>
                    <Link href={`/admin/users/detail?id=${u.id}`} style={{ fontSize: '12px', color: '#1748c0', textDecoration: 'none', fontWeight: '600' }}>Edit →</Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
