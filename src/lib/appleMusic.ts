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

export type AppleMusicAlbumType = 'Album' | 'EP' | 'Single';

export type AppleMusicAlbumRef = {
  albumId: string;
  storefront: string | null;
};

const STOREFRONT_RE = /^[a-z]{2}$/i;

export function extractAppleMusicAlbumRef(raw: string): AppleMusicAlbumRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'music.apple.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let storefront: string | null = null;
    let albumIndex = -1;
    if (parts[0]?.toLowerCase() === 'album') {
      albumIndex = 0;
    } else if (parts[1]?.toLowerCase() === 'album' && STOREFRONT_RE.test(parts[0] ?? '')) {
      storefront = parts[0]!.toLowerCase();
      albumIndex = 1;
    } else {
      return null;
    }
    const afterAlbum = parts.slice(albumIndex + 1);
    const idToken = afterAlbum.find((part) => /^\d+$/.test(part));
    if (!idToken) return null;
    return { albumId: idToken, storefront };
  } catch {
    return null;
  }
}

export function detectAppleMusicAlbumType(collectionName: string): AppleMusicAlbumType {
  const name = collectionName.trim();
  if (/\s[-–—]\s*EP\s*$/i.test(name) || /[(\uFF08]\s*EP\s*[)\uFF09]\s*$/i.test(name)) {
    return 'EP';
  }
  if (/\s[-–—]\s*Single\s*$/i.test(name) || /[(\uFF08]\s*Single\s*[)\uFF09]\s*$/i.test(name)) {
    return 'Single';
  }
  return 'Album';
}

export function appleMusicReleaseDateYmd(releaseDate: string | null | undefined): string | null {
  if (!releaseDate) return null;
  const match = releaseDate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function upscaleAppleArtworkUrl(artworkUrl: string, size = 1000): string | null {
  const trimmed = artworkUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== 'mzstatic.com' && !host.endsWith('.mzstatic.com')) return null;
    url.pathname = url.pathname.replace(/\d+x\d+([a-z]*)(\.[a-z]+)?$/i, `${size}x${size}$1$2`);
    return url.toString();
  } catch {
    return null;
  }
}

export function lookupCountriesForAppleStorefront(storefront: string | null): string[] {
  const preferred = storefront?.toUpperCase() ?? null;
  const ordered = ['KR', 'US', 'JP'] as const;
  if (!preferred) return [...ordered];
  return [preferred, ...ordered.filter((code) => code !== preferred)];
}

export type AppleMusicImportStorefront = 'kr' | 'jp';

export function parseAppleMusicImportStorefront(
  value: unknown,
): AppleMusicImportStorefront | null {
  if (value === 'kr' || value === 'jp') return value;
  return null;
}

export function lookupCountriesForImportStorefront(
  storefront: AppleMusicImportStorefront | null | undefined,
  urlStorefront: string | null,
): string[] {
  if (storefront === 'jp') return lookupCountriesForAppleStorefront('jp');
  if (storefront === 'kr') return lookupCountriesForAppleStorefront('kr');
  return lookupCountriesForAppleStorefront(urlStorefront);
}

export function appleMusicAlbumPageUrl(
  albumId: string,
  storefront: AppleMusicImportStorefront | null | undefined,
): string {
  const code = storefront === 'jp' ? 'jp' : 'kr';
  return `https://music.apple.com/${code}/album/${albumId}`;
}

export function appleMusicImportStorefrontForCountry(
  country: string | null | undefined,
): AppleMusicImportStorefront {
  return country?.trim() === '일본' ? 'jp' : 'kr';
}
