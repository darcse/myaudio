export const LISTEN_HISTORY_SOURCE_CATEGORIES = ['Source', 'DAP'] as const;
export const LISTEN_HISTORY_AMP_CATEGORIES = ['DAC', 'AMP', 'DAC/AMP', '기타'] as const;
export const LISTEN_HISTORY_RECEIVER_CATEGORIES = [
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
  '스피커',
] as const;

export type ListenHistoryGearOption = {
  id: number;
  brand: string;
  model: string;
};

export function formatListenHistoryOptionLabel(gear: ListenHistoryGearOption): string {
  return gear.model.trim() || '—';
}

export function formatListenHistoryGearName(gear: { brand: string; model: string }): string {
  return `${gear.brand} ${gear.model}`.trim() || '—';
}

type ListenHistoryGearRow = {
  source?: { brand: string; model: string } | null;
  dacAmp?: { brand: string; model: string } | null;
  dacAmp2?: { brand: string; model: string } | null;
  headphone?: { brand: string; model: string } | null;
};

export function formatListenHistoryGearLine(row: ListenHistoryGearRow): string | null {
  const parts = [row.source, row.dacAmp, row.dacAmp2, row.headphone]
    .filter((gear): gear is { brand: string; model: string } => gear != null)
    .map(formatListenHistoryGearName);
  return parts.length > 0 ? parts.join(' / ') : null;
}
