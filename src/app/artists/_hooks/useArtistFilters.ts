'use client';

import { useMemo, useState } from 'react';
import type { ArtistSummary } from '../types';

export type ArtistSortOption = 'nameAsc' | 'nameDesc' | 'albumDesc' | 'albumAsc';

export const ARTIST_SORT_OPTIONS: { value: ArtistSortOption; label: string }[] = [
  { value: 'nameAsc', label: '이름 오름차순 (A→Z)' },
  { value: 'nameDesc', label: '이름 내림차순 (Z→A)' },
  { value: 'albumDesc', label: '앨범 많은 순' },
  { value: 'albumAsc', label: '앨범 적은 순' },
];

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

export function useArtistFilters(summaries: ArtistSummary[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('전체');
  const [typeFilter, setTypeFilter] = useState('전체');
  const [genreFilter, setGenreFilter] = useState('전체');
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

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = summaries.filter((artist) => {
      if (countryFilter !== '전체' && artist.country !== countryFilter) return false;
      if (typeFilter !== '전체' && artist.artistType !== typeFilter) return false;
      if (genreFilter !== '전체' && !artist.genres.includes(genreFilter)) return false;
      if (!q) return true;
      if (artist.name.toLowerCase().includes(q)) return true;
      return artist.albums.some((album) => album.album_name?.toLowerCase().includes(q));
    });
    return sortArtists(filtered, sortOption);
  }, [summaries, searchQuery, countryFilter, typeFilter, genreFilter, sortOption]);

  return {
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    typeFilter,
    setTypeFilter,
    genreFilter,
    setGenreFilter,
    sortOption,
    setSortOption,
    countryOptions,
    typeOptions,
    genreOptions,
    filteredArtists,
  };
}
