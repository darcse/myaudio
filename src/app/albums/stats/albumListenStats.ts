import type { Album } from '@/app/albums/types';
import { buildListenHistoryIndex } from '@/app/artists/utils';

export const LISTEN_RANKING_LIMIT = 10;
export const WEEKLY_HOT_ALBUM_LIMIT = 5;

export type WeekRange = {
  startMs: number;
  endMs: number;
};

export type AlbumListenRankItem = {
  albumId: number;
  albumName: string;
  artist: string | null;
  coverImageUrl: string | null;
  listenCount: number;
};

export type ArtistListenRankItem = {
  artistName: string;
  listenCount: number;
  albumCount: number;
  coverImageUrl: string | null;
};

type HistoryRow = { album_id: number | null; listened_at: string | null };

export const STATS_MIN_YEAR = 2026;
export const STATS_MIN_MONTH = 6;

export type ListenPeriodFilter = {
  year: number;
  month: number | 'all';
};

export function listStatsYears(): number[] {
  const maxYear = Math.max(STATS_MIN_YEAR, new Date().getFullYear());
  const years: number[] = [];
  for (let year = STATS_MIN_YEAR; year <= maxYear; year += 1) {
    years.push(year);
  }
  return years;
}

export function listStatsMonths(year: number): Array<number | 'all'> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const minMonth = year === STATS_MIN_YEAR ? STATS_MIN_MONTH : 1;
  const maxMonth = year === currentYear ? currentMonth : 12;
  const months: Array<number | 'all'> = ['all'];
  for (let month = minMonth; month <= maxMonth; month += 1) {
    months.push(month);
  }
  return months;
}

export function getDefaultListenPeriodFilter(): ListenPeriodFilter {
  const now = new Date();
  const year = Math.max(STATS_MIN_YEAR, now.getFullYear());
  let month: number | 'all' = now.getMonth() + 1;
  if (year === STATS_MIN_YEAR && typeof month === 'number' && month < STATS_MIN_MONTH) {
    month = STATS_MIN_MONTH;
  }
  return { year, month };
}

export function clampListenPeriodFilter(filter: ListenPeriodFilter): ListenPeriodFilter {
  const years = listStatsYears();
  const year = years.includes(filter.year) ? filter.year : years[years.length - 1] ?? STATS_MIN_YEAR;
  const months = listStatsMonths(year);
  const month = months.includes(filter.month) ? filter.month : months[months.length - 1] ?? 'all';
  return { year, month };
}

export function filterHistoryByPeriod(
  rows: HistoryRow[],
  filter: ListenPeriodFilter,
): HistoryRow[] {
  return rows.filter((row) => {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) return false;
    const datePart = listenedAt.slice(0, 7);
    if (datePart.length < 7) return false;
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return false;
    if (year !== filter.year) return false;
    if (filter.month !== 'all' && month !== filter.month) return false;
    return true;
  });
}

export function formatPeriodLabel(filter: ListenPeriodFilter): string {
  if (filter.month === 'all') return `${filter.year}년`;
  return `${filter.year}년 ${filter.month}월`;
}

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

function releaseDateMs(releaseDate: string | null | undefined): number {
  if (!releaseDate?.trim()) return 0;
  const ms = Date.parse(releaseDate.trim());
  return Number.isFinite(ms) ? ms : 0;
}

export function buildAlbumListenRankings(
  albums: Album[],
  historyRows: HistoryRow[],
  limit = LISTEN_RANKING_LIMIT,
): AlbumListenRankItem[] {
  const index = buildListenHistoryIndex(historyRows);
  const albumById = new Map(albums.map((album) => [album.id, album]));
  const items: AlbumListenRankItem[] = [];

  for (const album of albums) {
    const entry = index.get(album.id);
    if (!entry || entry.count <= 0) continue;
    items.push({
      albumId: album.id,
      albumName: album.album_name,
      artist: album.artist,
      coverImageUrl: album.cover_image_url,
      listenCount: entry.count,
    });
  }

  return items
    .sort((a, b) => {
      const byCount = b.listenCount - a.listenCount;
      if (byCount !== 0) return byCount;
      const byReleaseDate =
        releaseDateMs(albumById.get(b.albumId)?.release_date) -
        releaseDateMs(albumById.get(a.albumId)?.release_date);
      if (byReleaseDate !== 0) return byReleaseDate;
      return a.albumName.localeCompare(b.albumName, 'ko') || a.albumId - b.albumId;
    })
    .slice(0, limit);
}

export function buildArtistListenRankings(
  albums: Album[],
  historyRows: HistoryRow[],
  limit = LISTEN_RANKING_LIMIT,
): ArtistListenRankItem[] {
  const index = buildListenHistoryIndex(historyRows);
  const artistMap = new Map<
    string,
    {
      listenCount: number;
      albumCount: number;
      coverImageUrl: string | null;
      bestCount: number;
      latestReleaseDateMs: number;
    }
  >();

  for (const album of albums) {
    const entry = index.get(album.id);
    if (!entry || entry.count <= 0) continue;
    const name = album.artist?.trim();
    if (!name) continue;

    const prev = artistMap.get(name) ?? {
      listenCount: 0,
      albumCount: 0,
      coverImageUrl: null,
      bestCount: 0,
      latestReleaseDateMs: 0,
    };
    const nextListenCount = prev.listenCount + entry.count;
    const useThisCover = entry.count > prev.bestCount;
    artistMap.set(name, {
      listenCount: nextListenCount,
      albumCount: prev.albumCount + 1,
      coverImageUrl: useThisCover ? album.cover_image_url : prev.coverImageUrl,
      bestCount: useThisCover ? entry.count : prev.bestCount,
      latestReleaseDateMs: Math.max(prev.latestReleaseDateMs, releaseDateMs(album.release_date)),
    });
  }

  const ranked = [...artistMap.entries()].map(([artistName, data]) => ({
    artistName,
    listenCount: data.listenCount,
    albumCount: data.albumCount,
    coverImageUrl: data.coverImageUrl,
    latestReleaseDateMs: data.latestReleaseDateMs,
  }));

  ranked.sort((a, b) => {
    const byCount = b.listenCount - a.listenCount;
    if (byCount !== 0) return byCount;
    if (b.latestReleaseDateMs !== a.latestReleaseDateMs) {
      return b.latestReleaseDateMs - a.latestReleaseDateMs;
    }
    return a.artistName.localeCompare(b.artistName, 'ko');
  });

  return ranked
    .slice(0, limit)
    .map(({ artistName, listenCount, albumCount, coverImageUrl }) => ({
      artistName,
      listenCount,
      albumCount,
      coverImageUrl,
    }));
}
