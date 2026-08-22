/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import type { Lyrics } from '../types';

type LyricsFavoritePlaylistDrawerProps = {
  open: boolean;
  onClose: () => void;
  tracks: Lyrics[];
  currentTrackId: number | null;
  onSelectTrack: (t: Lyrics) => boolean;
  /** 로그인 시: 행에서 즐겨찾기 해제 */
  onUnfavorite?: (t: Lyrics) => void | Promise<void>;
  unfavoriteBusyId?: number | null;
};

export function LyricsFavoritePlaylistDrawer({
  open,
  onClose,
  tracks,
  currentTrackId,
  onSelectTrack,
  onUnfavorite,
  unfavoriteBusyId = null,
}: LyricsFavoritePlaylistDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyrics-fav-playlist-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="플레이리스트 닫기"
        onClick={onClose}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm flex flex-col shadow-xl z-[71]"
        style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border)' }}
      >
        <div
          className="p-4 border-b shrink-0 flex items-start justify-between gap-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0 flex-1">
            <h3 id="lyrics-fav-playlist-title" className="font-semibold text-sm">
              즐겨찾기 플레이리스트
            </h3>
            <p className="text-xs opacity-70 mt-0.5 tabular-nums">{tracks.length}곡</p>
          </div>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg shrink-0 hover:bg-black/5 dark:hover:bg-white/10 -mr-1 -mt-1"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
          >
            <X className="size-5 opacity-90" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {tracks.length === 0 ? (
            <p className="text-sm text-center py-12 px-4 opacity-70">즐겨찾기 곡이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {tracks.map((t, index) => {
                const playable = Boolean(t.audio_url?.trim());
                const active = currentTrackId === t.id;
                const album = t.album?.trim() || '—';
                const num = String(index + 1).padStart(2, '0');
                const busy = unfavoriteBusyId === t.id;
                return (
                  <li key={t.id} className="flex items-stretch gap-1 min-w-0">
                    <span
                      className="w-7 shrink-0 flex items-center justify-center text-xs font-semibold tabular-nums select-none"
                      style={{ color: 'var(--lyrics-row-accent)' }}
                      aria-hidden
                    >
                      {num}
                    </span>
                    <button
                      type="button"
                      disabled={!playable}
                      onClick={() => {
                        const ok = onSelectTrack(t);
                        if (ok) onClose();
                      }}
                      className={`flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                        active ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'
                      } ${!playable ? 'opacity-45 cursor-not-allowed' : ''}`}
                      style={active ? { background: 'var(--badge-bg)' } : undefined}
                    >
                      <div
                        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-[10px] opacity-50"
                        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                      >
                        {t.cover_image_url ? (
                          <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate leading-snug"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {t.title}
                        </p>
                        <p className="text-xs truncate opacity-75 mt-0.5 leading-snug">{album}</p>
                        {!playable ? (
                          <p className="text-[10px] opacity-60 mt-0.5">오디오 없음</p>
                        ) : null}
                      </div>
                    </button>
                    {onUnfavorite ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void onUnfavorite(t);
                        }}
                        className="shrink-0 self-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-45"
                        aria-label={`${t.title} 즐겨찾기 해제`}
                        title="즐겨찾기 해제"
                      >
                        <Heart
                          className="size-5 shrink-0 fill-[var(--favorite-heart)] text-[var(--favorite-heart)]"
                          strokeWidth={0}
                          aria-hidden
                        />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
