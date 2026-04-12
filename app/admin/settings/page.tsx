'use client';

import { useEffect, useState } from 'react';
import { C } from '@/components/ui';
import { useT } from '@/lib/i18n';

type StripeMode = 'test' | 'live';

interface ConfigState {
  stripe_mode: StripeMode;
  updated_at?: string;
}

export default function AdminSettingsPage() {
  const { t } = useT();

  const [config,  setConfig]  = useState<ConfigState>({ stripe_mode: 'test' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [error,   setError]   = useState('');

  // ── Load current config ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/app-config?key=stripe_mode')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setConfig({
          stripe_mode: (data.value === 'live' ? 'live' : 'test') as StripeMode,
          updated_at:  data.updated_at,
        });
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Save Stripe mode ──────────────────────────────────────────────────────
  async function saveStripeMode(mode: StripeMode) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'stripe_mode', value: mode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Unknown error');
      setConfig(prev => ({ ...prev, stripe_mode: mode }));
      showToast(t('admin.stripe_mode_saved'), true);
    } catch (e) {
      showToast(`${t('admin.stripe_mode_error')}: ${e}`, false);
    }
    setSaving(false);
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const isLive = config.stripe_mode === 'live';

  return (
    <div style={{ padding: '32px', color: C.white, maxWidth: '700px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: C.white, letterSpacing: '-0.5px', marginBottom: '4px' }}>
          {t('admin.settings_title')}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>
          {t('admin.settings_subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>{t('admin.loading')}</div>
      ) : (
        <>
          {/* ── Stripe Mode Card ──────────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,.04)',
            border: `1px solid ${isLive ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.08)'}`,
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}>
            {/* Card header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: C.white, marginBottom: '2px' }}>
                  {t('admin.stripe_mode_title')}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>
                  {t('admin.stripe_mode_subtitle')}
                </div>
              </div>
              {/* Current mode badge */}
              <span style={{
                fontSize: '11px', fontWeight: '700',
                padding: '4px 12px', borderRadius: '20px',
                background: isLive ? 'rgba(239,68,68,.15)' : 'rgba(74,222,128,.1)',
                color: isLive ? '#FCA5A5' : '#4ADE80',
                border: `1px solid ${isLive ? 'rgba(239,68,68,.3)' : 'rgba(74,222,128,.2)'}`,
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                {isLive ? t('admin.stripe_mode_live') : t('admin.stripe_mode_test')}
              </span>
            </div>

            {/* Warning banner */}
            <div style={{
              padding: '10px 24px',
              background: isLive ? 'rgba(239,68,68,.08)' : 'rgba(74,222,128,.05)',
              borderBottom: '1px solid rgba(255,255,255,.04)',
              fontSize: '12px',
              color: isLive ? '#FCA5A5' : '#86EFAC',
            }}>
              {isLive ? t('admin.stripe_warning_live') : t('admin.stripe_warning_test')}
            </div>

            {/* Toggle buttons */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                {t('admin.stripe_mode_label')}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Test button */}
                <button
                  onClick={() => !saving && config.stripe_mode !== 'test' && saveStripeMode('test')}
                  disabled={saving || config.stripe_mode === 'test'}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: '10px', cursor: config.stripe_mode === 'test' ? 'default' : 'pointer',
                    border: config.stripe_mode === 'test'
                      ? '2px solid rgba(74,222,128,.4)'
                      : '2px solid rgba(255,255,255,.1)',
                    background: config.stripe_mode === 'test'
                      ? 'rgba(74,222,128,.08)'
                      : 'rgba(255,255,255,.03)',
                    transition: 'all .2s',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: config.stripe_mode === 'test' ? '#4ADE80' : 'rgba(255,255,255,.2)',
                      flexShrink: 0,
                    }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: config.stripe_mode === 'test' ? '#4ADE80' : 'rgba(255,255,255,.5)' }}>
                        {t('admin.stripe_mode_test')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '2px' }}>
                        STRIPE_SECRET_KEY_TEST
                      </div>
                    </div>
                    {config.stripe_mode === 'test' && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#4ADE80' }}>✓ Active</span>
                    )}
                  </div>
                </button>

                {/* Live button */}
                <button
                  onClick={() => !saving && config.stripe_mode !== 'live' && saveStripeMode('live')}
                  disabled={saving || config.stripe_mode === 'live'}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: '10px', cursor: config.stripe_mode === 'live' ? 'default' : 'pointer',
                    border: config.stripe_mode === 'live'
                      ? '2px solid rgba(239,68,68,.4)'
                      : '2px solid rgba(255,255,255,.1)',
                    background: config.stripe_mode === 'live'
                      ? 'rgba(239,68,68,.08)'
                      : 'rgba(255,255,255,.03)',
                    transition: 'all .2s',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: config.stripe_mode === 'live' ? '#EF4444' : 'rgba(255,255,255,.2)',
                      flexShrink: 0,
                    }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: config.stripe_mode === 'live' ? '#FCA5A5' : 'rgba(255,255,255,.5)' }}>
                        {t('admin.stripe_mode_live')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '2px' }}>
                        STRIPE_SECRET_KEY_LIVE
                      </div>
                    </div>
                    {config.stripe_mode === 'live' && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#FCA5A5' }}>✓ Active</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Security note */}
              <div style={{
                marginTop: '16px', padding: '10px 14px',
                background: 'rgba(255,255,255,.03)', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,.06)',
                fontSize: '11px', color: 'rgba(255,255,255,.3)', lineHeight: '1.6',
              }}>
                🔒 <strong style={{ color: 'rgba(255,255,255,.4)' }}>Secret keys are never stored here.</strong>{' '}
                Only the mode flag is saved in the database. Keys are read from Vercel environment variables on the server at runtime.
                {config.updated_at && (
                  <span style={{ display: 'block', marginTop: '4px', color: 'rgba(255,255,255,.2)' }}>
                    Last changed: {new Date(config.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '12px 20px', borderRadius: '10px',
          background: toast.ok ? '#065F46' : '#7F1D1D',
          border: `1px solid ${toast.ok ? '#059669' : '#DC2626'}`,
          color: C.white, fontSize: '13px', fontWeight: '600',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          zIndex: 9999, transition: 'all .2s',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
