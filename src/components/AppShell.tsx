'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LyricsPlayerProvider } from '@/contexts/LyricsPlayerContext';
import { GlobalLyricsPlayer } from '@/components/GlobalLyricsPlayer';
import { MainWithPlayerInset } from '@/components/MainWithPlayerInset';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LyricsPlayerProvider>
      <Navigation />
      <MainWithPlayerInset>{children}</MainWithPlayerInset>
      <GlobalLyricsPlayer />
      <Toaster position="top-center" richColors closeButton />
    </LyricsPlayerProvider>
  );
}
