'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Album } from '../types';
import { matchesArtistNameSearch } from '@/app/artists/utils';
import {
  ALL_PERIOD_YEAR_FILTER,
  albumHasTag,
  albumMatchesLibraryTag,
  albumMatchesLotteryYearFilter,
  albumMatchesYearFilter,
  buildAlbumTagFilterOptions,
  buildDynamicYearOptions,
  composersFromAlbum,
  parseAlbumLibraryTag,
} from '../utils';
import type { AlbumLibraryTag } from '../utils';

const ITEMS_PER_PAGE = 20;

export type AlbumMediaFilter = 'all' | 'cd' | 'lp' | 'cassette';
export type { AlbumLibraryTag };

export function useAlbumFilters(
  library: Album[],
  artistNameAltByName: Record<string, string | null> = {},
  options?: {
    disableYearGrouping?: boolean;
    enableLibraryTags?: boolean;
    enableTagFilter?: boolean;
    defaultYearToAllPeriod?: boolean;
  },
) {
  const disableYearGrouping = options?.disableYearGrouping ?? false;
  const enableLibraryTags = options?.enableLibraryTags ?? false;
  const enableTagFilter = options?.enableTagFilter ?? false;
  const defaultYearToAllPeriod = options?.defaultYearToAllPeriod ?? false;
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listYearFilter, setListYearFilter] = useState('');
  const [listLibraryTag, setListLibraryTagState] = useState<AlbumLibraryTag>('전체');
  const [listGenreFilter, setListGenreFilter] = useState('전체');
  const [listInstrumentFilter, setListInstrumentFilter] = useState('전체');
  const [listFormFilter, setListFormFilter] = useState('전체');
  const [listCountryFilter, setListCountryFilter] = useState('전체');
  const [listTagFilter, setListTagFilter] = useState('전체');
  const [listMediaFilter, setListMediaFilter] = useState<AlbumMediaFilter>('all');
  const [listSortOrder, setListSortOrder] = useState('release_desc');
  const [listCurrentPage, setListCurrentPage] = useState(1);

  const setListLibraryTag = useCallback((value: AlbumLibraryTag | string) => {
    setListLibraryTagState(parseAlbumLibraryTag(value));
  }, []);

  const dynamicYearOptions = useMemo(() => buildDynamicYearOptions(library), [library]);
  const tagFilterOptions = useMemo(
    () => (enableTagFilter ? buildAlbumTagFilterOptions(library) : []),
    [enableTagFilter, library],
  );

  useEffect(() => {
    if (disableYearGrouping) {
      setListYearFilter('');
      return;
    }
    if (dynamicYearOptions.length === 0) {
      setListYearFilter('');
      return;
    }
    setListYearFilter((prev) => {
      if (prev && dynamicYearOptions.includes(prev)) return prev;
      if (defaultYearToAllPeriod && dynamicYearOptions.includes(ALL_PERIOD_YEAR_FILTER)) {
        return ALL_PERIOD_YEAR_FILTER;
      }
      return dynamicYearOptions[0];
    });
  }, [dynamicYearOptions, disableYearGrouping, defaultYearToAllPeriod]);

  useEffect(() => {
    setListCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    listSearchQuery,
    listYearFilter,
    listLibraryTag,
    listGenreFilter,
    listInstrumentFilter,
    listFormFilter,
    listCountryFilter,
    listTagFilter,
    listMediaFilter,
    listSortOrder,
  ]);

  const listFilterCommon = useCallback(
    (item: Album) => {
      const matchesGenre = listGenreFilter === '전체' || item.genre1 === listGenreFilter;
      const matchesInstrument =
        listInstrumentFilter === '전체' ||
        (item.classic_instrument?.trim() ?? '') === listInstrumentFilter;
      const matchesForm = listFormFilter === '전체' || (item.genre2?.trim() ?? '') === listFormFilter;
      const matchesCountry = listCountryFilter === '전체' || item.country === listCountryFilter;
      const matchesTagFilter =
        !enableTagFilter ||
        listTagFilter === '전체' ||
        albumHasTag(item, listTagFilter);
      const matchesMedia =
        listMediaFilter === 'all' ||
        (listMediaFilter === 'cd' && Boolean(item.owns_cd)) ||
        (listMediaFilter === 'lp' && Boolean(item.owns_lp)) ||
        (listMediaFilter === 'cassette' && Boolean(item.owns_cassette));
      const lowerQuery = listSearchQuery.toLowerCase().trim();
      const artistName = item.artist?.trim() ?? '';
      const nameAlt = artistName ? (artistNameAltByName[artistName] ?? null) : null;
      const matchesComposer = composersFromAlbum(item).some((entry) =>
        entry.name.trim().toLowerCase().includes(lowerQuery),
      );
      const matchesTagSearch = (item.tags ?? []).some(
        (tag) => typeof tag === 'string' && tag.toLowerCase().includes(lowerQuery),
      );
      const matchesSearch =
        !lowerQuery ||
        (item.album_name && item.album_name.toLowerCase().includes(lowerQuery)) ||
        matchesArtistNameSearch(lowerQuery, artistName, nameAlt) ||
        (item.genre2 && item.genre2.toLowerCase().includes(lowerQuery)) ||
        matchesComposer ||
        matchesTagSearch;
      return (
        matchesGenre &&
        matchesInstrument &&
        matchesForm &&
        matchesCountry &&
        matchesTagFilter &&
        matchesMedia &&
        matchesSearch
      );
    },
    [
      enableTagFilter,
      listGenreFilter,
      listInstrumentFilter,
      listFormFilter,
      listCountryFilter,
      listTagFilter,
      listMediaFilter,
      listSearchQuery,
      artistNameAltByName,
    ],
  );

  const filteredLibrary = useMemo(
    () =>
      library.filter((item) => {
        const matchesTag = !enableLibraryTags || albumMatchesLibraryTag(item, listLibraryTag);
        const matchesYear =
          disableYearGrouping ||
          (enableLibraryTags && listLibraryTag === 'All Time') ||
          albumMatchesYearFilter(item, listYearFilter);
        return matchesTag && matchesYear && listFilterCommon(item);
      }),
    [
      library,
      disableYearGrouping,
      enableLibraryTags,
      listLibraryTag,
      listYearFilter,
      listFilterCommon,
    ],
  );

  const yearLotteryPool = useMemo(
    () => library.filter((item) => albumMatchesLotteryYearFilter(item, listYearFilter)),
    [library, listYearFilter],
  );

  const sortedLibrary = useMemo(
    () =>
      [...filteredLibrary].sort((a, b) => {
        if (listSortOrder === 'release_desc') {
          return (b.release_date || '').localeCompare(a.release_date || '');
        }
        if (listSortOrder === 'release_asc') {
          return (a.release_date || '').localeCompare(b.release_date || '');
        }
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }),
    [filteredLibrary, listSortOrder],
  );

  const totalFilteredCount = sortedLibrary.length;
  const listTotalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE) || 1;
  const listStartIndex = (listCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLibrary = sortedLibrary.slice(listStartIndex, listStartIndex + ITEMS_PER_PAGE);

  return {
    itemsPerPage: ITEMS_PER_PAGE,
    listSearchQuery,
    setListSearchQuery,
    listYearFilter,
    setListYearFilter,
    listLibraryTag,
    setListLibraryTag,
    listGenreFilter,
    setListGenreFilter,
    listInstrumentFilter,
    setListInstrumentFilter,
    listFormFilter,
    setListFormFilter,
    listCountryFilter,
    setListCountryFilter,
    listTagFilter,
    setListTagFilter,
    listMediaFilter,
    setListMediaFilter,
    listSortOrder,
    setListSortOrder,
    listCurrentPage,
    setListCurrentPage,
    dynamicYearOptions,
    tagFilterOptions,
    yearLotteryPool,
    paginatedLibrary,
    totalFilteredCount,
    listTotalPages,
  };
}
