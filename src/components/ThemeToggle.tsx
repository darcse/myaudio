'use client';

import { useCallback, useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  getStoredThemeMode,
  nextThemeMode,
  persistThemeMode,
  type ThemeMode,
} from '@/lib/theme';

export function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    const initial = getStoredThemeMode();
    setThemeMode(initial);
    persistThemeMode(initial);
  }, []);

  const handleThemeToggle = useCallback(() => {
    const next = nextThemeMode(themeMode);
    setThemeMode(next);
    persistThemeMode(next);
  }, [themeMode]);

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
      style={{
        borderColor: 'var(--border)',
        color: 'var(--foreground)',
        background: 'var(--card-bg)',
      }}
      aria-label={
        themeMode === 'light'
          ? '라이트 모드 (클릭 시 다크 모드)'
          : themeMode === 'dark'
            ? '다크 모드 (클릭 시 자동 모드)'
            : '자동 모드 (클릭 시 라이트 모드)'
      }
      title={themeMode === 'light' ? '라이트' : themeMode === 'dark' ? '다크' : '자동'}
    >
      {themeMode === 'light' ? (
        <Sun size={16} strokeWidth={2} />
      ) : themeMode === 'dark' ? (
        <Moon size={16} strokeWidth={2} />
      ) : (
        <Monitor size={16} strokeWidth={2} />
      )}
    </button>
  );
}
