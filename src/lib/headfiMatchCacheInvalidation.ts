import {
  isDacAmpDapCategory,
  isWiredHeadphoneEarphoneCategory,
} from '@/lib/headfiMatchScore';

type HeadfiMatchRow = Record<string, unknown>;

const WIRED_HP_IEM_MATCH_FIELDS = [
  'category',
  'status2',
  'temp',
  'impedance',
  'db1',
  'bass_quantity',
  'bass_depth',
  'bass_speed',
  'dynamics_slam',
  'midrange_body',
  'tone_warmth',
  'vocal_position',
  'midrange_clarity',
  'treble_brightness',
  'treble_smoothness',
  'treble_airiness',
  'resolution',
  'separation',
  'soundstage',
  'imaging',
  'timbre',
  'ai_sound_analysis',
  'fr_interpretation',
  'recommended_genres',
] as const;

const DAC_AMP_DAP_MATCH_FIELDS = [
  'category',
  'status2',
  'temp',
  'amp_type',
  'chipset',
  'output_impedance',
  'vrms_bal',
  'vrms_single',
] as const;

function normalizeScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function normalizeGenres(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join('\u0001');
}

function normalizeField(field: string, value: unknown): string {
  if (field === 'recommended_genres') return normalizeGenres(value);
  return normalizeScalar(value);
}

function matchFieldsForCategory(category: unknown): readonly string[] {
  const cat = typeof category === 'string' ? category : '';
  if (isWiredHeadphoneEarphoneCategory(cat)) return WIRED_HP_IEM_MATCH_FIELDS;
  if (isDacAmpDapCategory(cat)) return DAC_AMP_DAP_MATCH_FIELDS;
  return ['category', 'status2'];
}

export function hasHeadfiMatchAffectingChange(before: HeadfiMatchRow, after: HeadfiMatchRow): boolean {
  const fields = new Set<string>([
    ...matchFieldsForCategory(before.category),
    ...matchFieldsForCategory(after.category),
  ]);
  for (const field of fields) {
    if (normalizeField(field, before[field]) !== normalizeField(field, after[field])) {
      return true;
    }
  }
  return false;
}
