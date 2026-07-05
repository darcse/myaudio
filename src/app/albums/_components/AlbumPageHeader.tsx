'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, ChevronLeft, Disc, Sparkles } from 'lucide-react';

export type AlbumNavId = 'stats';

type AlbumPageHeaderProps = {
  activeNav?: AlbumNavId | null;
  isAuthenticated: boolean | null;
  showRegister?: boolean;
  showDivider?: boolean;
  onMoodClick?: () => void;
  onTasteClick?: () => void;
  onRegisterClick?: () => void;
};

function navButtonClass(active: boolean): string {
  return `btn-apple h-[42px] px-3 flex items-center justify-center gap-1.5 ${
    active ? 'btn-apple-primary' : 'btn-apple-secondary'
  }`;
}

export function AlbumPageHeader({
  activeNav,
  isAuthenticated,
  showRegister = false,
  showDivider = false,
  onMoodClick,
  onTasteClick,
  onRegisterClick,
}: AlbumPageHeaderProps) {
  const moodHref = '/albums?panel=mood';
  const tasteHref = '/albums?panel=taste';

  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between${showDivider ? ' border-b pb-6' : ''}`}
      style={showDivider ? { borderColor: 'var(--border)' } : undefined}
    >
      <h1 className="page-title flex shrink-0 items-center gap-2">
        <Disc className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
        Albums
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/albums/stats" className={navButtonClass(activeNav === 'stats')} aria-label="앨범 통계">
          <BarChart3 className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
          <span className="hidden sm:inline">앨범 통계</span>
        </Link>
        {onMoodClick ? (
          <button
            type="button"
            className={navButtonClass(false)}
            onClick={onMoodClick}
            aria-label="기분 추천"
          >
            <span className="text-base leading-none">🎵</span>
            <span className="hidden sm:inline">기분 추천</span>
          </button>
        ) : (
          <Link href={moodHref} className={navButtonClass(false)} aria-label="기분 추천">
            <span className="text-base leading-none">🎵</span>
            <span className="hidden sm:inline">기분 추천</span>
          </Link>
        )}
        {onTasteClick ? (
          <button
            type="button"
            className={navButtonClass(false)}
            onClick={() => void onTasteClick()}
            aria-label="취향 분석"
          >
            <Sparkles className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">취향 분석</span>
          </button>
        ) : (
          <Link href={tasteHref} className={navButtonClass(false)} aria-label="취향 분석">
            <Sparkles className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">취향 분석</span>
          </Link>
        )}
        {showRegister && isAuthenticated ? (
          <button
            type="button"
            className="btn-apple btn-apple-secondary flex h-[42px] w-[42px] items-center justify-center"
            onClick={onRegisterClick}
            aria-label="앨범 직접 등록하기"
          >
            <span className="text-lg leading-none">＋</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

type AlbumSubHeaderProps = {
  icon: LucideIcon;
  title: string;
};

export function AlbumSubHeader({ icon: Icon, title }: AlbumSubHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-2">
      <Link
        href="/albums"
        className="inline-flex items-center justify-center rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="앨범 목록으로 이동"
      >
        <ChevronLeft className="size-6" strokeWidth={1.75} />
      </Link>
      <Icon className="size-6 shrink-0 opacity-80" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
