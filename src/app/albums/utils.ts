import type {
  Album,
  AlbumComposerFormEntry,
  AlbumComposerStored,
  AlbumFormData,
  AlbumTrack,
} from './types';

export const MAX_ALBUM_COMPOSERS = 6;

export function isClassicGenre(genre1: string | null | undefined): boolean {
  return genre1?.trim() === 'Classic';
}

export type AlbumFormMode = 'pop' | 'classic';

export function albumFormModeFromGenre1(genre1: string | null | undefined): AlbumFormMode {
  return isClassicGenre(genre1) ? 'classic' : 'pop';
}

export function emptyComposerFormEntry(): AlbumComposerFormEntry {
  return { name: '', country: '', era: '', wiki_url: '' };
}

export function emptyAlbumTrack(disc = 1, no = 1): AlbumTrack {
  return { disc, no, title: '', duration_ms: null };
}

export function formatAlbumTrackDuration(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) return '—';
  const totalSec = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function renumberAlbumTracks(tracks: readonly AlbumTrack[]): AlbumTrack[] {
  const counters = new Map<number, number>();
  return tracks.map((track) => {
    const disc = Number.isFinite(track.disc) && track.disc > 0 ? Math.floor(track.disc) : 1;
    const nextNo = (counters.get(disc) ?? 0) + 1;
    counters.set(disc, nextNo);
    return {
      disc,
      no: nextNo,
      title: typeof track.title === 'string' ? track.title : '',
      duration_ms:
        track.duration_ms == null || !Number.isFinite(track.duration_ms) || track.duration_ms < 0
          ? null
          : Math.round(track.duration_ms),
    };
  });
}

export function sanitizeAlbumTracksForSave(tracks: readonly AlbumTrack[] | null | undefined): AlbumTrack[] {
  const cleaned = (tracks ?? [])
    .filter((track) => typeof track.title === 'string' && track.title.trim())
    .map((track) => ({
      disc: Number.isFinite(track.disc) && track.disc > 0 ? Math.floor(track.disc) : 1,
      no: Number.isFinite(track.no) && track.no > 0 ? Math.floor(track.no) : 1,
      title: track.title.trim(),
      duration_ms:
        track.duration_ms == null || !Number.isFinite(track.duration_ms) || track.duration_ms < 0
          ? null
          : Math.round(track.duration_ms),
    }));
  return renumberAlbumTracks(cleaned);
}

export function normalizeAlbumTracksFromDb(value: unknown): AlbumTrack[] {
  if (!Array.isArray(value)) return [];
  const tracks: AlbumTrack[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title : '';
    tracks.push({
      disc:
        typeof row.disc === 'number' && Number.isFinite(row.disc) && row.disc > 0
          ? Math.floor(row.disc)
          : 1,
      no:
        typeof row.no === 'number' && Number.isFinite(row.no) && row.no > 0
          ? Math.floor(row.no)
          : tracks.length + 1,
      title,
      duration_ms:
        typeof row.duration_ms === 'number' && Number.isFinite(row.duration_ms) && row.duration_ms >= 0
          ? Math.round(row.duration_ms)
          : null,
    });
  }
  return renumberAlbumTracks(tracks);
}

export function normalizeComposerNameKey(name: string): string {
  return name.trim().normalize('NFKC').toLocaleLowerCase();
}

export function normalizeAlbumTagKey(tag: string): string {
  return tag.trim().toLocaleLowerCase();
}

export function canonicalizeAlbumTag(
  raw: string,
  knownTags: readonly string[] = [],
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = normalizeAlbumTagKey(trimmed);
  const known = knownTags.find((tag) => normalizeAlbumTagKey(tag) === key);
  return known?.trim() || trimmed;
}

export function sanitizeAlbumTagsForSave(
  tags: readonly string[],
  knownTags: readonly string[] = [],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const canonical = canonicalizeAlbumTag(raw, [...knownTags, ...result]);
    if (!canonical) continue;
    const key = normalizeAlbumTagKey(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);
  }
  return result;
}

export function addAlbumTag(
  current: readonly string[],
  raw: string,
  knownTags: readonly string[] = [],
): string[] {
  return sanitizeAlbumTagsForSave([...current, raw], knownTags);
}

export function collectKnownAlbumTags(
  albums: readonly { tags?: string[] | null }[],
): string[] {
  const byKey = new Map<string, string>();
  for (const album of albums) {
    for (const tag of album.tags ?? []) {
      if (typeof tag !== 'string') continue;
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const key = normalizeAlbumTagKey(trimmed);
      if (!byKey.has(key)) byKey.set(key, trimmed);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function albumHasTag(
  album: { tags?: string[] | null },
  tag: string,
): boolean {
  const target = normalizeAlbumTagKey(tag);
  if (!target) return false;
  return (album.tags ?? []).some(
    (item) => typeof item === 'string' && normalizeAlbumTagKey(item) === target,
  );
}

export type AlbumTagFilterOption = {
  label: string;
  count: number;
};

export function buildAlbumTagFilterOptions(
  albums: readonly { tags?: string[] | null }[],
): AlbumTagFilterOption[] {
  const counts = new Map<string, AlbumTagFilterOption>();
  for (const album of albums) {
    for (const tag of album.tags ?? []) {
      if (typeof tag !== 'string') continue;
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const key = normalizeAlbumTagKey(trimmed);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: trimmed, count: 1 });
      }
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'),
  );
}

export function primaryComposerFieldsFromEntries(
  entries: AlbumComposerFormEntry[],
): Pick<AlbumFormData, 'composer' | 'composer_country' | 'composer_era' | 'composer_wiki_url'> {
  const first = entries.find((entry) => entry.name.trim()) ?? entries[0] ?? emptyComposerFormEntry();
  return {
    composer: first.name,
    composer_country: first.country,
    composer_era: first.era,
    composer_wiki_url: first.wiki_url,
  };
}

function parseStoredComposerEntry(raw: unknown): AlbumComposerFormEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name : '';
  return {
    name,
    country: typeof row.country === 'string' ? row.country : '',
    era: typeof row.era === 'string' ? row.era : '',
    wiki_url: typeof row.wiki_url === 'string' ? row.wiki_url : '',
  };
}

export function composersFromAlbum(
  item: Pick<
    Album,
    'composers' | 'composer' | 'composer_country' | 'composer_era' | 'composer_wiki_url'
  >,
): AlbumComposerFormEntry[] {
  if (Array.isArray(item.composers) && item.composers.length > 0) {
    const parsed = item.composers
      .map(parseStoredComposerEntry)
      .filter((entry): entry is AlbumComposerFormEntry => entry != null)
      .slice(0, MAX_ALBUM_COMPOSERS);
    if (parsed.length > 0) return parsed;
  }
  const legacyName = item.composer?.trim() ?? '';
  if (legacyName) {
    return [
      {
        name: item.composer ?? '',
        country: item.composer_country ?? '',
        era: item.composer_era ?? '',
        wiki_url: item.composer_wiki_url ?? '',
      },
    ];
  }
  return [emptyComposerFormEntry()];
}

export function sanitizeComposersForSave(
  entries: AlbumComposerFormEntry[] | null | undefined,
): AlbumComposerStored[] {
  const out: AlbumComposerStored[] = [];
  const seen = new Set<string>();
  for (const entry of entries ?? []) {
    const name = entry.name.trim();
    if (!name) continue;
    const key = normalizeComposerNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      country: entry.country.trim() || null,
      era: entry.era.trim() || null,
      wiki_url: entry.wiki_url.trim() || null,
    });
    if (out.length >= MAX_ALBUM_COMPOSERS) break;
  }
  return out;
}

export type ComposerComboOption = {
  name: string;
  country: string | null;
  era: string | null;
  wikiUrl: string | null;
};

export type ComposerComboRow = {
  composer: string | null;
  composer_country: string | null;
  composer_era: string | null;
  composer_wiki_url: string | null;
  composers?: AlbumComposerStored[] | null;
  created_at: string | null;
};

function pickModeOrLatest(entries: { value: string; createdAt: string }[]): string | null {
  const filled = entries.filter((entry) => entry.value);
  if (filled.length === 0) return null;
  const counts = new Map<string, number>();
  for (const entry of filled) {
    counts.set(entry.value, (counts.get(entry.value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  let bestCreatedAt = '';
  for (const entry of filled) {
    const count = counts.get(entry.value) ?? 0;
    if (count > bestCount || (count === bestCount && entry.createdAt > bestCreatedAt)) {
      best = entry.value;
      bestCount = count;
      bestCreatedAt = entry.createdAt;
    }
  }
  return best;
}

export function buildComposerComboOptions(rows: ComposerComboRow[]): ComposerComboOption[] {
  type Meta = { country: string; era: string; wiki_url: string; createdAt: string };
  const byName = new Map<string, { displayName: string; metas: Meta[] }>();
  for (const row of rows) {
    const createdAt = row.created_at ?? '';
    for (const entry of composersFromAlbum(row)) {
      const displayName = entry.name.trim();
      if (!displayName) continue;
      const key = normalizeComposerNameKey(displayName);
      if (!key) continue;
      const bucket = byName.get(key) ?? { displayName, metas: [] };
      bucket.metas.push({
        country: entry.country.trim(),
        era: entry.era.trim(),
        wiki_url: entry.wiki_url.trim(),
        createdAt,
      });
      if (!byName.has(key)) byName.set(key, bucket);
    }
  }
  return [...byName.values()]
    .map(({ displayName, metas }) => ({
      name: displayName,
      country: pickModeOrLatest(metas.map((m) => ({ value: m.country, createdAt: m.createdAt }))),
      era: pickModeOrLatest(metas.map((m) => ({ value: m.era, createdAt: m.createdAt }))),
      wikiUrl: pickModeOrLatest(
        metas.map((m) => ({ value: m.wiki_url, createdAt: m.createdAt })),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
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
    tags: sanitizeAlbumTagsForSave(Array.isArray(item.tags) ? item.tags : []),
    classic_instrument: item.classic_instrument ?? '',
    ...(() => {
      const composers = composersFromAlbum(item);
      return { composers, ...primaryComposerFieldsFromEntries(composers) };
    })(),
    cover_image_url: item.cover_image_url ?? '',
    matching1: item.matching1 ?? '',
    matching2: item.matching2 ?? '',
    title_song_url: item.title_song_url ?? '',
    youtube_playlist_id: item.youtube_playlist_id ?? '',
    apple_music_url: item.apple_music_url ?? '',
    tracks: normalizeAlbumTracksFromDb(item.tracks),
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

export type AlbumLibraryTag = '전체' | 'All Time';

export const LIBRARY_TAGS: AlbumLibraryTag[] = ['전체', 'All Time'];

export function parseAlbumLibraryTag(value: unknown): AlbumLibraryTag {
  if (value === 'All Time') return 'All Time';
  return '전체';
}

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
  if (tag === 'All Time') return albumHasAllTimeYear(item.year);
  return true;
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

export type AlbumLotteryCatalogTag = '전체' | 'All Time';

export const LOTTERY_CATALOG_TAGS: AlbumLotteryCatalogTag[] = ['전체', 'All Time'];

export const ALL_GENRE1_FILTER = '전체 장르';

export type AlbumLotteryAlbumTypeFilter = '전체' | '정규' | 'EP' | '정규+EP';

export const LOTTERY_ALBUM_TYPE_FILTER_OPTIONS: {
  value: AlbumLotteryAlbumTypeFilter;
  label: string;
}[] = [
  { value: '전체', label: '전체' },
  { value: '정규', label: '정규' },
  { value: 'EP', label: 'EP' },
  { value: '정규+EP', label: '정규+EP' },
];

export type CatalogLotteryMatchFilters = {
  yearFilter: string;
  tag: AlbumLotteryCatalogTag;
  genre1Filter: string;
  albumTypeFilter: AlbumLotteryAlbumTypeFilter;
};

export function albumMatchesLotteryGenre1(item: Album, genre1Filter: string): boolean {
  if (!genre1Filter || genre1Filter === ALL_GENRE1_FILTER) return true;
  const genre1 = item.genre1?.trim() ?? '';
  if (!genre1) return false;
  return genre1 === genre1Filter;
}

export function albumMatchesLotteryAlbumType(
  item: Album,
  albumTypeFilter: AlbumLotteryAlbumTypeFilter,
): boolean {
  if (albumTypeFilter === '전체') return true;
  const albumType = item.album_type?.trim() ?? '';
  if (!albumType) return false;
  if (albumTypeFilter === '정규') return albumType === 'Album';
  if (albumTypeFilter === 'EP') return albumType === 'EP';
  return albumType === 'Album' || albumType === 'EP';
}

export function albumMatchesCatalogLotteryConditions(
  item: Album,
  filters: CatalogLotteryMatchFilters,
): boolean {
  if (filters.tag === 'All Time') {
    if (!albumHasAllTimeYear(item.year)) return false;
  } else if (!albumMatchesYearFilter(item, filters.yearFilter)) {
    return false;
  }
  if (!albumMatchesLotteryGenre1(item, filters.genre1Filter)) return false;
  if (!albumMatchesLotteryAlbumType(item, filters.albumTypeFilter)) return false;
  return true;
}

export function buildLotteryGenre1Options(
  rows: Pick<Album, 'genre1'>[],
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const genre1 = row.genre1?.trim() ?? '';
    if (!genre1) continue;
    counts.set(genre1, (counts.get(genre1) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'en'));
}

export function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url?.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export type StagePlusUrlParseResult =
  | { status: 'empty'; url: null }
  | { status: 'ok'; url: string }
  | { status: 'invalid'; url: null };

export function normalizeStagePlusUrl(raw: string): StagePlusUrlParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty', url: null };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return { status: 'invalid', url: null };
    const host = url.hostname.toLowerCase();
    if (host !== 'stage-plus.com' && host !== 'www.stage-plus.com') {
      return { status: 'invalid', url: null };
    }
    const params = new URLSearchParams(url.search);
    for (const key of [...params.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) {
        params.delete(key);
      }
    }
    const query = params.toString();
    url.search = query ? `?${query}` : '';
    return { status: 'ok', url: url.toString() };
  } catch {
    return { status: 'invalid', url: null };
  }
}

export type ClassicTitleSongLinkKind = 'Stage+' | 'YouTube' | '링크';

export function resolveClassicTitleSongLink(
  raw: string | null | undefined,
): { href: string; label: ClassicTitleSongLinkKind } | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  const stage = normalizeStagePlusUrl(trimmed);
  if (stage.status === 'ok' && stage.url) {
    return { href: stage.url, label: 'Stage+' };
  }
  if (getYoutubeId(trimmed)) {
    return { href: trimmed, label: 'YouTube' };
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { href: trimmed, label: '링크' };
    }
  } catch {
    return null;
  }
  return null;
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
