'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { ExternalLink, Maximize2, Minimize2, Pause, Play, RefreshCw, SkipBack, SkipForward, X } from 'lucide-react';
import { toast } from 'sonner';
import { saveAlbumYoutubeTracks } from '@/app/albums/actions';
import { useAlbumPlayer, type AlbumPlayerAlbum } from '@/contexts/AlbumPlayerContext';
import { useAuthState } from '@/hooks/useAuthState';
import {
  applyYoutubeReferrerPolicy,
  createYoutubePlaylistIframe,
  getYoutubeIframeApiIfReady,
  isYoutubePlayerReady,
  loadYoutubeIframeApi,
  YT_PLAYER_STATE,
  type YoutubePlayer,
} from '@/lib/youtubeIframeApi';
import { youtubeMusicPlaylistUrl, youtubePlaylistOpenUrl } from '@/lib/youtubePlaylist';
import {
  fallbackTrackTitle,
  tracksMatchPlaylist,
  type YoutubeTrack,
} from '@/lib/youtubeTracks';

const EXPANDED_SIDE = 200;
const EXPANDED_PLAYER_W = Math.round((EXPANDED_SIDE * 16) / 9);
const EXPANDED_PLAYER_H = EXPANDED_SIDE;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function GlobalAlbumPlayer() {
  const { current, session, expanded, close, setExpanded, commandsRef } = useAlbumPlayer();
  const isAuthenticated = useAuthState();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const skippedRef = useRef(new Set<string>());
  const emptyCheckTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const resolvedKeyRef = useRef('');
  const resolveInFlightRef = useRef('');
  const expandedRef = useRef(expanded);
  const tracksRef = useRef<YoutubeTrack[]>([]);
  const resolveTracksRef = useRef<(videoIds: string[], force: boolean) => void>(() => {});
  const cancelledRef = useRef(false);
  const startedSyncRef = useRef('');
  const playStartedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackCount, setTrackCount] = useState(0);
  const [fatalError, setFatalError] = useState(false);
  const [tracks, setTracks] = useState<YoutubeTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksRefreshing, setTracksRefreshing] = useState(false);
  const [unplayableIds, setUnplayableIds] = useState<string[]>([]);
  const [gestureHint, setGestureHint] = useState(false);
  tracksRef.current = tracks;
  expandedRef.current = expanded;

  const syncProgress = useCallback((player: YoutubePlayer) => {
    if (!isYoutubePlayerReady(player)) return;
    try {
      const time = player.getCurrentTime();
      const length = player.getDuration();
      const playlist = player.getPlaylist() ?? [];
      setCurrentTime(Number.isFinite(time) ? time : 0);
      setDuration(Number.isFinite(length) ? length : 0);
      setTrackIndex(player.getPlaylistIndex() + 1);
      setTrackCount(playlist.length);
      if (playlist.length > 0) {
        resolveTracksRef.current(playlist, false);
      }
    } catch {
    }
  }, []);

  const resizePlayer = useCallback(() => {
    const host = hostRef.current;
    const player = playerRef.current;
    if (!host || !isYoutubePlayerReady(player) || typeof player.setSize !== 'function') return;
    try {
      const width = expandedRef.current ? EXPANDED_PLAYER_W : Math.max(1, host.clientWidth);
      const height = expandedRef.current ? EXPANDED_PLAYER_H : Math.max(1, host.clientHeight);
      player.setSize(width, height);
      const iframe = player.getIframe?.() ?? host.querySelector('iframe');
      if (iframe) {
        iframe.style.width = `${width}px`;
        iframe.style.height = `${height}px`;
      }
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

  const bindPlayer = useCallback((iframe: HTMLIFrameElement, host: HTMLElement) => {
    const api = getYoutubeIframeApiIfReady();
    if (!api) return false;
    new api.Player(iframe, {
      events: {
        onReady: (event) => {
          if (cancelledRef.current) return;
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
          const playing = event.data === YT_PLAYER_STATE.PLAYING;
          if (playing) {
            playStartedRef.current = true;
            setGestureHint(false);
          }
          setIsPlaying(playing);
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
            if (videoId) {
              skippedRef.current.add(videoId);
              setUnplayableIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
            }
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
    return true;
  }, [resizePlayer, syncProgress, startProgressTimer]);

  const startAlbum = useCallback((album: AlbumPlayerAlbum): boolean => {
    const existing = playerRef.current;
    if (isYoutubePlayerReady(existing)) {
      try {
        existing.loadPlaylist({ list: album.playlistId, listType: 'playlist', index: 0 });
        existing.playVideo();
        applyYoutubeReferrerPolicy(existing, hostRef.current ?? document.body);
        startedSyncRef.current = album.playlistId;
        return true;
      } catch {
        return false;
      }
    }
    const host = hostRef.current;
    if (!getYoutubeIframeApiIfReady() || !host) return false;
    try {
      cancelledRef.current = false;
      readyRef.current = false;
      stopProgressTimer();
      playerRef.current = null;
      const iframe = createYoutubePlaylistIframe(album.playlistId);
      host.replaceChildren(iframe);
      if (!bindPlayer(iframe, host)) return false;
      startedSyncRef.current = album.playlistId;
      return true;
    } catch {
      return false;
    }
  }, [bindPlayer, stopProgressTimer]);

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

  const resolveTracks = useCallback(async (videoIds: string[], force: boolean) => {
    if (!current || videoIds.length === 0) return;
    const resolveKey = `${current.id}:${videoIds.join('\0')}`;
    if (!force && resolvedKeyRef.current.startsWith(`${current.id}:`)) {
      return;
    }
    if (!force && resolveInFlightRef.current.startsWith(`${current.id}:`)) {
      return;
    }
    const cached = current.cachedTracks ?? [];
    if (!force && tracksMatchPlaylist(cached, videoIds)) {
      setTracks(cached);
      setTracksLoading(false);
      setTracksRefreshing(false);
      resolvedKeyRef.current = resolveKey;
      return;
    }
    if (!force && tracksMatchPlaylist(tracksRef.current, videoIds)) {
      setTracksLoading(false);
      setTracksRefreshing(false);
      resolvedKeyRef.current = resolveKey;
      return;
    }
    resolveInFlightRef.current = resolveKey;
    setTracks(
      videoIds.map((videoId, index) => ({
        videoId,
        title: cached.find((track) => track.videoId === videoId)?.title || fallbackTrackTitle(index),
      })),
    );
    if (force) setTracksRefreshing(true);
    else if (tracksRef.current.length === 0) setTracksLoading(true);
    try {
      const response = await fetch('/api/youtube-track-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds, country: current.country ?? '' }),
      });
      let titles: (string | null)[] = [];
      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as { titles?: unknown } | null;
        titles = Array.isArray(payload?.titles) ? (payload.titles as (string | null)[]) : [];
      }
      const next = videoIds.map((videoId, index) => {
        const fetched = typeof titles[index] === 'string' ? titles[index]?.trim() ?? '' : '';
        return {
          videoId,
          title: fetched || fallbackTrackTitle(index),
        };
      });
      setTracks(next);
      resolvedKeyRef.current = resolveKey;
      if (isAuthenticated === true) {
        void saveAlbumYoutubeTracks(current.id, next).catch(() => {});
      }
    } catch {
      resolvedKeyRef.current = resolveKey;
    } finally {
      if (resolveInFlightRef.current === resolveKey) resolveInFlightRef.current = '';
      setTracksLoading(false);
      setTracksRefreshing(false);
    }
  }, [current, isAuthenticated]);

  resolveTracksRef.current = resolveTracks;
  commandsRef.current.startAlbum = startAlbum;
  commandsRef.current.pauseIfPlaying = () => {
    const player = playerRef.current;
    if (!readyRef.current || !isYoutubePlayerReady(player)) return;
    try {
      player.pauseVideo();
    } catch {
    }
  };

  useEffect(() => {
    if (!current) {
      cancelledRef.current = true;
      teardownPlayer();
      startedSyncRef.current = '';
      playStartedRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setTrackIndex(0);
      setTrackCount(0);
      setFatalError(false);
      setGestureHint(false);
      setTracks([]);
      setTracksLoading(false);
      setTracksRefreshing(false);
      setUnplayableIds([]);
      resolvedKeyRef.current = '';
      resolveInFlightRef.current = '';
      return;
    }

    cancelledRef.current = false;
    if (resolvedKeyRef.current && !resolvedKeyRef.current.startsWith(`${current.id}:`)) {
      resolvedKeyRef.current = '';
      resolveInFlightRef.current = '';
    }
    setTracks(current.cachedTracks ?? []);
    setTracksLoading(false);
    setTracksRefreshing(false);
    setUnplayableIds([]);
    clearEmptyCheckTimer();
    skippedRef.current = new Set();
    playStartedRef.current = false;
    setGestureHint(false);
    setFatalError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTrackIndex(1);
    setTrackCount(0);

    const startedSync = startedSyncRef.current === current.playlistId;
    if (startedSync) startedSyncRef.current = '';
    const existing = playerRef.current;
    if (isYoutubePlayerReady(existing)) {
      if (!startedSync) {
        try {
          existing.loadPlaylist({ list: current.playlistId, listType: 'playlist', index: 0 });
          existing.playVideo();
          applyYoutubeReferrerPolicy(existing, hostRef.current ?? document.body);
        } catch {
          setFatalError(true);
        }
      }
      return () => {
        cancelledRef.current = true;
        clearEmptyCheckTimer();
      };
    }
    if (hostRef.current?.querySelector('iframe')) {
      return () => {
        cancelledRef.current = true;
        clearEmptyCheckTimer();
      };
    }

    readyRef.current = false;
    stopProgressTimer();
    playerRef.current = null;

    const host = hostRef.current;
    if (!host) return;

    void loadYoutubeIframeApi()
      .then(() => {
        if (cancelledRef.current || !hostRef.current) return;
        const iframe = createYoutubePlaylistIframe(current.playlistId);
        hostRef.current.replaceChildren(iframe);
        if (!bindPlayer(iframe, hostRef.current)) {
          setFatalError(true);
        }
      })
      .catch(() => {
        if (!cancelledRef.current) setFatalError(true);
      });

    return () => {
      cancelledRef.current = true;
      clearEmptyCheckTimer();
    };
  }, [current, session, bindPlayer, teardownPlayer, clearEmptyCheckTimer, stopProgressTimer]);

  useEffect(() => {
    if (!current || fatalError) {
      setGestureHint(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (!playStartedRef.current) setGestureHint(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [current, session, fatalError]);

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

  const seekFillPct =
    duration > 0 && Number.isFinite(currentTime)
      ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`
      : '0%';
  const trackLabel = trackCount > 0 ? `${trackIndex} / ${trackCount}` : '—';
  const currentTitle =
    tracks[trackIndex - 1]?.title?.trim() ||
    (trackIndex > 0 ? fallbackTrackTitle(trackIndex - 1) : '');
  const openUrl = current ? youtubePlaylistOpenUrl(current.playlistId) : '';
  const musicUrl = current ? youtubeMusicPlaylistUrl(current.playlistId) : '';

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

  const handleTrackClick = (index: number, videoId: string) => {
    if (unplayableIds.includes(videoId)) {
      toast.error('이 곡은 임베드가 차단되어 재생할 수 없습니다.');
      return;
    }
    if (trackIndex === index + 1) {
      togglePlay();
      return;
    }
    callPlayer((player) => {
      if (typeof player.playVideoAt === 'function') player.playVideoAt(index);
    });
  };

  const playerBoxClass = !current
    ? 'h-full w-full'
    : expanded
      ? 'relative size-[200px] shrink-0 overflow-hidden rounded-xl bg-black'
      : 'size-12 shrink-0 overflow-hidden rounded-lg bg-black sm:size-14';
  const playerCropStyle = current && expanded
    ? {
        position: 'absolute' as const,
        top: 0,
        left: '50%',
        width: EXPANDED_PLAYER_W,
        height: EXPANDED_PLAYER_H,
        transform: 'translateX(-50%)',
      }
    : { width: '100%', height: '100%' };

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
      {current && expanded ? <div className="fixed inset-0 z-[80] bg-black/45" onClick={() => setExpanded(false)} /> : null}
      <div
        className={
          !current
            ? 'pointer-events-none fixed bottom-0 left-0 z-0 size-12 overflow-hidden opacity-0'
            : expanded
              ? 'fixed inset-0 z-[81] flex items-center justify-center p-4'
              : 'fixed bottom-0 left-0 right-0 z-[60] border-t shadow-[0_-4px_24px_rgba(0,0,0,0.08)]'
        }
        style={
          !current || expanded
            ? undefined
            : { borderColor: 'var(--border)', background: 'var(--card-bg)' }
        }
        aria-hidden={!current}
      >
        <div
          className={
            !current
              ? 'h-full w-full'
              : expanded
                ? 'modal-panel-apple relative flex max-h-[min(90dvh,56rem)] w-full max-w-3xl flex-col gap-4 overflow-hidden p-4 sm:p-6'
                : 'mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4'
          }
          onClick={current && expanded ? (event) => event.stopPropagation() : undefined}
        >
          <div
            className={
              !current
                ? 'h-full w-full'
                : expanded
                  ? 'flex min-w-0 shrink-0 flex-col gap-3 min-[480px]:min-h-[200px] min-[480px]:flex-row min-[480px]:items-stretch min-[480px]:pr-14'
                  : 'flex min-w-0 shrink-0 items-center gap-3 sm:w-[min(100%,280px)]'
            }
          >
            <div className={playerBoxClass}>
              <div style={playerCropStyle}>
                <div ref={hostRef} className="h-full w-full" />
              </div>
            </div>
            {current ? (
            <div
              className={
                expanded
                  ? 'flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2'
                  : 'min-w-0 flex-1'
              }
            >
              <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                {current.albumName}
              </p>
              <p className="mt-0.5 truncate text-xs leading-tight opacity-70">{current.artist || '—'}</p>
              {currentTitle ? (
                <p className="mt-0.5 truncate text-xs leading-tight opacity-80">
                  {currentTitle}
                  <span className="ml-1.5 tabular-nums opacity-60">{trackLabel}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] tabular-nums opacity-60">{trackLabel}</p>
              )}
              {gestureHint && !expanded && !fatalError ? (
                <p className="mt-1 text-[11px] leading-tight opacity-70">재생 버튼을 눌러 시작하세요</p>
              ) : null}
              {expanded ? (
                fatalError ? (
                  <p className="text-xs" style={{ color: '#ff3b30' }}>
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
                  <div className="flex w-full min-w-0 flex-col items-stretch gap-2">{controls}</div>
                )
              ) : null}
            </div>
            ) : null}
          </div>
          {current && !expanded ? (
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
          ) : null}
          {current ? (
          <div
            className={
              expanded
                ? 'absolute right-3 top-3 z-10 flex shrink-0 items-center gap-1 sm:right-4 sm:top-4'
                : 'flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto'
            }
          >
            <a
              href={musicUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => commandsRef.current.pauseIfPlaying()}
              className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 sm:p-2"
              title="유튜브 뮤직에서 열기"
              aria-label="유튜브 뮤직에서 열기"
            >
              <ExternalLink className="size-5 opacity-90" strokeWidth={1.75} />
            </a>
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
          ) : null}
          {current && expanded ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <p className="text-sm font-semibold">트랙</p>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      const player = playerRef.current;
                      const ids =
                        player && isYoutubePlayerReady(player)
                          ? player.getPlaylist() ?? []
                          : tracks.map((track) => track.videoId);
                      if (ids.length === 0) return;
                      void resolveTracks(ids, true);
                    }}
                    disabled={tracksRefreshing}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs opacity-80 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                    aria-label="트랙 목록 새로고침"
                  >
                    <RefreshCw className={`size-3.5 ${tracksRefreshing ? 'animate-spin' : ''}`} />
                    새로고침
                  </button>
                ) : null}
              </div>
              {tracksLoading && tracks.length === 0 ? (
                <p className="text-xs opacity-60">트랙 목록을 불러오는 중...</p>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" style={{ maxHeight: 'min(36vh, 22rem)' }}>
                  {tracks.map((track, index) => {
                    const active = trackIndex === index + 1;
                    const blocked = unplayableIds.includes(track.videoId);
                    return (
                      <button
                        key={`${track.videoId}-${index}`}
                        type="button"
                        onClick={() => handleTrackClick(index, track.videoId)}
                        className="flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-2 text-left"
                        style={{
                          background: active ? 'var(--badge-bg)' : 'transparent',
                          color: 'var(--foreground)',
                        }}
                      >
                        <span className="w-6 shrink-0 text-xs tabular-nums opacity-60">{index + 1}</span>
                        <span className="min-w-0 flex-1 break-words text-sm">
                          {track.title || fallbackTrackTitle(index)}
                        </span>
                        {blocked ? (
                          <span className="shrink-0 text-[11px] opacity-60">재생 불가</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
