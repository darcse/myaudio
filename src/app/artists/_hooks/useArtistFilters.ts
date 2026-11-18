'use client';

import { useCallback, useMemo, useState } from 'react';
import { COMPOSER_ERA_OPTIONS } from '@/app/albums/constants';
import {
  albumHasTag,
  buildAlbumTagFilterOptions,
  type AlbumTagFilterOption,
} from '@/app/albums/utils';
import type { ArtistSummary } from '../types';
import { matchesArtistNameSearch } from '../utils';

export type ArtistSortOption = 'nameAsc' | 'nameDesc' | 'albumDesc' | 'albumAsc';

export const ARTIST_SORT_OPTIONS: { value: ArtistSortOption; label: string }[] = [
  { value: 'nameAsc', label: '이름 오름차순 (A→Z)' },
  { value: 'nameDesc', label: '이름 내림차순 (Z→A)' },
  { value: 'albumDesc', label: '앨범 많은 순' },
  { value: 'albumAsc', label: '앨범 적은 순' },
];

function compareComposerEraOptions(a: string, b: string): number {
  const order = COMPOSER_ERA_OPTIONS as readonly string[];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  const aKnown = ia >= 0;
  const bKnown = ib >= 0;
  if (aKnown && bKnown) return ia - ib;
  if (aKnown) return -1;
  if (bKnown) return 1;
  return a.localeCompare(b, 'ko');
}

function sortArtists(artists: ArtistSummary[], sortOption: ArtistSortOption): ArtistSummary[] {
  const sorted = [...artists];
  switch (sortOption) {
    case 'nameDesc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
      break;
    case 'albumDesc':
      sorted.sort(
        (a, b) => b.albumCount - a.albumCount || a.name.localeCompare(b.name, 'ko'),
      );
      break;
    case 'albumAsc':
      sorted.sort(
        (a, b) => a.albumCount - b.albumCount || a.name.localeCompare(b.name, 'ko'),
      );
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  return sorted;
}

export type Genre2Tag = {
  label: string;
  count: number;
};

export function useArtistFilters(summaries: ArtistSummary[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('전체');
  const [typeFilter, setTypeFilter] = useState('전체');
  const [genreFilter, setGenreFilter] = useState('전체');
  const [genre2Filter, setGenre2Filter] = useState('전체');
  const [tagFilter, setTagFilter] = useState('전체');
  const [instrumentFilter, setInstrumentFilter] = useState('전체');
  const [eraFilter, setEraFilter] = useState('전체');
  const [sortOption, setSortOption] = useState<ArtistSortOption>('nameAsc');

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const artist of summaries) {
      if (artist.country?.trim()) set.add(artist.country.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [summaries]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const artist of summaries) {
      if (artist.artistType?.trim()) set.add(artist.artistType.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [summaries]);

  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    for (const artist of summaries) {
      for (const genre of artist.genres) set.add(genre);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [summaries]);

  const eraOptions = useMemo(() => {
    const set = new Set<string>();
    for (const artist of summaries) {
      if (artist.era?.trim()) set.add(artist.era.trim());
    }
    return Array.from(set).sort(compareComposerEraOptions);
  }, [summaries]);

  const genre2Tags = useMemo((): Genre2Tag[] => {
    const counts = new Map<string, number>();
    for (const artist of summaries) {
      const genre2Set = new Set(
        artist.albums
          .map((album) => album.genre2?.trim())
          .filter((genre): genre is string => !!genre),
      );
      for (const genre of genre2Set) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  }, [summaries]);

  const tagFilterOptions = useMemo((): AlbumTagFilterOption[] => {
    const albums = summaries.flatMap((artist) => artist.albums);
    return buildAlbumTagFilterOptions(albums);
  }, [summaries]);

  const handleGenre2TagSelect = (genre: string) => {
    if (genre === '전체') {
      setGenre2Filter('전체');
      return;
    }
    setGenre2Filter((prev) => (prev === genre ? '전체' : genre));
  };

  const handleGenreFilterChange = useCallback((value: string) => {
    setGenreFilter(value);
    setGenre2Filter('전체');
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setCountryFilter('전체');
    setTypeFilter('전체');
    setGenreFilter('전체');
    setGenre2Filter('전체');
    setTagFilter('전체');
    setInstrumentFilter('전체');
    setEraFilter('전체');
    setSortOption('nameAsc');
  }, []);

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = summaries.filter((artist) => {
      if (countryFilter !== '전체' && artist.country !== countryFilter) return false;
      if (eraFilter !== '전체' && artist.era !== eraFilter) return false;
      if (typeFilter !== '전체' && artist.artistType !== typeFilter) return false;
      if (genreFilter !== '전체' && !artist.genres.includes(genreFilter)) return false;
      if (genre2Filter !== '전체') {
        const hasGenre2 = artist.albums.some((album) => album.genre2?.trim() === genre2Filter);
        if (!hasGenre2) return false;
      }
      if (tagFilter !== '전체') {
        const hasTag = artist.albums.some((album) => albumHasTag(album, tagFilter));
        if (!hasTag) return false;
      }
      if (instrumentFilter !== '전체') {
        const hasInstrument = artist.albums.some(
          (album) => album.classic_instrument?.trim() === instrumentFilter,
        );
        if (!hasInstrument) return false;
      }
      if (!q) return true;
      if (matchesArtistNameSearch(q, artist.name, artist.nameAlt)) return true;
      return artist.albums.some(
        (album) =>
          album.album_name?.toLowerCase().includes(q) ||
          album.genre2?.toLowerCase().includes(q),
      );
    });
    return sortArtists(filtered, sortOption);
  }, [
    summaries,
    searchQuery,
    countryFilter,
    eraFilter,
    typeFilter,
    genreFilter,
    genre2Filter,
    tagFilter,
    instrumentFilter,
    sortOption,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    eraFilter,
    setEraFilter,
    eraOptions,
    typeFilter,
    setTypeFilter,
    genreFilter,
    setGenreFilter: handleGenreFilterChange,
    genre2Filter,
    setGenre2Filter,
    genre2Tags,
    handleGenre2TagSelect,
    tagFilter,
    setTagFilter,
    tagFilterOptions,
    instrumentFilter,
    setInstrumentFilter,
    resetFilters,
    sortOption,
    setSortOption,
    countryOptions,
    typeOptions,
    genreOptions,
    filteredArtists,
  };
}
