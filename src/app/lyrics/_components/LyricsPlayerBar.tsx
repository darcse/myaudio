/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  FileText,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Lyrics } from '../types';
import { LyricsFavoritePlaylistDrawer } from './LyricsFavoritePlaylistDrawer';

type LyricsPlayerBarProps = {
  track: Lyrics;
  orderedTracks: Lyrics[];
  favoriteDrawerTracks: Lyrics[];
  tryPlayFavoriteFromDrawer: (t: Lyrics) => boolean;
  onUnfavoriteFromDrawer?: (t: Lyrics) => void | Promise<void>;
  drawerUnfavoriteBusyId?: number | null;
  onTrackChange: (t: Lyrics) => void;
  onClose: () => void;
  onOpenLyrics: () => void;
  onFavoriteToggle?: () => void | Promise<void>;
  favoriteBusy?: boolean;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LyricsPlayerBar({
  track,
  orderedTracks,
  favoriteDrawerTracks,
  tryPlayFavoriteFromDrawer,
  onUnfavoriteFromDrawer,
  drawerUnfavoriteBusyId = null,
  onTrackChange,
  onClose,
  onOpenLyrics,
  onFavoriteToggle,
  favoriteBusy = false,
}: LyricsPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeBeforeMuteRef = useRef(1);

  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  /** HTML5 audio.loop — 현재 곡 끝나면 즉시 다시 재생 */
  const [loopOne, setLoopOne] = useState(false);

  /** 한 곡 반복·큐 조회 — ended 핸들러에서 최신값 사용 (effect deps로 오디오 재로드 방지) */
  const loopOneRef = useRef(loopOne);
  loopOneRef.current = loopOne;
  const orderedTracksRef = useRef(orderedTracks);
  orderedTracksRef.current = orderedTracks;

  const idx = orderedTracks.findIndex((t) => t.id === track.id);
  const canPrev = orderedTracks.length > 1 && idx > 0;
  const canNext = orderedTracks.length > 1 && idx >= 0 && idx < orderedTracks.length - 1;

  const albumLabel = track.album?.trim() || '—';
  const fav = Boolean(track.is_favorite);

  const seekFillPct =
    duration > 0 && Number.isFinite(currentTime)
      ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`
      : '0%';

  const volumeFillPct = muted ? '0%' : `${Math.min(100, Math.max(0, volume * 100))}%`;

  const applyVolumeToAudio = useCallback((vol: number, isMuted: boolean) => {
    const el = audioRef.current;
    if (!el) return;
    if (isMuted) {
      el.volume = 0;
      el.muted = true;
    } else {
      el.volume = vol;
      el.muted = false;
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track.audio_url?.trim()) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onDuration = () => {
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (loopOneRef.current) return;
      const list = orderedTracksRef.current;
      const i = list.findIndex((t) => t.id === track.id);
      if (i >= 0 && i < list.length - 1) {
        onTrackChange(list[i + 1]);
        return;
      }
      setIsPlaying(false);
    };

    setCurrentTime(0);
    setDuration(0);
    el.load();
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('durationchange', onDuration);
    el.addEventListener('loadedmetadata', onDuration);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);

    void el.play().catch(() => setIsPlaying(false));

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('durationchange', onDuration);
      el.removeEventListener('loadedmetadata', onDuration);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [track.id, track.audio_url, applyVolumeToAudio, onTrackChange]);

  useEffect(() => {
    applyVolumeToAudio(volume, muted);
  }, [volume, muted, applyVolumeToAudio]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = loopOne;
  }, [loopOne, track.id]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !track.audio_url?.trim()) return;
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(duration) || duration <= 0) return;
    const v = parseFloat(e.target.value);
    el.currentTime = v;
    setCurrentTime(v);
  };

  const handleVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0) setMuted(false);
  };

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      volumeBeforeMuteRef.current = volume > 0 ? volume : volumeBeforeMuteRef.current;
      setVolume(volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 0.5);
    } else {
      volumeBeforeMuteRef.current = volume;
      setMuted(true);
    }
  };

  const hasAudio = Boolean(track.audio_url?.trim());

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] border-t shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* 좌: 썸네일 + 제목 + 앨범 */}
        <div className="flex items-center gap-3 min-w-0 shrink-0 sm:w-[min(100%,240px)]">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-[10px] opacity-50"
            style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
          >
            {track.cover_image_url ? (
              <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              'No'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--foreground)' }}>
              {track.title}
            </p>
            <p className="text-xs truncate opacity-70 mt-0.5 leading-tight">{albumLabel}</p>
          </div>
        </div>

        {/* 중앙: 이전 · 재생/멈춤 · 다음 + 진행바 */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0 w-full">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => canPrev && onTrackChange(orderedTracks[idx - 1])}
              disabled={!canPrev}
              className="p-2 rounded-full opacity-90 disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="이전 곡"
            >
              <SkipBack className="size-5 sm:size-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!hasAudio}
              className="p-2.5 sm:p-3 rounded-full disabled:opacity-40 disabled:pointer-events-none hover:opacity-95 transition-opacity"
              style={{
                background: 'rgba(0,91,193,0.2)',
                color: '#005bc1',
                border: '1px solid rgba(0,91,193,0.25)',
              }}
              aria-label={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
              <Pause className="size-6 sm:size-7" strokeWidth={2} />
            ) : (
              <Play className="size-6 sm:size-7 ml-0.5" strokeWidth={2} fill="currentColor" />
            )}
            </button>
            <button
              type="button"
              onClick={() => canNext && onTrackChange(orderedTracks[idx + 1])}
              disabled={!canNext}
              className="p-2 rounded-full opacity-90 disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="다음 곡"
            >
              <SkipForward className="size-5 sm:size-6" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <span className="text-[11px] sm:text-xs tabular-nums opacity-70 w-9 sm:w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.1}
              value={Number.isFinite(currentTime) ? currentTime : 0}
              onChange={seek}
              disabled={!hasAudio || duration <= 0}
              className="lyrics-player-seek flex-1 min-w-0 disabled:opacity-40"
              style={{ '--seek-pct': seekFillPct } as CSSProperties}
              aria-label="재생 위치"
            />
            <span className="text-[11px] sm:text-xs tabular-nums opacity-70 w-9 sm:w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* 우: 즐겨찾기 · 한 곡 반복 · 가사 · 플레이리스트 · 볼륨 · 닫기 */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 w-full sm:w-auto sm:min-w-[200px]">
          {onFavoriteToggle ? (
            <button
              type="button"
              disabled={favoriteBusy}
              onClick={() => onFavoriteToggle()}
              className="p-2 rounded-lg shrink-0 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-45 transition-colors"
              style={{ color: 'var(--foreground)' }}
              aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
              title={fav ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              <Heart
                className={`size-5 shrink-0 ${
                  fav
                    ? 'fill-[var(--favorite-heart)] text-[var(--favorite-heart)]'
                    : 'text-[var(--favorite-heart)] opacity-40'
                }`}
                strokeWidth={fav ? 0 : 1.75}
                aria-hidden
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setLoopOne((v) => !v)}
            disabled={!hasAudio}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none ${
              loopOne ? 'text-[#005bc1] opacity-100' : 'opacity-70'
            }`}
            aria-label={loopOne ? '한 곡 반복 끄기' : '한 곡 반복 켜기'}
            aria-pressed={loopOne}
            title={loopOne ? '한 곡 반복 끄기' : '한 곡 반복'}
          >
            <Repeat1 className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onOpenLyrics}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="가사 보기"
            title="가사 보기"
          >
            <FileText className="size-5 opacity-90" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setPlaylistOpen(true)}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="플레이리스트"
            title="즐겨찾기 플레이리스트"
          >
            <ListMusic className="size-5 opacity-90" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={muted ? '음소거 해제' : '음소거'}
            title={muted ? '음소거 해제' : '음소거'}
          >
            {muted ? <VolumeX className="size-5 opacity-90" /> : <Volume2 className="size-5 opacity-90" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolumeInput}
            className="lyrics-player-volume w-16 sm:w-24"
            style={{ '--volume-pct': volumeFillPct } as CSSProperties}
            aria-label="볼륨"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="재생바 닫기"
          >
            <X className="size-5 opacity-80" />
          </button>
        </div>
      </div>

      {hasAudio ? (
        <audio ref={audioRef} src={track.audio_url ?? undefined} preload="metadata" className="hidden" />
      ) : null}
      {!hasAudio ? (
        <p className="text-center text-xs opacity-60 pb-2 px-4">재생할 오디오 URL이 없습니다.</p>
      ) : null}

      <LyricsFavoritePlaylistDrawer
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        tracks={favoriteDrawerTracks}
        currentTrackId={track.id}
        onSelectTrack={tryPlayFavoriteFromDrawer}
        onUnfavorite={onUnfavoriteFromDrawer}
        unfavoriteBusyId={drawerUnfavoriteBusyId}
      />
    </div>
  );
}
