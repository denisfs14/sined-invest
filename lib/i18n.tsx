'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

import en   from '@/messages/en.json';
import ptBR from '@/messages/pt-BR.json';
import es   from '@/messages/es.json';

export type Locale = 'en' | 'pt-BR' | 'es';
type Messages = Record<string, Record<string, string>>;

interface I18nContextValue {
  locale:    Locale;
  setLocale: (l: Locale) => void;
  t:         (key: string, vars?: Record<string, string | number>) => string;
}

const ALL: Record<Locale, Messages> = {
  'en':    en    as Messages,
  'pt-BR': ptBR  as Messages,
  'es':    es    as Messages,
};

export const LOCALES: Locale[] = ['en', 'pt-BR', 'es'];
const DEFAULT: Locale           = 'en';
const KEY                       = 'sined_locale';

// t() is created fresh per locale — guarantees stale-closure is impossible
function makeT(locale: Locale) {
  const msgs = ALL[locale] ?? ALL[DEFAULT];
  return function t(key: string, vars?: Record<string, string | number>): string {
    const [ns, ...rest] = key.split('.');
    const section = msgs[ns];
    if (!section) return key;
    let val: string | Record<string, string> = section;
    for (const part of rest) {
      if (typeof val !== 'object') return key;
      val = (val as Record<string, string>)[part];
      if (val === undefined) return key;
    }
    if (typeof val !== 'string') return key;
    if (!vars) return val;
    return val.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
}

const I18nContext = createContext<I18nContextValue>({
  locale:    DEFAULT,
  setLocale: () => {},
  t:         makeT(DEFAULT),
});

function savedLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    if (v && LOCALES.includes(v as Locale)) return v as Locale;
  } catch {}
  return DEFAULT;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleRaw] = useState<Locale>(DEFAULT);
  const [t,      setT]         = useState(() => makeT(DEFAULT));

  // Hydrate from localStorage
  useEffect(() => {
    const l = savedLocale();
    if (l !== DEFAULT) {
      setLocaleRaw(l);
      setT(() => makeT(l));
    }
  }, []);

  // Hydrate from Supabase user metadata (overrides localStorage)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const l = user?.user_metadata?.language as Locale | undefined;
      if (l && LOCALES.includes(l)) {
        setLocaleRaw(l);
        setT(() => makeT(l));
        try { localStorage.setItem(KEY, l); } catch {}
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setLocale(newLocale: Locale) {
    setLocaleRaw(newLocale);
    setT(() => makeT(newLocale)); // new t function → context value changes → all consumers re-render
    try { localStorage.setItem(KEY, newLocale); } catch {}
    supabase.auth.updateUser({ data: { language: newLocale } }).catch(() => {});
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
