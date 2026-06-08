/** DAC/AMP Vrms를 32Ω 기준 표기로 변환 (GEAR-013) */
export function formatVrmsAt32Ohm(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return null;
  return `${n}V@32Ω`;
}
