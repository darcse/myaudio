'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BarChart2, ChevronLeft, Headphones, Map, Music, Shuffle } from 'lucide-react';

export type HeadfiNavId = 'stats' | 'position' | 'device-match' | 'album-match';

type HeadfiPageHeaderProps = {
  activeNav?: HeadfiNavId | null;
  isAuthenticated: boolean | null;
  showRegister?: boolean;
  showDivider?: boolean;
  onStatsClick?: () => void;
  onDeviceMatchClick?: () => void;
  onRegisterClick?: () => void;
};

function navButtonClass(active: boolean): string {
  return `btn-apple h-[42px] px-3 flex items-center justify-center gap-1.5 ${
    active ? 'btn-apple-primary' : 'btn-apple-secondary'
  }`;
}

export function HeadfiPageHeader({
  activeNav,
  isAuthenticated,
  showRegister = false,
  showDivider = false,
  onStatsClick,
  onDeviceMatchClick,
  onRegisterClick,
}: HeadfiPageHeaderProps) {
  const statsHref = '/headfi?panel=stats';
  const deviceMatchHref = '/headfi?panel=device-match';

  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between${showDivider ? ' border-b pb-6' : ''}`}
      style={showDivider ? { borderColor: 'var(--border)' } : undefined}
    >
      <h1 className="page-title flex shrink-0 items-center gap-2">
        <Headphones className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
        Head-fi
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        {isAuthenticated ? (
          onStatsClick ? (
            <button type="button" className={navButtonClass(activeNav === 'stats')} onClick={onStatsClick}>
              <BarChart2 className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
              <span className="hidden sm:inline">소비 통계</span>
            </button>
          ) : (
            <Link href={statsHref} className={navButtonClass(activeNav === 'stats')}>
              <BarChart2 className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
              <span className="hidden sm:inline">소비 통계</span>
            </Link>
          )
        ) : null}
        <Link href="/headfi/map" className={navButtonClass(activeNav === 'position')}>
          <Map className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
          <span className="hidden sm:inline">포지션 맵</span>
        </Link>
        {onDeviceMatchClick ? (
          <button
            type="button"
            className={navButtonClass(activeNav === 'device-match')}
            onClick={onDeviceMatchClick}
          >
            <Shuffle className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">기기 매칭</span>
          </button>
        ) : (
          <Link href={deviceMatchHref} className={navButtonClass(activeNav === 'device-match')}>
            <Shuffle className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">기기 매칭</span>
          </Link>
        )}
        <Link href="/headfi/match" className={navButtonClass(activeNav === 'album-match')}>
          <Music className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
          <span className="hidden sm:inline">앨범 매칭</span>
        </Link>
        {showRegister && isAuthenticated ? (
          <button
            type="button"
            className="btn-apple btn-apple-secondary flex h-[42px] w-[42px] items-center justify-center"
            onClick={onRegisterClick}
            aria-label="기기 등록하기"
          >
            <span className="text-lg leading-none">＋</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

type HeadfiSubHeaderProps = {
  icon: LucideIcon;
  title: string;
};

export function HeadfiSubHeader({ icon: Icon, title }: HeadfiSubHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-2">
      <Link
        href="/headfi"
        className="inline-flex items-center justify-center rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="헤드파이 목록으로 이동"
      >
        <ChevronLeft className="size-6" strokeWidth={1.75} />
      </Link>
      <Icon className="size-6 shrink-0 opacity-80" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
