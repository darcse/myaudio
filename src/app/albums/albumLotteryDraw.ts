import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Album } from './types';
import {
  ALL_GENRE1_FILTER,
  ALL_PERIOD_YEAR_FILTER,
  albumMatchesCatalogLotteryConditions,
  type AlbumLotteryAlbumTypeFilter,
  type AlbumLotteryCatalogTag,
  type CatalogLotteryMatchFilters,
} from './utils';

const SPIN_SELECT = 'id, cover_image_url';
const FILTER_SELECT = 'id, year, genre1, release_date, album_type';

export type CatalogLotteryFilterRow = {
  id: number;
  year: Album['year'];
  genre1: string | null;
  release_date: string | null;
  album_type: string | null;
};

export type CatalogAlbumLotteryFilters = {
  yearFilter?: string;
  tag?: AlbumLotteryCatalogTag;
  genre1Filter?: string;
  albumTypeFilter?: AlbumLotteryAlbumTypeFilter;
  excludeId?: number;
};

export type AlbumLotterySpinCover = {
  id: number;
  cover_image_url: string | null;
};

export type AlbumLotteryDrawResult =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ok'; winner: Album; spinCovers: AlbumLotterySpinCover[] };

export type CatalogLotteryFilterRowsResult =
  | { status: 'ok'; rows: CatalogLotteryFilterRow[] }
  | { status: 'error'; message: string };

export function albumLotteryCoverAsAlbum(cover: AlbumLotterySpinCover): Album {
  return {
    id: cover.id,
    artist: null,
    artist_type: null,
    country: null,
    album_name: '',
    album_type: null,
    release_date: null,
    genre1: null,
    genre2: null,
    cover_image_url: cover.cover_image_url,
    matching1: null,
    matching2: null,
    title_song_url: null,
  };
}

function toCatalogMatchFilters(filters: CatalogAlbumLotteryFilters): CatalogLotteryMatchFilters {
  return {
    yearFilter: filters.yearFilter || ALL_PERIOD_YEAR_FILTER,
    tag: filters.tag ?? '전체',
    genre1Filter: filters.genre1Filter || ALL_GENRE1_FILTER,
    albumTypeFilter: filters.albumTypeFilter ?? '전체',
  };
}

function normalizeFilterRows(rows: unknown[] | null): CatalogLotteryFilterRow[] {
  const normalized: CatalogLotteryFilterRow[] = [];
  for (const row of rows ?? []) {
    const item = row as Partial<CatalogLotteryFilterRow>;
    const id = Number(item.id);
    if (!Number.isFinite(id)) continue;
    normalized.push({
      id,
      year: item.year ?? null,
      genre1: typeof item.genre1 === 'string' ? item.genre1 : null,
      release_date: typeof item.release_date === 'string' ? item.release_date : null,
      album_type: typeof item.album_type === 'string' ? item.album_type : null,
    });
  }
  return normalized;
}

export async function fetchCatalogLotteryFilterRows(): Promise<CatalogLotteryFilterRowsResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('album').select(FILTER_SELECT);
    if (error) return { status: 'error', message: getClientErrorMessage(error) };
    return { status: 'ok', rows: normalizeFilterRows(data) };
  } catch (error) {
    return { status: 'error', message: getClientErrorMessage(error) };
  }
}

export async function fetchCatalogAlbumLotteryDraw(
  filters: CatalogAlbumLotteryFilters = {},
): Promise<AlbumLotteryDrawResult> {
  try {
    const matchFilters = toCatalogMatchFilters(filters);
    const supabase = createClient();
    const { data: filterRows, error: filterError } = await supabase
      .from('album')
      .select(FILTER_SELECT);

    if (filterError) return { status: 'error', message: getClientErrorMessage(filterError) };

    const matchedIds = normalizeFilterRows(filterRows)
      .filter((row) => albumMatchesCatalogLotteryConditions(row as Album, matchFilters))
      .map((row) => row.id);

    const candidateIds =
      filters.excludeId != null && matchedIds.length > 1
        ? matchedIds.filter((id) => id !== filters.excludeId)
        : matchedIds;

    if (candidateIds.length < 1) return { status: 'empty' };

    const winnerId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
    const { data: winnerRows, error: winnerError } = await supabase
      .from('album')
      .select('*')
      .eq('id', winnerId)
      .limit(1);

    if (winnerError) return { status: 'error', message: getClientErrorMessage(winnerError) };
    const winner = (winnerRows?.[0] ?? null) as Album | null;
    if (!winner) return { status: 'error', message: '당첨 앨범을 불러오지 못했습니다.' };

    const spinCount = Math.min(matchedIds.length, 20 + Math.floor(Math.random() * 11));
    const spinIds = new Set<number>([winner.id]);
    const shuffled = [...matchedIds].sort(() => Math.random() - 0.5);
    for (const id of shuffled) {
      if (spinIds.size >= spinCount) break;
      spinIds.add(id);
    }

    const { data: spinRows, error: spinError } = await supabase
      .from('album')
      .select(SPIN_SELECT)
      .in('id', [...spinIds]);

    if (spinError) return { status: 'error', message: getClientErrorMessage(spinError) };

    const spinCovers: AlbumLotterySpinCover[] = (spinRows ?? []).map((row) => ({
      id: Number(row.id),
      cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    }));

    if (!spinCovers.some((cover) => cover.id === winner.id)) {
      spinCovers.push({ id: winner.id, cover_image_url: winner.cover_image_url });
    }

    return { status: 'ok', winner, spinCovers };
  } catch (error) {
    return { status: 'error', message: getClientErrorMessage(error) };
  }
}
