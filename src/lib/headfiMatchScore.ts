import type { Headfi } from '@/app/headfi/types';
import { formatVrms } from '@/app/headfi/dacAmpSpec';
import { formatFrInterpretationForPrompt } from '@/lib/headfiAlbumMatch';
import { buildHeadfiSoundScoresPromptBlock } from '@/lib/gemini';
import { shuffleArray } from '@/lib/utils';

export { parseFrInterpretationSummary } from '@/lib/headfiAlbumMatch';

export type HeadfiMatchScoreMode = 'dac_amp' | 'headphone';

export const HEADFI_CATEGORY_OPTIONS = [
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
  '스피커',
  'DAC',
  'AMP',
  'DAC/AMP',
  'DAP',
  'Source',
  '기타',
] as const;

export const DAC_AMP_ONLY_CATEGORIES = ['DAC', 'AMP', 'DAC/AMP'] as const;
export const DAC_AMP_DAP_CATEGORIES = ['DAC', 'AMP', 'DAC/AMP', 'DAP'] as const;
export const WIRED_HP_IEM_CATEGORIES = ['헤드폰', '이어폰'] as const;

export function isDacAmpOnlyCategory(category: string | null | undefined): boolean {
  return category === 'DAC' || category === 'AMP' || category === 'DAC/AMP';
}

export function isDacAmpDapCategory(category: string | null | undefined): boolean {
  return category === 'DAC' || category === 'AMP' || category === 'DAC/AMP' || category === 'DAP';
}

export function isWiredHeadphoneEarphoneCategory(category: string | null | undefined): boolean {
  return category === '헤드폰' || category === '이어폰';
}

export type CompressedCandidate = {
  id: number;
  name: string;
  temp: string;
  rkOrImpedance: string;
  db1: string;
  vrms32: string;
  vrms300: string;
  low: string;
  mid: string;
  high: string;
};

function deviceName(brand: string | null, model: string | null): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '-';
}

function avgScore(...values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(Number(v)));
  if (nums.length === 0) return 0;
  const sum = nums.reduce((acc, v) => acc + Number(v), 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

export function compressHeadfiAudioBands(item: Headfi): { low: number; mid: number; high: number } {
  return {
    low: avgScore(item.bass_quantity, item.bass_depth),
    mid: avgScore(item.midrange_body, item.midrange_clarity),
    high: avgScore(item.treble_brightness, item.treble_airiness),
  };
}

export function formatGenres(genres: string[] | null | undefined, max = 3): string {
  if (!Array.isArray(genres) || genres.length === 0) return '-';
  return genres.slice(0, max).join(', ');
}

export function compressCandidateRow(item: Headfi): CompressedCandidate {
  const isWired = isWiredHeadphoneEarphoneCategory(item.category);
  const isDacSide = isDacAmpDapCategory(item.category);
  const bands = isWired ? compressHeadfiAudioBands(item) : null;
  const rkOrImpedance = isDacSide
    ? item.output_impedance != null && Number.isFinite(Number(item.output_impedance))
      ? String(item.output_impedance)
      : '-'
    : item.impedance != null && Number.isFinite(Number(item.impedance))
      ? String(item.impedance)
      : '-';
  const db1 =
    item.db1 != null && Number.isFinite(Number(item.db1)) ? String(item.db1) : '-';
  const vrms32 = isDacSide ? formatVrms(item.vrms_bal) || '-' : '-';
  const vrms300 = isDacSide ? formatVrms(item.vrms_single) || '-' : '-';

  return {
    id: item.id,
    name: deviceName(item.brand, item.model),
    temp: item.temp?.trim() || '-',
    rkOrImpedance,
    db1,
    vrms32,
    vrms300,
    low: bands ? String(bands.low) : '-',
    mid: bands ? String(bands.mid) : '-',
    high: bands ? String(bands.high) : '-',
  };
}

export function candidateLine(row: CompressedCandidate): string {
  return `${row.id}|${row.name}|${row.temp}|${row.rkOrImpedance}|${row.db1}|${row.vrms32}|${row.vrms300}|${row.low}|${row.mid}|${row.high}`;
}

export function pickCandidates(items: Headfi[], limit = 20): Headfi[] {
  return shuffleArray(items).slice(0, limit);
}

export function buildHeadphoneListeningContextForPrompt(item: Headfi): string | null {
  if (!isWiredHeadphoneEarphoneCategory(item.category)) return null;

  const parts: string[] = [];
  const scoresBlock = buildHeadfiSoundScoresPromptBlock({
    brand: item.brand,
    model: item.model,
    category: item.category,
    bass_quantity: item.bass_quantity,
    bass_depth: item.bass_depth,
    bass_speed: item.bass_speed,
    dynamics_slam: item.dynamics_slam,
    midrange_body: item.midrange_body,
    tone_warmth: item.tone_warmth,
    vocal_position: item.vocal_position,
    midrange_clarity: item.midrange_clarity,
    treble_brightness: item.treble_brightness,
    treble_smoothness: item.treble_smoothness,
    treble_airiness: item.treble_airiness,
    resolution: item.resolution,
    separation: item.separation,
    soundstage: item.soundstage,
    imaging: item.imaging,
    timbre: item.timbre,
  });
  if (scoresBlock) parts.push(scoresBlock);

  const ai = item.ai_sound_analysis?.trim();
  if (ai) parts.push(`[청음 평가 AI 분석] ${ai}`);

  const fr = formatFrInterpretationForPrompt(item.fr_interpretation);
  if (fr) parts.push(`[FR 그래프 분석] ${fr}`);

  if (parts.length === 0) return null;
  return `[${deviceName(item.brand, item.model)} | id:${item.id}]\n${parts.join('\n')}`;
}

export function buildHeadphoneListeningContextSections(items: Headfi[]): string | null {
  const blocks = items
    .map((item) => buildHeadphoneListeningContextForPrompt(item))
    .filter((block): block is string => Boolean(block));
  if (blocks.length === 0) return null;
  return `[후보 헤드폰/이어폰 청음·FR 상세 (있는 항목만)]\n\n${blocks.join('\n\n')}`;
}

export function buildHeadphoneBaseListeningContext(item: Headfi): {
  sound_scores_block: string | null;
  ai_sound_analysis: string | null;
  fr_interpretation_block: string | null;
} {
  if (!isWiredHeadphoneEarphoneCategory(item.category)) {
    return { sound_scores_block: null, ai_sound_analysis: null, fr_interpretation_block: null };
  }
  return {
    sound_scores_block: buildHeadfiSoundScoresPromptBlock({
      brand: item.brand,
      model: item.model,
      category: item.category,
      bass_quantity: item.bass_quantity,
      bass_depth: item.bass_depth,
      bass_speed: item.bass_speed,
      dynamics_slam: item.dynamics_slam,
      midrange_body: item.midrange_body,
      tone_warmth: item.tone_warmth,
      vocal_position: item.vocal_position,
      midrange_clarity: item.midrange_clarity,
      treble_brightness: item.treble_brightness,
      treble_smoothness: item.treble_smoothness,
      treble_airiness: item.treble_airiness,
      resolution: item.resolution,
      separation: item.separation,
      soundstage: item.soundstage,
      imaging: item.imaging,
      timbre: item.timbre,
    }),
    ai_sound_analysis: item.ai_sound_analysis?.trim() || null,
    fr_interpretation_block: formatFrInterpretationForPrompt(item.fr_interpretation),
  };
}
