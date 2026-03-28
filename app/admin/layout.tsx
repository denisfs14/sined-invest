'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, ArrowLeft, Shield } from 'lucide-react';
import { getCurrentUserProfile, isAdmin } from '@/services/admin.service';
import { C } from '@/components/ui';

const NAV = [
  { href: '/admin',         label: 'Overview',  icon: LayoutDashboard },
  { href: '/admin/users',   label: 'Users',     icon: Users },
  { href: '/admin/billing', label: 'Billing',   icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUserProfile().then(p => {
      if (!isAdmin(p)) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'var(--font)' }}>
      {/* Sidebar */}
      <aside style={{ width: '200px', background: '#1E293B', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color={C.goldL} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: C.white }}>Admin</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>SINED Invest</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', marginBottom: '2px', background: active ? 'rgba(255,255,255,.1)' : 'transparent', cursor: 'pointer' }}>
                  <Icon size={15} color={active ? C.white : 'rgba(255,255,255,.4)'} />
                  <span style={{ fontSize: '13px', fontWeight: active ? '700' : '500', color: active ? C.white : 'rgba(255,255,255,.4)' }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={14} color="rgba(255,255,255,.35)" />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>Back to App</span>
            </div>
          </Link>
        </div>
      </aside>
      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
