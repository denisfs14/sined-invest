'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, ArrowLeft, Shield } from 'lucide-react';
import { fetchMyProfile } from '@/services/admin.service';
import { isAdmin } from '@/lib/access-control';
import { C } from '@/components/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchMyProfile().then(profile => {
      if (!isAdmin(profile)) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '13px' }}>Verificando acesso…</div>
      </div>
    );
  }

  const NAV = [
    { href: '/admin',         label: 'Overview',  icon: LayoutDashboard },
    { href: '/admin/users',   label: 'Usuários',  icon: Users },
    { href: '/admin/billing', label: 'Billing',   icon: CreditCard },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', fontFamily: 'var(--font)' }}>

      {/* Admin sidebar */}
      <aside style={{ width: '220px', background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Shield size={16} color="#EF4444" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#EF4444', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin</span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>SINED Invest</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                  background: active ? 'rgba(239,68,68,.12)' : 'transparent',
                  transition: 'background .15s',
                }}>
                  <Icon size={15} color={active ? '#EF4444' : 'rgba(255,255,255,.4)'} />
                  <span style={{ fontSize: '13px', fontWeight: active ? '700' : '500', color: active ? '#FCA5A5' : 'rgba(255,255,255,.5)' }}>
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
              <ArrowLeft size={13} color="rgba(255,255,255,.3)" />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>Voltar ao app</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
