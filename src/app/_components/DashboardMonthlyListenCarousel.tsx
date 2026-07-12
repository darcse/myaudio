/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Music } from 'lucide-react';
import type { MonthlyListenAlbum } from './DashboardContent';

type DashboardMonthlyListenCarouselProps = {
  albums: MonthlyListenAlbum[];
  onAlbumClick: (albumId: number) => void;
};

const AUTO_SLIDE_INTERVAL_MS = 3000;
const MANUAL_PAUSE_MS = 7000;

export function DashboardMonthlyListenCarousel({
  albums,
  onAlbumClick,
}: DashboardMonthlyListenCarouselProps) {
  const items = albums.slice(0, 6);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const isHoveringRef = useRef(false);
  const isTouchingRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const manualPauseUntilRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const canAutoSlide = items.length > 2;

  const scrollToIndex = useCallback(
    (index: number, options?: { manual?: boolean }) => {
      if (options?.manual) {
        manualPauseUntilRef.current = Date.now() + MANUAL_PAUSE_MS;
      }
      const next = Math.max(0, Math.min(items.length - 1, index));
      const root = scrollRef.current;
      const slide = slideRefs.current[next];
      if (root && slide) {
        const rootRect = root.getBoundingClientRect();
        const slideRect = slide.getBoundingClientRect();
        const nextLeft =
          root.scrollLeft +
          (slideRect.left - rootRect.left) -
          (rootRect.width - slideRect.width) / 2;
        root.scrollTo({ left: Math.max(0, nextLeft), behavior: 'smooth' });
      }
      activeIndexRef.current = next;
      setActiveIndex(next);
    },
    [items.length],
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

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

      const current = activeIndexRef.current;
      const next = current >= items.length - 1 ? 0 : current + 1;
      scrollToIndex(next);
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [canAutoSlide, items.length, scrollToIndex]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || items.length === 0) return;

    const slides = slideRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const index = slides.indexOf(visible[0].target as HTMLButtonElement);
        if (index >= 0) {
          activeIndexRef.current = index;
          setActiveIndex(index);
        }
      },
      { root, threshold: [0.55, 0.7, 0.85] },
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [items]);

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
        className="scrollbar-hide absolute inset-0 flex items-center gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory"
      >
        <div className="w-[9%] shrink-0" aria-hidden />
        {items.map((row, index) => (
          <button
            key={row.id}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            type="button"
            onClick={() => onAlbumClick(row.id)}
            className="relative aspect-square h-full max-h-full shrink-0 snap-center self-center overflow-hidden rounded-xl transition-opacity hover:opacity-90"
            style={{
              flexBasis: '82%',
              border: '1px solid var(--border)',
              background: 'var(--badge-bg)',
            }}
            title={`${row.artist ?? ''} — ${row.album_name} (${row.listenCount}회)`}
          >
            {row.cover_image_url ? (
              <img src={row.cover_image_url} alt="" className="h-full w-full object-cover" />
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
        <div className="w-[9%] shrink-0" aria-hidden />
      </div>

      {items.length > 1 ? (
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
            disabled={activeIndex === items.length - 1}
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
