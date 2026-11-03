'use client';

import type { ReactNode } from 'react';
import { useAlbumPlayer } from '@/contexts/AlbumPlayerContext';
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';

export function MainWithPlayerInset({ children }: { children: ReactNode }) {
  const { playingTrack } = useLyricsPlayer();
  const { current } = useAlbumPlayer();
  const insetClass = current
    ? 'pb-48 [--player-inset:12rem]'
    : playingTrack
      ? 'pb-40 [--player-inset:10rem]'
      : '[--player-inset:0px]';

  return (
    <div className={insetClass}>{children}</div>
  );
}
