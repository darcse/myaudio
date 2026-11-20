export type AppleMusicAlbumTrack = {
  disc: number;
  no: number;
  title: string;
  duration_ms: number | null;
};

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function asDurationMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function parseItunesAlbumTracks(results: readonly unknown[]): AppleMusicAlbumTrack[] {
  const tracks: AppleMusicAlbumTrack[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.wrapperType !== 'track') continue;
    const title = typeof row.trackName === 'string' ? row.trackName.trim() : '';
    if (!title) continue;
    tracks.push({
      disc: asPositiveInt(row.discNumber, 1),
      no: asPositiveInt(row.trackNumber, tracks.length + 1),
      title,
      duration_ms: asDurationMs(row.trackTimeMillis),
    });
  }
  return tracks.sort((a, b) => a.disc - b.disc || a.no - b.no || a.title.localeCompare(b.title, 'ko'));
}
