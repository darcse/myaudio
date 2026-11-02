'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LyricsPlayerProvider } from '@/contexts/LyricsPlayerContext';
import { AlbumPlayerProvider, useAlbumPlayer } from '@/contexts/AlbumPlayerContext';
import { GlobalLyricsPlayer } from '@/components/GlobalLyricsPlayer';
import { MainWithPlayerInset } from '@/components/MainWithPlayerInset';
import { BackToTop } from '@/components/BackToTop';
import { Footer } from '@/components/Footer';

const GlobalAlbumPlayer = dynamic(
  () => import('@/components/GlobalAlbumPlayer').then((m) => ({ default: m.GlobalAlbumPlayer })),
  { ssr: false },
);
const GlobalAlbumDetailHost = dynamic(
  () =>
    import('@/components/GlobalAlbumDetailHost').then((m) => ({ default: m.GlobalAlbumDetailHost })),
  { ssr: false },
);

function AlbumPlayerLazyMounts() {
  const { current, detailAlbumId } = useAlbumPlayer();
  const [loadPlayer, setLoadPlayer] = useState(false);
  const [loadDetail, setLoadDetail] = useState(false);

  useEffect(() => {
    if (current) setLoadPlayer(true);
  }, [current]);

  useEffect(() => {
    if (detailAlbumId != null) setLoadDetail(true);
  }, [detailAlbumId]);

  return (
    <>
      {loadPlayer ? <GlobalAlbumPlayer /> : null}
      {loadDetail ? <GlobalAlbumDetailHost /> : null}
    </>
  );
}

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
        <AlbumPlayerLazyMounts />
        <BackToTop />
        <Toaster position="top-center" richColors closeButton />
      </AlbumPlayerProvider>
    </LyricsPlayerProvider>
  );
}
