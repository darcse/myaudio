export function normalizeSearchQuery(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase();
}

const HANGUL_S_BASE = 0xac00;
const HANGUL_V_COUNT = 21;
const HANGUL_T_COUNT = 28;
const HANGUL_N_COUNT = HANGUL_V_COUNT * HANGUL_T_COUNT;

const COMPAT_CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const COMPAT_JUNGSEONG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
] as const;

const COMPAT_JONGSEONG = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄱㅅ',
  'ㄴ',
  'ㄴㅈ',
  'ㄴㅎ',
  'ㄷ',
  'ㄹ',
  'ㄹㄱ',
  'ㄹㅁ',
  'ㄹㅂ',
  'ㄹㅅ',
  'ㄹㅌ',
  'ㄹㅍ',
  'ㄹㅎ',
  'ㅁ',
  'ㅂ',
  'ㅂㅅ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const EXPAND_COMPAT_JAMO: Record<string, string> = {
  ㄳ: 'ㄱㅅ',
  ㄵ: 'ㄴㅈ',
  ㄶ: 'ㄴㅎ',
  ㄺ: 'ㄹㄱ',
  ㄻ: 'ㄹㅁ',
  ㄼ: 'ㄹㅂ',
  ㄽ: 'ㄹㅅ',
  ㄾ: 'ㄹㅌ',
  ㄿ: 'ㄹㅍ',
  ㅀ: 'ㄹㅎ',
  ㅄ: 'ㅂㅅ',
};

export function toHangulJamo(value: string): string {
  let out = '';
  for (const char of value.normalize('NFC')) {
    const code = char.codePointAt(0);
    if (code == null) continue;

    if (code >= HANGUL_S_BASE && code < HANGUL_S_BASE + 19 * HANGUL_N_COUNT) {
      const sIndex = code - HANGUL_S_BASE;
      const lIndex = Math.floor(sIndex / HANGUL_N_COUNT);
      const vIndex = Math.floor((sIndex % HANGUL_N_COUNT) / HANGUL_T_COUNT);
      const tIndex = sIndex % HANGUL_T_COUNT;
      out += COMPAT_CHOSEONG[lIndex];
      out += COMPAT_JUNGSEONG[vIndex];
      if (tIndex > 0) out += COMPAT_JONGSEONG[tIndex];
      continue;
    }

    if (code >= 0x1100 && code <= 0x1112) {
      out += COMPAT_CHOSEONG[code - 0x1100];
      continue;
    }
    if (code >= 0x1161 && code <= 0x1175) {
      out += COMPAT_JUNGSEONG[code - 0x1161];
      continue;
    }
    if (code >= 0x11a8 && code <= 0x11c2) {
      out += COMPAT_JONGSEONG[code - 0x11a7];
      continue;
    }

    if (code >= 0x3131 && code <= 0x318e) {
      out += EXPAND_COMPAT_JAMO[char] ?? char;
      continue;
    }

    out += char;
  }
  return out;
}

export function hasHangul(value: string): boolean {
  return /[\u1100-\u11FF\u3131-\u318E\uAC00-\uD7A3]/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesEnglishWordStart(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const pattern = new RegExp(`(?:^|[\\s\\-(/[])${escapeRegExp(needle)}`, 'i');
  return pattern.test(haystack);
}

export function matchesSearchContains(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;
  const normalizedHaystack = normalizeSearchQuery(haystack);
  if (normalizedHaystack.includes(normalizedQuery)) return true;
  return toHangulJamo(normalizedHaystack).includes(toHangulJamo(normalizedQuery));
}

export type PrefixMatchKind = 'none' | 'prefix' | 'other';

export function hangulContainsMatchKind(
  haystack: string,
  query: string,
): PrefixMatchKind {
  if (!query) return 'prefix';
  const nameJamo = toHangulJamo(haystack);
  const queryJamo = toHangulJamo(query);
  if (!(hasHangul(query) || queryJamo !== query)) return 'none';
  if (!nameJamo.includes(queryJamo)) return 'none';
  return nameJamo.startsWith(queryJamo) ? 'prefix' : 'other';
}
