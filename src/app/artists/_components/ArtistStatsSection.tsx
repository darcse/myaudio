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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[11px] font-semibold opacity-60">등록 앨범</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums">{stats.totalAlbums}장</p>
      </div>
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[11px] font-semibold opacity-60">총 청취</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums">{stats.totalListenCount}회</p>
      </div>
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-[11px] font-semibold opacity-60">최근 청취일</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums">
          {formatListenDate(stats.latestListenedAt)}
        </p>
      </div>
    </div>
  );
}
