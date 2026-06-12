/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Disc } from 'lucide-react';

type MatchedAlbum = {
  id: number;
  album_name: string;
  artist: string;
  cover_image_url: string | null;
  release_date?: string | null;
};

type HeadfiMatchedAlbumsSectionProps = {
  headfiId: number;
  matchedAlbums: MatchedAlbum[];
  onClose: () => void;
};

export function HeadfiMatchedAlbumsSection({
  headfiId,
  matchedAlbums,
  onClose,
}: HeadfiMatchedAlbumsSectionProps) {
  const [albumsOpen, setAlbumsOpen] = useState(false);

  useEffect(() => {
    setAlbumsOpen(false);
  }, [headfiId]);

  if (matchedAlbums.length === 0) return null;

  return (
    <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setAlbumsOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left mb-3 rounded-lg -mx-1 px-1 py-1 hover:opacity-90 transition-opacity"
        aria-expanded={albumsOpen}
      >
        <strong className="text-sm flex items-center gap-1.5 font-semibold opacity-90">
          <Disc className="size-4 opacity-80 shrink-0" aria-hidden />
          추천 앨범
        </strong>
        <span className="text-sm opacity-60 tabular-nums shrink-0">{albumsOpen ? '▴' : '▾'}</span>
      </button>
      {albumsOpen ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {matchedAlbums.map((album) => (
            <Link
              key={album.id}
              href={`/albums?view=${album.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              onClick={onClose}
            >
              {album.cover_image_url ? (
                <img
                  src={album.cover_image_url}
                  alt=""
                  className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                  style={{ border: '1px solid var(--border)' }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xs opacity-50"
                  style={{ background: 'var(--badge-bg)' }}
                >
                  No
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{album.album_name}</p>
                <p className="text-xs opacity-60 truncate">{album.artist}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
