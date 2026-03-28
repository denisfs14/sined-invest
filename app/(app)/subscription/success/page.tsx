'use client';

// ─── Subscription Success Page ────────────────────────────────────────────────
// Shown after Stripe redirects the user back post-payment.
//
// Root causes of the previous flicker/loop:
//   1. `refresh()` calls `loadData()` which sets `loading:true` in AppContext.
//      AppShell gates on `loading` → remounts entire layout every 2s → flicker.
//   2. `planData.plan` inside the poll closure was stale (captured at mount time)
//      so the loop never detected the plan change and always ran until MAX retries.
//
// Fix:
//   • Poll Supabase DIRECTLY from this page — bypass app context entirely.
//   • Use a ref-based cancellation flag to prevent state updates after unmount.
//   • Controlled interval: max 12 retries × 2s = 24s ceiling, then show fallback.
//   • After confirming plan is active, call refresh() ONCE to sync app state —
//     but only after we've already transitioned to 'done' UI (no flicker risk).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useT } from '@/lib/i18n';
import { C } from '@/components/ui';

type PageStatus = 'polling' | 'activated' | 'timeout' | 'no_session';

const MAX_RETRIES  = 12;    // 12 × 2 000ms = 24 s ceiling
const POLL_INTERVAL = 2000; // ms between checks

export default function SubscriptionSuccessPage() {
  const { refresh } = useApp();
  const { t }       = useT();
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get('session_id');

  const [status,   setStatus]   = useState<PageStatus>('polling');
  const [attempt,  setAttempt]  = useState(0);

  // Ref flags to prevent state updates after unmount or after polling is done
  const stopped   = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Direct Supabase poll — bypasses app context loading state ─────────────
  const checkPlan = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan, billing_status')
        .eq('id', user.id)
        .maybeSingle();

      // Plan is active when the webhook has set it to simple or advanced
      return profile?.plan === 'simple' || profile?.plan === 'advanced';
    } catch {
      return false;
    }
  }, []);

  const stopPolling = useCallback(() => {
    stopped.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setStatus('no_session');
      return;
    }

    stopped.current = false;
    let tries = 0;

    async function poll() {
      if (stopped.current) return;

      tries++;
      setAttempt(tries);

      const activated = await checkPlan();

      if (stopped.current) return;

      if (activated) {
        setStatus('activated');
        stopPolling();
        // Sync app context ONCE after we've already shown the success UI
        // Small delay so the user sees the success screen before any layout change
        setTimeout(() => { if (!stopped.current) refresh(); }, 1500);
        return;
      }

      if (tries >= MAX_RETRIES) {
        setStatus('timeout');
        stopPolling();
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL);
    }

    // Start the first poll after a brief delay so Stripe has time to fire the webhook
    timerRef.current = setTimeout(poll, 800);

    return () => { stopPolling(); };
  // checkPlan and stopPolling are stable refs — safe to include
  }, [sessionId, checkPlan, stopPolling, refresh]);

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${C.navy} 0%, #0a1628 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font)', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px', width: '100%' }}>

        {/* ── Polling: waiting for webhook ───────────────────────────────── */}
        {status === 'polling' && (
          <>
            {/* Animated pulse ring instead of spinning loader — less aggressive */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              border: `3px solid ${C.gold}44`,
              borderTop: `3px solid ${C.goldL}`,
              animation: 'spin 1.2s linear infinite',
              margin: '0 auto 28px',
            }} />
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.white, marginBottom: '12px', letterSpacing: '-0.4px' }}>
              {t('subscription.success_loading_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', lineHeight: '1.7', marginBottom: '20px' }}>
              {t('subscription.success_loading_desc')}
            </p>
            {/* Subtle progress dots */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              {Array.from({ length: MAX_RETRIES }).map((_, i) => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: i < attempt ? C.goldL : 'rgba(255,255,255,.15)',
                  transition: 'background .4s',
                }} />
              ))}
            </div>
          </>
        )}

        {/* ── Activated: webhook delivered, plan live ────────────────────── */}
        {status === 'activated' && (
          <>
            <div style={{
              width: '80px', height: '80px', borderRadius: '22px',
              background: `${C.gold}20`, border: `2px solid ${C.gold}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: `0 0 40px ${C.gold}22`,
            }}>
              <CheckCircle size={40} color={C.goldL} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: C.white, letterSpacing: '-0.8px', marginBottom: '12px' }}>
              {t('subscription.success_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: '1.7', marginBottom: '32px' }}>
              {t('subscription.success_desc')}
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                color: C.navy, padding: '14px 32px', borderRadius: '12px',
                fontSize: '14px', fontWeight: '800',
                boxShadow: `0 6px 24px ${C.gold}44`,
                transition: 'transform .15s, box-shadow .15s',
              }}>
                {t('subscription.success_cta')} →
              </div>
            </Link>
          </>
        )}

        {/* ── Timeout: webhook delayed, show calm fallback (no loop) ─────── */}
        {status === 'timeout' && (
          <>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Clock size={36} color="#FCD34D" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.white, marginBottom: '12px' }}>
              {t('subscription.timeout_title')}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: '1.7', marginBottom: '8px' }}>
              {t('subscription.timeout_desc')}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.25)', marginBottom: '32px' }}>
              {t('subscription.timeout_note')}
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                color: C.white, padding: '12px 28px', borderRadius: '10px',
                fontSize: '13px', fontWeight: '700',
              }}>
                {t('subscription.timeout_cta')}
              </div>
            </Link>
          </>
        )}

        {/* ── No session: arrived without session_id param ───────────────── */}
        {status === 'no_session' && (
          <>
            <AlertCircle size={44} color="#F87171" style={{ marginBottom: '20px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.white, marginBottom: '10px' }}>
              {t('subscription.error_title')}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', lineHeight: '1.7', marginBottom: '28px' }}>
              {t('subscription.error_desc')}
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'inline-flex', background: 'rgba(255,255,255,.07)',
                color: C.white, padding: '11px 22px', borderRadius: '9px',
                fontSize: '13px', fontWeight: '700',
              }}>
                {t('subscription.error_cta')}
              </div>
            </Link>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
