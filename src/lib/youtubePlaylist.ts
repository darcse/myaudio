export type YoutubePlaylistParseResult =
  | { status: 'empty'; id: null }
  | { status: 'ok'; id: string }
  | { status: 'invalid'; id: null };

const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

function looksLikeUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw) || raw.includes('youtube.com') || raw.includes('youtu.be');
}

function extractListParam(raw: string): string | null {
  try {
    const list = new URL(raw).searchParams.get('list');
    if (list?.trim()) return list.trim();
  } catch {
  }
  const match = raw.match(/[?&]list=([^&#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

export function parseYoutubePlaylistInput(raw: string): YoutubePlaylistParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty', id: null };
  const fromQuery = extractListParam(trimmed);
  if (fromQuery) {
    return PLAYLIST_ID_RE.test(fromQuery)
      ? { status: 'ok', id: fromQuery }
      : { status: 'invalid', id: null };
  }
  if (looksLikeUrl(trimmed)) return { status: 'invalid', id: null };
  if (PLAYLIST_ID_RE.test(trimmed)) return { status: 'ok', id: trimmed };
  return { status: 'invalid', id: null };
}

export function youtubePlaylistOpenUrl(id: string): string {
  return `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`;
}

export function youtubeMusicPlaylistUrl(id: string): string {
  return `https://music.youtube.com/playlist?list=${encodeURIComponent(id)}`;
}
