import { NextRequest, NextResponse } from 'next/server';
import {
  APPLE_MUSIC_ALBUM_SCORE_MIN,
  APPLE_MUSIC_ARTIST_SCORE_MIN,
  scoreAppleMusicName,
  toKrAppleAlbumUrl,
} from '@/lib/appleMusic';

const SEARCH_TIMEOUT_MS = 2500;
const SEARCH_COUNTRIES = ['US', 'JP'] as const;

type ItunesAlbum = {
  artistName?: unknown;
  collectionName?: unknown;
  collectionViewUrl?: unknown;
};

function pickBestAlbumUrl(artist: string, albumName: string, results: ItunesAlbum[]): string | null {
  let bestUrl: string | null = null;
  let bestScore = 0;
  for (const item of results) {
    const candidateArtist = typeof item.artistName === 'string' ? item.artistName : '';
    const candidateAlbum = typeof item.collectionName === 'string' ? item.collectionName : '';
    const viewUrl = typeof item.collectionViewUrl === 'string' ? item.collectionViewUrl : '';
    if (!candidateAlbum || !viewUrl) continue;
    if (artist && scoreAppleMusicName(artist, candidateArtist) < APPLE_MUSIC_ARTIST_SCORE_MIN) continue;
    const albumScore = scoreAppleMusicName(albumName, candidateAlbum);
    if (albumScore < APPLE_MUSIC_ALBUM_SCORE_MIN) continue;
    if (albumScore > bestScore) {
      const url = toKrAppleAlbumUrl(viewUrl);
      if (!url) continue;
      bestScore = albumScore;
      bestUrl = url;
    }
  }
  return bestUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { artist?: unknown; albumName?: unknown };
    const artist = typeof body.artist === 'string' ? body.artist.trim() : '';
    const albumName = typeof body.albumName === 'string' ? body.albumName.trim() : '';
    if (!albumName) {
      return NextResponse.json({ url: null });
    }
    const term = [artist, albumName].filter(Boolean).join(' ');
    let picked: string | null = null;
    for (const country of SEARCH_COUNTRIES) {
      const endpoint = new URL('https://itunes.apple.com/search');
      endpoint.searchParams.set('term', term);
      endpoint.searchParams.set('entity', 'album');
      endpoint.searchParams.set('country', country);
      endpoint.searchParams.set('limit', '10');
      try {
        const res = await fetch(endpoint.toString(), {
          cache: 'no-store',
          signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        });
        if (!res.ok) continue;
        const data: unknown = await res.json().catch(() => null);
        const results =
          data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)
            ? (data as { results: ItunesAlbum[] }).results
            : [];
        picked = pickBestAlbumUrl(artist, albumName, results);
        if (picked) break;
      } catch {
      }
    }
    return NextResponse.json({ url: picked });
  } catch {
    return NextResponse.json({ url: null });
  }
}
