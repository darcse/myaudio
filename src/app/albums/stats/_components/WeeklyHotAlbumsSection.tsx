'use client';

import { Crown, Disc, Flame } from 'lucide-react';
import { ALBUM_COVER_BLUR_OVERLAY } from '@/app/albums/_components/AlbumCoverBlurBackdrop';
import type { AlbumListenRankItem, WeekRange } from '../albumListenStats';
import { formatWeekRangeLabel } from '../albumListenStats';

type WeeklyHotAlbumsSectionProps = {
  items: AlbumListenRankItem[];
  weekRange: WeekRange;
  onAlbumClick: (albumId: number) => void;
};

function HotAlbumCover({
  coverImageUrl,
  albumName,
}: {
  coverImageUrl: string | null;
  albumName: string;
}) {
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16"
      style={{ background: 'var(--badge-bg)' }}
    >
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center opacity-40">
          <Disc className="size-5" strokeWidth={1.5} />
        </div>
      )}
      <span className="sr-only">{albumName}</span>
    </div>
  );
}

function WeeklyHotAlbumCard({
  item,
  rank,
  onClick,
}: {
  item: AlbumListenRankItem;
  rank: number;
  onClick: () => void;
}) {
  const isFirst = rank === 1;

  if (isFirst) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative h-full min-h-[12rem] w-full overflow-hidden rounded-xl border text-left text-white transition-opacity hover:opacity-90 sm:min-h-0"
        style={{ borderColor: 'var(--border)' }}
      >
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--badge-bg)' }}
            aria-hidden
          >
            <Disc className="size-12 opacity-40" strokeWidth={1.5} />
          </div>
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: ALBUM_COVER_BLUR_OVERLAY }}
          aria-hidden
        />
        <div
          className="absolute left-3 top-3 z-[2] flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:text-sm"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <Crown className="size-3.5 shrink-0 sm:size-4" strokeWidth={1.75} />
          <span>1위</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-4">
          <p className="line-clamp-2 text-base font-semibold leading-snug drop-shadow-sm sm:text-lg">
            {item.albumName}
          </p>
          <p className="mt-0.5 truncate text-sm text-white/80 drop-shadow-sm">{item.artist || '—'}</p>
          <p className="mt-1 text-sm font-bold tabular-nums drop-shadow-sm">{item.listenCount}회</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-opacity hover:opacity-90"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
        style={{ background: 'var(--badge-bg)' }}
      >
        {rank}
      </span>
      <HotAlbumCover coverImageUrl={item.coverImageUrl} albumName={item.albumName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.albumName}</p>
        <p className="truncate text-xs opacity-60">{item.artist || '—'}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </button>
  );
}

export function WeeklyHotAlbumsSection({
  items,
  weekRange,
  onAlbumClick,
}: WeeklyHotAlbumsSectionProps) {
  const first = items[0] ?? null;
  const rest = items.slice(1);

  return (
    <section
      className="mb-8 rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
          <Flame className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
          금주의 핫 앨범
        </h2>
        <p className="text-xs opacity-60 sm:text-sm">{formatWeekRangeLabel(weekRange)}</p>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium opacity-80">최근 7일 청취 기록이 없습니다.</p>
          <p className="mt-2 text-sm opacity-60">오늘 포함 최근 7일간 청취하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:items-stretch sm:p-5">
          {first ? (
            <WeeklyHotAlbumCard
              item={first}
              rank={1}
              onClick={() => onAlbumClick(first.albumId)}
            />
          ) : null}
          {rest.length > 0 ? (
            <div className="flex flex-col gap-2">
              {rest.map((item, index) => (
                <WeeklyHotAlbumCard
                  key={item.albumId}
                  item={item}
                  rank={index + 2}
                  onClick={() => onAlbumClick(item.albumId)}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
