import type { Lyrics } from '../types';

export function buildAllFavoritesSorted(rows: Lyrics[]): Lyrics[] {
  return [...rows]
    .filter((t) => t.is_favorite ?? false)
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
}

export function buildFavoritePlayableQueue(rows: Lyrics[]): Lyrics[] {
  return [...rows]
    .filter((t) => (t.is_favorite ?? false) && Boolean(t.audio_url?.trim()))
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
}
