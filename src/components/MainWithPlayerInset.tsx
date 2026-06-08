'use client';

import type { ReactNode } from 'react';
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';

export function MainWithPlayerInset({ children }: { children: ReactNode }) {
  const { playingTrack } = useLyricsPlayer();

  return (
    <div className={playingTrack ? 'pb-40' : undefined}>{children}</div>
  );
}
