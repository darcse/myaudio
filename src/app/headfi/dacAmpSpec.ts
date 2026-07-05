export const AMP_DRIVE_OPTIONS = ['전류형', '혼합형', '전압형'] as const;
export const AMP_GRADE_OPTIONS = ['표준 범용형', '저전력 효율형', '광대역 전력형'] as const;

export const AMP_DRIVE_GRADE_OPTIONS = AMP_DRIVE_OPTIONS.flatMap((drive) =>
  AMP_GRADE_OPTIONS.map((grade) => `${drive} / ${grade}`),
) as readonly string[];

export const HEADFI_DAC_AMP_LABELS = {
  driveGrade: '구동방식/등급',
  chipset: 'Chipset',
  rk: '정합 임피던스 (Rk)',
  vrms32: 'Vrms@32Ω',
  vrms300: 'Vrms@300Ω',
} as const;

export function isAmpDriveGradeOption(v: string): boolean {
  return (AMP_DRIVE_GRADE_OPTIONS as readonly string[]).includes(v);
}

export function isLegacyGradeOnlyAmpType(v: string): boolean {
  return (AMP_GRADE_OPTIONS as readonly string[]).includes(v);
}

export function isLegacyAmpTypeValue(v: string): boolean {
  const trimmed = v.trim();
  if (!trimmed) return false;
  return !isAmpDriveGradeOption(trimmed);
}

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
  if (!trimmed) return '-';
  if (isLegacyGradeOnlyAmpType(trimmed)) {
    return `${trimmed} (구동방식 미입력)`;
  }
  return trimmed;
}

export function formatDacAmpSpecsForPrompt(item: {
  amp_type?: string | null;
  chipset?: string | null;
  output_impedance?: number | null;
  vrms_bal?: number | null;
  vrms_single?: number | null;
}): {
  driveGrade: string;
  chipset: string;
  rk: string;
  vrms32: string;
  vrms300: string;
} {
  return {
    driveGrade: formatAmpTypeDisplay(item.amp_type),
    chipset: item.chipset?.trim() || '-',
    rk: formatRkDisplay(item.output_impedance),
    vrms32: formatVrms(item.vrms_bal) || '-',
    vrms300: formatVrms(item.vrms_single) || '-',
  };
}
