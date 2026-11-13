import type { Album } from '@/app/albums/types';
import {
  buildAlbumListenRankings,
  isVariousArtistName,
  type AlbumListenRankItem,
} from '@/app/albums/stats/albumListenStats';
import { buildListenHistoryIndex } from '@/app/artists/utils';

export const WEEKLY_HOT_ALBUM_LIMIT = 3;

export type WeekRange = {
  startMs: number;
  endMs: number;
};

export type WeeklyHotArtistItem = {
  artistName: string;
  listenCount: number;
  albumCount: number;
};

export type WeeklyListenStats = {
  artistCount: number;
  albumCount: number;
  listenCount: number;
};

export type WeeklyHotSnapshot = {
  weekRange: WeekRange;
  hotArtist: WeeklyHotArtistItem | null;
  hotAlbums: AlbumListenRankItem[];
  stats: WeeklyListenStats;
};

type HistoryRow = { album_id: number | null; listened_at: string | null };

function parseListenedAtMs(listenedAt: string): number | null {
  const trimmed = listenedAt.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map((part) => parseInt(part, 10));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(year, month - 1, day).getTime();
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getRollingSevenDayRange(reference = new Date()): WeekRange {
  const end = new Date(reference);
  end.setHours(23, 59, 59, 999);

  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

export function formatWeekRangeLabel(range: WeekRange): string {
  const start = new Date(range.startMs);
  const end = new Date(range.endMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${start.getMonth() + 1}/${pad(start.getDate())} ~ ${end.getMonth() + 1}/${pad(end.getDate())}`;
}

export function filterHistoryByWeek(rows: HistoryRow[], week: WeekRange): HistoryRow[] {
  return rows.filter((row) => {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) return false;
    const ms = parseListenedAtMs(listenedAt);
    if (ms == null) return false;
    return ms >= week.startMs && ms <= week.endMs;
  });
}

export function buildWeeklyHotAlbumRankings(
  albums: Album[],
  historyRows: HistoryRow[],
  reference = new Date(),
  limit = WEEKLY_HOT_ALBUM_LIMIT,
): AlbumListenRankItem[] {
  const range = getRollingSevenDayRange(reference);
  const filtered = filterHistoryByWeek(historyRows, range);
  return buildAlbumListenRankings(albums, filtered, limit);
}

export function buildWeeklyHotArtist(
  albums: Album[],
  historyRows: HistoryRow[],
  reference = new Date(),
): WeeklyHotArtistItem | null {
  const range = getRollingSevenDayRange(reference);
  const filtered = filterHistoryByWeek(historyRows, range);
  return rankWeeklyHotArtist(albums, filtered);
}

function rankWeeklyHotArtist(albums: Album[], filtered: HistoryRow[]): WeeklyHotArtistItem | null {
  const index = buildListenHistoryIndex(filtered);
  const artistMap = new Map<string, { listenCount: number; albumCount: number }>();

  for (const album of albums) {
    const entry = index.get(album.id);
    if (!entry || entry.count <= 0) continue;
    const name = album.artist?.trim();
    if (!name || isVariousArtistName(name)) continue;
    const prev = artistMap.get(name) ?? { listenCount: 0, albumCount: 0 };
    artistMap.set(name, {
      listenCount: prev.listenCount + entry.count,
      albumCount: prev.albumCount + 1,
    });
  }

  const ranked = [...artistMap.entries()]
    .map(([artistName, data]) => ({ artistName, ...data }))
    .sort((a, b) => {
      const byCount = b.listenCount - a.listenCount;
      if (byCount !== 0) return byCount;
      const byAlbums = b.albumCount - a.albumCount;
      if (byAlbums !== 0) return byAlbums;
      return a.artistName.localeCompare(b.artistName, 'ko');
    });

  return ranked[0] ?? null;
}

export function buildWeeklyListenStats(albums: Album[], filtered: HistoryRow[]): WeeklyListenStats {
  const albumIds = new Set<number>();
  for (const row of filtered) {
    if (row.album_id != null) albumIds.add(row.album_id);
  }

  const albumById = new Map(albums.map((album) => [album.id, album]));
  const artists = new Set<string>();
  for (const id of albumIds) {
    const name = albumById.get(id)?.artist?.trim();
    if (!name || isVariousArtistName(name)) continue;
    artists.add(name);
  }

  return {
    artistCount: artists.size,
    albumCount: albumIds.size,
    listenCount: filtered.length,
  };
}

export function buildWeeklyHotSnapshot(
  albums: Album[],
  historyRows: HistoryRow[],
  reference = new Date(),
  albumLimit = WEEKLY_HOT_ALBUM_LIMIT,
): WeeklyHotSnapshot {
  const weekRange = getRollingSevenDayRange(reference);
  const filtered = filterHistoryByWeek(historyRows, weekRange);
  return {
    weekRange,
    hotArtist: rankWeeklyHotArtist(albums, filtered),
    hotAlbums: buildAlbumListenRankings(albums, filtered, albumLimit),
    stats: buildWeeklyListenStats(albums, filtered),
  };
}
