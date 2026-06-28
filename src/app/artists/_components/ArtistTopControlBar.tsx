'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Tag, X } from 'lucide-react';
import { countryOptions, genreOptions } from '@/app/albums/constants';
import {
  ARTIST_SORT_OPTIONS,
  type ArtistSortOption,
  type Genre2Tag,
} from '../_hooks/useArtistFilters';
import { ArtistGenre2TagCloud } from './ArtistGenre2TagCloud';

type ArtistTopControlBarProps = {
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
  genre2Tags: Genre2Tag[];
  genre2Filter: string;
  onGenre2TagSelect: (genre: string) => void;
  onResetFilters: () => void;
};

const artistTypeOptions = ['솔로', '아이돌', '밴드', '걸스 밴드', '그룹', '기타'] as const;

const filterSelectClassName =
  'select-apple h-9 min-w-0 max-w-[8.5rem] shrink-0 appearance-auto truncate rounded-full pl-3 pr-7 text-xs font-medium';

export function ArtistTopControlBar({
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
  genre2Tags,
  genre2Filter,
  onGenre2TagSelect,
  onResetFilters,
}: ArtistTopControlBarProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const tagPopoverRef = useRef<HTMLDivElement>(null);

  const countrySelectOptions =
    dynamicCountries.length > 0
      ? dynamicCountries
      : countryOptions.map((c) => c.name);
  const typeSelectOptions =
    dynamicTypes.length > 0 ? dynamicTypes : [...artistTypeOptions];
  const genreSelectOptions =
    dynamicGenres.length > 0 ? dynamicGenres : [...genreOptions];

  useEffect(() => {
    if (!tagOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!tagPopoverRef.current?.contains(event.target as Node)) {
        setTagOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [tagOpen]);

  useEffect(() => {
    if (!tagOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [tagOpen]);

  const tagActive = genre2Filter !== '전체';

  const handleReset = () => {
    setTagOpen(false);
    onResetFilters();
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[10rem] flex-1 basis-[12rem]">
        <input
          className="input-apple h-9 w-full px-3 py-1.5 pr-8 text-sm"
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
      <select
        className={filterSelectClassName}
        style={{ background: 'var(--surface-elevated)' }}
        value={countryFilter}
        onChange={(e) => setCountryFilter(e.target.value)}
        aria-label="국적 필터"
        title={countryFilter === '전체' ? '국가 전체' : countryFilter}
      >
        <option value="전체">국적</option>
        {countrySelectOptions.map((name) => (
          <option key={name} value={name}>
            {countryOptions.find((c) => c.name === name)?.flag ?? ''} {name}
          </option>
        ))}
      </select>
      <select
        className={filterSelectClassName}
        style={{ background: 'var(--surface-elevated)' }}
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        aria-label="아티스트 타입 필터"
        title={typeFilter === '전체' ? '타입 전체' : typeFilter}
      >
        <option value="전체">타입</option>
        {typeSelectOptions.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select
        className={filterSelectClassName}
        style={{ background: 'var(--surface-elevated)' }}
        value={genreFilter}
        onChange={(e) => setGenreFilter(e.target.value)}
        aria-label="장르 필터"
        title={genreFilter === '전체' ? '장르 전체' : genreFilter}
      >
        <option value="전체">장르</option>
        {genreSelectOptions.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>
      <select
        className={filterSelectClassName}
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
      {genre2Tags.length > 0 ? (
        <div className="relative shrink-0" ref={tagPopoverRef}>
          <button
            type="button"
            onClick={() => setTagOpen((open) => !open)}
            className="btn-apple flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium"
            style={{
              background: tagActive ? 'var(--foreground)' : 'var(--surface-elevated)',
              color: tagActive ? 'var(--background)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
            aria-label="genre2 태그 필터"
            aria-expanded={tagOpen}
            aria-haspopup="true"
          >
            <Tag className="size-3.5" strokeWidth={2} aria-hidden />
            태그
          </button>
          {tagOpen ? (
            <div
              className="absolute right-0 top-full z-30 mt-1.5 w-[min(31.25rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--card-bg)',
              }}
            >
              <div className="max-h-[500px] overflow-y-auto p-3">
                <ArtistGenre2TagCloud
                  tags={genre2Tags}
                  selected={genre2Filter}
                  onSelect={onGenre2TagSelect}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleReset}
        className="btn-apple flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'var(--surface-elevated)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
        aria-label="검색·필터·정렬 초기화"
        title="초기화"
      >
        <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
