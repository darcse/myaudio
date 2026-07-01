import type { Headfi, HeadfiFrInterpretation } from '@/app/headfi/types';

export const POSITION_MAP_CATEGORIES = ['헤드폰', '이어폰'] as const;

export function isPositionMapCategory(category: string | null | undefined): boolean {
  return POSITION_MAP_CATEGORIES.includes(category as (typeof POSITION_MAP_CATEGORIES)[number]);
}

export function hasPositionCoordinates(item: Pick<Headfi, 'position_x' | 'position_y'>): boolean {
  return (
    item.position_x != null &&
    item.position_y != null &&
    Number.isFinite(Number(item.position_x)) &&
    Number.isFinite(Number(item.position_y))
  );
}

export function parseFrInterpretationFields(raw: string | null | undefined): HeadfiFrInterpretation {
  const empty = { bass: '-', mid: '-', treble: '-', summary: '-' };
  if (!raw?.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<HeadfiFrInterpretation>;
    return {
      bass: typeof parsed.bass === 'string' && parsed.bass.trim() ? parsed.bass.trim() : '-',
      mid: typeof parsed.mid === 'string' && parsed.mid.trim() ? parsed.mid.trim() : '-',
      treble: typeof parsed.treble === 'string' && parsed.treble.trim() ? parsed.treble.trim() : '-',
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : '-',
    };
  } catch {
    return empty;
  }
}

function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

function avgScore(...values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(Number(v)));
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((acc, v) => acc + Number(v), 0) / nums.length) * 10) / 10;
}

export function buildPositionPromptInput(
  item: Pick<
    Headfi,
    | 'brand'
    | 'model'
    | 'category'
    | 'bass_quantity'
    | 'bass_depth'
    | 'bass_speed'
    | 'dynamics_slam'
    | 'midrange_body'
    | 'tone_warmth'
    | 'vocal_position'
    | 'midrange_clarity'
    | 'treble_brightness'
    | 'treble_smoothness'
    | 'treble_airiness'
    | 'resolution'
    | 'separation'
    | 'soundstage'
    | 'imaging'
    | 'timbre'
    | 'fr_interpretation'
    | 'ai_sound_analysis'
  >,
) {
  const bass = avgScore(item.bass_quantity, item.bass_depth);
  const mid = avgScore(item.midrange_body, item.midrange_clarity);
  const treble = avgScore(item.treble_brightness, item.treble_airiness);
  const fr = parseFrInterpretationFields(item.fr_interpretation);
  return {
    brand: item.brand || '',
    model: item.model || '',
    category: item.category || '',
    bass: formatScore(bass),
    mid: formatScore(mid),
    treble: formatScore(treble),
    resolution: formatScore(item.resolution),
    separation: formatScore(item.separation),
    soundstage: formatScore(item.soundstage),
    frSummary: fr.summary,
    aiSoundAnalysis: item.ai_sound_analysis?.trim() || '-',
  };
}

export function clampPositionCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, Math.round(value * 100) / 100));
}
