'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Album } from '../types';
import { albumMatchesLotteryYearFilter, albumMatchesYearFilter, buildDynamicYearOptions } from '../utils';

const ITEMS_PER_PAGE = 20;

export function useAlbumFilters(library: Album[]) {
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listYearFilter, setListYearFilter] = useState('');
  const [listGenreFilter, setListGenreFilter] = useState('전체');
  const [listCountryFilter, setListCountryFilter] = useState('전체');
  const [listSortOrder, setListSortOrder] = useState('release_desc');
  const [listCurrentPage, setListCurrentPage] = useState(1);

  const dynamicYearOptions = useMemo(() => buildDynamicYearOptions(library), [library]);

  useEffect(() => {
    if (dynamicYearOptions.length === 0) {
      setListYearFilter('');
      return;
    }
    setListYearFilter((prev) => {
      if (prev && dynamicYearOptions.includes(prev)) return prev;
      return dynamicYearOptions[0];
    });
  }, [dynamicYearOptions]);

  useEffect(() => {
    setListCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listSearchQuery, listYearFilter, listGenreFilter, listCountryFilter, listSortOrder]);

  const listFilterCommon = useCallback(
    (item: Album) => {
      const matchesGenre = listGenreFilter === '전체' || item.genre1 === listGenreFilter;
      const matchesCountry = listCountryFilter === '전체' || item.country === listCountryFilter;
      const lowerQuery = listSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !lowerQuery ||
        (item.album_name && item.album_name.toLowerCase().includes(lowerQuery)) ||
        (item.artist && item.artist.toLowerCase().includes(lowerQuery)) ||
        (item.genre2 && item.genre2.toLowerCase().includes(lowerQuery));
      return matchesGenre && matchesCountry && matchesSearch;
    },
    [listGenreFilter, listCountryFilter, listSearchQuery],
  );

  const filteredLibrary = useMemo(
    () =>
      library.filter(
        (item) => albumMatchesYearFilter(item, listYearFilter) && listFilterCommon(item),
      ),
    [library, listYearFilter, listFilterCommon],
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
    listGenreFilter,
    setListGenreFilter,
    listCountryFilter,
    setListCountryFilter,
    listSortOrder,
    setListSortOrder,
    listCurrentPage,
    setListCurrentPage,
    dynamicYearOptions,
    yearLotteryPool,
    paginatedLibrary,
    totalFilteredCount,
    listTotalPages,
  };
}
