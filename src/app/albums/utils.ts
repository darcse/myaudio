import type { Album } from './types';

export const YEAR_GROUP_CUTOFF = 2024;
export const LEGACY_YEAR_GROUP = '~2023';

export function albumYearIncludesFilter(year: Album['year'], filter: string): boolean {
  if (year == null) return false;
  if (Array.isArray(year)) return year.includes(filter);
  return String(year).trim() === filter;
}

export function albumHasAllTimeYear(year: Album['year']): boolean {
  if (year == null) return false;
  if (Array.isArray(year)) return year.includes('All Time');
  return String(year).trim() === 'All Time';
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
