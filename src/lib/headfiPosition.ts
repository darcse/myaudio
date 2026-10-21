import type { Headfi, HeadfiFrInterpretation } from '@/app/headfi/types';
import { formatDacAmpSpecsForPrompt } from '@/app/headfi/dacAmpSpec';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import {
  buildHeadfiSoundScoresPromptBlock,
  pickHeadfiSoundScores,
  type HeadfiSoundScores,
} from '@/lib/headfiSoundScores';
import { readNullableScore } from '@/app/headfi/listeningEvaluation';

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

export const WIRED_POSITION_DISPLAY_SCALE = 100;

export const WIRED_POSITION_WEIGHTS = {
  xWarmth: 0.5,
  xBrightness: 0.5,
} as const;

export const WIRED_POSITION_TRAIT_ABS_MAX = 2;
export const WIRED_POSITION_SCORE_DIFF_MAX = 9;

export type WiredPositionCoords = {
  x: number;
  y: number;
  xDisplay: number;
  yDisplay: number;
};

export function computeWiredPositionCoords(
  item: Pick<
    Headfi,
    | 'trait_warmth'
    | 'trait_brightness'
    | 'resolution'
    | 'separation'
    | 'imaging'
    | 'musicality'
  >,
): WiredPositionCoords | null {
  const warmth = readNullableScore(item.trait_warmth);
  const brightness = readNullableScore(item.trait_brightness);
  const resolution = readNullableScore(item.resolution);
  const separation = readNullableScore(item.separation);
  const imaging = readNullableScore(item.imaging);
  const musicality = readNullableScore(item.musicality);
  if (
    warmth == null ||
    brightness == null ||
    resolution == null ||
    separation == null ||
    imaging == null ||
    musicality == null
  ) {
    return null;
  }

  const xWarm = (-warmth / WIRED_POSITION_TRAIT_ABS_MAX) * WIRED_POSITION_WEIGHTS.xWarmth;
  const xCool = (brightness / WIRED_POSITION_TRAIT_ABS_MAX) * WIRED_POSITION_WEIGHTS.xBrightness;
  const x = clampPositionCoord(xWarm + xCool);

  const technical = (resolution + separation + imaging) / 3;
  const y = clampPositionCoord((technical - musicality) / WIRED_POSITION_SCORE_DIFF_MAX);

  return {
    x,
    y,
    xDisplay: Math.round(x * WIRED_POSITION_DISPLAY_SCALE),
    yDisplay: Math.round(y * WIRED_POSITION_DISPLAY_SCALE),
  };
}

export function fallbackWiredPositionLabel(x: number, y: number): string {
  const temp = x < -0.25 ? '따뜻한' : x > 0.25 ? '차가운' : '온도 중립의';
  const axis = y < -0.25 ? '음악적인' : y > 0.25 ? '분석적인' : '균형 잡힌';
  return `${temp} ${axis} 성향`;
}

export function buildDacAmpPositionPromptInput(
  item: Pick<
    Headfi,
    | 'brand'
    | 'model'
    | 'category'
    | 'amp_type'
    | 'chipset'
    | 'output_impedance'
    | 'vrms_bal'
    | 'vrms_single'
    | 'memo'
  >,
) {
  const specs = formatDacAmpSpecsForPrompt(item);
  return {
    profile: 'dac_amp' as const,
    brand: item.brand || '',
    model: item.model || '',
    category: item.category || '',
    ...specs,
    memo: item.memo?.trim() || '-',
  };
}

export function isPositionAnalyzableCategory(category: string | null | undefined): boolean {
  return isPositionMapCategory(category) || isDacAmpDapCategory(category);
}

export function buildWiredPositionLabelPromptInput(
  item: Pick<Headfi, 'brand' | 'model' | 'category' | 'fr_interpretation' | 'ai_sound_analysis'> &
    HeadfiSoundScores & { x: number; y: number },
) {
  const fr = parseFrInterpretationFields(item.fr_interpretation);
  const scores = pickHeadfiSoundScores(item);
  return {
    profile: 'wired_label' as const,
    brand: item.brand || '',
    model: item.model || '',
    category: item.category || '',
    x: item.x,
    y: item.y,
    scoresBlock: buildHeadfiSoundScoresPromptBlock(scores) ?? '-',
    frSummary: fr.summary,
    aiSoundAnalysis: item.ai_sound_analysis?.trim() || '-',
  };
}

export function clampPositionCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, Math.round(value * 100) / 100));
}
