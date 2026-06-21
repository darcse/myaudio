/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { Disc, RefreshCw, Sparkles } from 'lucide-react';

type MatchedAlbum = {
  id: number;
  album_name: string;
  artist: string;
  cover_image_url: string | null;
  release_date?: string | null;
};

type HeadfiMatchedAlbumsSectionProps = {
  headfiId: number;
  registeredAlbums: MatchedAlbum[];
  aiRecommendedAlbums: MatchedAlbum[];
  aiRecommendReason: string | null;
  aiRecommendLoading: boolean;
  isAuthenticated: boolean | null;
  onRefreshAiRecommend?: () => void;
  onAlbumClick: (albumId: number) => void;
};

function AlbumGrid({
  albums,
  onAlbumClick,
}: {
  albums: MatchedAlbum[];
  onAlbumClick: (albumId: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {albums.map((album) => (
        <button
          key={album.id}
          type="button"
          onClick={() => onAlbumClick(album.id)}
          className="flex items-center gap-3 rounded-xl p-3 text-left transition-opacity hover:opacity-90"
          style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
        >
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : (
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs opacity-50"
              style={{ background: 'var(--badge-bg)' }}
            >
              No
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{album.album_name}</p>
            <p className="truncate text-xs opacity-60">{album.artist}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function HeadfiMatchedAlbumsSection({
  headfiId,
  registeredAlbums,
  aiRecommendedAlbums,
  aiRecommendReason,
  aiRecommendLoading,
  isAuthenticated,
  onRefreshAiRecommend,
  onAlbumClick,
}: HeadfiMatchedAlbumsSectionProps) {
  const [registeredOpen, setRegisteredOpen] = useState(false);
  const aiReason = aiRecommendReason?.trim() ?? '';

  useEffect(() => {
    setRegisteredOpen(false);
  }, [headfiId]);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold opacity-90">
            <Sparkles className="size-4 shrink-0 opacity-80" aria-hidden />
            AI 추천
          </h3>
          {isAuthenticated === true && onRefreshAiRecommend ? (
            <button
              type="button"
              onClick={onRefreshAiRecommend}
              disabled={aiRecommendLoading}
              className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ color: 'var(--foreground)' }}
              title="AI 추천 다시 생성"
              aria-label="AI 추천 다시 생성"
            >
              <RefreshCw className={`size-4 ${aiRecommendLoading ? 'animate-spin' : ''}`} />
            </button>
          ) : null}
        </div>
        {aiRecommendLoading ? (
          <div className="mb-4 flex flex-col items-center justify-center gap-3 py-6">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--foreground)',
              }}
              aria-hidden
            />
            <p className="text-xs opacity-70">Gemini가 추천 앨범을 분석 중이에요...</p>
          </div>
        ) : aiReason ? (
          <p
            className="mb-4 whitespace-pre-line rounded-xl p-3 text-xs leading-relaxed opacity-80"
            style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
          >
            {aiReason}
          </p>
        ) : null}
        {!aiRecommendLoading && aiRecommendedAlbums.length > 0 ? (
          <AlbumGrid albums={aiRecommendedAlbums} onAlbumClick={onAlbumClick} />
        ) : !aiRecommendLoading ? (
          <p className="text-xs opacity-60">
            AI 추천이 아직 없습니다. 로그인 후 새로고침으로 생성할 수 있습니다.
          </p>
        ) : null}
      </section>

      <section className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setRegisteredOpen((o) => !o)}
          className="mb-3 flex w-full items-center justify-between gap-2 rounded-lg -mx-1 px-1 py-1 text-left transition-opacity hover:opacity-90"
          aria-expanded={registeredOpen}
        >
          <h3 className="flex items-center gap-1.5 text-sm font-semibold opacity-90">
            <Disc className="size-4 shrink-0 opacity-80" aria-hidden />
            등록 앨범
            {registeredAlbums.length > 0 ? (
              <span className="text-[11px] font-normal opacity-50">({registeredAlbums.length})</span>
            ) : null}
          </h3>
          <span className="shrink-0 text-sm opacity-60 tabular-nums">{registeredOpen ? '▴' : '▾'}</span>
        </button>
        {registeredOpen ? (
          registeredAlbums.length === 0 ? (
            <p className="text-xs opacity-60">이 기기를 수동 추천으로 등록한 앨범이 없습니다.</p>
          ) : (
            <AlbumGrid albums={registeredAlbums} onAlbumClick={onAlbumClick} />
          )
        ) : null}
      </section>
    </div>
  );
}
