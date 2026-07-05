export const AMP_TYPE_OPTIONS = ['표준 범용형', '저전력 효율형', '광대역 전력형'] as const;

export const HEADFI_DAC_AMP_LABELS = {
  ampType: '앰프 타입',
  chipset: 'Chipset',
  rk: '정합 임피던스 (Rk)',
  vrms32: 'Vrms@32Ω',
  vrms300: 'Vrms@300Ω',
} as const;

export function formatVrms(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return null;
  return `${n}V`;
}

export function formatRkDisplay(v: unknown): string {
  if (v === null || v === undefined) return '-';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return '-';
  return `${n} Ω`;
}

export function formatAmpTypeDisplay(v: string | null | undefined): string {
  const trimmed = v?.trim();
  return trimmed || '-';
}
