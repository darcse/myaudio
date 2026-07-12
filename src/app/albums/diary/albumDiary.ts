import type { Album } from '@/app/albums/types';
import {
  clampListenPeriodFilter,
  filterHistoryByPeriod,
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
