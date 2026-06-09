/* eslint-disable @next/next/no-img-element */
'use client';

import type { CSSProperties } from 'react';
import { LayoutGrid, LayoutList, Music } from 'lucide-react';
import type { Album } from '../types';
import { albumHasAllTimeYear, releaseYearFromAlbum } from '../utils';
import { getMoodGradientPair, hexToRgba } from '../moodGradient';

export type LibraryViewMode = 'list' | 'moodboard' | 'genreboard';

const coverBadgeStyle = {
  background: '#2F3440',
  color: '#EAEAF0',
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
} as const;

export function albumCoverBadges(album: Album): string[] {
  const badges: string[] = [];
  const releaseYear = releaseYearFromAlbum(album);
  if (releaseYear != null) badges.push(String(releaseYear));
  if (albumHasAllTimeYear(album.year)) badges.push('All Time');
  return badges;
}

export function BoardCollage({ albums }: { albums: Album[] }) {
  const slots = Array.from({ length: 6 }, (_, i) => albums[i] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1 mb-3 w-full aspect-[3/2]">
      {slots.map((item, i) => (
        <div
          key={i}
          className="relative rounded-md overflow-hidden min-h-0"
          style={{ background: 'var(--badge-bg)' }}
        >
          {item?.cover_image_url ? (
            <img src={item.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">—</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function BoardExpandedAlbumGrid({
  albums,
  onAlbumClick,
}: {
  albums: Album[];
  onAlbumClick: (album: Album) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {albums.map((item) => {
        const badges = albumCoverBadges(item);
        return (
        <button
          key={item.id}
          type="button"
          className="group text-left w-full"
          onClick={() => onAlbumClick(item)}
        >
          <div
            className="relative aspect-square mb-2 rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            {badges.length > 0 ? (
              <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1.5">
                {badges.map((label) => (
                  <span
                    key={label}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
                    style={coverBadgeStyle}
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            {item.cover_image_url ? (
              <img src={item.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs opacity-45"
                style={{ background: 'var(--badge-bg)' }}
              >
                No Cover
              </div>
            )}
          </div>
          <p className="font-bold text-sm leading-tight line-clamp-2">{item.album_name}</p>
          <p className="text-xs opacity-60 truncate mt-0.5">{item.artist ?? ''}</p>
        </button>
        );
      })}
    </div>
  );
}

export function LibraryViewModeIcons({
  viewMode,
  onViewModeChange,
}: {
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
}) {
  const iconBtn = (
    mode: LibraryViewMode,
    Icon: typeof LayoutList,
    label: string,
  ) => (
    <button
      key={mode}
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onViewModeChange(mode)}
      className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
      style={
        viewMode === mode
          ? { background: 'var(--foreground)', color: 'var(--background)' }
          : { background: 'var(--card-bg)', border: '1px solid var(--border)' }
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
  return (
    <div className="flex items-center gap-1 shrink-0">
      {iconBtn('list', LayoutList, '목록 뷰')}
      {iconBtn('moodboard', LayoutGrid, '무드보드 뷰')}
      {iconBtn('genreboard', Music, '장르보드 뷰')}
    </div>
  );
}

export function genreCardStyle(genreName: string): CSSProperties {
  const pair = getMoodGradientPair(genreName);
  return {
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: `linear-gradient(135deg, ${hexToRgba(pair.a, 0.28)}, ${hexToRgba(pair.b, 0.28)})`,
    border: '1px solid var(--border)',
  };
}

export const UNCLASSIFIED_GENRE = '미분류';

export function groupAlbumsByGenre1(library: Album[]): { genre: string; albums: Album[] }[] {
  const map = new Map<string, Album[]>();
  for (const album of library) {
    const key = album.genre1?.trim() || UNCLASSIFIED_GENRE;
    const list = map.get(key);
    if (list) list.push(album);
    else map.set(key, [album]);
  }
  return Array.from(map.entries())
    .map(([genre, albums]) => ({ genre, albums }))
    .filter((g) => g.albums.length > 0)
    .sort((a, b) => b.albums.length - a.albums.length || a.genre.localeCompare(b.genre, 'ko'));
}
