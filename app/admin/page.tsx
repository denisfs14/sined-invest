'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, CreditCard, Star, AlertTriangle } from 'lucide-react';
import { adminGetStats, AdminStats } from '@/services/admin.service';
import { C } from '@/components/ui';

function StatBox({ label, value, icon: Icon, color = C.navy }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A' }}>{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetStats().then(setStats).catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>Admin Overview</h1>
        <div style={{ fontSize: '13px', color: '#64748B' }}>User and billing summary</div>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}

      {!stats ? (
        <div style={{ color: '#94A3B8', fontSize: '13px' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <StatBox label="Total Users"    value={stats.total}         icon={Users}          color={C.blue} />
            <StatBox label="Active"         value={stats.active}        icon={UserCheck}      color="#059669" />
            <StatBox label="Trial"          value={stats.trial}         icon={CreditCard}     color={C.amber} />
            <StatBox label="Inactive"       value={stats.inactive}      icon={AlertTriangle}  color="#DC2626" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <StatBox label="Free Plan"      value={stats.free}          icon={Users}          color="#64748B" />
            <StatBox label="Simple Plan"    value={stats.simple}        icon={Star}           color={C.blue} />
            <StatBox label="Advanced Plan"  value={stats.advanced}      icon={Star}           color={C.gold} />
            <StatBox label="Special Access" value={stats.specialAccess} icon={UserCheck}      color="#7C3AED" />
          </div>
        </>
      )}
    </div>
  );
}
