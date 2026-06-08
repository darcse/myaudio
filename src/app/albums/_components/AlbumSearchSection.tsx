/* eslint-disable @next/next/no-img-element */
'use client';

import { Search, X, Calendar, Mic2 } from 'lucide-react';
import type { MusicBrainzSearchItem } from '../types';

const iconClass = 'size-4 opacity-70 shrink-0';

interface AlbumSearchSectionProps {
  query: string;
  setQuery: (v: string) => void;
  albums: MusicBrainzSearchItem[];
  hasSearched: boolean;
  isSearching: boolean;
  totalResults: number;
  currentPage: number;
  itemsPerPage: number;
  mbTotalPages: number;
  onSearch: (page?: number) => void;
  onClearSearch: () => void;
  onManualRegister: () => void;
  onSelectAlbum: (album: MusicBrainzSearchItem) => void;
  isAuthenticated: boolean | null;
  inputBaseClass: string;
}

export function AlbumSearchSection({
  query,
  setQuery,
  albums,
  hasSearched,
  isSearching,
  totalResults,
  currentPage,
  mbTotalPages,
  onSearch,
  onClearSearch,
  onManualRegister,
  onSelectAlbum,
  isAuthenticated,
  inputBaseClass,
}: AlbumSearchSectionProps) {
  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            className={`${inputBaseClass} w-full pr-10`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(1)}
            placeholder="앨범명이나 아티스트를 검색하세요 (예: Queen, Hitsujibungaku)"
          />
          {query && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              onClick={onClearSearch}
              title="검색어 지우기"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn-apple btn-apple-primary h-[42px] px-3 flex items-center justify-center"
          onClick={() => onSearch(1)}
        >
          <Search className="size-4 sm:mr-1" strokeWidth={2} />
          <span className="hidden sm:inline">검색</span>
        </button>
        {isAuthenticated && (
          <button
            type="button"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center"
            onClick={onManualRegister}
          >
            <span className="text-lg leading-none sm:mr-1">＋</span>
            <span className="hidden sm:inline">직접 등록하기</span>
          </button>
        )}
      </div>
      {isSearching && (
        <div className="flex items-center gap-2 mb-4 text-sm opacity-80">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
          <span>검색 중...</span>
        </div>
      )}
      {!isSearching && hasSearched && albums.length === 0 && (
        <p className="text-sm mb-4" style={{ color: '#ff3b30' }}>
          검색 결과가 없습니다.
        </p>
      )}
      {!isSearching && albums.length > 0 && (
        <div className="card-apple mb-8 p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold opacity-90 flex items-center gap-2">
              <Search className={iconClass} /> MusicBrainz 검색 결과 (총 {totalResults.toLocaleString()}건)
            </span>
          </div>
          <ul className="grid gap-2 mb-4">
            {albums.map((album, i) => (
              <li key={album.mbid ?? i} className="card-apple p-4 flex justify-between items-center hover:opacity-95 transition-opacity">
                <div className="flex gap-4 flex-1 pr-4 items-center min-w-0">
                  <img
                    src={album.cover_image_url}
                    alt="커버"
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    style={{ border: '1px solid var(--border)' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                    }}
                  />
                  <div className="w-16 h-16 rounded-lg hidden flex-shrink-0 items-center justify-center text-xs opacity-50" style={{ background: 'var(--badge-bg)' }}>
                    No Cover
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base leading-snug break-words">
                      {album.album_name}{' '}
                      <span className="text-xs font-normal opacity-60">({album.album_type})</span>
                    </h3>
                    <div className="text-sm opacity-80 mt-1 flex flex-wrap gap-x-2">
                      <span className="flex items-center gap-1"><Mic2 className={iconClass} /> {album.artist}</span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <Calendar className={iconClass} />{' '}
                        {album.release_date ? album.release_date.substring(0, 4) : '발매연도 미상'}
                      </span>
                    </div>
                  </div>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    className="btn-apple btn-apple-primary px-4 py-2 flex-shrink-0"
                    onClick={() => onSelectAlbum(album)}
                  >
                    등록
                  </button>
                )}
              </li>
            ))}
          </ul>
          {mbTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 mb-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onSearch(currentPage - 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                &larr; 이전
              </button>
              <span className="text-sm font-semibold opacity-80">
                {currentPage} / {mbTotalPages} 페이지
              </span>
              <button
                type="button"
                disabled={currentPage >= mbTotalPages}
                onClick={() => onSearch(currentPage + 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                다음 &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
