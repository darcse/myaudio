import { shuffleArray } from '@/lib/utils';

export type HeadfiAlbumMatchCandidate = {
  id: number;
  artist: string | null;
  genre1: string | null;
  genre2: string | null;
  audio_tags: string[] | null;
};

function normalizeGenreToken(value: string): string {
  return value.trim().toLowerCase();
}

function albumMatchesRecommendedGenres(
  album: HeadfiAlbumMatchCandidate,
  recommendedGenres: string[],
): boolean {
  const genres = recommendedGenres.map(normalizeGenreToken).filter(Boolean);
  if (genres.length === 0) return false;
  const g1 = normalizeGenreToken(album.genre1 ?? '');
  const g2 = normalizeGenreToken(album.genre2 ?? '');
  return genres.some((rg) => {
    if (!rg) return false;
    return (
      (g1 && (g1.includes(rg) || rg.includes(g1))) ||
      (g2 && (g2.includes(rg) || rg.includes(g2)))
    );
  });
}

export function selectAlbumsForHeadfiMatch(
  albums: HeadfiAlbumMatchCandidate[],
  recommendedGenres: string[] | null | undefined,
  limit = 80,
): HeadfiAlbumMatchCandidate[] {
  if (albums.length <= limit) {
    return shuffleArray(albums);
  }

  const genres = (recommendedGenres ?? []).filter((g) => g.trim());
  if (genres.length === 0) {
    return shuffleArray(albums).slice(0, limit);
  }

  const matched = albums.filter((album) => albumMatchesRecommendedGenres(album, genres));
  const matchedIds = new Set(matched.map((a) => a.id));
  const rest = albums.filter((a) => !matchedIds.has(a.id));
  const shuffledRest = shuffleArray(rest);
  const selected = [...matched];
  if (selected.length < limit) {
    selected.push(...shuffledRest.slice(0, limit - selected.length));
  }
  return selected.slice(0, limit);
}

export function parseFrInterpretationSummary(raw: string | null | undefined): string {
  if (!raw?.trim()) return '-';
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown };
    if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
      return parsed.summary.trim();
    }
  } catch {
    return '-';
  }
  return '-';
}
