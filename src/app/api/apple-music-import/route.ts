import { NextRequest, NextResponse } from 'next/server';
import {
  appleMusicReleaseDateYmd,
  detectAppleMusicAlbumType,
  extractAppleMusicAlbumRef,
  lookupCountriesForAppleStorefront,
  parseAppleMusicAlbumInput,
  stripAppleCatalogSuffix,
  toKrAppleAlbumUrl,
  upscaleAppleArtworkUrl,
} from '@/lib/appleMusic';
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
};

type ImportOk = {
  artist: string;
  albumName: string;
  releaseDate: string | null;
  coverImageUrl: string | null;
  albumType: 'Album' | 'EP' | 'Single';
  appleMusicUrl: string;
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

async function fetchLookupAlbum(
  albumId: string,
  country: string,
): Promise<ItunesLookupAlbum | null> {
  const endpoint = new URL('https://itunes.apple.com/lookup');
  endpoint.searchParams.set('id', albumId);
  endpoint.searchParams.set('entity', 'album');
  endpoint.searchParams.set('country', country);
  try {
    const res = await fetch(endpoint.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json().catch(() => null);
    const results =
      data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)
        ? ((data as { results: ItunesLookupAlbum[] }).results ?? [])
        : [];
    const album = results.find((item) => {
      if (typeof item.collectionName !== 'string' || !item.collectionName.trim()) return false;
      if (item.wrapperType === 'collection') return true;
      return typeof item.collectionType === 'string' && item.collectionType.length > 0;
    });
    return album ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { url?: unknown };
    const rawUrl = typeof body.url === 'string' ? body.url : '';
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

    let album: ItunesLookupAlbum | null = null;
    for (const country of lookupCountriesForAppleStorefront(ref.storefront)) {
      album = await fetchLookupAlbum(ref.albumId, country);
      if (album) break;
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

    const payload: ImportOk = {
      artist: artistName,
      albumName: stripAppleCatalogSuffix(collectionName),
      releaseDate: appleMusicReleaseDateYmd(
        typeof album.releaseDate === 'string' ? album.releaseDate : null,
      ),
      coverImageUrl,
      albumType: detectAppleMusicAlbumType(collectionName),
      appleMusicUrl,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: '앨범 정보를 가져오지 못했습니다.' }, { status: 500 });
  }
}
