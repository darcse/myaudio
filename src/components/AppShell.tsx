'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LyricsPlayerProvider } from '@/contexts/LyricsPlayerContext';
import { AlbumPlayerProvider } from '@/contexts/AlbumPlayerContext';
import { GlobalLyricsPlayer } from '@/components/GlobalLyricsPlayer';
import { GlobalAlbumPlayer } from '@/components/GlobalAlbumPlayer';
import { MainWithPlayerInset } from '@/components/MainWithPlayerInset';
import { BackToTop } from '@/components/BackToTop';
import { Footer } from '@/components/Footer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LyricsPlayerProvider>
      <AlbumPlayerProvider>
        <Navigation />
        <MainWithPlayerInset>
          {children}
          <Footer />
        </MainWithPlayerInset>
        <GlobalLyricsPlayer />
        <GlobalAlbumPlayer />
        <BackToTop />
        <Toaster position="top-center" richColors closeButton />
      </AlbumPlayerProvider>
    </LyricsPlayerProvider>
  );
}
