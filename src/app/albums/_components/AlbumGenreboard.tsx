'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Music } from 'lucide-react';
import type { Album } from '../types';
import {
  BoardCollage,
  BoardExpandedAlbumGrid,
  LibraryViewModeIcons,
  groupAlbumsByGenre1,
  genreCardStyle,
  type LibraryViewMode,
} from './albumBoardShared';

type AlbumGenreboardProps = {
  library: Album[];
  onAlbumClick: (album: Album) => void;
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
};

export function AlbumGenreboard({
  library,
  onAlbumClick,
  viewMode,
  onViewModeChange,
}: AlbumGenreboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const genreQuery = searchParams.get('genre') ?? '';
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);

  const groups = useMemo(() => groupAlbumsByGenre1(library), [library]);

  useEffect(() => {
    if (viewMode !== 'genreboard') {
      setExpandedGenre(null);
      return;
    }
    const raw = genreQuery.trim();
    if (!raw) return;
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const hit = groups.find((x) => x.genre.trim() === decoded.trim());
    if (hit) setExpandedGenre(hit.genre);
  }, [viewMode, groups, genreQuery]);

  const openGenre = useCallback(
    (genre: string) => {
      setExpandedGenre(genre);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('genre', genre);
      router.replace(`/albums?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const clearGenreQuery = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('genre');
    const q = sp.toString();
    router.replace(q ? `/albums?${q}` : '/albums');
  }, [router, searchParams]);

  const expandedAlbums = useMemo(() => {
    if (!expandedGenre) return [];
    const g = groups.find((x) => x.genre === expandedGenre);
    if (!g) return [];
    return [...g.albums].sort(
      (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
    );
  }, [expandedGenre, groups]);

  if (expandedGenre != null) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 gap-y-3 mb-5 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setExpandedGenre(null);
                if (genreQuery.trim()) clearGenreQuery();
              }}
              className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              aria-label="장르보드로 돌아가기"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
            <p className="text-base font-semibold truncate min-w-0" style={{ color: 'var(--foreground)' }}>
              {expandedGenre}
            </p>
          </div>
          <LibraryViewModeIcons viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
        <BoardExpandedAlbumGrid
          albums={expandedAlbums}
          onAlbumClick={onAlbumClick}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0">
        <h2 className="text-base font-bold flex items-center gap-2 shrink-0" style={{ color: 'var(--foreground)' }}>
          <Music className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
          Genreboard
        </h2>
        <LibraryViewModeIcons viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      {library.length === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>등록된 앨범이 없습니다.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>표시할 장르가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g) => (
            <button
              key={g.genre}
              type="button"
              onClick={() => openGenre(g.genre)}
              className="album-mood-card text-left rounded-2xl p-4 overflow-hidden hover:opacity-95"
              style={genreCardStyle(g.genre)}
            >
              <BoardCollage albums={g.albums} />
              <p
                className="text-sm font-extrabold leading-snug truncate mt-3 tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                {g.genre}
              </p>
              <p
                className="text-xs font-semibold mt-1.5 tabular-nums"
                style={{ color: 'var(--foreground)', opacity: 0.9 }}
              >
                {g.albums.length}장
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
