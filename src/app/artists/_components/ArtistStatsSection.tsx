'use client';

import type { ArtistStats } from '../types';

type ArtistStatsSectionProps = {
  stats: ArtistStats;
};

function formatListenDate(value: string | null): string {
  if (!value?.trim()) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('ko-KR');
}

export function ArtistStatsSection({ stats }: ArtistStatsSectionProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      <div
        className="rounded-xl px-2 py-2 sm:px-3 sm:py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-semibold opacity-60 sm:text-[11px]">등록 앨범</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums sm:text-sm">{stats.totalAlbums}장</p>
      </div>
      <div
        className="rounded-xl px-2 py-2 sm:px-3 sm:py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-semibold opacity-60 sm:text-[11px]">총 청취</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums sm:text-sm">{stats.totalListenCount}회</p>
      </div>
      <div
        className="rounded-xl px-2 py-2 sm:px-3 sm:py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-semibold opacity-60 sm:text-[11px]">최근 청취일</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums sm:text-sm">
          {formatListenDate(stats.latestListenedAt)}
        </p>
      </div>
    </div>
  );
}
