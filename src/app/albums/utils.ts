import type { Album, AlbumFormData } from './types';

function formYearsFromAlbum(year: Album['year']): string[] {
  if (year == null) return ['2026'];
  if (Array.isArray(year)) return year.length > 0 ? [...year] : ['2026'];
  const s = String(year).trim();
  return s ? [s] : ['2026'];
}

export function albumToFormData(item: Album, overrides?: Partial<AlbumFormData>): AlbumFormData {
  const mids = (item.manual_recommended_headphone_ids ?? []).slice(0, 2);
  return {
    artist: item.artist ?? '',
    artist_type: item.artist_type ?? '',
    country: item.country ?? '',
    album_name: item.album_name ?? '',
    album_type: item.album_type ?? '',
    year: formYearsFromAlbum(item.year),
    release_date: item.release_date ?? '',
    genre1: item.genre1 ?? '',
    genre2: item.genre2 ?? '',
    cover_image_url: item.cover_image_url ?? '',
    matching1: item.matching1 ?? '',
    matching2: item.matching2 ?? '',
    title_song_url: item.title_song_url ?? '',
    wiki_url: item.wiki_url ?? '',
    album_intro: item.album_intro ?? '',
    recommended_hp1: mids[0] != null ? String(mids[0]) : '',
    recommended_hp2: mids[1] != null ? String(mids[1]) : '',
    recommended_hp3: '',
    mood_names: Array.isArray(item.mood_names) ? [...item.mood_names] : [],
    ...overrides,
  };
}

export const YEAR_GROUP_CUTOFF = 2024;
export const LEGACY_YEAR_GROUP = '~2023';

export function albumYearIncludesFilter(year: Album['year'], filter: string): boolean {
  if (year == null) return false;
  if (Array.isArray(year)) return year.includes(filter);
  return String(year).trim() === filter;
}

function isAllTimeYearValue(value: string): boolean {
  return value.trim().toLowerCase() === 'all time';
}

export function albumHasAllTimeYear(year: Album['year']): boolean {
  if (year == null) return false;
  if (Array.isArray(year)) return year.some((y) => isAllTimeYearValue(String(y)));
  return isAllTimeYearValue(String(year));
}

export function albumMatchesLotteryYearFilter(item: Album, filter: string): boolean {
  if (!filter) return false;
  if (filter === 'All Time') return albumHasAllTimeYear(item.year);
  if (filter === LEGACY_YEAR_GROUP) {
    if (albumYearIncludesFilter(item.year, filter)) return true;
    const y = releaseYearFromAlbum(item);
    return y != null && y <= 2023;
  }
  return albumYearIncludesFilter(item.year, filter);
}

export function releaseYearFromAlbum(item: Album): number | null {
  if (!item.release_date) return null;
  const y = parseInt(item.release_date.substring(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function albumMatchesYearFilter(item: Album, filter: string): boolean {
  if (!filter) return false;
  if (filter === 'All Time') return albumYearIncludesFilter(item.year, 'All Time');
  if (filter === '날짜 미상') return !item.release_date;
  if (filter === LEGACY_YEAR_GROUP) {
    const y = releaseYearFromAlbum(item);
    return y != null && y <= 2023;
  }
  return item.release_date?.substring(0, 4) === filter;
}

export function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url?.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function buildDynamicYearOptions(library: Album[]): string[] {
  const recentYears = new Set<string>();
  let hasLegacy = false;
  let hasAllTime = false;
  let hasUnknown = false;

  library.forEach((a) => {
    if (albumHasAllTimeYear(a.year)) hasAllTime = true;
    if (!a.release_date) {
      hasUnknown = true;
      return;
    }
    const y = releaseYearFromAlbum(a);
    if (y == null) return;
    if (y >= YEAR_GROUP_CUTOFF) {
      recentYears.add(String(y));
    } else {
      hasLegacy = true;
    }
  });

  const sortedRecent = [...recentYears].sort((a, b) => b.localeCompare(a));
  return [
    ...sortedRecent,
    ...(hasLegacy ? [LEGACY_YEAR_GROUP] : []),
    ...(hasAllTime ? ['All Time'] : []),
    ...(hasUnknown ? ['날짜 미상'] : []),
  ];
}
