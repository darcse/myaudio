'use client';

import { X } from 'lucide-react';
import { countryOptions, genreOptions } from '@/app/albums/constants';
import {
  ARTIST_SORT_OPTIONS,
  type ArtistSortOption,
} from '../_hooks/useArtistFilters';
import type { ArtistSummary } from '../types';

type ArtistListSidebarProps = {
  artists: ArtistSummary[];
  selectedName: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  countryFilter: string;
  setCountryFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  genreFilter: string;
  setGenreFilter: (value: string) => void;
  sortOption: ArtistSortOption;
  setSortOption: (value: ArtistSortOption) => void;
  countryOptions: string[];
  typeOptions: string[];
  genreOptions: string[];
  onSelect: (name: string) => void;
};

const artistTypeOptions = ['솔로', '아이돌', '밴드', '그룹', '기타'] as const;

const filterPillClassName =
  'select-apple h-8 min-w-0 w-full truncate rounded-full px-2.5 py-1 text-[11px] font-medium';

export function ArtistListSidebar({
  artists,
  selectedName,
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
  countryOptions: dynamicCountries,
  typeOptions: dynamicTypes,
  genreOptions: dynamicGenres,
  onSelect,
}: ArtistListSidebarProps) {
  const countrySelectOptions =
    dynamicCountries.length > 0
      ? dynamicCountries
      : countryOptions.map((c) => c.name);
  const typeSelectOptions =
    dynamicTypes.length > 0 ? dynamicTypes : [...artistTypeOptions];
  const genreSelectOptions =
    dynamicGenres.length > 0 ? dynamicGenres : [...genreOptions];

  return (
    <aside
      className="flex h-full max-h-[calc(100dvh-14rem)] min-h-[20rem] flex-col rounded-xl border lg:max-h-[calc(100dvh-6rem)]"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="space-y-2 border-b p-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="relative">
          <input
            className="input-apple w-full px-3 py-2 pr-8 text-sm"
            placeholder="아티스트·앨범명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              aria-label="검색어 지우기"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className={filterPillClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="국적 필터"
            title={countryFilter === '전체' ? '국가 전체' : countryFilter}
          >
            <option value="전체">국가 전체</option>
            {countrySelectOptions.map((name) => (
              <option key={name} value={name}>
                {countryOptions.find((c) => c.name === name)?.flag ?? ''} {name}
              </option>
            ))}
          </select>
          <select
            className={filterPillClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="아티스트 타입 필터"
            title={typeFilter === '전체' ? '타입 전체' : typeFilter}
          >
            <option value="전체">타입 전체</option>
            {typeSelectOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className={filterPillClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            aria-label="장르 필터"
            title={genreFilter === '전체' ? '장르 전체' : genreFilter}
          >
            <option value="전체">장르 전체</option>
            {genreSelectOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <select
            className={filterPillClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as ArtistSortOption)}
            aria-label="정렬"
            title={ARTIST_SORT_OPTIONS.find((item) => item.value === sortOption)?.label}
          >
            {ARTIST_SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {artists.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm opacity-60">표시할 아티스트가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {artists.map((artist) => {
              const active = selectedName === artist.name;
              return (
                <li key={artist.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(artist.name)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: active ? 'var(--badge-bg)' : 'transparent',
                      color: 'var(--foreground)',
                      opacity: active ? 1 : 0.85,
                    }}
                  >
                    <span className="min-w-0 truncate font-medium">{artist.name}</span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums opacity-70"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      {artist.albumCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
