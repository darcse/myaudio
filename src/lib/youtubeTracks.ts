export type YoutubeTrack = {
  videoId: string;
  title: string;
};

export function parseYoutubeTracks(raw: unknown): YoutubeTrack[] {
  if (!Array.isArray(raw)) return [];
  const tracks: YoutubeTrack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { videoId?: unknown; title?: unknown };
    const videoId = typeof record.videoId === 'string' ? record.videoId.trim() : '';
    if (!videoId) continue;
    tracks.push({
      videoId,
      title: typeof record.title === 'string' ? record.title.trim() : '',
    });
  }
  return tracks;
}

export function tracksMatchPlaylist(tracks: YoutubeTrack[], videoIds: string[]): boolean {
  if (tracks.length === 0 || tracks.length !== videoIds.length) return false;
  return tracks.every((track, index) => track.videoId === videoIds[index]);
}

export function fallbackTrackTitle(index: number): string {
  return `트랙 ${index + 1}`;
}
