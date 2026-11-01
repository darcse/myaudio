'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAlbumPlayer } from '@/contexts/AlbumPlayerContext';
import {
  applyYoutubeReferrerPolicy,
  createYoutubePlaylistIframe,
  isYoutubePlayerReady,
  loadYoutubeIframeApi,
  YT_PLAYER_STATE,
  type YoutubePlayer,
} from '@/lib/youtubeIframeApi';
import { youtubePlaylistOpenUrl } from '@/lib/youtubePlaylist';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function GlobalAlbumPlayer() {
  const { current, session, expanded, close, setExpanded } = useAlbumPlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const skippedRef = useRef(new Set<string>());
  const emptyCheckTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackCount, setTrackCount] = useState(0);
  const [fatalError, setFatalError] = useState(false);

  const syncProgress = useCallback((player: YoutubePlayer) => {
    if (!isYoutubePlayerReady(player)) return;
    try {
      const time = player.getCurrentTime();
      const length = player.getDuration();
      const playlist = player.getPlaylist();
      setCurrentTime(Number.isFinite(time) ? time : 0);
      setDuration(Number.isFinite(length) ? length : 0);
      setTrackIndex(player.getPlaylistIndex() + 1);
      setTrackCount(playlist?.length ?? 0);
    } catch {
    }
  }, []);

  const resizePlayer = useCallback(() => {
    const host = hostRef.current;
    const player = playerRef.current;
    if (!host || !isYoutubePlayerReady(player) || typeof player.setSize !== 'function') return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    try {
      player.setSize(width, height);
    } catch {
    }
  }, []);

  const clearEmptyCheckTimer = useCallback(() => {
    if (emptyCheckTimerRef.current == null) return;
    window.clearTimeout(emptyCheckTimerRef.current);
    emptyCheckTimerRef.current = null;
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current == null) return;
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }, []);

  const startProgressTimer = useCallback(() => {
    stopProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      if (!readyRef.current) return;
      const player = playerRef.current;
      if (!isYoutubePlayerReady(player)) return;
      syncProgress(player);
    }, 250);
  }, [stopProgressTimer, syncProgress]);

  const teardownPlayer = useCallback(() => {
    stopProgressTimer();
    readyRef.current = false;
    clearEmptyCheckTimer();
    try {
      playerRef.current?.destroy();
    } catch {
    }
    playerRef.current = null;
    skippedRef.current = new Set();
    hostRef.current?.replaceChildren();
  }, [clearEmptyCheckTimer, stopProgressTimer]);

  useEffect(() => {
    if (!current) {
      teardownPlayer();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setTrackIndex(0);
      setTrackCount(0);
      setFatalError(false);
      return;
    }

    clearEmptyCheckTimer();
    let cancelled = false;
    skippedRef.current = new Set();
    setFatalError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTrackIndex(1);
    setTrackCount(0);

    const existing = playerRef.current;
    if (isYoutubePlayerReady(existing)) {
      try {
        existing.loadPlaylist({ list: current.playlistId, listType: 'playlist', index: 0 });
        existing.playVideo();
        applyYoutubeReferrerPolicy(existing, hostRef.current ?? document.body);
      } catch {
        setFatalError(true);
      }
      return;
    }

    readyRef.current = false;
    stopProgressTimer();
    playerRef.current = null;

    const host = hostRef.current;
    if (!host) return;

    void loadYoutubeIframeApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        const iframe = createYoutubePlaylistIframe(current.playlistId);
        hostRef.current.replaceChildren(iframe);
        new api.Player(iframe, {
          events: {
            onReady: (event) => {
              if (cancelled) return;
              applyYoutubeReferrerPolicy(event.target, hostRef.current ?? host);
              playerRef.current = event.target;
              readyRef.current = true;
              resizePlayer();
              event.target.playVideo();
              syncProgress(event.target);
              startProgressTimer();
              const playlist = typeof event.target.getPlaylist === 'function' ? event.target.getPlaylist() : undefined;
              if (!playlist || playlist.length === 0) {
                emptyCheckTimerRef.current = window.setTimeout(() => {
                  emptyCheckTimerRef.current = null;
                  if (!isYoutubePlayerReady(event.target)) return;
                  const later = event.target.getPlaylist();
                  if (!later || later.length === 0) setFatalError(true);
                }, 1500);
              }
            },
            onStateChange: (event) => {
              if (!isYoutubePlayerReady(event.target)) return;
              setIsPlaying(event.data === YT_PLAYER_STATE.PLAYING);
              syncProgress(event.target);
              if (event.data === YT_PLAYER_STATE.ENDED) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              if (!isYoutubePlayerReady(event.target)) {
                setFatalError(true);
                return;
              }
              const embedBlocked = event.data === 101 || event.data === 150;
              if (embedBlocked) {
                const playlist = event.target.getPlaylist() ?? [];
                const index = event.target.getPlaylistIndex();
                const videoId = playlist[index];
                if (videoId) skippedRef.current.add(videoId);
                toast.error('이 곡은 임베드가 차단되어 다음 곡으로 넘어갑니다.');
                if (playlist.length > 0 && skippedRef.current.size >= playlist.length) {
                  setFatalError(true);
                  event.target.pauseVideo();
                  return;
                }
                event.target.nextVideo();
                return;
              }
              setFatalError(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFatalError(true);
      });

    return () => {
      cancelled = true;
      clearEmptyCheckTimer();
    };
  }, [current, session, resizePlayer, syncProgress, teardownPlayer, clearEmptyCheckTimer, stopProgressTimer, startProgressTimer]);

  useEffect(() => {
    if (!current) return;
    resizePlayer();
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => resizePlayer());
    observer.observe(host);
    return () => observer.disconnect();
  }, [current, expanded, resizePlayer]);

  useEffect(() => {
    return () => {
      teardownPlayer();
    };
  }, [teardownPlayer]);

  useEffect(() => {
    if (!expanded) return;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [expanded]);

  if (!current) return null;

  const seekFillPct =
    duration > 0 && Number.isFinite(currentTime)
      ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`
      : '0%';
  const trackLabel = trackCount > 0 ? `${trackIndex} / ${trackCount}` : '—';
  const openUrl = youtubePlaylistOpenUrl(current.playlistId);

  const callPlayer = (fn: (player: YoutubePlayer) => void) => {
    const player = playerRef.current;
    if (!readyRef.current || !isYoutubePlayerReady(player) || fatalError) return;
    try {
      fn(player);
    } catch {
    }
  };

  const togglePlay = () => {
    callPlayer((player) => {
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    });
  };

  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    if (duration <= 0) return;
    const next = parseFloat(event.target.value);
    callPlayer((player) => {
      player.seekTo(next, true);
      setCurrentTime(next);
    });
  };

  const playerBoxClass = expanded
    ? 'aspect-video w-full overflow-hidden rounded-xl bg-black'
    : 'size-12 shrink-0 overflow-hidden rounded-lg bg-black sm:size-14';

  const controls = (
    <>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => callPlayer((player) => player.previousVideo())}
          disabled={fatalError || trackIndex <= 1}
          className="rounded-full p-2 opacity-90 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10"
          aria-label="이전 곡"
        >
          <SkipBack className="size-5 sm:size-6" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={fatalError}
          className="rounded-full p-2.5 transition-opacity hover:opacity-95 disabled:pointer-events-none disabled:opacity-40 sm:p-3"
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
            <Play className="size-6 sm:size-7 ml-0.5 fill-current" strokeWidth={2} />
          )}
        </button>
        <button
          type="button"
          onClick={() => callPlayer((player) => player.nextVideo())}
          disabled={fatalError || (trackCount > 0 && trackIndex >= trackCount)}
          className="rounded-full p-2 opacity-90 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10"
          aria-label="다음 곡"
        >
          <SkipForward className="size-5 sm:size-6" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex w-full max-w-xl items-center gap-2">
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums opacity-70 sm:w-10 sm:text-xs">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={0.1}
          value={Number.isFinite(currentTime) ? currentTime : 0}
          onChange={seek}
          disabled={fatalError || duration <= 0}
          className="lyrics-player-seek min-w-0 flex-1 disabled:opacity-40"
          style={{ '--seek-pct': seekFillPct } as CSSProperties}
          aria-label="재생 위치"
        />
        <span className="w-9 shrink-0 text-[11px] tabular-nums opacity-70 sm:w-10 sm:text-xs">
          {formatTime(duration)}
        </span>
      </div>
    </>
  );

  return (
    <>
      {expanded ? <div className="fixed inset-0 z-[80] bg-black/45" onClick={() => setExpanded(false)} /> : null}
      <div
        className={
          expanded
            ? 'fixed inset-0 z-[81] flex items-center justify-center p-4'
            : 'fixed bottom-0 left-0 right-0 z-[60] border-t shadow-[0_-4px_24px_rgba(0,0,0,0.08)]'
        }
        style={
          expanded
            ? undefined
            : { borderColor: 'var(--border)', background: 'var(--card-bg)' }
        }
      >
        <div
          className={
            expanded
              ? 'modal-panel-apple flex max-h-[min(90dvh,56rem)] w-full max-w-3xl flex-col gap-4 overflow-y-auto p-4 sm:p-6'
              : 'mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4'
          }
          onClick={expanded ? (event) => event.stopPropagation() : undefined}
        >
          <div className={expanded ? 'flex min-w-0 flex-col gap-3' : 'flex min-w-0 shrink-0 items-center gap-3 sm:w-[min(100%,280px)]'}>
            <div className={playerBoxClass}>
              <div ref={hostRef} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                {current.albumName}
              </p>
              <p className="mt-0.5 truncate text-xs leading-tight opacity-70">{current.artist || '—'}</p>
              <p className="mt-0.5 text-[11px] tabular-nums opacity-60">{trackLabel}</p>
            </div>
          </div>
          <div className="flex min-w-0 w-full flex-1 flex-col items-center gap-2">
            {fatalError ? (
              <p className="w-full text-center text-xs" style={{ color: '#ff3b30' }}>
                재생목록을 불러올 수 없습니다.{' '}
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: 'var(--link)' }}
                >
                  유튜브에서 열기
                </a>
              </p>
            ) : (
              controls
            )}
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={expanded ? '축소' : '확장'}
            >
              {expanded ? (
                <Minimize2 className="size-5 opacity-90" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="size-5 opacity-90" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                stopProgressTimer();
                readyRef.current = false;
                close();
              }}
              className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="재생바 닫기"
            >
              <X className="size-5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
