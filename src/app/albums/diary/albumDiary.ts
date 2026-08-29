import type { Album } from '@/app/albums/types';
import { buildDiaryDayGradient, buildDiaryDaySoftGradient, collectDiaryDayColors } from '@/lib/albumCoverColors';
import {
  clampListenPeriodFilter,
  filterHistoryByPeriod,
  STATS_EARLY_MONTHS,
  type ListenPeriodFilter,
} from '@/app/albums/stats/albumListenStats';

export type DiaryGearSummary = {
  id: number;
  brand: string;
  model: string;
};

export type DiaryHistoryRow = {
  id: number;
  album_id: number | null;
  listened_at: string | null;
  created_at: string | null;
  captured_at: string | null;
  weather_condition: string | null;
  temperature: number | null;
  impression: string | null;
  dac_amp_id: number | null;
  dac_amp2_id: number | null;
  headphone_id: number | null;
};

export type DiaryListenEntry = {
  id: number;
  albumId: number;
  listenedAt: string;
  createdAt: string | null;
  capturedAt: string | null;
  weatherCondition: string | null;
  temperature: number | null;
  impression: string | null;
  dacAmpId: number | null;
  dacAmp2Id: number | null;
  headphoneId: number | null;
  album: Album | null;
  dacAmp: DiaryGearSummary | null;
  dacAmp2: DiaryGearSummary | null;
  headphone: DiaryGearSummary | null;
};

export type DiaryDaySortOrder = 'desc' | 'asc';

export type DiaryDayGroup = {
  date: string;
  label: string;
  entries: DiaryListenEntry[];
};

function dateLabel(date: string): string {
  const month = Number.parseInt(date.slice(5, 7), 10);
  const day = Number.parseInt(date.slice(8, 10), 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return date;
  return `${month}/${day}`;
}

function createdAtMs(value: string | null): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function buildDiaryDayGroups(
  historyRows: DiaryHistoryRow[],
  albums: Album[],
  gearById: Map<number, DiaryGearSummary>,
  periodFilter: ListenPeriodFilter,
  sortOrder: DiaryDaySortOrder = 'desc',
): DiaryDayGroup[] {
  const filter = clampListenPeriodFilter(periodFilter);
  const albumById = new Map(albums.map((album) => [album.id, album]));
  const filtered = filterHistoryByPeriod(historyRows, filter);
  const ascending = sortOrder === 'asc';

  const entries: DiaryListenEntry[] = [];
  for (const row of filtered) {
    if (row.album_id == null || !row.listened_at) continue;
    const listenedAt = row.listened_at.slice(0, 10);
    if (listenedAt.length < 10) continue;
    entries.push({
      id: row.id,
      albumId: row.album_id,
      listenedAt,
      createdAt: row.created_at,
      capturedAt: row.captured_at,
      weatherCondition: row.weather_condition,
      temperature: row.temperature,
      impression: row.impression,
      dacAmpId: row.dac_amp_id,
      dacAmp2Id: row.dac_amp2_id,
      headphoneId: row.headphone_id,
      album: albumById.get(row.album_id) ?? null,
      dacAmp: row.dac_amp_id != null ? gearById.get(row.dac_amp_id) ?? null : null,
      dacAmp2: row.dac_amp2_id != null ? gearById.get(row.dac_amp2_id) ?? null : null,
      headphone: row.headphone_id != null ? gearById.get(row.headphone_id) ?? null : null,
    });
  }

  entries.sort((a, b) => {
    const byDate = ascending
      ? a.listenedAt.localeCompare(b.listenedAt)
      : b.listenedAt.localeCompare(a.listenedAt);
    if (byDate !== 0) return byDate;
    const byCreated = ascending
      ? createdAtMs(a.createdAt) - createdAtMs(b.createdAt)
      : createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
    if (byCreated !== 0) return byCreated;
    return ascending ? a.id - b.id : b.id - a.id;
  });

  const groups = new Map<string, DiaryListenEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.listenedAt) ?? [];
    list.push(entry);
    groups.set(entry.listenedAt, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (ascending ? a.localeCompare(b) : b.localeCompare(a)))
    .map(([date, dayEntries]) => ({
      date,
      label: dateLabel(date),
      entries: dayEntries,
    }));
}

export function formatDiaryGearLabel(gear: DiaryGearSummary): string {
  return `${gear.brand} ${gear.model}`.trim() || '—';
}

export function getDiaryDayHeaderGradient(entries: DiaryListenEntry[]): string | null {
  return buildDiaryDayGradient(collectDiaryDayColors(entries));
}

export function getDiaryDayCalendarGradient(entries: DiaryListenEntry[]): string | null {
  return buildDiaryDaySoftGradient(collectDiaryDayColors(entries));
}

export type DiaryCalendarCell = {
  date: string | null;
  day: number | null;
  entries: DiaryListenEntry[];
  inMonth: boolean;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function weekdayLabelForDate(date: string): string {
  const day = new Date(`${date}T12:00:00`).getDay();
  return WEEKDAY_LABELS[day] ?? '';
}

export function resolveDiaryCalendarMonth(
  filter: ListenPeriodFilter,
  dayGroups: DiaryDayGroup[],
): number {
  if (typeof filter.month === 'number') return filter.month;
  const latestDate = [...dayGroups].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  if (latestDate) {
    return Number.parseInt(latestDate.slice(5, 7), 10);
  }
  const now = new Date();
  if (filter.month === STATS_EARLY_MONTHS) {
    return filter.year === now.getFullYear() && now.getMonth() + 1 <= 5 ? now.getMonth() + 1 : 5;
  }
  return filter.year === now.getFullYear() ? now.getMonth() + 1 : 12;
}

export function buildEntriesByDate(dayGroups: DiaryDayGroup[]): Map<string, DiaryListenEntry[]> {
  const map = new Map<string, DiaryListenEntry[]>();
  for (const group of dayGroups) {
    map.set(group.date, group.entries);
  }
  return map;
}

export function buildDiaryCalendarGrid(
  year: number,
  month: number,
  entriesByDate: Map<string, DiaryListenEntry[]>,
): DiaryCalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: DiaryCalendarCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ date: null, day: null, entries: [], inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      date,
      day,
      entries: entriesByDate.get(date) ?? [],
      inMonth: true,
    });
  }

  while (cells.length > 0 && cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, entries: [], inMonth: false });
  }

  return cells;
}

export function countUniqueAlbums(entries: DiaryListenEntry[]): number {
  return new Set(entries.map((entry) => entry.albumId)).size;
}

export function pickDayWeatherEntry(entries: DiaryListenEntry[]): DiaryListenEntry | null {
  return entries.find((entry) => entry.weatherCondition || entry.temperature != null) ?? entries[0] ?? null;
}
