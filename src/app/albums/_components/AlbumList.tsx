/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, LayoutList, List, X } from 'lucide-react';
import { countryOptions, genreOptions } from '../constants';
import type { Album } from '../types';

interface AlbumListProps {
  yearOptions: string[];
  paginatedLibrary: Album[];
  listSearchQuery: string;
  setListSearchQuery: (v: string) => void;
  listYearFilter: string;
  setListYearFilter: (v: string) => void;
  listGenreFilter: string;
  setListGenreFilter: (v: string) => void;
  listCountryFilter: string;
  setListCountryFilter: (v: string) => void;
  listSortOrder: string;
  setListSortOrder: (v: string) => void;
  listCurrentPage: number;
  setListCurrentPage: (v: number) => void;
  totalFilteredCount: number;
  listTotalPages: number;
  onItemClick: (item: Album) => void;
  onGenreLabelClick?: (genre: string) => void;
  onSubGenreLabelClick?: (subGenre: string) => void;
  libraryViewMode?: 'list' | 'moodboard';
  onLibraryViewModeChange?: (mode: 'list' | 'moodboard') => void;
}

export function AlbumList({
  yearOptions,
  paginatedLibrary,
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
  totalFilteredCount,
  listTotalPages,
  onItemClick,
  onGenreLabelClick,
  onSubGenreLabelClick,
  libraryViewMode = 'list',
  onLibraryViewModeChange,
}: AlbumListProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultYearFilter = yearOptions[0] ?? '';

  const activeFilters = [
    defaultYearFilter && listYearFilter !== defaultYearFilter && {
      key: 'year',
      label: `연도: ${listYearFilter}`,
      reset: () => setListYearFilter(defaultYearFilter),
    },
    listGenreFilter !== '전체' && {
      key: 'genre',
      label: `장르: ${listGenreFilter}`,
      reset: () => setListGenreFilter('전체'),
    },
    listCountryFilter !== '전체' && {
      key: 'country',
      label: `국가: ${listCountryFilter}`,
      reset: () => setListCountryFilter('전체'),
    },
  ].filter(Boolean) as { key: string; label: string; reset: () => void }[];

  const hasActiveFilters = activeFilters.length > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listCurrentPage]);

  const activeFilterChips = hasActiveFilters ? (
    <div className="flex flex-wrap gap-1 justify-start lg:justify-end">
      {activeFilters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            f.reset();
          }}
          className="group inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
        >
          <span className="truncate max-w-[120px]">{f.label}</span>
          <X className="size-3 opacity-45 group-hover:opacity-80 transition-opacity" strokeWidth={2} />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start mb-2 gap-4 lg:gap-6">
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <h2 className="list-section-title flex items-center gap-2">
            <List className="size-5 opacity-80 shrink-0" strokeWidth={1.5} /> Albums of the
          </h2>
          <select
            className="select-apple px-3 py-2 text-sm h-[38px] min-w-[8.5rem] disabled:opacity-50"
            value={listYearFilter}
            disabled={yearOptions.length === 0}
            onChange={(e) => {
              setListYearFilter(e.target.value);
              setListCurrentPage(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="연도 필터"
          >
            {yearOptions.length === 0 ? (
              <option value="">등록된 앨범 없음</option>
            ) : (
              yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))
            )}
          </select>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto lg:ml-auto lg:min-w-0">
          {onLibraryViewModeChange && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title="목록 뷰"
                aria-label="목록 뷰"
                onClick={() => onLibraryViewModeChange('list')}
                className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
                style={
                  libraryViewMode === 'list'
                    ? { background: 'var(--foreground)', color: 'var(--background)' }
                    : { background: 'var(--card-bg)', border: '1px solid var(--border)' }
                }
              >
                <LayoutList className="size-[18px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="무드보드 뷰"
                aria-label="무드보드 뷰"
                onClick={() => onLibraryViewModeChange('moodboard')}
                className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
                style={
                  libraryViewMode === 'moodboard'
                    ? { background: 'var(--foreground)', color: 'var(--background)' }
                    : { background: 'var(--card-bg)', border: '1px solid var(--border)' }
                }
              >
                <LayoutGrid className="size-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          )}
          <div className="relative flex-1 min-w-0 lg:w-[320px]">
            <input
              className="input-apple px-3 py-2 text-sm w-full h-[38px] pr-8"
              placeholder="앨범명, 아티스트 검색..."
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
            />
            {listSearchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => setListSearchQuery('')}
                title="검색어 지우기"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="h-[34px] px-4 text-[13px] font-medium inline-flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <span>필터</span>
            {hasActiveFilters && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold leading-none text-white rounded-full tabular-nums"
                style={{ background: '#0a84ff' }}
                aria-label={`활성 필터 ${activeFilters.length}개`}
              >
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
      </div>
      <div
        className={`flex flex-wrap items-start gap-x-4 gap-y-2 mb-3 ${
          filtersOpen || hasActiveFilters ? 'justify-between' : ''
        }`}
      >
        <p className="text-sm font-semibold opacity-80 shrink-0 pt-1.5">
          총 <span className="link-apple font-semibold">{totalFilteredCount}</span>개
        </p>
        {(filtersOpen || hasActiveFilters) && (
          <div className="flex w-full flex-col items-stretch gap-2 lg:ml-auto lg:w-auto lg:items-end">
            {filtersOpen && (
              <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                <select
                  className="select-apple px-3 py-2 text-sm h-[38px]"
                  value={listGenreFilter}
                  onChange={(e) => setListGenreFilter(e.target.value)}
                >
                  <option value="전체">장르: 전체</option>
                  {genreOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  className="select-apple px-3 py-2 text-sm h-[38px]"
                  value={listCountryFilter}
                  onChange={(e) => setListCountryFilter(e.target.value)}
                >
                  <option value="전체">국가: 전체</option>
                  {countryOptions.map((c) => (
                    <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <select
                  className="select-apple px-3 py-2 text-sm h-[38px]"
                  value={listSortOrder}
                  onChange={(e) => setListSortOrder(e.target.value)}
                >
                  <option value="latest">최신 등록순</option>
                  <option value="release_desc">발매일 최신순</option>
                  <option value="release_asc">발매일 과거순</option>
                </select>
              </div>
            )}
            {activeFilterChips}
          </div>
        )}
      </div>

      {totalFilteredCount === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>조건에 맞는 앨범이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8">
            {paginatedLibrary.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <div
                  className="relative aspect-square mb-3 rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{ boxShadow: 'var(--shadow)' }}
                >
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt="앨범 커버"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex items-center justify-center text-xs opacity-50 ${item.cover_image_url ? 'hidden' : ''}`}
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Cover
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm leading-tight truncate flex-1">
                      {item.album_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs opacity-60 truncate">
                    {item.country && (
                      <span>
                        {countryOptions.find((c) => c.name === item.country)?.flag || ''}
                      </span>
                    )}
                    <span className="truncate">{item.artist}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.release_date && (
                      <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full badge-apple">
                        {item.release_date.substring(0, 4)}
                      </span>
                    )}

                    {item.genre1 && (
                      onGenreLabelClick ? (
                        <button
                          type="button"
                          className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full cursor-pointer hover:opacity-90"
                          style={{ background: 'rgba(0,91,193,0.12)', color: '#005bc1' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenreLabelClick(item.genre1!);
                          }}
                        >
                          {item.genre1.toUpperCase()}
                        </button>
                      ) : (
                        <span
                          className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,91,193,0.12)', color: '#005bc1' }}
                        >
                          {item.genre1.toUpperCase()}
                        </span>
                      )
                    )}

                    {item.genre2 && (
                      onSubGenreLabelClick ? (
                        <button
                          type="button"
                          className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full cursor-pointer hover:opacity-90 badge-apple"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSubGenreLabelClick(item.genre2!);
                          }}
                        >
                          {item.genre2}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full badge-apple">
                          {item.genre2}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {listTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                type="button"
                disabled={listCurrentPage === 1}
                onClick={() => setListCurrentPage(listCurrentPage - 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                &larr; 이전
              </button>
              <span className="text-sm font-semibold opacity-80">
                {listCurrentPage} / {listTotalPages} 페이지
              </span>
              <button
                type="button"
                disabled={listCurrentPage === listTotalPages}
                onClick={() => setListCurrentPage(listCurrentPage + 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                다음 &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
