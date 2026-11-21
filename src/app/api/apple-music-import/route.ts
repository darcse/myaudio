import { NextRequest, NextResponse } from 'next/server';
import {
  appleMusicAlbumPageUrl,
  appleMusicReleaseDateYmd,
  detectAppleMusicAlbumType,
  extractAppleMusicAlbumRef,
  lookupCountriesForImportStorefront,
  parseAppleMusicAlbumInput,
  parseAppleMusicImportStorefront,
  stripAppleCatalogSuffix,
  toKrAppleAlbumUrl,
  upscaleAppleArtworkUrl,
} from '@/lib/appleMusic';
import {
  fetchAppleMusicPageTracks,
  needsAppleMusicPageTrackFallback,
} from '@/lib/appleMusicPageTracks';
import {
  parseItunesAlbumTracks,
  type AppleMusicAlbumTrack,
} from '@/lib/appleMusicTracks';
import { getCurrentUser } from '@/lib/supabase/server';

const LOOKUP_TIMEOUT_MS = 2500;
const COVER_CHECK_TIMEOUT_MS = 3000;

type ItunesLookupAlbum = {
  wrapperType?: unknown;
  collectionType?: unknown;
  artistName?: unknown;
  collectionName?: unknown;
  collectionViewUrl?: unknown;
  artworkUrl100?: unknown;
  releaseDate?: unknown;
  trackCount?: unknown;
};

type ImportOk = {
  artist: string;
  albumName: string;
  releaseDate: string | null;
  coverImageUrl: string | null;
  albumType: 'Album' | 'EP' | 'Single';
  appleMusicUrl: string;
  tracks: AppleMusicAlbumTrack[];
  source: 'itunes' | 'apple_music_page';
};

function isAllowedArtworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'mzstatic.com' || host.endsWith('.mzstatic.com');
}

function toHttpsMzstaticUrl(artworkUrl: string, size: number): string | null {
  const scaled = upscaleAppleArtworkUrl(artworkUrl, size);
  if (!scaled) return null;
  try {
    const url = new URL(scaled);
    if (url.protocol !== 'https:' || !isAllowedArtworkHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function isReachableImageUrl(imageUrl: string): Promise<boolean> {
  const headers = { 'User-Agent': 'MyAudio/1.0' };
  try {
    const head = await fetch(imageUrl, {
      method: 'HEAD',
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(COVER_CHECK_TIMEOUT_MS),
    });
    if (head.ok) {
      const contentType = (head.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
      if (!contentType || contentType.startsWith('image/')) return true;
    }
  } catch {
  }
  try {
    const res = await fetch(imageUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { ...headers, Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(COVER_CHECK_TIMEOUT_MS),
    });
    if (!(res.ok || res.status === 206)) return false;
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    return !contentType || contentType.startsWith('image/');
  } catch {
    return false;
  }
}

async function resolveCoverImageUrl(artworkUrl: string): Promise<string | null> {
  for (const size of [1000, 600] as const) {
    const candidate = toHttpsMzstaticUrl(artworkUrl, size);
    if (!candidate) continue;
    if (await isReachableImageUrl(candidate)) return candidate;
  }
  return null;
}

async function fetchLookupResults(
  albumId: string,
  country: string,
  entity: 'album' | 'song',
): Promise<unknown[]> {
  const endpoint = new URL('https://itunes.apple.com/lookup');
  endpoint.searchParams.set('id', albumId);
  endpoint.searchParams.set('entity', entity);
  endpoint.searchParams.set('country', country);
  if (entity === 'song') {
    endpoint.searchParams.set('limit', '200');
  }
  try {
    const res = await fetch(endpoint.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return [];
    const results = (data as { results?: unknown }).results;
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}

function findLookupAlbum(results: unknown[]): ItunesLookupAlbum | null {
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as ItunesLookupAlbum;
    if (typeof row.collectionName !== 'string' || !row.collectionName.trim()) continue;
    if (row.wrapperType === 'collection') return row;
    if (typeof row.collectionType === 'string' && row.collectionType.length > 0) return row;
  }
  return null;
}

async function fetchLookupAlbum(
  albumId: string,
  country: string,
): Promise<ItunesLookupAlbum | null> {
  const results = await fetchLookupResults(albumId, country, 'album');
  return findLookupAlbum(results);
}

async function fetchLookupTracks(
  albumId: string,
  country: string,
): Promise<AppleMusicAlbumTrack[]> {
  const results = await fetchLookupResults(albumId, country, 'song');
  return parseItunesAlbumTracks(results);
}

function collectionTrackCount(album: ItunesLookupAlbum): number | null {
  const value = album.trackCount;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      url?: unknown;
      storefront?: unknown;
    };
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const requestedStorefront = parseAppleMusicImportStorefront(body.storefront);
    const parsed = parseAppleMusicAlbumInput(rawUrl);
    if (parsed.status === 'empty') {
      return NextResponse.json({ error: 'Apple Music 주소를 입력해 주세요.' }, { status: 400 });
    }
    if (parsed.status === 'invalid') {
      return NextResponse.json({ error: 'music.apple.com 앨범 주소를 입력해 주세요.' }, { status: 400 });
    }

    const ref = extractAppleMusicAlbumRef(rawUrl);
    if (!ref) {
      return NextResponse.json(
        { error: '앨범 주소를 확인할 수 없습니다. 앨범 페이지 링크인지 확인해 주세요.' },
        { status: 400 },
      );
    }

    const lookupCountries = lookupCountriesForImportStorefront(
      requestedStorefront,
      ref.storefront,
    );

    let album: ItunesLookupAlbum | null = null;
    let albumCountry = '';
    for (const country of lookupCountries) {
      album = await fetchLookupAlbum(ref.albumId, country);
      if (album) {
        albumCountry = country;
        break;
      }
    }
    if (!album) {
      return NextResponse.json({ error: '앨범 정보를 찾지 못했습니다.' }, { status: 404 });
    }

    const collectionName =
      typeof album.collectionName === 'string' ? album.collectionName.trim() : '';
    const artistName = typeof album.artistName === 'string' ? album.artistName.trim() : '';
    if (!collectionName) {
      return NextResponse.json({ error: '앨범 정보를 찾지 못했습니다.' }, { status: 404 });
    }

    const viewUrl =
      typeof album.collectionViewUrl === 'string' ? album.collectionViewUrl.trim() : '';
    const appleMusicUrl =
      toKrAppleAlbumUrl(viewUrl) ??
      parsed.url ??
      `https://music.apple.com/kr/album/${ref.albumId}`;

    const artworkUrl = typeof album.artworkUrl100 === 'string' ? album.artworkUrl100 : '';
    const coverImageUrl = artworkUrl ? await resolveCoverImageUrl(artworkUrl) : null;

    let tracks: AppleMusicAlbumTrack[] = [];
    let source: ImportOk['source'] = 'itunes';
    try {
      const trackCountries = albumCountry
        ? [albumCountry, ...lookupCountries.filter((c) => c !== albumCountry)]
        : lookupCountries;
      for (const country of trackCountries) {
        tracks = await fetchLookupTracks(ref.albumId, country);
        if (tracks.length > 0) break;
      }
    } catch {
      tracks = [];
    }

    const expectedTrackCount = collectionTrackCount(album);
    if (needsAppleMusicPageTrackFallback(tracks.length, expectedTrackCount)) {
      const pageUrl =
        requestedStorefront === 'jp'
          ? appleMusicAlbumPageUrl(ref.albumId, 'jp')
          : appleMusicUrl;
      const pageTracks = await fetchAppleMusicPageTracks(pageUrl);
      if (pageTracks.length > tracks.length) {
        tracks = pageTracks;
        source = 'apple_music_page';
      }
    }

    const payload: ImportOk = {
      artist: artistName,
      albumName: stripAppleCatalogSuffix(collectionName),
      releaseDate: appleMusicReleaseDateYmd(
        typeof album.releaseDate === 'string' ? album.releaseDate : null,
      ),
      coverImageUrl,
      albumType: detectAppleMusicAlbumType(collectionName),
      appleMusicUrl,
      tracks,
      source,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: '앨범 정보를 가져오지 못했습니다.' }, { status: 500 });
  }
}
