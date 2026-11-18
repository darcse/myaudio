'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Tag, X } from 'lucide-react';
import { AlbumTagFilterPopover } from '@/app/albums/_components/AlbumTagFilterPopover';
import {
  artistTypeOptionsForCatalog,
  CLASSIC_INSTRUMENT_OPTIONS,
  countryOptions,
  genre2OptionsForGenre1,
  genreOptions,
} from '@/app/albums/constants';
import type { AlbumTagFilterOption } from '@/app/albums/utils';
import type { CatalogScope } from '@/lib/catalogScope';
import {
  ARTIST_SORT_OPTIONS,
  type ArtistSortOption,
  type Genre2Tag,
} from '../_hooks/useArtistFilters';
import { ArtistGenre2TagCloud } from './ArtistGenre2TagCloud';
import type { ArtistLibraryRole } from '../types';

type ArtistTopControlBarProps = {
  role?: ArtistLibraryRole;
  catalogScope?: CatalogScope;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  countryFilter: string;
  setCountryFilter: (value: string) => void;
  eraFilter?: string;
  setEraFilter?: (value: string) => void;
  eraOptions?: string[];
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  genreFilter: string;
  setGenreFilter: (value: string) => void;
  genre2Filter: string;
  setGenre2Filter: (value: string) => void;
  sortOption: ArtistSortOption;
  setSortOption: (value: ArtistSortOption) => void;
  countryOptions: string[];
  typeOptions: string[];
  genreOptions: string[];
  genre2Tags: Genre2Tag[];
  onGenre2TagSelect: (genre: string) => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  tagFilterOptions: AlbumTagFilterOption[];
  instrumentFilter: string;
  setInstrumentFilter: (value: string) => void;
  onResetFilters: () => void;
};

const filterSelectClassName =
  'select-apple h-9 min-w-0 flex-1 appearance-auto truncate rounded-full pl-3 pr-7 text-xs font-medium sm:max-w-[8.5rem] sm:flex-none sm:shrink-0';

const sortSelectClassName =
  'select-apple h-9 min-w-0 flex-1 appearance-auto truncate rounded-full pl-3 pr-7 text-xs font-medium sm:max-w-[8.5rem] sm:flex-none sm:shrink-0';

const artistTagTriggerClassName =
  'select-apple flex h-9 min-w-0 max-w-full items-center justify-between gap-2 truncate rounded-full px-3 text-left text-xs font-medium sm:max-w-[8.5rem] sm:shrink-0';

const formCloudButtonClassName =
  'select-apple flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium';

export function ArtistTopControlBar({
  role = 'artist',
  catalogScope = 'popular',
  searchQuery,
  setSearchQuery,
  countryFilter,
  setCountryFilter,
  eraFilter = '전체',
  setEraFilter,
  eraOptions = [],
  typeFilter,
  setTypeFilter,
  genreFilter,
  setGenreFilter,
  genre2Filter,
  setGenre2Filter,
  sortOption,
  setSortOption,
  countryOptions: dynamicCountries,
  typeOptions: dynamicTypes,
  genreOptions: dynamicGenres,
  genre2Tags,
  onGenre2TagSelect,
  tagFilter,
  setTagFilter,
  tagFilterOptions,
  instrumentFilter,
  setInstrumentFilter,
  onResetFilters,
}: ArtistTopControlBarProps) {
  const isComposer = role === 'composer';
  const isPopular = catalogScope === 'popular';
  const isClassicArtist = catalogScope === 'classic' && !isComposer;
  const [formOpen, setFormOpen] = useState(false);
  const formPopoverRef = useRef<HTMLDivElement>(null);
  const artistTypeOptions = artistTypeOptionsForCatalog(catalogScope);
  const popGenre2Options = isPopular ? genre2OptionsForGenre1(genreFilter) : null;
  const showPopGenre2Filter = isPopular;
  const formCloudLabel = isPopular ? '태그' : '형식';

  const countrySelectOptions =
    countryFilter !== '전체' && !dynamicCountries.includes(countryFilter)
      ? [...dynamicCountries, countryFilter].sort((a, b) => a.localeCompare(b, 'ko'))
      : dynamicCountries;
  const typeSelectOptions = [
    ...artistTypeOptions,
    ...dynamicTypes.filter(
      (type) => !(artistTypeOptions as readonly string[]).includes(type),
    ),
  ];
  const genreSelectOptions =
    dynamicGenres.length > 0
      ? dynamicGenres
      : genreOptions.filter((genre) => catalogScope !== 'popular' || genre !== 'Classic');

  useEffect(() => {
    if (!formOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!formPopoverRef.current?.contains(event.target as Node)) {
        setFormOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [formOpen]);

  useEffect(() => {
    if (!formOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [formOpen]);

  const formActive = genre2Filter !== '전체';

  const handleReset = () => {
    setFormOpen(false);
    onResetFilters();
  };

  const formCloudButton =
    !isPopular && genre2Tags.length > 0 ? (
      <div className="relative shrink-0" ref={formPopoverRef}>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className={formCloudButtonClassName}
          style={{
            background: formActive ? 'var(--foreground)' : 'var(--surface-elevated)',
            color: formActive ? 'var(--background)' : 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
          aria-label={`${formCloudLabel} 필터`}
          aria-expanded={formOpen}
          aria-haspopup="true"
        >
          <Tag className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {formCloudLabel}
        </button>
        {formOpen ? (
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
    ) : null;

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full min-w-0 sm:min-w-[12rem] sm:flex-1 sm:basis-[12rem]">
        <input
          className="input-apple h-9 w-full px-3 py-1.5 pr-8 text-sm"
          placeholder={isComposer ? '작곡가·앨범명 검색...' : '아티스트·앨범명 검색...'}
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
      <div className="flex w-full items-center gap-2 sm:contents">
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
        {isComposer ? (
          <select
            className={filterSelectClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={eraFilter}
            onChange={(e) => setEraFilter?.(e.target.value)}
            aria-label="시대 필터"
            title={eraFilter === '전체' ? '시대 전체' : eraFilter}
          >
            <option value="전체">시대</option>
            {eraOptions.map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>
        ) : (
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
        )}
        {isClassicArtist ? formCloudButton : null}
        {isPopular ? (
          <>
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
            {showPopGenre2Filter ? (
              <select
                className={filterSelectClassName}
                style={{ background: 'var(--surface-elevated)' }}
                value={genre2Filter}
                onChange={(e) => setGenre2Filter(e.target.value)}
                disabled={popGenre2Options == null}
                aria-label="장르2 필터"
                title={
                  popGenre2Options == null
                    ? '장르를 먼저 선택'
                    : genre2Filter === '전체'
                      ? '장르2 전체'
                      : genre2Filter
                }
              >
                <option value="전체">장르2</option>
                {(popGenre2Options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : null}
        {isClassicArtist ? (
          <select
            className={filterSelectClassName}
            style={{ background: 'var(--surface-elevated)' }}
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value)}
            aria-label="대표 악기 필터"
            title={instrumentFilter === '전체' ? '대표 악기 전체' : instrumentFilter}
          >
            <option value="전체">대표 악기</option>
            {CLASSIC_INSTRUMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 sm:contents">
        <select
          className={sortSelectClassName}
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
        {isComposer ? formCloudButton : null}
        {isPopular && tagFilterOptions.length > 0 ? (
          <AlbumTagFilterPopover
            value={tagFilter}
            options={tagFilterOptions}
            onChange={setTagFilter}
            triggerClassName={artistTagTriggerClassName}
            triggerStyle={{ background: 'var(--surface-elevated)' }}
          />
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
    </div>
  );
}
