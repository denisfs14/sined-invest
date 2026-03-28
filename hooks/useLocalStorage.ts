import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initial;
    } catch { return initial; }
  });

  const set = (v: T | ((prev: T) => T)) => {
    const next = v instanceof Function ? v(value) : v;
    setValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  return [value, set] as const;
}
