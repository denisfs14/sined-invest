'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────
export type Locale = 'en' | 'pt-BR' | 'es';

type Translations = Record<string, Record<string, string>>;

interface I18nContextValue {
  locale:    Locale;
  setLocale: (l: Locale) => Promise<void>;
  t:         (key: string, vars?: Record<string, string | number>) => string;
}

// ─── Supported locales ───────────────────────────────────────────────────────
export const LOCALES: Locale[] = ['en', 'pt-BR', 'es'];
const DEFAULT_LOCALE: Locale = 'en';
const STORAGE_KEY = 'sined_locale';

// ─── Context ─────────────────────────────────────────────────────────────────
const I18nContext = createContext<I18nContextValue>({
  locale:    DEFAULT_LOCALE,
  setLocale: async () => {},
  t:         (key) => key,
});

// ─── Load translations ────────────────────────────────────────────────────────
async function loadMessages(locale: Locale): Promise<Translations> {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default as Translations;
  } catch {
    // Fallback to English
    const mod = await import('@/messages/en.json');
    return mod.default as Translations;
  }
}

// ─── Resolve saved locale ────────────────────────────────────────────────────
function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  return DEFAULT_LOCALE;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale,   setLocaleState]  = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages]     = useState<Translations>({});
  const [ready,    setReady]        = useState(false);

  // Load locale on mount
  useEffect(() => {
    const saved = getSavedLocale();
    loadMessages(saved).then(msgs => {
      setLocaleState(saved);
      setMessages(msgs);
      setReady(true);
    });
  }, []);

  // Also try to read from Supabase user metadata
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userLang = user?.user_metadata?.language as Locale | undefined;
      if (userLang && LOCALES.includes(userLang) && userLang !== locale) {
        loadMessages(userLang).then(msgs => {
          setLocaleState(userLang);
          setMessages(msgs);
          try { localStorage.setItem(STORAGE_KEY, userLang); } catch {}
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    const msgs = await loadMessages(newLocale);
    setLocaleState(newLocale);
    setMessages(msgs);
    // Persist to localStorage (immediate)
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch {}
    // Persist to Supabase user metadata (async, best-effort)
    supabase.auth.updateUser({ data: { language: newLocale } }).catch(() => {});
  }, []);

  // Translation function
  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const parts = key.split('.');
    let value: unknown = messages;
    for (const part of parts) {
      if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key; // key not found, return raw key
      }
    }
    if (typeof value !== 'string') return key;

    // Variable interpolation: {varName} → value
    if (vars) {
      return value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    }
    return value;
  }, [messages]);

  if (!ready) return null; // brief flash prevention

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useT() {
  return useContext(I18nContext);
}
