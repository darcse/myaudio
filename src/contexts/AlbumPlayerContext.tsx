'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';
import type { YoutubeTrack } from '@/lib/youtubeTracks';

export type AlbumPlayerAlbum = {
  id: number;
  albumName: string;
  artist: string;
  coverImageUrl: string | null;
  playlistId: string;
  country?: string | null;
  cachedTracks?: YoutubeTrack[];
};

export type AlbumPlayerCommands = {
  startAlbum: (album: AlbumPlayerAlbum) => boolean;
  pauseIfPlaying: () => void;
};

export type AlbumPlayerContextValue = {
  current: AlbumPlayerAlbum | null;
  session: number;
  expanded: boolean;
  detailAlbumId: number | null;
  playAlbum: (album: AlbumPlayerAlbum) => void;
  pauseIfPlaying: () => void;
  close: () => void;
  closeIfPlayingAlbum: (albumId: number) => void;
  setExpanded: (expanded: boolean) => void;
  openAlbumDetail: (albumId: number) => void;
  closeAlbumDetail: () => void;
  patchCurrentMeta: (
    albumId: number,
    patch: Partial<Pick<AlbumPlayerAlbum, 'albumName' | 'artist' | 'coverImageUrl' | 'playlistId' | 'country'>>,
  ) => void;
  commandsRef: MutableRefObject<AlbumPlayerCommands>;
};

const AlbumPlayerContext = createContext<AlbumPlayerContextValue | null>(null);

export function AlbumPlayerProvider({ children }: { children: ReactNode }) {
  const { playingTrack, stopPlayback } = useLyricsPlayer();
  const [current, setCurrent] = useState<AlbumPlayerAlbum | null>(null);
  const [session, setSession] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [detailAlbumId, setDetailAlbumId] = useState<number | null>(null);
  const currentRef = useRef<AlbumPlayerAlbum | null>(null);
  currentRef.current = current;
  const commandsRef = useRef<AlbumPlayerCommands>({
    startAlbum: () => false,
    pauseIfPlaying: () => {},
  });

  useEffect(() => {
    if (!playingTrack) return;
    setCurrent(null);
    setExpanded(false);
  }, [playingTrack]);

  const playAlbum = useCallback(
    (album: AlbumPlayerAlbum) => {
      stopPlayback();
      commandsRef.current.startAlbum(album);
      setCurrent(album);
      setExpanded(false);
      setSession((value) => value + 1);
    },
    [stopPlayback],
  );

  const pauseIfPlaying = useCallback(() => {
    commandsRef.current.pauseIfPlaying();
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
    setExpanded(false);
  }, []);

  const closeIfPlayingAlbum = useCallback((albumId: number) => {
    if (currentRef.current?.id !== albumId) return;
    setCurrent(null);
    setExpanded(false);
  }, []);

  const openAlbumDetail = useCallback((albumId: number) => {
    setDetailAlbumId(albumId);
  }, []);

  const closeAlbumDetail = useCallback(() => {
    setDetailAlbumId(null);
  }, []);

  const patchCurrentMeta = useCallback(
    (
      albumId: number,
      patch: Partial<
        Pick<AlbumPlayerAlbum, 'albumName' | 'artist' | 'coverImageUrl' | 'playlistId' | 'country'>
      >,
    ) => {
      setCurrent((prev) => {
        if (!prev || prev.id !== albumId) return prev;
        const nextPlaylistId = patch.playlistId?.trim();
        return {
          ...prev,
          ...patch,
          playlistId: nextPlaylistId || prev.playlistId,
        };
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      current,
      session,
      expanded,
      detailAlbumId,
      playAlbum,
      pauseIfPlaying,
      close,
      closeIfPlayingAlbum,
      setExpanded,
      openAlbumDetail,
      closeAlbumDetail,
      patchCurrentMeta,
      commandsRef,
    }),
    [
      current,
      session,
      expanded,
      detailAlbumId,
      playAlbum,
      pauseIfPlaying,
      close,
      closeIfPlayingAlbum,
      openAlbumDetail,
      closeAlbumDetail,
      patchCurrentMeta,
    ],
  );

  return <AlbumPlayerContext.Provider value={value}>{children}</AlbumPlayerContext.Provider>;
}

export function useAlbumPlayer(): AlbumPlayerContextValue {
  const ctx = useContext(AlbumPlayerContext);
  if (!ctx) {
    throw new Error('useAlbumPlayer는 AlbumPlayerProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
