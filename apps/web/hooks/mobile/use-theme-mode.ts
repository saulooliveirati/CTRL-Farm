// ==============================================================================
// Hook de Tema iOS (Dark / Light Mode)
// Suporte ao Human Interface Guidelines da Apple com persistência local
// ==============================================================================

'use client';

import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('ctrl_mobile_theme') as ThemeMode;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    let activeDark = true;
    if (mode === 'system') {
      activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      activeDark = mode === 'dark';
    }

    setIsDark(activeDark);
    const root = document.documentElement;

    if (activeDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  const toggleTheme = (newMode: ThemeMode) => {
    setTheme(newMode);
    localStorage.setItem('ctrl_mobile_theme', newMode);
    applyTheme(newMode);
  };

  return {
    theme,
    isDark,
    toggleTheme,
  };
}
