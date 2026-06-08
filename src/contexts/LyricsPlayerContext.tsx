'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Lyrics, LyricsQueueSource } from '@/app/lyrics/types';
import { buildAllFavoritesSorted, buildFavoritePlayableQueue } from '@/app/lyrics/lib/favorites-queue';
import { LYRICS_LIBRARY_SYNC_EVENT } from '@/app/lyrics/lib/lyrics-events';

export type { LyricsQueueSource };

export type LyricsPlayerContextValue = {
  playingTrack: Lyrics | null;
  orderedTracks: Lyrics[];
  queueSource: LyricsQueueSource;
  favoriteDrawerTracks: Lyrics[];
  playTrack: (track: Lyrics, queue: Lyrics[], source?: LyricsQueueSource) => void;
  changeTrack: (track: Lyrics) => void;
  stopPlayback: () => void;
  patchTrackFavorite: (id: number, isFavorite: boolean) => void;
  playFavoriteFromDrawer: (track: Lyrics) => boolean;
};

const LyricsPlayerContext = createContext<LyricsPlayerContextValue | null>(null);

export function LyricsPlayerProvider({ children }: { children: ReactNode }) {
  const [playingTrack, setPlayingTrack] = useState<Lyrics | null>(null);
  const [orderedTracks, setOrderedTracks] = useState<Lyrics[]>([]);
  const [queueSource, setQueueSource] = useState<LyricsQueueSource>('album');
  const [favoriteDrawerTracks, setFavoriteDrawerTracks] = useState<Lyrics[]>([]);

  useEffect(() => {
    const onSync = (e: Event) => {
      const ce = e as CustomEvent<Lyrics[]>;
      const rows = ce.detail;
      if (!Array.isArray(rows)) return;
      setFavoriteDrawerTracks(buildAllFavoritesSorted(rows));
    };
    window.addEventListener(LYRICS_LIBRARY_SYNC_EVENT, onSync);
    return () => window.removeEventListener(LYRICS_LIBRARY_SYNC_EVENT, onSync);
  }, []);

  const playTrack = useCallback((track: Lyrics, queue: Lyrics[], source: LyricsQueueSource = 'album') => {
    setOrderedTracks(queue);
    setPlayingTrack(track);
    setQueueSource(source);
  }, []);

  const changeTrack = useCallback((track: Lyrics) => {
    setPlayingTrack(track);
  }, []);

  const stopPlayback = useCallback(() => {
    setPlayingTrack(null);
    setOrderedTracks([]);
    setQueueSource('album');
  }, []);

  const patchTrackFavorite = useCallback((id: number, isFavorite: boolean) => {
    setPlayingTrack((prev) => (prev?.id === id ? { ...prev, is_favorite: isFavorite } : prev));
    setOrderedTracks((prev) => prev.map((t) => (t.id === id ? { ...t, is_favorite: isFavorite } : t)));
    setFavoriteDrawerTracks((prev) => {
      const mapped = prev.map((t) => (t.id === id ? { ...t, is_favorite: isFavorite } : t));
      if (!isFavorite) return mapped.filter((t) => t.id !== id);
      return mapped;
    });
  }, []);

  const playFavoriteFromDrawer = useCallback(
    (track: Lyrics) => {
      const queue = buildFavoritePlayableQueue(favoriteDrawerTracks);
      const hit = queue.find((t) => t.id === track.id);
      if (!hit) return false;
      playTrack(hit, queue, 'favorites');
      return true;
    },
    [favoriteDrawerTracks, playTrack],
  );

  const value = useMemo(
    () => ({
      playingTrack,
      orderedTracks,
      queueSource,
      favoriteDrawerTracks,
      playTrack,
      changeTrack,
      stopPlayback,
      patchTrackFavorite,
      playFavoriteFromDrawer,
    }),
    [
      playingTrack,
      orderedTracks,
      queueSource,
      favoriteDrawerTracks,
      playTrack,
      changeTrack,
      stopPlayback,
      patchTrackFavorite,
      playFavoriteFromDrawer,
    ],
  );

  return <LyricsPlayerContext.Provider value={value}>{children}</LyricsPlayerContext.Provider>;
}

export function useLyricsPlayer(): LyricsPlayerContextValue {
  const ctx = useContext(LyricsPlayerContext);
  if (!ctx) {
    throw new Error('useLyricsPlayer는 LyricsPlayerProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
