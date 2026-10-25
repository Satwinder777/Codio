'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

export type Theme = 'codio' | 'dark' | 'light';
export type ResolvedTheme = Theme;

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'codio_theme';
let fallbackTheme: Theme = 'codio';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = stored === 'dark' || stored === 'light' || stored === 'codio' ? stored : fallbackTheme;
    fallbackTheme = theme;
    return theme;
  } catch {
    return fallbackTheme;
  }
}

function subscribeToTheme(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener('codio-theme-change', onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('codio-theme-change', onChange);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getStoredTheme, () => 'codio');
  const resolvedTheme = theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedTheme === 'light' ? 'light' : 'dark');
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    fallbackTheme = nextTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The current tab can still use the selected theme if storage is disabled.
    }
    window.dispatchEvent(new Event('codio-theme-change'));
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
