'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, ChevronLeft, Disc, Shuffle, Sparkles } from 'lucide-react';

export type AlbumNavId = 'diary';

type AlbumPageHeaderProps = {
  title?: string;
  tabs?: ReactNode;
  showAlbumNav?: boolean;
  activeNav?: AlbumNavId | null;
  isAuthenticated: boolean | null;
  showRegister?: boolean;
  showDivider?: boolean;
  onRandomClick?: () => void;
  onTasteClick?: () => void;
  onRegisterClick?: () => void;
  registerAriaLabel?: string;
  registerPressed?: boolean;
};

function navButtonClass(active: boolean): string {
  return `btn-apple h-[42px] px-3 flex items-center justify-center gap-1.5 ${
    active ? 'btn-apple-primary' : 'btn-apple-secondary'
  }`;
}

export function AlbumPageHeader({
  title = 'Albums',
  tabs,
  showAlbumNav = true,
  activeNav,
  isAuthenticated,
  showRegister = false,
  showDivider = false,
  onRandomClick,
  onTasteClick,
  onRegisterClick,
  registerAriaLabel = '앨범 직접 등록하기',
  registerPressed,
}: AlbumPageHeaderProps) {
  const randomHref = '/albums?panel=random';

  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between${showDivider ? ' border-b pb-6' : ''}`}
      style={showDivider ? { borderColor: 'var(--border)' } : undefined}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="page-title flex shrink-0 items-center gap-2">
          <Disc className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
          {title}
        </h1>
        {tabs}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showAlbumNav ? (
          <>
            <Link
              href="/albums/diary"
              className={navButtonClass(activeNav === 'diary')}
              aria-label="다이어리"
              title="다이어리"
            >
              <BookOpen className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            </Link>
            {onRandomClick ? (
              <button
                type="button"
                className={navButtonClass(false)}
                onClick={onRandomClick}
                aria-label="랜덤 추천"
                title="랜덤 추천"
              >
                <Shuffle className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
              </button>
            ) : (
              <Link
                href={randomHref}
                className={navButtonClass(false)}
                aria-label="랜덤 추천"
                title="랜덤 추천"
              >
                <Shuffle className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
              </Link>
            )}
            {onTasteClick ? (
              <button
                type="button"
                className={navButtonClass(false)}
                onClick={() => void onTasteClick()}
                aria-label="취향 분석"
                title="취향 분석"
              >
                <Sparkles className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
              </button>
            ) : null}
          </>
        ) : null}
        {showRegister && isAuthenticated ? (
          <button
            type="button"
            className="btn-apple btn-apple-secondary flex h-[42px] w-[42px] items-center justify-center"
            onClick={onRegisterClick}
            aria-label={registerAriaLabel}
            aria-pressed={registerPressed}
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
  trailing?: ReactNode;
};

export function AlbumSubHeader({ icon: Icon, title, trailing }: AlbumSubHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Link
        href="/albums"
        className="inline-flex items-center justify-center rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="앨범 목록으로 이동"
      >
        <ChevronLeft className="size-6" strokeWidth={1.75} />
      </Link>
      <Icon className="size-6 shrink-0 opacity-80" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold">{title}</h2>
      {trailing ? <div className="ml-1 flex flex-wrap items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}
