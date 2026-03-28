'use client';

import { useT, LOCALES, Locale } from '@/lib/i18n';
import { C } from '@/components/ui';

const FLAG: Record<Locale, string> = {
  'en':    '🇺🇸',
  'pt-BR': '🇧🇷',
  'es':    '🇪🇸',
};

interface LanguageSwitcherProps {
  compact?: boolean; // icon-only for sidebar
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useT();

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '4px', padding: '0 14px' }}>
        {LOCALES.map(l => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            title={t(`languages.${l}`)}
            style={{
              background: locale === l ? 'rgba(255,255,255,.15)' : 'transparent',
              border: 'none', borderRadius: '6px', padding: '4px 6px',
              cursor: 'pointer', fontSize: '14px', lineHeight: '1',
              opacity: locale === l ? 1 : 0.45,
              transition: 'all .15s',
            }}
          >
            {FLAG[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {LOCALES.map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font)', fontSize: '12px', fontWeight: '600',
            background: locale === l ? C.blue : C.gray100,
            color: locale === l ? C.white : C.gray600,
            border: locale === l ? `1px solid ${C.blue}` : `1px solid ${C.gray200}`,
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: '14px' }}>{FLAG[l]}</span>
          {t(`languages.${l}`)}
        </button>
      ))}
    </div>
  );
}
