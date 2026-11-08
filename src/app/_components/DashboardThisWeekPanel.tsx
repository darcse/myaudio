/* eslint-disable @next/next/no-img-element */
'use client';

import { Crown, Disc, Flame, Shuffle, UserCircle } from 'lucide-react';
import type { AlbumListenRankItem } from '@/app/albums/stats/albumListenStats';
import {
  formatWeekRangeLabel,
  type WeekRange,
  type WeeklyHotArtistItem,
  type WeeklyListenStats,
} from '@/lib/weeklyHot';

type DashboardThisWeekPanelProps = {
  weekRange: WeekRange;
  hotArtist: WeeklyHotArtistItem | null;
  hotAlbums: AlbumListenRankItem[];
  stats: WeeklyListenStats;
  artistProfileUrl: string | null;
  onAlbumClick: (albumId: number) => void;
  onArtistClick: (artistName: string) => void;
  onRandomClick: () => void;
};

const ALBUM_CARD_OVERLAY =
  'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.58) 38%, rgba(0,0,0,0.18) 68%, transparent 100%)';

function HotAlbumTile({
  item,
  rank,
  onClick,
}: {
  item: AlbumListenRankItem;
  rank: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square w-full overflow-hidden rounded-xl border text-left transition-opacity hover:opacity-90"
      style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
      title={`${item.albumName} · ${item.listenCount}회`}
      aria-label={`${item.albumName} 앨범 상세`}
    >
      {item.coverImageUrl ? (
        <img src={item.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Disc className="size-5 opacity-40" strokeWidth={1.5} />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: ALBUM_CARD_OVERLAY }} aria-hidden />
      <span
        className="absolute left-1.5 top-1.5 z-[2] flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-white"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        {rank}
      </span>
      <div className="relative z-[1] flex h-full min-w-0 flex-col justify-end p-2 text-white sm:p-2.5">
        <p className="truncate text-xs font-bold drop-shadow-sm">{item.albumName}</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums drop-shadow-sm">{item.listenCount}회</p>
      </div>
    </button>
  );
}

function HotArtistTile({
  artist,
  profileImageUrl,
  onClick,
}: {
  artist: WeeklyHotArtistItem;
  profileImageUrl: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
      title={`${artist.artistName} · ${artist.listenCount}회`}
      aria-label={`${artist.artistName} 아티스트 상세`}
    >
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <UserCircle className="size-8 opacity-35" strokeWidth={1.25} />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.35) 100%)',
        }}
        aria-hidden
      />
      <span
        className="absolute left-1.5 top-1.5 z-[1] flex size-5 items-center justify-center rounded-full text-white"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        aria-hidden
      >
        <Crown className="size-3" strokeWidth={1.75} />
      </span>
      <div className="relative z-[1] flex h-full flex-col justify-end p-2 text-white sm:p-2.5">
        <p className="truncate text-xs font-bold drop-shadow-sm">{artist.artistName}</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums drop-shadow-sm">{artist.listenCount}회</p>
      </div>
    </button>
  );
}

export function DashboardThisWeekPanel({
  weekRange,
  hotArtist,
  hotAlbums,
  stats,
  artistProfileUrl,
  onAlbumClick,
  onArtistClick,
  onRandomClick,
}: DashboardThisWeekPanelProps) {
  const hasData = stats.listenCount > 0;
  const albums = hotAlbums.slice(0, 3);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="inline-flex items-center gap-1.5 text-[15px] font-semibold leading-none opacity-80">
            <Flame className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            <span className="leading-none">이번 주</span>
          </h2>
          <p className="text-xs leading-none tabular-nums opacity-55">
            {formatWeekRangeLabel(weekRange)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasData ? (
            <p className="text-xs leading-none tabular-nums opacity-70">
              아티스트 {stats.artistCount}명 · 앨범 {stats.albumCount}장 · 청취 {stats.listenCount}회
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRandomClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition-opacity hover:opacity-90"
            style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)', color: 'var(--foreground)' }}
            aria-label="랜덤 추천"
          >
            <Shuffle className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden />
            랜덤 추천
          </button>
        </div>
      </div>

      {hasData ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {hotArtist ? (
              <HotArtistTile
                artist={hotArtist}
                profileImageUrl={artistProfileUrl}
                onClick={() => onArtistClick(hotArtist.artistName)}
              />
            ) : (
              <div
                className="aspect-square rounded-xl"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                aria-hidden
              />
            )}
            {albums.map((item, index) => (
              <HotAlbumTile
                key={item.albumId}
                item={item}
                rank={index + 1}
                onClick={() => onAlbumClick(item.albumId)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="flex min-h-0 flex-1 items-center text-sm opacity-60">이번 주 청취 기록이 없습니다</p>
      )}
    </div>
  );
}
