import type { Album, AlbumFormData } from './types';

export function isClassicGenre(genre1: string | null | undefined): boolean {
  return genre1?.trim() === 'Classic';
}

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
    composer: item.composer ?? '',
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
    owns_cd: Boolean(item.owns_cd),
    owns_lp: Boolean(item.owns_lp),
    owns_cassette: Boolean(item.owns_cassette),
    ...overrides,
  };
}

export const INDIVIDUAL_YEAR_FILTERS = ['2026', '2025'] as const;

export const YEAR_RANGE_FILTERS = [
  { label: '2020 ~ 2024', min: 2020, max: 2024 },
  { label: '2010 ~ 2019', min: 2010, max: 2019 },
  { label: '2000 ~ 2009', min: 2000, max: 2009 },
  { label: '~1999', min: null, max: 1999 },
] as const;

export const ALL_TIME_YEAR_FILTER = 'All Time';
export const ALL_PERIOD_YEAR_FILTER = '기간 전체';
export const UNKNOWN_YEAR_FILTER = '날짜 미상';

export type AlbumLibraryTag = '전체' | 'Popular' | 'Classic' | 'All Time';

export const LIBRARY_TAGS: AlbumLibraryTag[] = ['전체', 'Popular', 'Classic', 'All Time'];

export const ALBUM_PERIOD_FILTER_OPTIONS: string[] = [
  ...INDIVIDUAL_YEAR_FILTERS,
  ...YEAR_RANGE_FILTERS.map((range) => range.label),
  ALL_PERIOD_YEAR_FILTER,
];

const YEAR_FILTER_ORDER = [
  ...INDIVIDUAL_YEAR_FILTERS,
  ...YEAR_RANGE_FILTERS.map((r) => r.label),
  UNKNOWN_YEAR_FILTER,
] as const;

export function isIndividualYearFilter(filter: string): boolean {
  return (INDIVIDUAL_YEAR_FILTERS as readonly string[]).includes(filter);
}

function releaseYearMatchesFilter(y: number, filter: string): boolean {
  if (isIndividualYearFilter(filter)) return String(y) === filter;
  const range = YEAR_RANGE_FILTERS.find((r) => r.label === filter);
  if (!range) return false;
  if (range.label === '~1999') return y <= range.max;
  return y >= range.min! && y <= range.max;
}

function classifyReleaseYear(y: number): (typeof YEAR_FILTER_ORDER)[number] | null {
  if (y === 2026) return '2026';
  if (y === 2025) return '2025';
  if (y >= 2020 && y <= 2024) return '2020 ~ 2024';
  if (y >= 2010 && y <= 2019) return '2010 ~ 2019';
  if (y >= 2000 && y <= 2009) return '2000 ~ 2009';
  if (y <= 1999) return '~1999';
  return null;
}

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
  if (filter === ALL_PERIOD_YEAR_FILTER) return true;
  if (filter === ALL_TIME_YEAR_FILTER) return albumHasAllTimeYear(item.year);
  if (filter === UNKNOWN_YEAR_FILTER) return !item.release_date;
  const y = releaseYearFromAlbum(item);
  return y != null && releaseYearMatchesFilter(y, filter);
}

export function releaseYearFromAlbum(item: Album): number | null {
  if (!item.release_date) return null;
  const y = parseInt(item.release_date.substring(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function albumMatchesYearFilter(item: Album, filter: string): boolean {
  if (!filter) return false;
  if (filter === ALL_PERIOD_YEAR_FILTER) return true;
  if (filter === ALL_TIME_YEAR_FILTER) return albumYearIncludesFilter(item.year, ALL_TIME_YEAR_FILTER);
  if (filter === UNKNOWN_YEAR_FILTER) return !item.release_date;
  const y = releaseYearFromAlbum(item);
  return y != null && releaseYearMatchesFilter(y, filter);
}

export function albumMatchesLibraryTag(item: Album, tag: AlbumLibraryTag): boolean {
  if (tag === '전체') return true;
  if (tag === 'Popular') return !isClassicGenre(item.genre1);
  if (tag === 'Classic') return isClassicGenre(item.genre1);
  return albumHasAllTimeYear(item.year);
}

export function albumMatchesLibraryConditions(
  item: Album,
  yearFilter: string,
  tag: AlbumLibraryTag,
): boolean {
  if (!albumMatchesLibraryTag(item, tag)) return false;
  if (tag === 'All Time') return true;
  return albumMatchesYearFilter(item, yearFilter);
}

export function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url?.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function buildDynamicYearOptions(library: Album[]): string[] {
  const available = new Set<(typeof YEAR_FILTER_ORDER)[number]>();

  library.forEach((a) => {
    if (!a.release_date) {
      available.add(UNKNOWN_YEAR_FILTER);
      return;
    }
    const y = releaseYearFromAlbum(a);
    if (y == null) return;
    const bucket = classifyReleaseYear(y);
    if (bucket) available.add(bucket);
  });

  const options: string[] = YEAR_FILTER_ORDER.filter((label) => available.has(label));
  if (library.length > 0) options.push(ALL_PERIOD_YEAR_FILTER);
  return options;
}
