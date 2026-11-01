export type AppleMusicUrlParseResult =
  | { status: 'empty'; url: null }
  | { status: 'ok'; url: string }
  | { status: 'invalid'; url: null };

const EXTRA_TOKENS = new Set([
  'deluxe',
  'deluxeedition',
  'edition',
  'remaster',
  'remastered',
  'expanded',
  'anniversary',
  'bonus',
  'version',
  'special',
  'complete',
  'instrumental',
]);

export function stripAppleCatalogSuffix(raw: string): string {
  return raw
    .replace(/\s*[-–—]\s*(EP|Single|LP|Album)\s*$/i, '')
    .replace(/\s*[(\uFF08](EP|Single|LP)[)\uFF09]\s*$/i, '')
    .trim();
}

export function normalizeAppleMusicName(raw: string): string {
  return stripAppleCatalogSuffix(raw)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function tokenizeAppleMusicName(raw: string): string[] {
  return stripAppleCatalogSuffix(raw)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d']/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token && !EXTRA_TOKENS.has(token));
}

export function scoreAppleMusicName(query: string, candidate: string): number {
  const nq = normalizeAppleMusicName(query);
  const nc = normalizeAppleMusicName(candidate);
  if (!nq || !nc) return 0;
  if (nq === nc) return 1;
  if (nc.startsWith(nq) || nq.startsWith(nc)) {
    return 0.82 + 0.18 * (Math.min(nq.length, nc.length) / Math.max(nq.length, nc.length));
  }
  const qTokens = tokenizeAppleMusicName(query);
  const cTokens = tokenizeAppleMusicName(candidate);
  if (qTokens.length === 0 || cTokens.length === 0) return 0;
  const cSet = new Set(cTokens);
  const overlap = qTokens.filter((token) => cSet.has(token)).length;
  if (overlap === 0) return 0;
  if (overlap === qTokens.length) {
    return 0.78 + 0.16 * (qTokens.length / Math.max(cTokens.length, qTokens.length));
  }
  return (2 * overlap) / (qTokens.length + cTokens.length);
}

export const APPLE_MUSIC_ALBUM_SCORE_MIN = 0.72;
export const APPLE_MUSIC_ARTIST_SCORE_MIN = 0.5;

export function parseAppleMusicAlbumInput(raw: string): AppleMusicUrlParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty', url: null };
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'music.apple.com') return { status: 'invalid', url: null };
    url.protocol = 'https:';
    url.hostname = 'music.apple.com';
    url.search = '';
    url.hash = '';
    const cleaned = url.toString().replace(/\/$/, '');
    return { status: 'ok', url: cleaned };
  } catch {
    return { status: 'invalid', url: null };
  }
}

export function toKrAppleAlbumUrl(collectionViewUrl: string): string | null {
  try {
    const url = new URL(collectionViewUrl);
    const match = url.pathname.match(/\/album\/[^?#]+/i);
    if (!match) return null;
    return `https://music.apple.com/kr${match[0].replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

export function appleMusicSearchUrl(artist: string, albumName: string): string {
  const term = [artist, albumName].map((part) => part.trim()).filter(Boolean).join(' ');
  return `https://music.apple.com/kr/search?term=${encodeURIComponent(term)}`;
}
