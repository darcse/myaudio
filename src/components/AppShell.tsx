'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LyricsPlayerProvider } from '@/contexts/LyricsPlayerContext';
import { GlobalLyricsPlayer } from '@/components/GlobalLyricsPlayer';
import { MainWithPlayerInset } from '@/components/MainWithPlayerInset';
import { BackToTop } from '@/components/BackToTop';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LyricsPlayerProvider>
      <Navigation />
      <MainWithPlayerInset>{children}</MainWithPlayerInset>
      <GlobalLyricsPlayer />
      <BackToTop />
      <Toaster position="top-center" richColors closeButton />
    </LyricsPlayerProvider>
  );
}
