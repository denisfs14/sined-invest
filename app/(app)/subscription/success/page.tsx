'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

// This page shows AFTER Stripe redirects the user back.
// Access is NOT granted from this page — it is granted by the webhook.
// The page simply instructs the user and triggers an app state refresh.

export default function SubscriptionSuccessPage() {
  const { refresh, planData } = useApp();
  const { t } = useT();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [attempts, setAttempts] = useState(0);

  // Poll the app context until plan upgrades (webhook may take a few seconds)
  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }

    let tries = 0;
    const MAX = 12; // poll for up to 24 seconds

    async function poll() {
      tries++;
      await refresh();
      setAttempts(tries);

      if (planData.plan !== 'FREE' || tries >= MAX) {
        setStatus(planData.plan !== 'FREE' ? 'done' : 'done'); // show done regardless after max tries
        return;
      }
      setTimeout(poll, 2000);
    }

    poll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div style={{
      minHeight: '100vh', background: C.navy, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font)', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>

        {status === 'loading' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <Loader size={48} color={C.goldL} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.white, marginBottom: '12px' }}>
              {t('subscription.success_loading_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', marginBottom: '8px' }}>
              {t('subscription.success_loading_desc')}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.25)' }}>
              {t('subscription.success_attempt', { n: String(attempts) })}
            </p>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: `${C.gold}22`, border: `2px solid ${C.gold}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={36} color={C.goldL} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: C.white, letterSpacing: '-0.8px', marginBottom: '12px' }}>
              {t('subscription.success_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', marginBottom: '8px' }}>
              {t('subscription.success_desc')}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', marginBottom: '32px' }}>
              {t('subscription.success_webhook_note')}
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: C.navy, padding: '13px 28px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', boxShadow: `0 4px 20px ${C.gold}44` }}>
                {t('subscription.success_cta')} →
              </div>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={48} color="#F87171" style={{ marginBottom: '24px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.white, marginBottom: '12px' }}>
              {t('subscription.error_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', marginBottom: '32px' }}>
              {t('subscription.error_desc')}
            </p>
            <Link href="/dashboard">
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.08)', color: C.white, padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                {t('subscription.error_cta')}
              </div>
            </Link>
          </>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
