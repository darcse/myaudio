'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useAlbumPlayer } from '@/contexts/AlbumPlayerContext';
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';

const SCROLL_THRESHOLD = 300;

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { playingTrack } = useLyricsPlayer();
  const { current, expanded } = useAlbumPlayer();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY >= SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible || expanded) return null;

  const bottomClass = current ? 'bottom-52' : playingTrack ? 'bottom-44' : 'bottom-6';

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-6 z-[70] inline-flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-90 sm:size-12 ${bottomClass}`}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        color: 'var(--foreground)',
      }}
      aria-label="맨 위로 이동"
      title="맨 위로 이동"
    >
      <ChevronUp className="size-5 sm:size-[22px]" strokeWidth={1.8} aria-hidden />
    </button>
  );
}
