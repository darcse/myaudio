'use client';

import type { ReactNode } from 'react';
import { Crown, Disc, Flame, UserCircle } from 'lucide-react';
import { ALBUM_COVER_BLUR_OVERLAY } from '@/app/albums/_components/AlbumCoverBlurBackdrop';
import type { AlbumListenRankItem, WeekRange, WeeklyHotArtistItem } from '../albumListenStats';
import { WEEKLY_HOT_ALBUM_LIMIT, formatWeekRangeLabel } from '../albumListenStats';

const ARTIST_CARD_OVERLAY =
  'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 46%, rgba(0,0,0,0.42) 100%)';
const ARTIST_CARD_FALLBACK_BG =
  'linear-gradient(180deg, color-mix(in srgb, var(--foreground) 16%, var(--card-bg)), var(--badge-bg))';
const ALBUM_CARD_OVERLAY =
  'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.58) 38%, rgba(0,0,0,0.18) 68%, transparent 100%)';

type WeeklyHotAlbumsSectionProps = {
  items: AlbumListenRankItem[];
  hotArtist: WeeklyHotArtistItem | null;
  artistProfileUrl: string | null;
  weekRange: WeekRange;
  onAlbumClick: (albumId: number) => void;
};

function HotPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="flex min-h-0 flex-col rounded-xl border lg:h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--border)' }}
      >
        {icon}
        {title}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </section>
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
  const showImage = Boolean(item.coverImageUrl);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-[12.5rem] w-full overflow-hidden rounded-xl border text-left transition-opacity hover:opacity-90 sm:aspect-square sm:h-auto"
      style={{
        borderColor: 'var(--border)',
        background: showImage ? 'var(--badge-bg)' : ARTIST_CARD_FALLBACK_BG,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.coverImageUrl!} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <Disc className="size-10 opacity-40" strokeWidth={1.5} />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: ALBUM_CARD_OVERLAY }} aria-hidden />
      <span
        className="absolute left-2 top-2 z-[2] flex size-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        {rank}
      </span>
      <div className="relative z-[1] flex h-full flex-col justify-end p-3 text-white">
        <p className="line-clamp-2 text-sm font-bold drop-shadow-sm">{item.albumName}</p>
        <p className="mt-0.5 truncate text-xs text-white/80 drop-shadow-sm">{item.artist || '—'}</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums drop-shadow-sm">{item.listenCount}회</p>
      </div>
    </button>
  );
}

function WeeklyHotArtistCard({
  artist,
  profileImageUrl,
}: {
  artist: WeeklyHotArtistItem | null;
  profileImageUrl: string | null;
}) {
  const showImage = Boolean(artist && profileImageUrl);

  return (
    <div
      className="relative h-40 w-full overflow-hidden rounded-xl border lg:h-full"
      style={{
        borderColor: 'var(--border)',
        background: showImage ? 'var(--badge-bg)' : ARTIST_CARD_FALLBACK_BG,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImageUrl!}
          alt=""
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <UserCircle className="size-12 opacity-35" strokeWidth={1.25} />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: showImage ? ARTIST_CARD_OVERLAY : ALBUM_COVER_BLUR_OVERLAY }}
        aria-hidden
      />
      <div className="relative z-[1] flex h-full flex-col justify-end p-3 text-white">
        {artist ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold drop-shadow-sm">{artist.artistName}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums drop-shadow-sm">
              {artist.listenCount}회
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium drop-shadow-sm">집계할 아티스트가 없습니다</p>
        )}
      </div>
    </div>
  );
}

export function WeeklyHotAlbumsSection({
  items,
  hotArtist,
  artistProfileUrl,
  weekRange,
  onAlbumClick,
}: WeeklyHotAlbumsSectionProps) {
  const albumSlots = Array.from(
    { length: WEEKLY_HOT_ALBUM_LIMIT },
    (_, index) => items[index] ?? null,
  );

  return (
    <>
      <section
        className="mb-4 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
            <Flame className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
            Weekly Hot
          </h2>
          <p className="text-xs opacity-60 sm:text-sm">{formatWeekRangeLabel(weekRange)}</p>
        </div>
      </section>

      {items.length === 0 ? (
        <section
          className="mb-8 rounded-xl border"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
        >
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium opacity-80">최근 7일 청취 기록이 없습니다.</p>
            <p className="mt-2 text-sm opacity-60">오늘 포함 최근 7일간 청취하면 여기에 표시됩니다.</p>
          </div>
        </section>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-stretch">
          <HotPanel
            title="핫 아티스트"
            icon={<Crown className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />}
          >
            <div className="min-h-0 flex-1">
              <WeeklyHotArtistCard artist={hotArtist} profileImageUrl={artistProfileUrl} />
            </div>
          </HotPanel>
          <HotPanel
            title="핫 앨범"
            icon={<Flame className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />}
          >
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch">
              {albumSlots.map((item, index) =>
                item ? (
                  <div key={item.albumId} className="min-w-0 sm:h-full">
                    <WeeklyHotAlbumCard
                      item={item}
                      rank={index + 1}
                      onClick={() => onAlbumClick(item.albumId)}
                    />
                  </div>
                ) : (
                  <div
                    key={`hot-album-empty-${index}`}
                    className="hidden min-w-0 sm:block sm:aspect-square"
                    aria-hidden
                  />
                ),
              )}
            </div>
          </HotPanel>
        </div>
      )}
    </>
  );
}
