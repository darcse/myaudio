import type { AppleMusicAlbumTrack } from './appleMusicTracks';

const PAGE_TIMEOUT_MS = 8000;

const PAGE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
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
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed);
  }
  return null;
}

export function parseIso8601DurationToMs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return null;
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const seconds = match[3] ? Number.parseFloat(match[3]) : 0;
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) return null;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

function sortTracks(tracks: AppleMusicAlbumTrack[]): AppleMusicAlbumTrack[] {
  return tracks.sort(
    (a, b) => a.disc - b.disc || a.no - b.no || a.title.localeCompare(b.title, 'ko'),
  );
}

function parseSerializedServerDataTracks(html: string): AppleMusicAlbumTrack[] {
  const match = html.match(
    /<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch {
    return [];
  }

  const found: AppleMusicAlbumTrack[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 14 || found.length > 500) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;

    const row = node as Record<string, unknown>;
    const titleRaw =
      typeof row.title === 'string'
        ? row.title
        : typeof row.name === 'string'
          ? row.name
          : '';
    const title = titleRaw.trim();
    const hasTrackNumber = 'trackNumber' in row;
    const hasDiscOrDuration = 'discNumber' in row || 'duration' in row || 'durationInMillis' in row;

    if (title && hasTrackNumber && hasDiscOrDuration) {
      const disc = asPositiveInt(row.discNumber, 1);
      const no = asPositiveInt(row.trackNumber, found.length + 1);
      const duration_ms =
        asDurationMs(row.durationInMillis) ?? asDurationMs(row.duration);
      const key = `${disc}:${no}:${title}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({ disc, no, title, duration_ms });
      }
    }

    for (const value of Object.values(row)) walk(value, depth + 1);
  };

  walk(parsed, 0);
  return sortTracks(found);
}

function parseLdJsonMusicAlbumTracks(html: string): AppleMusicAlbumTrack[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
    }
  }

  const flat = blocks.flatMap((block) => (Array.isArray(block) ? block : [block]));
  const album = flat.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const type = (item as { '@type'?: unknown })['@type'];
    if (type === 'MusicAlbum') return true;
    return Array.isArray(type) && type.includes('MusicAlbum');
  }) as Record<string, unknown> | undefined;

  if (!album) return [];

  const tracksRaw = album.track ?? album.tracks;
  let list: unknown[] = [];
  if (Array.isArray(tracksRaw)) {
    list = tracksRaw;
  } else if (tracksRaw && typeof tracksRaw === 'object') {
    const itemList = (tracksRaw as { itemListElement?: unknown }).itemListElement;
    if (Array.isArray(itemList)) list = itemList;
  }

  const tracks: AppleMusicAlbumTrack[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (!entry || typeof entry !== 'object') continue;
    const item = ((entry as { item?: unknown }).item ?? entry) as Record<string, unknown>;
    const title = typeof item.name === 'string' ? item.name.trim() : '';
    if (!title) continue;
    const durationRaw = typeof item.duration === 'string' ? item.duration : '';
    tracks.push({
      disc: 1,
      no: asPositiveInt(item.position, i + 1),
      title,
      duration_ms: durationRaw ? parseIso8601DurationToMs(durationRaw) : null,
    });
  }
  return sortTracks(tracks);
}

export function parseAppleMusicPageTracks(html: string): AppleMusicAlbumTrack[] {
  const fromSerialized = parseSerializedServerDataTracks(html);
  if (fromSerialized.length > 0) return fromSerialized;
  return parseLdJsonMusicAlbumTracks(html);
}

export function needsAppleMusicPageTrackFallback(
  itunesTrackCount: number,
  collectionTrackCount: number | null,
): boolean {
  if (itunesTrackCount <= 0) return true;
  if (collectionTrackCount != null && itunesTrackCount < collectionTrackCount) return true;
  return false;
}

export async function fetchAppleMusicPageTracks(
  pageUrl: string,
): Promise<AppleMusicAlbumTrack[]> {
  try {
    const res = await fetch(pageUrl, {
      cache: 'no-store',
      headers: PAGE_HEADERS,
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (!html) return [];
    return parseAppleMusicPageTracks(html);
  } catch {
    return [];
  }
}
