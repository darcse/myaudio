import type { Album } from '@/app/albums/types';
import { buildListenHistoryIndex } from '@/app/artists/utils';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';

export const LISTEN_RANKING_LIMIT = 10;
export const GEAR_LISTEN_RANKING_LIMIT = 10;
export const WEEKLY_HOT_ALBUM_LIMIT = 5;
export const WEEKLY_HOT_RECEIVER_LIMIT = 5;
export const LISTEN_TREND_WEEK_COUNT = 12;

export type ListenTrendUnit = 'year' | 'month' | 'week';

export type ListenTrendPoint = {
  key: string;
  label: string;
  count: number;
};

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

export type GearListenHistoryRow = HistoryRow & {
  headphone_id: number | null;
  dac_amp_id?: number | null;
  dac_amp2_id?: number | null;
};

export type GearCategoryFilter = 'all' | '헤드폰' | '이어폰' | '무선 헤드폰' | '무선 이어폰';

export type GearSummary = {
  id: number;
  brand: string;
  model: string;
  category: string;
  image_url: string | null;
};

export type GearListenRankItem = {
  headfiId: number;
  brand: string;
  model: string;
  category: string;
  imageUrl: string | null;
  listenCount: number;
};

export const GEAR_CATEGORY_FILTER_OPTIONS: GearCategoryFilter[] = [
  'all',
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
];

export function gearCategoryFilterLabel(filter: GearCategoryFilter): string {
  if (filter === 'all') return '전체';
  if (filter === '헤드폰') return 'HP';
  if (filter === '이어폰') return 'IEM';
  if (filter === '무선 헤드폰') return 'W-HP';
  if (filter === '무선 이어폰') return 'W-IEM';
  return filter;
}

function matchesGearCategoryFilter(category: string, filter: GearCategoryFilter): boolean {
  if (filter === 'all') {
    return (
      category === '헤드폰' ||
      category === '이어폰' ||
      category === '무선 헤드폰' ||
      category === '무선 이어폰'
    );
  }
  if (filter === '헤드폰') {
    return category === '헤드폰';
  }
  if (filter === '이어폰') {
    return category === '이어폰';
  }
  if (filter === '무선 헤드폰') {
    return category === '무선 헤드폰';
  }
  return category === '무선 이어폰';
}

export function filterGearHistoryByPeriod(
  rows: GearListenHistoryRow[],
  filter: ListenPeriodFilter,
): GearListenHistoryRow[] {
  return filterHistoryByPeriod(rows, filter);
}

export function buildGearListenRankings(
  gearById: Map<number, GearSummary>,
  historyRows: GearListenHistoryRow[],
  categoryFilter: GearCategoryFilter,
  limit = GEAR_LISTEN_RANKING_LIMIT,
): GearListenRankItem[] {
  const counts = new Map<number, number>();

  for (const row of historyRows) {
    const headfiId = row.headphone_id;
    if (headfiId == null) continue;
    const gear = gearById.get(headfiId);
    if (!gear || !matchesGearCategoryFilter(gear.category, categoryFilter)) continue;
    counts.set(headfiId, (counts.get(headfiId) ?? 0) + 1);
  }

  const items: GearListenRankItem[] = [];
  for (const [headfiId, listenCount] of counts.entries()) {
    const gear = gearById.get(headfiId);
    if (!gear) continue;
    items.push({
      headfiId,
      brand: gear.brand,
      model: gear.model,
      category: gear.category,
      imageUrl: gear.image_url,
      listenCount,
    });
  }

  return sortGearListenRankItems(items, limit);
}

function sortGearListenRankItems(items: GearListenRankItem[], limit: number): GearListenRankItem[] {
  return items
    .sort((a, b) => {
      const byCount = b.listenCount - a.listenCount;
      if (byCount !== 0) return byCount;
      const byBrand = a.brand.localeCompare(b.brand, 'ko');
      if (byBrand !== 0) return byBrand;
      return a.model.localeCompare(b.model, 'ko') || a.headfiId - b.headfiId;
    })
    .slice(0, limit);
}

export function buildWeeklyHotReceiverRankings(
  gearById: Map<number, GearSummary>,
  historyRows: GearListenHistoryRow[],
  reference = new Date(),
  limit = WEEKLY_HOT_RECEIVER_LIMIT,
): GearListenRankItem[] {
  const range = getRollingSevenDayRange(reference);
  const filtered = filterHistoryByWeek(historyRows, range) as GearListenHistoryRow[];
  return buildGearListenRankings(gearById, filtered, 'all', limit);
}

export function buildDacAmpListenRankings(
  gearById: Map<number, GearSummary>,
  historyRows: GearListenHistoryRow[],
  limit = GEAR_LISTEN_RANKING_LIMIT,
): GearListenRankItem[] {
  const counts = new Map<number, number>();

  for (const row of historyRows) {
    for (const headfiId of [row.dac_amp_id, row.dac_amp2_id, row.headphone_id]) {
      if (headfiId == null) continue;
      const gear = gearById.get(headfiId);
      if (!gear || !isDacAmpDapCategory(gear.category)) continue;
      counts.set(headfiId, (counts.get(headfiId) ?? 0) + 1);
    }
  }

  const items: GearListenRankItem[] = [];
  for (const [headfiId, listenCount] of counts.entries()) {
    const gear = gearById.get(headfiId);
    if (!gear) continue;
    items.push({
      headfiId,
      brand: gear.brand,
      model: gear.model,
      category: gear.category,
      imageUrl: gear.image_url,
      listenCount,
    });
  }

  return sortGearListenRankItems(items, limit);
}

export const STATS_MIN_YEAR = 2026;
export const STATS_EARLY_MONTHS = '1-5' as const;

export type ListenPeriodMonth = number | 'all' | typeof STATS_EARLY_MONTHS;

export type ListenPeriodFilter = {
  year: number;
  month: ListenPeriodMonth;
};

export function listStatsYears(): number[] {
  const maxYear = Math.max(STATS_MIN_YEAR, new Date().getFullYear());
  const years: number[] = [];
  for (let year = STATS_MIN_YEAR; year <= maxYear; year += 1) {
    years.push(year);
  }
  return years;
}

export function listStatsMonths(year: number): ListenPeriodMonth[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const maxMonth = year === currentYear ? currentMonth : 12;
  const months: ListenPeriodMonth[] = ['all'];
  if (maxMonth >= 1) {
    months.push(STATS_EARLY_MONTHS);
  }
  for (let month = 6; month <= maxMonth; month += 1) {
    months.push(month);
  }
  return months;
}

export function getDefaultListenPeriodFilter(): ListenPeriodFilter {
  const now = new Date();
  const year = Math.max(STATS_MIN_YEAR, now.getFullYear());
  const currentMonth = now.getMonth() + 1;
  const month: ListenPeriodMonth = currentMonth <= 5 ? STATS_EARLY_MONTHS : currentMonth;
  return clampListenPeriodFilter({ year, month });
}

export function clampListenPeriodFilter(filter: ListenPeriodFilter): ListenPeriodFilter {
  const years = listStatsYears();
  const year = years.includes(filter.year) ? filter.year : years[years.length - 1] ?? STATS_MIN_YEAR;
  const months = listStatsMonths(year);
  const month = months.includes(filter.month) ? filter.month : months[months.length - 1] ?? 'all';
  return { year, month };
}

export function filterHistoryByPeriod<T extends HistoryRow>(
  rows: T[],
  filter: ListenPeriodFilter,
): T[] {
  return rows.filter((row) => {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) return false;
    const datePart = listenedAt.slice(0, 7);
    if (datePart.length < 7) return false;
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return false;
    if (year !== filter.year) return false;
    if (filter.month === 'all') return true;
    if (filter.month === STATS_EARLY_MONTHS) return month >= 1 && month <= 5;
    return month === filter.month;
  });
}

export function formatStatsMonthOptionLabel(month: ListenPeriodMonth): string {
  if (month === 'all') return '전체';
  if (month === STATS_EARLY_MONTHS) return '1~5월';
  return `${month}월`;
}

export function formatPeriodLabel(filter: ListenPeriodFilter): string {
  if (filter.month === 'all') return `${filter.year}년`;
  if (filter.month === STATS_EARLY_MONTHS) return `${filter.year}년 1~5월`;
  return `${filter.year}년 ${filter.month}월`;
}

function parseYearMonthFromListenedAt(listenedAt: string): { year: number; month: number } | null {
  const trimmed = listenedAt.trim();
  if (!trimmed) return null;
  const datePart = trimmed.slice(0, 7);
  if (datePart.length < 7) return null;
  const year = parseInt(datePart.slice(0, 4), 10);
  const month = parseInt(datePart.slice(5, 7), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

function getMondayWeekStart(reference: Date): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}

export function buildYearlyListenTrend(
  rows: HistoryRow[],
  reference = new Date(),
): ListenTrendPoint[] {
  const maxYear = Math.max(STATS_MIN_YEAR, reference.getFullYear());
  const counts = new Map<number, number>();
  for (let year = STATS_MIN_YEAR; year <= maxYear; year += 1) {
    counts.set(year, 0);
  }

  for (const row of rows) {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) continue;
    const parts = parseYearMonthFromListenedAt(listenedAt);
    if (!parts || parts.year < STATS_MIN_YEAR || !counts.has(parts.year)) continue;
    counts.set(parts.year, (counts.get(parts.year) ?? 0) + 1);
  }

  return [...counts.entries()].map(([year, count]) => ({
    key: String(year),
    label: String(year),
    count,
  }));
}

export function buildMonthlyListenTrend(rows: HistoryRow[], year: number): ListenTrendPoint[] {
  const counts = new Map<number, number>();
  for (let month = 1; month <= 12; month += 1) {
    counts.set(month, 0);
  }

  for (const row of rows) {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) continue;
    const parts = parseYearMonthFromListenedAt(listenedAt);
    if (!parts || parts.year !== year) continue;
    counts.set(parts.month, (counts.get(parts.month) ?? 0) + 1);
  }

  return [...counts.entries()].map(([month, count]) => ({
    key: `${year}-${month}`,
    label: String(month),
    count,
  }));
}

export function buildWeeklyListenTrend(
  rows: HistoryRow[],
  reference = new Date(),
  weekCount = LISTEN_TREND_WEEK_COUNT,
): ListenTrendPoint[] {
  const currentWeekStart = getMondayWeekStart(reference);
  const buckets: { startMs: number; endMs: number; label: string }[] = [];

  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - offset * 7);
    const endMs = start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1;
    buckets.push({
      startMs: start.getTime(),
      endMs,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
    });
  }

  const counts = buckets.map((bucket) => ({ ...bucket, count: 0 }));

  for (const row of rows) {
    const listenedAt = row.listened_at?.trim();
    if (!listenedAt || row.album_id == null) continue;
    const ms = parseListenedAtMs(listenedAt);
    if (ms == null) continue;
    for (const bucket of counts) {
      if (ms >= bucket.startMs && ms <= bucket.endMs) {
        bucket.count += 1;
        break;
      }
    }
  }

  return counts.map((bucket) => ({
    key: String(bucket.startMs),
    label: bucket.label,
    count: bucket.count,
  }));
}

export function formatListenTrendUnitLabel(unit: ListenTrendUnit): string {
  if (unit === 'year') return '연도';
  if (unit === 'month') return '월';
  return '주';
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
