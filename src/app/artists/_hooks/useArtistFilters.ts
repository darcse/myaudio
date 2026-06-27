'use client';

import { useCallback, useMemo, useState } from 'react';
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

  const handleGenre2TagSelect = (genre: string) => {
    if (genre === '전체') {
      setGenre2Filter('전체');
      return;
    }
    setGenre2Filter((prev) => (prev === genre ? '전체' : genre));
  };

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setCountryFilter('전체');
    setTypeFilter('전체');
    setGenreFilter('전체');
    setGenre2Filter('전체');
    setSortOption('nameAsc');
  }, []);

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = summaries.filter((artist) => {
      if (countryFilter !== '전체' && artist.country !== countryFilter) return false;
      if (typeFilter !== '전체' && artist.artistType !== typeFilter) return false;
      if (genreFilter !== '전체' && !artist.genres.includes(genreFilter)) return false;
      if (genre2Filter !== '전체') {
        const hasGenre2 = artist.albums.some((album) => album.genre2?.trim() === genre2Filter);
        if (!hasGenre2) return false;
      }
      if (!q) return true;
      if (artist.name.toLowerCase().includes(q)) return true;
      return artist.albums.some(
        (album) =>
          album.album_name?.toLowerCase().includes(q) ||
          album.genre2?.toLowerCase().includes(q),
      );
    });
    return sortArtists(filtered, sortOption);
  }, [summaries, searchQuery, countryFilter, typeFilter, genreFilter, genre2Filter, sortOption]);

  return {
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    typeFilter,
    setTypeFilter,
    genreFilter,
    setGenreFilter,
    genre2Filter,
    genre2Tags,
    handleGenre2TagSelect,
    resetFilters,
    sortOption,
    setSortOption,
    countryOptions,
    typeOptions,
    genreOptions,
    filteredArtists,
  };
}
