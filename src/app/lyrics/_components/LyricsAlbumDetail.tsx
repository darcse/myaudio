/* eslint-disable @next/next/no-img-element */
'use client';

import { ArrowLeft, Disc, FileText, Heart, Play } from 'lucide-react';
import type { Lyrics } from '../types';

type LyricsAlbumDetailProps = {
  albumTitle: string;
  tracks: Lyrics[];
  onBack: () => void;
  onLyricsClick: (track: Lyrics) => void;
  onPlayTrack: (track: Lyrics) => void;
  onFavoriteToggle?: (track: Lyrics) => void | Promise<void>;
  favoriteBusyId?: number | null;
};

export function LyricsAlbumDetail({
  albumTitle,
  tracks,
  onBack,
  onLyricsClick,
  onPlayTrack,
  onFavoriteToggle,
  favoriteBusyId,
}: LyricsAlbumDetailProps) {
  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 p-1.5 rounded-lg opacity-85 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="앨범 목록으로 돌아가기"
        >
          <ArrowLeft className="size-5 sm:size-6" strokeWidth={2} />
        </button>
        <h2 className="list-section-title flex items-center gap-2 min-w-0 flex-1">
          <Disc className="size-5 opacity-80 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="truncate">{albumTitle}</span>
        </h2>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p className="opacity-80">이 앨범에 등록된 곡이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--badge-bg)' }}>
          <ul className="space-y-2 sm:space-y-3">
            {tracks.map((t, index) => (
              <li
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
                  <span
                    className="tabular-nums text-sm font-semibold w-8 shrink-0 text-center select-none"
                    style={{ color: 'var(--lyrics-row-accent)' }}
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-[10px]"
                    style={{
                      background: 'var(--badge-bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t.cover_image_url ? (
                      <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-[15px] leading-snug truncate">
                      {t.title}
                    </p>
                    <p
                      className="text-xs sm:text-[13px] truncate mt-0.5 leading-snug"
                      style={{ color: 'var(--lyrics-row-accent)' }}
                    >
                      {[t.genre1, t.genre2].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 sm:self-center">
                  <button
                    type="button"
                    disabled={!t.audio_url?.trim()}
                    title={!t.audio_url?.trim() ? '오디오가 등록되지 않았습니다.' : undefined}
                    onClick={() => onPlayTrack(t)}
                    className="btn-apple btn-apple-secondary h-9 px-3 text-sm inline-flex items-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none"
                  >
                    <Play className="size-4 shrink-0" />
                    재생
                  </button>
                  <button
                    type="button"
                    onClick={() => onLyricsClick(t)}
                    className="btn-apple btn-apple-primary h-9 px-3 text-sm inline-flex items-center gap-1.5"
                  >
                    <FileText className="size-4 shrink-0" />
                    가사
                  </button>
                  {onFavoriteToggle ? (
                    <button
                      type="button"
                      disabled={favoriteBusyId === t.id}
                      onClick={() => onFavoriteToggle(t)}
                      className="p-2 rounded-lg shrink-0 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-45 transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      aria-label={t.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                      title={t.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                    >
                      <Heart
                        className={`size-5 shrink-0 ${
                          t.is_favorite
                            ? 'fill-[var(--favorite-heart)] text-[var(--favorite-heart)]'
                            : 'text-[var(--favorite-heart)] opacity-40'
                        }`}
                        strokeWidth={t.is_favorite ? 0 : 1.75}
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
