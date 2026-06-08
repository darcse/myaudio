export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme-mode';
const CYCLE: ThemeMode[] = ['light', 'dark', 'auto'];

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') root.classList.add('theme-light');
  else if (mode === 'dark') root.classList.add('theme-dark');
  window.dispatchEvent(new Event('theme-mode-change'));
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}

export function persistThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function nextThemeMode(current: ThemeMode): ThemeMode {
  const index = CYCLE.indexOf(current);
  return CYCLE[(index + 1) % CYCLE.length];
}
