import type { Lyrics } from '../types';

export const LYRICS_NO_ALBUM_KEY = '__lyrics_no_album__';

export type LyricsAlbumGroup = {
  key: string;
  displayName: string;
  tracks: Lyrics[];
  coverUrl: string | null;
  latestCreatedAt: number;
};

function trackSort(a: Lyrics, b: Lyrics, order: 'created_desc' | 'title_asc'): number {
  if (order === 'title_asc') {
    return (a.title || '').localeCompare(b.title || '', 'ko');
  }
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return tb - ta;
}

export function groupLyricsByAlbum(
  rows: Lyrics[],
  sortOrder: 'created_desc' | 'title_asc',
): LyricsAlbumGroup[] {
  const map = new Map<string, Lyrics[]>();
  for (const row of rows) {
    const raw = row.album?.trim();
    const key = raw ? raw : LYRICS_NO_ALBUM_KEY;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  const groups: LyricsAlbumGroup[] = [];
  for (const [key, tracks] of map) {
    const sorted = [...tracks].sort((a, b) => trackSort(a, b, sortOrder));
    const coverUrl = sorted.find((t) => t.cover_image_url?.trim())?.cover_image_url ?? null;
    const displayName = key === LYRICS_NO_ALBUM_KEY ? '(앨범 미지정)' : key;
    const latestCreatedAt = sorted.reduce((max, t) => {
      const ts = t.created_at ? new Date(t.created_at).getTime() : 0;
      return Math.max(max, ts);
    }, 0);
    groups.push({ key, displayName, tracks: sorted, coverUrl, latestCreatedAt });
  }
  groups.sort((a, b) => {
    if (sortOrder === 'created_desc') {
      const diff = b.latestCreatedAt - a.latestCreatedAt;
      if (diff !== 0) return diff;
    }
    return a.displayName.localeCompare(b.displayName, 'ko');
  });
  return groups;
}

export function findTracksForAlbumKey(library: Lyrics[], albumKey: string): Lyrics[] {
  if (albumKey === LYRICS_NO_ALBUM_KEY) {
    return library.filter((r) => !r.album?.trim());
  }
  return library.filter((r) => (r.album?.trim() || '') === albumKey);
}

export type LyricsAlbumCard = {
  key: string;
  displayName: string;
  coverUrl: string | null;
  trackCount: number;
  vibeColors: string[] | null;
  vibeEmoji: string | null;
};

function pickAlbumVibe(tracks: Lyrics[]): { vibeColors: string[] | null; vibeEmoji: string | null } {
  const withVibe = tracks.find((t) => (t.vibe_colors?.length ?? 0) >= 2);
  if (!withVibe?.vibe_colors) return { vibeColors: null, vibeEmoji: null };
  return {
    vibeColors: withVibe.vibe_colors.slice(0, 2),
    vibeEmoji: withVibe.vibe_emoji ?? null,
  };
}

export function toAlbumCards(groups: LyricsAlbumGroup[]): LyricsAlbumCard[] {
  return groups.map((g) => {
    const { vibeColors, vibeEmoji } = pickAlbumVibe(g.tracks);
    return {
      key: g.key,
      displayName: g.displayName,
      coverUrl: g.coverUrl,
      trackCount: g.tracks.length,
      vibeColors,
      vibeEmoji,
    };
  });
}
