/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Music } from 'lucide-react';
import type { MonthlyListenAlbum } from './DashboardContent';

type DashboardMonthlyListenCarouselProps = {
  albums: MonthlyListenAlbum[];
  onAlbumClick: (albumId: number) => void;
};

const AUTO_SLIDE_INTERVAL_MS = 4000;
const MANUAL_PAUSE_MS = 7000;

export function DashboardMonthlyListenCarousel({
  albums,
  onAlbumClick,
}: DashboardMonthlyListenCarouselProps) {
  const items = albums.slice(0, 7);
  const itemCount = items.length;
  const itemIds = items.map((item) => item.id).join(',');
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slideIndexRef = useRef(0);
  const isHoveringRef = useRef(false);
  const isTouchingRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const manualPauseUntilRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const canAutoSlide = itemCount > 2;

  const applyScrollToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const root = scrollRef.current;
    const slide = slideRefs.current[index];
    if (!root || !slide) return;
    isProgrammaticScrollRef.current = true;
    root.scrollTo({ left: slide.offsetLeft, behavior });
    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, behavior === 'smooth' ? 500 : 50);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, options?: { manual?: boolean; auto?: boolean }) => {
      if (options?.manual) {
        manualPauseUntilRef.current = Date.now() + MANUAL_PAUSE_MS;
      }
      const next = Math.max(0, Math.min(itemCount - 1, index));
      applyScrollToIndex(next, 'smooth');
      slideIndexRef.current = next;
      setActiveIndex(next);
    },
    [applyScrollToIndex, itemCount],
  );

  useEffect(() => {
    slideIndexRef.current = 0;
    setActiveIndex(0);
    const id = window.requestAnimationFrame(() => {
      applyScrollToIndex(0, 'auto');
    });
    return () => window.cancelAnimationFrame(id);
  }, [applyScrollToIndex, itemIds]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!canAutoSlide) return;

    const id = window.setInterval(() => {
      if (!isPageVisibleRef.current) return;
      if (isHoveringRef.current || isTouchingRef.current) return;
      if (Date.now() < manualPauseUntilRef.current) return;

      const current = slideIndexRef.current;
      const next = current >= itemCount - 1 ? 0 : current + 1;
      applyScrollToIndex(next, 'smooth');
      slideIndexRef.current = next;
      setActiveIndex(next);
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [applyScrollToIndex, canAutoSlide, itemCount]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || itemCount === 0) return;

    const ro = new ResizeObserver(() => {
      const slide = slideRefs.current[slideIndexRef.current];
      if (!slide) return;
      root.scrollLeft = slide.offsetLeft;
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [itemCount]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || itemCount === 0) return;

    let syncTimer = 0;
    const onScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        const slides = slideRefs.current.filter(Boolean) as HTMLButtonElement[];
        if (slides.length === 0) return;
        const scrollLeft = root.scrollLeft;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < slides.length; i += 1) {
          const dist = Math.abs(slides[i].offsetLeft - scrollLeft);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        slideIndexRef.current = best;
        setActiveIndex(best);
      }, 80);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      window.clearTimeout(syncTimer);
    };
  }, [itemCount]);

  return (
    <div
      className="relative min-h-0 flex-1"
      onMouseEnter={() => {
        isHoveringRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
      }}
      onTouchStart={() => {
        isTouchingRef.current = true;
      }}
      onTouchEnd={() => {
        isTouchingRef.current = false;
      }}
      onTouchCancel={() => {
        isTouchingRef.current = false;
      }}
    >
      <div
        ref={scrollRef}
        className="scrollbar-hide absolute inset-0 flex items-center gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory"
      >
        {items.map((row, index) => (
          <button
            key={row.id}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            type="button"
            onClick={() => onAlbumClick(row.id)}
            className="relative aspect-square h-full w-auto shrink-0 snap-start overflow-hidden rounded-xl transition-opacity hover:opacity-90"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--badge-bg)',
            }}
            title={`${row.artist ?? ''} — ${row.album_name} (${row.listenCount}회)`}
          >
            {row.cover_image_url ? (
              <img src={row.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="size-8 opacity-35" strokeWidth={1.5} aria-hidden />
              </div>
            )}
            {row.listenCount > 1 ? (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                {row.listenCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {itemCount > 1 ? (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1, { manual: true })}
            disabled={activeIndex === 0}
            className="absolute left-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
            aria-label="이전 앨범"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1, { manual: true })}
            disabled={activeIndex === itemCount - 1}
            className="absolute right-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
            aria-label="다음 앨범"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </>
      ) : null}
    </div>
  );
}
