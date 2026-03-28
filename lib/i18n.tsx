'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// ─── Import all translation files statically ──────────────────────────────────
// Dynamic import with variable paths fails in Next.js static export.
// We import all locales at build time — tree-shaking keeps the bundle small.
import en    from '@/messages/en.json';
import ptBR  from '@/messages/pt-BR.json';
import es    from '@/messages/es.json';

// ─── Types ───────────────────────────────────────────────────────────────────
export type Locale = 'en' | 'pt-BR' | 'es';

type DeepRecord = { [key: string]: string | DeepRecord };

interface I18nContextValue {
  locale:    Locale;
  setLocale: (l: Locale) => void;
  t:         (key: string, vars?: Record<string, string | number>) => string;
}

// ─── All messages bundled synchronously ──────────────────────────────────────
const ALL_MESSAGES: Record<Locale, DeepRecord> = {
  'en':    en    as unknown as DeepRecord,
  'pt-BR': ptBR  as unknown as DeepRecord,
  'es':    es    as unknown as DeepRecord,
};

export const LOCALES: Locale[] = ['en', 'pt-BR', 'es'];
const DEFAULT_LOCALE: Locale   = 'en';
const STORAGE_KEY              = 'sined_locale';

// ─── Context default ──────────────────────────────────────────────────────────
const I18nContext = createContext<I18nContextValue>({
  locale:    DEFAULT_LOCALE,
  setLocale: () => {},
  t:         (key) => key,
});

// ─── Resolve locale from localStorage ────────────────────────────────────────
function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  } catch {}
  return DEFAULT_LOCALE;
}

// ─── Translation resolver ────────────────────────────────────────────────────
function resolve(messages: DeepRecord, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split('.');
  let node: string | DeepRecord = messages;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as DeepRecord)[part];
    if (node === undefined) return key;
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = getSavedLocale();
    if (saved !== locale) setLocaleState(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also read from Supabase user metadata (overrides localStorage if set)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const lang = user?.user_metadata?.language as Locale | undefined;
      if (lang && LOCALES.includes(lang)) {
        setLocaleState(lang);
        try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch {}
    // Best-effort persist to Supabase
    supabase.auth.updateUser({ data: { language: newLocale } }).catch(() => {});
  }, []);

  const messages = ALL_MESSAGES[locale] ?? ALL_MESSAGES[DEFAULT_LOCALE];

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    return resolve(messages, key, vars);
  }, [messages]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
