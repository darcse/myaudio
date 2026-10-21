import type { Headfi, HeadfiFormData } from './types';

export type ListeningPerformanceField = (typeof LISTENING_PERFORMANCE_FIELDS)[number];
export type ListeningTraitField = (typeof LISTENING_TRAIT_FIELDS)[number];

export const LISTENING_PERFORMANCE_FIELDS = [
  'bass_quantity',
  'bass_depth',
  'bass_control',
  'midrange_body',
  'treble_airiness',
  'treble_smoothness',
  'resolution',
  'dynamic_range',
  'separation',
  'soundstage',
  'imaging',
  'musicality',
  'listening_comfort',
] as const;

export const LISTENING_TRAIT_FIELDS = [
  'trait_warmth',
  'trait_brightness',
  'trait_vocal_position',
  'trait_bass_decay',
] as const;

export const PERFORMANCE_LABELS: Record<ListeningPerformanceField, string> = {
  bass_quantity: '저역 풍성함',
  bass_depth: '저역 깊이',
  bass_control: '저역 컨트롤',
  midrange_body: '중역 밀도감',
  treble_airiness: '고역 공기감',
  treble_smoothness: '고역 부드러움',
  resolution: '해상도',
  dynamic_range: '다이나믹 레인지',
  separation: '분리도',
  soundstage: '사운드스테이지',
  imaging: '정위감',
  musicality: '음악적 매력',
  listening_comfort: '청취 편안함',
};

export const TRAIT_LABELS: Record<ListeningTraitField, string> = {
  trait_warmth: 'Warmth',
  trait_brightness: 'Brightness',
  trait_vocal_position: 'Vocal Position',
  trait_bass_decay: 'Bass Decay',
};

export const LISTENING_PERFORMANCE_GROUPS: {
  title: string;
  fields: { key: ListeningPerformanceField; en: string; ko: string }[];
}[] = [
  {
    title: '저역',
    fields: [
      { key: 'bass_quantity', en: 'Bass Quantity', ko: PERFORMANCE_LABELS.bass_quantity },
      { key: 'bass_depth', en: 'Bass Depth', ko: PERFORMANCE_LABELS.bass_depth },
      { key: 'bass_control', en: 'Bass Control', ko: PERFORMANCE_LABELS.bass_control },
    ],
  },
  {
    title: '중역',
    fields: [{ key: 'midrange_body', en: 'Midrange Body', ko: PERFORMANCE_LABELS.midrange_body }],
  },
  {
    title: '고역',
    fields: [
      { key: 'treble_airiness', en: 'Treble Airiness', ko: PERFORMANCE_LABELS.treble_airiness },
      { key: 'treble_smoothness', en: 'Treble Smoothness', ko: PERFORMANCE_LABELS.treble_smoothness },
    ],
  },
  {
    title: '기술·공간',
    fields: [
      { key: 'resolution', en: 'Resolution', ko: PERFORMANCE_LABELS.resolution },
      { key: 'dynamic_range', en: 'Dynamic Range', ko: PERFORMANCE_LABELS.dynamic_range },
      { key: 'separation', en: 'Separation', ko: PERFORMANCE_LABELS.separation },
      { key: 'soundstage', en: 'Soundstage', ko: PERFORMANCE_LABELS.soundstage },
      { key: 'imaging', en: 'Imaging', ko: PERFORMANCE_LABELS.imaging },
    ],
  },
  {
    title: '종합',
    fields: [
      { key: 'musicality', en: 'Musicality', ko: PERFORMANCE_LABELS.musicality },
      { key: 'listening_comfort', en: 'Listening Comfort', ko: PERFORMANCE_LABELS.listening_comfort },
    ],
  },
];

export const LISTENING_TRAIT_STEPS = [-2, -1, 0, 1, 2] as const;

export const LISTENING_TRAIT_DISPLAY: {
  key: ListeningTraitField;
  en: string;
  left: string;
  right: string;
  negativeTag: string;
  positiveTag: string;
}[] = [
  {
    key: 'trait_warmth',
    en: TRAIT_LABELS.trait_warmth,
    left: '차가움',
    right: '따뜻함',
    negativeTag: '차가움',
    positiveTag: '따뜻함',
  },
  {
    key: 'trait_brightness',
    en: TRAIT_LABELS.trait_brightness,
    left: '어두움',
    right: '밝음',
    negativeTag: '어두움',
    positiveTag: '밝음',
  },
  {
    key: 'trait_vocal_position',
    en: TRAIT_LABELS.trait_vocal_position,
    left: '후방',
    right: '전진',
    negativeTag: '보컬 후방',
    positiveTag: '보컬 전진',
  },
  {
    key: 'trait_bass_decay',
    en: TRAIT_LABELS.trait_bass_decay,
    left: '타이트',
    right: '풍성',
    negativeTag: '타이트한 저역',
    positiveTag: '풍성한 저역',
  },
];

export function readNullableScore(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(raw: string | undefined): { empty: true } | { empty: false; value: number } {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { empty: true };
  const trimmed = String(raw).trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error('정수가 아닙니다.');
  }
  return { empty: false, value: Number(trimmed) };
}

export function parsePerformanceScore(raw: string | undefined, label: string): number | null {
  try {
    const parsed = parseOptionalInt(raw);
    if (parsed.empty) return null;
    if (parsed.value < 1 || parsed.value > 10) {
      throw new Error(`${label}은(는) 1~10 사이 정수여야 합니다.`);
    }
    return parsed.value;
  } catch (error) {
    if (error instanceof Error && error.message.includes('1~10')) throw error;
    throw new Error(`${label}은(는) 1~10 사이 정수여야 합니다.`);
  }
}

export function parseTraitScore(raw: string | undefined, label: string): number | null {
  try {
    const parsed = parseOptionalInt(raw);
    if (parsed.empty) return null;
    if (parsed.value < -2 || parsed.value > 2) {
      throw new Error(`${label}은(는) -2~+2 사이 정수여야 합니다.`);
    }
    return parsed.value;
  } catch (error) {
    if (error instanceof Error && error.message.includes('-2~+2')) throw error;
    throw new Error(`${label}은(는) -2~+2 사이 정수여야 합니다.`);
  }
}

export function getListeningEvaluationFormError(data: HeadfiFormData): string | null {
  for (const field of LISTENING_PERFORMANCE_FIELDS) {
    try {
      parsePerformanceScore(data[field], PERFORMANCE_LABELS[field]);
    } catch (error) {
      return error instanceof Error ? error.message : '청음 평가 값이 올바르지 않습니다.';
    }
  }
  for (const field of LISTENING_TRAIT_FIELDS) {
    try {
      parseTraitScore(data[field], TRAIT_LABELS[field]);
    } catch (error) {
      return error instanceof Error ? error.message : '청음 평가 값이 올바르지 않습니다.';
    }
  }
  return null;
}

export function countFilledPerformanceScores(data: HeadfiFormData): number {
  return LISTENING_PERFORMANCE_FIELDS.filter((field) => {
    try {
      return parsePerformanceScore(data[field], PERFORMANCE_LABELS[field]) != null;
    } catch {
      return false;
    }
  }).length;
}

export function countFilledPerformanceFromGear(item: Headfi): number {
  return LISTENING_PERFORMANCE_FIELDS.filter((field) => readNullableScore(item[field]) != null).length;
}

export function hasCompletePerformanceRadar(item: Headfi): boolean {
  return countFilledPerformanceFromGear(item) === LISTENING_PERFORMANCE_FIELDS.length;
}

export function hasListeningEvaluationInput(item: Headfi): boolean {
  if (countFilledPerformanceFromGear(item) > 0) return true;
  return LISTENING_TRAIT_FIELDS.some((field) => readNullableScore(item[field]) != null);
}

export function performanceGroupAverages(item: Headfi): {
  title: string;
  filled: number;
  total: number;
  average: number | null;
}[] {
  return LISTENING_PERFORMANCE_GROUPS.map((group) => {
    const values = group.fields
      .map((field) => readNullableScore(item[field.key]))
      .filter((value): value is number => value != null);
    const filled = values.length;
    const average =
      filled === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / filled) * 10) / 10;
    return { title: group.title, filled, total: group.fields.length, average };
  });
}

export function traitTagSummary(item: Headfi): string[] {
  const tags: string[] = [];
  for (const row of LISTENING_TRAIT_DISPLAY) {
    const value = readNullableScore(item[row.key]);
    if (value == null || value === 0) continue;
    tags.push(value < 0 ? row.negativeTag : row.positiveTag);
  }
  return tags;
}

export function wiredListeningScoreColumns(data: HeadfiFormData) {
  return {
    bass_quantity: parsePerformanceScore(data.bass_quantity, PERFORMANCE_LABELS.bass_quantity),
    bass_depth: parsePerformanceScore(data.bass_depth, PERFORMANCE_LABELS.bass_depth),
    bass_control: parsePerformanceScore(data.bass_control, PERFORMANCE_LABELS.bass_control),
    midrange_body: parsePerformanceScore(data.midrange_body, PERFORMANCE_LABELS.midrange_body),
    treble_airiness: parsePerformanceScore(data.treble_airiness, PERFORMANCE_LABELS.treble_airiness),
    treble_smoothness: parsePerformanceScore(data.treble_smoothness, PERFORMANCE_LABELS.treble_smoothness),
    resolution: parsePerformanceScore(data.resolution, PERFORMANCE_LABELS.resolution),
    dynamic_range: parsePerformanceScore(data.dynamic_range, PERFORMANCE_LABELS.dynamic_range),
    separation: parsePerformanceScore(data.separation, PERFORMANCE_LABELS.separation),
    soundstage: parsePerformanceScore(data.soundstage, PERFORMANCE_LABELS.soundstage),
    imaging: parsePerformanceScore(data.imaging, PERFORMANCE_LABELS.imaging),
    musicality: parsePerformanceScore(data.musicality, PERFORMANCE_LABELS.musicality),
    listening_comfort: parsePerformanceScore(data.listening_comfort, PERFORMANCE_LABELS.listening_comfort),
    trait_warmth: parseTraitScore(data.trait_warmth, TRAIT_LABELS.trait_warmth),
    trait_brightness: parseTraitScore(data.trait_brightness, TRAIT_LABELS.trait_brightness),
    trait_vocal_position: parseTraitScore(data.trait_vocal_position, TRAIT_LABELS.trait_vocal_position),
    trait_bass_decay: parseTraitScore(data.trait_bass_decay, TRAIT_LABELS.trait_bass_decay),
  };
}
