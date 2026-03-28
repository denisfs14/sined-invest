'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, CreditCard, Star, Shield } from 'lucide-react';
import { adminFetchUsers, adminFetchStats, type AdminStats } from '@/services/admin.service';
import type { UserProfile } from '@/lib/access-control';
import { getBillingStatusColor, getBillingStatusLabel } from '@/lib/access-control';
import { C } from '@/components/ui';
import { useT } from '@/lib/i18n';

function StatTile({ label, value, icon: Icon, color = C.white }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
        <Icon size={16} color="rgba(255,255,255,.2)" />
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { t } = useT();
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminFetchUsers()
      .then(async u => {
        setUsers(u);
        setStats(await adminFetchStats(u));
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const recentUsers = users.slice(0, 8);

  return (
    <div style={{ padding: '32px', color: C.white }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px', marginBottom: '4px' }}>Admin Overview</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>SINED Invest — Painel Administrativo</div>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>{t('admin.loading')}</div>
      ) : stats && (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '32px' }}>
            <StatTile label={t('admin.stat_total')}  value={stats.total}         icon={Users}     />
            <StatTile label={t('admin.stat_active')}           value={stats.active}        icon={UserCheck} color="#4ADE80" />
            <StatTile label={t('admin.stat_inactive')}         value={stats.inactive}      icon={UserX}     color="#F87171" />
            <StatTile label={t('admin.stat_free')}       value={stats.free}          icon={Users}     color="rgba(255,255,255,.5)" />
            <StatTile label={t('admin.stat_simple')}     value={stats.simple}        icon={CreditCard}color="#93C5FD" />
            <StatTile label={t('admin.stat_advanced')}   value={stats.advanced}      icon={Star}      color={C.goldL} />
            <StatTile label={t('admin.stat_trial')}            value={stats.trial}         icon={CreditCard}color="#93C5FD" />
            <StatTile label={t('admin.stat_special')}  value={stats.specialAccess} icon={Shield}    color="#C4B5FD" />
            <StatTile label={t('admin.stat_admins')}           value={stats.admins}        icon={Shield}    color="#F87171" />
          </div>

          {/* Recent users */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: C.white, marginBottom: '14px' }}>Usuários recentes</div>
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <div>Email</div><div>Plano</div><div>Billing</div><div>Status</div>
              </div>
              {recentUsers.map((u, i) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '13px 20px', borderBottom: i < recentUsers.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: C.white, fontWeight: '500' }}>{u.email}</div>
                    {u.full_name && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>{u.full_name}</div>}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: u.plan === 'advanced' ? `${C.gold}22` : u.plan === 'simple' ? '#1748c022' : 'rgba(255,255,255,.06)', color: u.plan === 'advanced' ? C.goldL : u.plan === 'simple' ? '#93C5FD' : 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {u.plan}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: getBillingStatusColor(u.billing_status) }}>
                      {getBillingStatusLabel(u.billing_status)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: u.is_active ? '#4ADE80' : '#F87171' }}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
