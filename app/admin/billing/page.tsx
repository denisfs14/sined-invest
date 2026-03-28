'use client';

import { useEffect, useState } from 'react';
import { adminFetchUsers, adminUpdateUser } from '@/services/admin.service';
import { getBillingStatusColor, getBillingStatusLabel } from '@/lib/access-control';
import type { UserProfile } from '@/lib/access-control';
import { C } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function AdminBillingPage() {
  const { t } = useT();
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [toast,   setToast]   = useState('');

  useEffect(() => { adminFetchUsers().then(u => { setUsers(u); setLoading(false); }); }, []);

  async function setBilling(id: string, billing_status: UserProfile['billing_status'], plan?: UserProfile['plan']) {
    setSaving(id);
    const updates: Partial<UserProfile> = { billing_status, manual_plan_override: true };
    if (plan) updates.plan = plan;
    if (billing_status === 'active' || billing_status === 'trial') updates.is_active = true;
    try {
      await adminUpdateUser(id, updates);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      setToast(t('admin.saved_ok')); setTimeout(() => setToast(''), 2000);
    } catch (e) { setToast(String(e)); }
    setSaving(null);
  }

  // Group by billing status
  const byStatus = {
    active:   users.filter(u => u.billing_status === 'active'),
    trial:    users.filter(u => u.billing_status === 'trial'),
    past_due: users.filter(u => u.billing_status === 'past_due'),
    inactive: users.filter(u => u.billing_status === 'inactive'),
    canceled: users.filter(u => u.billing_status === 'canceled'),
  };

  return (
    <div style={{ padding: '32px', color: C.white }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px' }}>Billing Control</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>Controle manual de acesso e cobrança</div>
        <div style={{ marginTop: '8px', padding: '10px 16px', background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '8px', fontSize: '12px', color: C.goldL }}>
          ⚡ Manual billing mode — Stripe integration pending. Use this panel to grant access manually.
        </div>
      </div>

      {toast && <div style={{ marginBottom: '16px', fontSize: '12px', fontWeight: '700', color: '#4ADE80' }}>{toast}</div>}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>{t('admin.loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(Object.entries(byStatus) as [UserProfile['billing_status'], UserProfile[]][]).map(([status, list]) => (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getBillingStatusColor(status) }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: getBillingStatusColor(status) }}>
                  {getBillingStatusLabel(status)}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>({list.length})</span>
              </div>
              {list.length > 0 ? (
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  {list.map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: i > 0 ? '1px solid rgba(255,255,255,.04)' : 'none', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: C.white }}>{u.email}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>
                          Plano: <strong style={{ color: 'rgba(255,255,255,.6)' }}>{u.plan}</strong>
                          {u.manual_plan_override && <span style={{ marginLeft: '8px', fontSize: '10px', color: C.goldL }}>★ override</span>}
                          {u.special_access && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#C4B5FD' }}>★ special</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {status !== 'active' && (
                          <button onClick={() => setBilling(u.id, 'active', 'simple')} disabled={saving === u.id}
                            style={{ padding: '5px 10px', background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '6px', color: '#4ADE80', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ✓ Ativar Simple
                          </button>
                        )}
                        {status !== 'trial' && (
                          <button onClick={() => setBilling(u.id, 'trial', 'simple')} disabled={saving === u.id}
                            style={{ padding: '5px 10px', background: 'rgba(147,197,253,.1)', border: '1px solid rgba(147,197,253,.3)', borderRadius: '6px', color: '#93C5FD', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Trial
                          </button>
                        )}
                        {status !== 'inactive' && (
                          <button onClick={() => setBilling(u.id, 'inactive')} disabled={saving === u.id}
                            style={{ padding: '5px 10px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: '6px', color: '#F87171', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Desativar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '12px 18px', color: 'rgba(255,255,255,.2)', fontSize: '12px' }}>Nenhum</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
