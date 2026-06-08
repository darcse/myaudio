/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { Disc, List, X } from 'lucide-react';
import { genre1Options } from '../constants';
import type { LyricsAlbumCard } from '../lib/album-groups';

type LyricsListProps = {
  paginatedAlbums: LyricsAlbumCard[];
  listSearchQuery: string;
  setListSearchQuery: (v: string) => void;
  listGenreFilter: string;
  setListGenreFilter: (v: string) => void;
  listGenre2Filter: string;
  setListGenre2Filter: (v: string) => void;
  genre2Options: string[];
  listSortOrder: 'created_desc' | 'title_asc';
  setListSortOrder: (v: 'created_desc' | 'title_asc') => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  listCurrentPage: number;
  setListCurrentPage: (v: number) => void;
  totalAlbumCount: number;
  listTotalPages: number;
  isLibraryEmpty: boolean;
  onAlbumOpen: (albumKey: string) => void;
};

export function LyricsList({
  paginatedAlbums,
  listSearchQuery,
  setListSearchQuery,
  listGenreFilter,
  setListGenreFilter,
  listGenre2Filter,
  setListGenre2Filter,
  genre2Options,
  listSortOrder,
  setListSortOrder,
  itemsPerPage,
  setItemsPerPage,
  listCurrentPage,
  setListCurrentPage,
  totalAlbumCount,
  listTotalPages,
  isLibraryEmpty,
  onAlbumOpen,
}: LyricsListProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (itemsPerPage !== 20) setItemsPerPage(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilters = [
    listGenreFilter !== '전체' && {
      key: 'genre1',
      label: `장르1: ${listGenreFilter}`,
      reset: () => setListGenreFilter('전체'),
    },
    listGenre2Filter !== '전체' && {
      key: 'genre2',
      label: `장르2: ${listGenre2Filter}`,
      reset: () => setListGenre2Filter('전체'),
    },
  ].filter(Boolean) as { key: string; label: string; reset: () => void }[];

  const hasActiveFilters = activeFilters.length > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listCurrentPage]);

  return (
    <div className="mt-8 pt-8 border-t-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center mb-2 gap-4 lg:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <h2 className="list-section-title flex items-center gap-2">
            <Disc className="size-5 opacity-80 shrink-0" strokeWidth={1.5} /> My lyrics + Suno
          </h2>
        </div>
        <div className="w-full flex flex-col gap-2 lg:w-auto lg:ml-auto">
          <div className="flex items-center gap-2 justify-between">
            <div className="relative flex-1 min-w-[140px] md:min-w-[170px] lg:flex-none lg:w-[320px]">
              <input
                className="input-apple px-3 py-2 text-sm w-full h-[38px] pr-8"
                placeholder="앨범명, 곡 제목 검색..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
              />
              {listSearchQuery ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setListSearchQuery('')}
                  title="검색어 지우기"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                className="h-[34px] px-4 text-[13px] font-medium inline-flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <span>필터</span>
                {hasActiveFilters ? (
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold leading-none text-white rounded-full tabular-nums"
                    style={{ background: '#0a84ff' }}
                    aria-label={`활성 필터 ${activeFilters.length}개`}
                  >
                    {activeFilters.length}
                  </span>
                ) : null}
              </button>
            </div>
            {hasActiveFilters ? (
              <div className="hidden lg:flex flex-wrap gap-1 justify-end">
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
            ) : null}
          </div>
        </div>
      </div>
      {filtersOpen ? (
        <div className="flex flex-wrap gap-2 w-full lg:flex-1 lg:justify-end items-center mb-4">
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listGenreFilter}
            onChange={(e) => setListGenreFilter(e.target.value)}
          >
            <option value="전체">장르1: 전체</option>
            {genre1Options.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listGenre2Filter}
            onChange={(e) => setListGenre2Filter(e.target.value)}
          >
            <option value="전체">장르2: 전체</option>
            {genre2Options.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listSortOrder}
            onChange={(e) => setListSortOrder(e.target.value as 'created_desc' | 'title_asc')}
          >
            <option value="created_desc">최신 등록순</option>
            <option value="title_asc">제목순</option>
          </select>
          <div className="hidden">
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
              {[15, 20, 30, 60].map((num) => (
                <option key={num} value={num}>
                  {num}개씩 보기
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      <p className="text-sm font-semibold opacity-80 mb-5 flex items-center gap-2">
        <List className="size-4 opacity-70 shrink-0" strokeWidth={1.5} />
        앨범 <span className="link-apple font-semibold">{totalAlbumCount}</span>개
      </p>
      {isLibraryEmpty ? (
        <div className="empty-state-apple text-center py-12">
          <p>등록된 가사가 없습니다.</p>
        </div>
      ) : totalAlbumCount === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>검색·필터 조건에 맞는 앨범이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {paginatedAlbums.map((album) => {
              const hasVibe = (album.vibeColors?.length ?? 0) >= 2;
              return (
              <button
                key={album.key}
                type="button"
                className="group cursor-pointer text-left w-full"
                onClick={() => onAlbumOpen(album.key)}
              >
                <div
                  className="relative aspect-square mb-3 rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{
                    boxShadow: 'var(--shadow)',
                    ...(hasVibe && album.vibeColors && !album.coverUrl
                      ? { background: `linear-gradient(135deg, ${album.vibeColors[0]}, ${album.vibeColors[1]})` }
                      : {}),
                  }}
                >
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : !hasVibe ? (
                    <div
                      className="w-full h-full flex items-center justify-center text-xs opacity-50"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      No Cover
                    </div>
                  ) : null}
                  {hasVibe && album.vibeColors && album.coverUrl ? (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${album.vibeColors[0]}99, ${album.vibeColors[1]}99)`,
                      }}
                    />
                  ) : null}
                  {album.vibeEmoji ? (
                    <span className="absolute top-2 right-2 text-2xl drop-shadow-md" aria-hidden>
                      {album.vibeEmoji}
                    </span>
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="font-bold text-sm leading-tight truncate">{album.displayName}</h3>
                <p className="text-xs opacity-70 mt-1 tabular-nums">{album.trackCount}곡</p>
              </button>
            );
            })}
          </div>
          {listTotalPages > 1 ? (
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
          ) : null}
        </>
      )}
    </div>
  );
}
