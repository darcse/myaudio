import { countryOptions } from '@/app/albums/constants';
import type { Album } from '@/app/albums/types';
import type { ArtistStats, ArtistSummary, ListenHistoryEntry, RelatedArtist } from './types';

function pickMostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function countryFlag(country: string | null | undefined): string {
  if (!country?.trim()) return '';
  return countryOptions.find((c) => c.name === country)?.flag ?? '';
}

export function buildArtistSummaries(albums: Album[]): ArtistSummary[] {
  const map = new Map<string, Album[]>();

  for (const album of albums) {
    const name = album.artist?.trim();
    if (!name) continue;
    const rows = map.get(name) ?? [];
    rows.push(album);
    map.set(name, rows);
  }

  const summaries: ArtistSummary[] = [];
  for (const [name, artistAlbums] of map) {
    const sortedAlbums = [...artistAlbums].sort((a, b) =>
      (b.release_date || '').localeCompare(a.release_date || ''),
    );
    const genres = [
      ...new Set(
        artistAlbums
          .map((a) => a.genre1?.trim())
          .filter((g): g is string => !!g),
      ),
    ].sort((a, b) => a.localeCompare(b, 'ko'));
    summaries.push({
      name,
      albumCount: artistAlbums.length,
      country: pickMostCommon(artistAlbums.map((a) => a.country ?? '')),
      artistType: pickMostCommon(artistAlbums.map((a) => a.artist_type ?? '')),
      genres,
      albums: sortedAlbums,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function getArtistMetaFromAlbums(
  albums: { country?: string | null; artist_type?: string | null; genre1?: string | null }[],
): { country: string | null; artistType: string | null; genres: string[] } {
  const genres = [
    ...new Set(
      albums
        .map((a) => a.genre1?.trim())
        .filter((g): g is string => !!g),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'));
  return {
    country: pickMostCommon(albums.map((a) => a.country ?? '')),
    artistType: pickMostCommon(albums.map((a) => a.artist_type ?? '')),
    genres,
  };
}

export function findArtistWikiUrl(albums: Album[]): string | null {
  for (const album of albums) {
    const url = album.wiki_url?.trim();
    if (url) return url;
  }
  return null;
}

export function buildListenHistoryIndex(
  rows: { album_id: number | null; listened_at: string | null }[],
): Map<number, ListenHistoryEntry> {
  const index = new Map<number, ListenHistoryEntry>();
  for (const row of rows) {
    const albumId = row.album_id;
    const listenedAt = row.listened_at?.trim();
    if (albumId == null || !listenedAt) continue;
    const prev = index.get(albumId);
    if (!prev) {
      index.set(albumId, { count: 1, latestListenedAt: listenedAt });
      continue;
    }
    index.set(albumId, {
      count: prev.count + 1,
      latestListenedAt: listenedAt > prev.latestListenedAt ? listenedAt : prev.latestListenedAt,
    });
  }
  return index;
}

export function getPrimaryGenre1(artist: ArtistSummary): string | null {
  return pickMostCommon(artist.albums.map((a) => a.genre1 ?? ''));
}

type ArtistSimilarityProfile = {
  genre1: string | null;
  genre2: string | null;
  artistType: string | null;
  country: string | null;
};

function getArtistSimilarityProfile(artist: ArtistSummary): ArtistSimilarityProfile {
  return {
    genre1: pickMostCommon(artist.albums.map((a) => a.genre1 ?? '')),
    genre2: pickMostCommon(artist.albums.map((a) => a.genre2 ?? '')),
    artistType: artist.artistType ?? pickMostCommon(artist.albums.map((a) => a.artist_type ?? '')),
    country: artist.country ?? pickMostCommon(artist.albums.map((a) => a.country ?? '')),
  };
}

function scoreArtistSimilarity(
  current: ArtistSimilarityProfile,
  candidate: ArtistSimilarityProfile,
): number {
  let score = 0;
  if (current.genre2 && candidate.genre2 && current.genre2 === candidate.genre2) {
    score += 3;
  }
  if (current.genre1 && candidate.genre1 && current.genre1 === candidate.genre1) {
    score += 2;
  }
  if (current.artistType && candidate.artistType && current.artistType === candidate.artistType) {
    score += 1;
  }
  if (current.country && candidate.country && current.country === candidate.country) {
    score += 1;
  }
  return score;
}

export function getRelatedArtists(
  current: ArtistSummary,
  all: ArtistSummary[],
  profileUrls: Record<string, string | null> = {},
): RelatedArtist[] {
  const currentProfile = getArtistSimilarityProfile(current);

  return all
    .filter((artist) => artist.name !== current.name)
    .map((artist) => ({
      artist,
      score: scoreArtistSimilarity(currentProfile, getArtistSimilarityProfile(artist)),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.artist.albumCount - a.artist.albumCount ||
        a.artist.name.localeCompare(b.artist.name, 'ko'),
    )
    .slice(0, 5)
    .map(({ artist }) => ({
      name: artist.name,
      albumCount: artist.albumCount,
      country: artist.country,
      artistType: artist.artistType,
      profileImageUrl: profileUrls[artist.name] ?? null,
    }));
}

export function getArtistStats(
  artist: ArtistSummary,
  listenIndex: Map<number, ListenHistoryEntry>,
): ArtistStats {
  let totalListenCount = 0;
  let latestListenedAt: string | null = null;
  for (const album of artist.albums) {
    const entry = listenIndex.get(album.id);
    if (!entry) continue;
    totalListenCount += entry.count;
    if (!latestListenedAt || entry.latestListenedAt > latestListenedAt) {
      latestListenedAt = entry.latestListenedAt;
    }
  }
  return {
    totalAlbums: artist.albumCount,
    totalListenCount,
    latestListenedAt,
  };
}

export function getPopularAlbumId(
  artist: ArtistSummary,
  listenIndex: Map<number, ListenHistoryEntry>,
): number | null {
  let bestId: number | null = null;
  let bestCount = 0;
  for (const album of artist.albums) {
    const entry = listenIndex.get(album.id);
    if (!entry || entry.count <= bestCount) continue;
    bestCount = entry.count;
    bestId = album.id;
  }
  return bestCount > 0 ? bestId : null;
}
