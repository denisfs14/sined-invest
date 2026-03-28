'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-context';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authLoading, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Gate 1: Auth session not yet checked
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Gate 2: User exists but profile/plan data still loading
  // This prevents the UI from flashing FREE plan before the real plan arrives
  // from user_profiles. Without this gate, planData is FREE on first render
  // then updates to ADVANCED after fetchMyProfile() completes — causing
  // Advanced Mode to appear locked even when user has advanced plan.
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  return (
    <>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
    </>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A1628',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '48px', height: '48px',
        border: '3px solid rgba(201,168,76,.3)',
        borderTop: '3px solid #C9A84C',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
