import type { AlbumTrack } from './types';

export type LyricsTrackForMatch = {
  id: string;
  track_number: number;
  track_title: string;
  hasLyrics: boolean;
};

export function normalizeLyricsTrackTitle(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function hasLyricsTranslationContent(row: {
  lyrics_text?: unknown;
  translated_lines?: unknown;
}): boolean {
  const text = typeof row.lyrics_text === 'string' ? row.lyrics_text.trim() : '';
  if (text.length > 0) return true;
  if (!Array.isArray(row.translated_lines) || row.translated_lines.length === 0) return false;
  return row.translated_lines.some((line) => {
    if (!line || typeof line !== 'object') return false;
    const original = (line as { original?: unknown }).original;
    const translation = (line as { translation?: unknown }).translation;
    const originalText = typeof original === 'string' ? original.trim() : '';
    const translationText = typeof translation === 'string' ? translation.trim() : '';
    return originalText.length > 0 || translationText.length > 0;
  });
}

export function matchAlbumTracksToLyricsTrackIds(
  albumTracks: readonly AlbumTrack[],
  lyricsTracks: readonly LyricsTrackForMatch[],
): (string | null)[] {
  const result: (string | null)[] = albumTracks.map(() => null);
  if (albumTracks.length === 0 || lyricsTracks.length === 0) return result;

  const ordered = albumTracks
    .map((track, index) => ({ track, index }))
    .sort(
      (a, b) =>
        a.track.disc - b.track.disc ||
        a.track.no - b.track.no ||
        a.track.title.localeCompare(b.track.title, 'ko') ||
        a.index - b.index,
    );

  const used = new Set<string>();
  const takeFirstUnused = (
    candidates: LyricsTrackForMatch[] | undefined,
    requireLyrics: boolean,
  ): string | null => {
    if (!candidates) return null;
    for (const candidate of candidates) {
      if (!candidate.id || used.has(candidate.id)) continue;
      if (requireLyrics && !candidate.hasLyrics) continue;
      used.add(candidate.id);
      return candidate.id;
    }
    return null;
  };

  // 앨범 트랙 수 = Lyrics 트랙 수(전체)이면 곡명 무시하고 평탄 번호 ↔ track_number
  if (albumTracks.length === lyricsTracks.length) {
    const byNumber = new Map<number, LyricsTrackForMatch[]>();
    for (const lyrics of lyricsTracks) {
      if (!lyrics.id || !Number.isFinite(lyrics.track_number)) continue;
      const bucket = byNumber.get(lyrics.track_number);
      if (bucket) bucket.push(lyrics);
      else byNumber.set(lyrics.track_number, [lyrics]);
    }
    for (let flatIndex = 0; flatIndex < ordered.length; flatIndex += 1) {
      const { index } = ordered[flatIndex];
      result[index] = takeFirstUnused(byNumber.get(flatIndex + 1), true);
    }
    return result;
  }

  const eligible = lyricsTracks.filter((track) => track.hasLyrics && track.id);
  if (eligible.length === 0) return result;

  const byNumberAndTitle = new Map<string, LyricsTrackForMatch[]>();
  const byTitle = new Map<string, LyricsTrackForMatch[]>();

  for (const lyrics of eligible) {
    const titleKey = normalizeLyricsTrackTitle(lyrics.track_title);
    if (!titleKey) continue;
    const numberKey = `${lyrics.track_number}::${titleKey}`;
    const numberBucket = byNumberAndTitle.get(numberKey);
    if (numberBucket) numberBucket.push(lyrics);
    else byNumberAndTitle.set(numberKey, [lyrics]);
    const titleBucket = byTitle.get(titleKey);
    if (titleBucket) titleBucket.push(lyrics);
    else byTitle.set(titleKey, [lyrics]);
  }

  for (let flatIndex = 0; flatIndex < ordered.length; flatIndex += 1) {
    const { track, index } = ordered[flatIndex];
    const titleKey = normalizeLyricsTrackTitle(track.title);
    if (!titleKey) continue;
    const flatNumber = flatIndex + 1;
    const matched =
      takeFirstUnused(byNumberAndTitle.get(`${flatNumber}::${titleKey}`), true) ??
      takeFirstUnused(byTitle.get(titleKey), true);
    result[index] = matched;
  }

  return result;
}
