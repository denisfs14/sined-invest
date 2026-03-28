'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Briefcase, Zap,
  Settings, History, CalendarDays, LogOut,
  ArrowLeftRight, Menu, X, TrendingUp, UserCog, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { C } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { useT } from '@/lib/i18n';
import { ModeBadge } from '@/components/ui/PlanGate';
import { ModeToggle } from '@/components/ModeToggle';
import { getUserPlan } from '@/lib/plans';

// NAV is now computed inside the component using t()

// Bottom nav items for mobile (most used 5)
// MOBILE_NAV is computed inside component

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user }  = useApp();
  const { t }     = useT();
  const MOBILE_NAV = [
    { href: '/dashboard',    label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/portfolio',    label: t('nav.portfolio'), icon: Briefcase       },
    { href: '/contribution', label: t('nav.contribute'),icon: Zap             },
    { href: '/operations',   label: t('nav.operations'),icon: ArrowLeftRight  },
    { href: '/dividends',    label: t('nav.dividends'), icon: CalendarDays    },
  ];
  const NAV = [
    { href: '/dashboard',    label: t('nav.dashboard'), icon: LayoutDashboard, group: 'Analysis' },
    { href: '/portfolio',    label: t('nav.portfolio'), icon: Briefcase,       group: 'Analysis' },
    { href: '/contribution', label: t('nav.contribute'),icon: Zap,             group: 'Analysis' },
    { href: '/dividends',    label: t('nav.dividends'), icon: CalendarDays,    group: 'Analysis' },
    { href: '/operations',   label: t('nav.operations'),icon: ArrowLeftRight,  group: 'Analysis' },
    { href: '/strategy',     label: t('nav.strategy'),  icon: Settings,        group: 'Config' },
    { href: '/history',      label: t('nav.history'),   icon: History,         group: 'Config' },
    { href: '/settings',     label: t('nav.settings'),  icon: UserCog,         group: 'Config' },
  ];
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  function NavItem({ href, label, Icon, onClick }: { href: string; label: string; Icon: React.ElementType; onClick?: () => void }) {
    const active = pathname === href;
    return (
      <Link href={href} onClick={onClick} style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
          background: active ? 'rgba(255,255,255,.1)' : 'transparent',
          transition: 'background .15s',
        }}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Icon size={16} color={active ? C.goldL : 'rgba(255,255,255,.5)'} />
          <span style={{ fontSize: '13px', fontWeight: active ? '700' : '500', color: active ? C.white : 'rgba(255,255,255,.6)' }}>
            {label}
          </span>
          {active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: C.goldL }} />}
        </div>
      </Link>
    );
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: C.navy,
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
        overflow: 'hidden',  /* prevent aside from scrolling; only nav scrolls */
      }} className="desktop-sidebar">  {/* aside: flex column, no overflow here */}

        {/* Logo */}
        <div style={{ padding: '24px 18px 20px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color={C.navy} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: C.white, letterSpacing: '-0.3px' }}>
                <span style={{ color: C.goldL }}>SINED</span> Invest
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.35)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Know what to buy next
              </div>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {['Analysis', 'Config'].map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,.25)', letterSpacing: '2px', textTransform: 'uppercase', padding: '0 14px', marginBottom: '6px' }}>
                  {group === 'Config' ? t('nav.config') : t('nav.analysis')}
                </div>
                {items.map(item => <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} />)}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
          {/* Mode Toggle — compact in sidebar to save vertical space */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,.06)', marginBottom: '6px' }}>
            <ModeToggle compact />
          </div>

          {/* Upgrade CTA for free users */}
          {getUserPlan() === 'free' && (
            <Link href="/upgrade" style={{ textDecoration: 'none', display: 'block', margin: '0 0 6px' }}>
              <div style={{
                padding: '8px 14px', borderRadius: '8px',
                background: `linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.08))`,
                border: '1px solid rgba(201,168,76,.25)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Star size={12} color="#c9a84c" fill="#c9a84c" />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#c9a84c' }}>{t('nav.upgrade_pro')}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>R$ 29/mês</div>
                </div>
              </div>
            </Link>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 14px', borderRadius: '8px', cursor: 'pointer',
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,.4)',
            fontSize: '12px', fontFamily: 'var(--font)', transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; (e.currentTarget as HTMLElement).style.color = C.white; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.4)'; }}
          >
            <LogOut size={14} /> {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <header className="mobile-header" style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: C.navy, height: '56px',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={15} color={C.navy} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: C.white }}>
            <span style={{ color: C.goldL }}>SINED</span> Invest
          </span>
        </div>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: '8px',
          padding: '7px', cursor: 'pointer', color: C.white, display: 'flex',
        }}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {menuOpen && (
        <div className="mobile-drawer" style={{
          position: 'fixed', top: '56px', left: 0, right: 0, bottom: 0,
          background: C.navy, zIndex: 999, overflowY: 'auto',
          display: 'none',
          padding: '16px 12px',
        }}>
          {['Analysis', 'Config'].map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.3)', letterSpacing: '2px', textTransform: 'uppercase', padding: '0 14px', marginBottom: '8px' }}>
                  {group === 'Config' ? t('nav.config') : t('nav.analysis')}
                </div>
                {items.map(item => (
                  <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon}
                    onClick={() => setMenuOpen(false)} />
                ))}
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '16px', marginTop: '8px' }}>
            <div style={{ padding: '10px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: C.white }}>{user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>{user?.email}</div>
            </div>
            {/* Mode Toggle — compact in sidebar to save vertical space */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,.06)', marginBottom: '6px' }}>
            <ModeToggle compact />
          </div>

          {/* Upgrade CTA for free users */}
          {getUserPlan() === 'free' && (
            <Link href="/upgrade" style={{ textDecoration: 'none', display: 'block', margin: '0 0 6px' }}>
              <div style={{
                padding: '8px 14px', borderRadius: '8px',
                background: `linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.08))`,
                border: '1px solid rgba(201,168,76,.25)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Star size={12} color="#c9a84c" fill="#c9a84c" />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#c9a84c' }}>{t('nav.upgrade_pro')}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>R$ 29/mês</div>
                </div>
              </div>
            </Link>
          )}
          <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', width: '100%', borderRadius: '10px',
              background: 'rgba(255,255,255,.06)', border: 'none',
              color: 'rgba(255,255,255,.6)', fontSize: '13px',
              fontFamily: 'var(--font)', cursor: 'pointer',
            }}>
              <LogOut size={16} /> {t('nav.logout')}
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: C.white,
        borderTop: `1px solid ${C.gray200}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '56px' }}>
          {MOBILE_NAV.map(item => {
            const active = pathname === item.href;
            const Icon   = item.icon;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '3px', padding: '6px 0',
                }}>
                  <div style={{
                    width: '36px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? `${C.blue}15` : 'transparent',
                    transition: 'background .15s',
                  }}>
                    <Icon size={20} color={active ? C.blue : C.gray400} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500', color: active ? C.blue : C.gray400 }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Global mobile CSS */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-drawer { display: block !important; }
          .mobile-bottom-nav { display: block !important; }
        }
      `}</style>
    </>
  );
}
