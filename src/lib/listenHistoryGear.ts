export const LISTEN_HISTORY_DEFAULT_MEDIA = 'Apple Music' as const;

export const LISTEN_HISTORY_MEDIA_OPTIONS = [
  'Apple Music',
  'Spotify',
  'YouTube Music',
  'CD',
  'LP',
  'Cassette',
  'FLAC',
  '기타',
] as const;

export type ListenHistoryMedia = (typeof LISTEN_HISTORY_MEDIA_OPTIONS)[number];

export function isListenHistoryMedia(value: string | null | undefined): value is ListenHistoryMedia {
  return (
    typeof value === 'string' &&
    (LISTEN_HISTORY_MEDIA_OPTIONS as readonly string[]).includes(value)
  );
}

export function listenHistoryMediaForForm(value: string | null | undefined): ListenHistoryMedia {
  return isListenHistoryMedia(value) ? value : LISTEN_HISTORY_DEFAULT_MEDIA;
}

export function listenHistoryMediaDisplay(value: string | null | undefined): ListenHistoryMedia | null {
  return isListenHistoryMedia(value) ? value : null;
}

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

export function formatListenHistoryOptionLabel(gear: { model: string }): string {
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
    .map(formatListenHistoryOptionLabel);
  return parts.length > 0 ? parts.join(' / ') : null;
}
