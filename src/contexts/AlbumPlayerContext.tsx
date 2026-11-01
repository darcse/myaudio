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
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';

export type AlbumPlayerAlbum = {
  id: number;
  albumName: string;
  artist: string;
  coverImageUrl: string | null;
  playlistId: string;
};

export type AlbumPlayerContextValue = {
  current: AlbumPlayerAlbum | null;
  session: number;
  expanded: boolean;
  playAlbum: (album: AlbumPlayerAlbum) => void;
  close: () => void;
  setExpanded: (expanded: boolean) => void;
};

const AlbumPlayerContext = createContext<AlbumPlayerContextValue | null>(null);

export function AlbumPlayerProvider({ children }: { children: ReactNode }) {
  const { playingTrack, stopPlayback } = useLyricsPlayer();
  const [current, setCurrent] = useState<AlbumPlayerAlbum | null>(null);
  const [session, setSession] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!playingTrack) return;
    setCurrent(null);
    setExpanded(false);
  }, [playingTrack]);

  const playAlbum = useCallback(
    (album: AlbumPlayerAlbum) => {
      stopPlayback();
      setCurrent(album);
      setExpanded(false);
      setSession((value) => value + 1);
    },
    [stopPlayback],
  );

  const close = useCallback(() => {
    setCurrent(null);
    setExpanded(false);
  }, []);

  const value = useMemo(
    () => ({
      current,
      session,
      expanded,
      playAlbum,
      close,
      setExpanded,
    }),
    [current, session, expanded, playAlbum, close],
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
