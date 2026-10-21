import {
  LISTENING_PERFORMANCE_FIELDS,
  LISTENING_TRAIT_FIELDS,
  PERFORMANCE_LABELS,
  TRAIT_LABELS,
} from '@/app/headfi/listeningEvaluation';

export type HeadfiSoundScores = {
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  bass_quantity?: number | null;
  bass_depth?: number | null;
  bass_control?: number | null;
  midrange_body?: number | null;
  treble_airiness?: number | null;
  treble_smoothness?: number | null;
  resolution?: number | null;
  dynamic_range?: number | null;
  separation?: number | null;
  soundstage?: number | null;
  imaging?: number | null;
  musicality?: number | null;
  listening_comfort?: number | null;
  trait_warmth?: number | null;
  trait_brightness?: number | null;
  trait_vocal_position?: number | null;
  trait_bass_decay?: number | null;
};

export const HEADFI_SOUND_SCORE_COLUMNS = [
  ...LISTENING_PERFORMANCE_FIELDS,
  ...LISTENING_TRAIT_FIELDS,
] as const;

export const HEADFI_SOUND_SCORE_SELECT = [
  'id',
  'brand',
  'model',
  'category',
  ...HEADFI_SOUND_SCORE_COLUMNS,
].join(', ');

function formatSoundScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

export function pickHeadfiSoundScores(
  row: HeadfiSoundScores & { brand?: string | null; model?: string | null; category?: string | null },
): HeadfiSoundScores {
  return {
    brand: row.brand || '',
    model: row.model || '',
    category: row.category || '',
    bass_quantity: row.bass_quantity,
    bass_depth: row.bass_depth,
    bass_control: row.bass_control,
    midrange_body: row.midrange_body,
    treble_airiness: row.treble_airiness,
    treble_smoothness: row.treble_smoothness,
    resolution: row.resolution,
    dynamic_range: row.dynamic_range,
    separation: row.separation,
    soundstage: row.soundstage,
    imaging: row.imaging,
    musicality: row.musicality,
    listening_comfort: row.listening_comfort,
    trait_warmth: row.trait_warmth,
    trait_brightness: row.trait_brightness,
    trait_vocal_position: row.trait_vocal_position,
    trait_bass_decay: row.trait_bass_decay,
  };
}

export function headfiHasSoundScores(scores: HeadfiSoundScores): boolean {
  return HEADFI_SOUND_SCORE_COLUMNS.some((field) => {
    const value = scores[field];
    return value != null && Number.isFinite(Number(value));
  });
}

export function buildHeadfiSoundScoresPromptBlock(headfi: HeadfiSoundScores): string | null {
  if (!headfiHasSoundScores(headfi)) return null;
  return `[청음 평가 — 성능 (1~10 품질, '-'=미입력)]
저역 - ${PERFORMANCE_LABELS.bass_quantity}:${formatSoundScore(headfi.bass_quantity)} ${PERFORMANCE_LABELS.bass_depth}:${formatSoundScore(headfi.bass_depth)} ${PERFORMANCE_LABELS.bass_control}:${formatSoundScore(headfi.bass_control)}
중역 - ${PERFORMANCE_LABELS.midrange_body}:${formatSoundScore(headfi.midrange_body)}
고역 - ${PERFORMANCE_LABELS.treble_airiness}:${formatSoundScore(headfi.treble_airiness)} ${PERFORMANCE_LABELS.treble_smoothness}:${formatSoundScore(headfi.treble_smoothness)}
기술·공간 - ${PERFORMANCE_LABELS.resolution}:${formatSoundScore(headfi.resolution)} ${PERFORMANCE_LABELS.dynamic_range}:${formatSoundScore(headfi.dynamic_range)} ${PERFORMANCE_LABELS.separation}:${formatSoundScore(headfi.separation)} ${PERFORMANCE_LABELS.soundstage}:${formatSoundScore(headfi.soundstage)} ${PERFORMANCE_LABELS.imaging}:${formatSoundScore(headfi.imaging)}
종합 - ${PERFORMANCE_LABELS.musicality}:${formatSoundScore(headfi.musicality)} ${PERFORMANCE_LABELS.listening_comfort}:${formatSoundScore(headfi.listening_comfort)}

[청음 평가 — 성향 (-2~+2, 품질이 아님. 0=중립 입력, '-'=미입력/모름)]
${TRAIT_LABELS.trait_warmth} 차가움(-2)~따뜻함(+2):${formatSoundScore(headfi.trait_warmth)}
${TRAIT_LABELS.trait_brightness} 어두움(-2)~밝음(+2):${formatSoundScore(headfi.trait_brightness)}
${TRAIT_LABELS.trait_vocal_position} 후방(-2)~전진(+2):${formatSoundScore(headfi.trait_vocal_position)}
${TRAIT_LABELS.trait_bass_decay} 타이트(-2)~풍성(+2):${formatSoundScore(headfi.trait_bass_decay)}
규칙: 성능은 잘함/못함 근거로만 쓰고, 성향은 취향·장르 거리로만 쓴다. '-'는 추정하지 말고 그 축을 비운다. 성향 0은 중립으로 읽는다.`;
}
