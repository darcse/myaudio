/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Disc, Trophy, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { useAlbumMutations } from '@/app/albums/_hooks/useAlbumMutations';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { ArtistDetailModal } from '@/app/artists/_components/ArtistDetailModal';
import { applyAlbumNameRetarget } from '@/app/artists/lib/updateArtistNames';
import { buildListenHistoryIndex } from '@/app/artists/utils';
import {
  buildGenre1ListenRankings,
  buildGenre2ListenRankings,
  clampListenPeriodFilter,
  filterHistoryByPeriod,
  formatPeriodLabel,
  formatStatsMonthOptionLabel,
  getDefaultListenPeriodFilter,
  listStatsMonths,
  listStatsYears,
  type Genre2ListenRankItem,
  type GenreLabelAlbum,
  type GenreLabelArtist,
  type ListenPeriodFilter,
  type ListenPeriodMonth,
} from '@/app/albums/stats/albumListenStats';

type HistoryRow = { album_id: number | null; listened_at: string | null };
type GenreField = 'genre1' | 'genre2';

const DETAIL_ARTIST_LIMIT = 5;
const DETAIL_ALBUM_LIMIT = 5;
const DETAIL_SLOT_COUNT = 5;
const DETAIL_THUMB_MAX_CLASS = 'max-h-[7.5rem] max-w-[7.5rem]';

const initialAlbumFormData: AlbumFormData = {
  artist: '',
  artist_type: '',
  country: '',
  album_name: '',
  album_type: '',
  year: ['2026'],
  release_date: '',
  genre1: '',
  genre2: '',
  composer: '',
  composer_country: '',
  composer_era: '',
  composer_wiki_url: '',
  cover_image_url: '',
  matching1: '',
  matching2: '',
  title_song_url: '',
  wiki_url: '',
  album_intro: '',
  recommended_hp1: '',
  recommended_hp2: '',
  recommended_hp3: '',
  mood_names: [],
  owns_cd: false,
  owns_lp: false,
  owns_cassette: false,
};

function padDetailSlots<T>(items: T[]): Array<T | null> {
  return Array.from({ length: DETAIL_SLOT_COUNT }, (_, index) => items[index] ?? null);
}

function filterToggleStyle(active: boolean): CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

function RankBadge({ rank }: { rank: number }) {
  const highlight = rank <= 3;
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
      style={{
        background: highlight ? 'var(--foreground)' : 'var(--badge-bg)',
        color: highlight ? 'var(--background)' : 'var(--foreground)',
        opacity: highlight ? 1 : 0.75,
      }}
    >
      {rank}
    </span>
  );
}

function GenreListItem({
  item,
  selected,
  onSelect,
}: {
  item: Genre2ListenRankItem;
  selected: boolean;
  onSelect: (label: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.label)}
      aria-pressed={selected}
      className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors"
      style={{
        background: selected ? 'var(--badge-bg)' : 'transparent',
      }}
    >
      <RankBadge rank={item.rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.label}</p>
        <p className="mt-0.5 text-xs opacity-60 tabular-nums">앨범 {item.albumCount}장</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </button>
  );
}

function DetailArtistCard({
  artist,
  profileImageUrl,
  onClick,
}: {
  artist: GenreLabelArtist;
  profileImageUrl: string | null;
  onClick: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(profileImageUrl && !imageError);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 w-full cursor-pointer flex-col items-center gap-2 text-center transition-opacity hover:opacity-80"
    >
      <div
        className={`aspect-square w-full overflow-hidden rounded-full ${DETAIL_THUMB_MAX_CLASS}`}
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        {showImage ? (
          <img
            src={profileImageUrl!}
            alt={`${artist.name} 프로필`}
            loading="lazy"
            className="size-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UserCircle className="size-[55%] opacity-35" strokeWidth={1.25} aria-hidden />
          </div>
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="truncate text-xs font-medium leading-tight">{artist.name}</p>
        <p className="mt-0.5 truncate text-[11px] tabular-nums opacity-55">{artist.listenCount}회</p>
      </div>
    </button>
  );
}

function DetailAlbumCard({
  album,
  onClick,
}: {
  album: GenreLabelAlbum;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 w-full cursor-pointer flex-col items-center gap-2 text-center transition-opacity hover:opacity-80"
    >
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-lg ${DETAIL_THUMB_MAX_CLASS}`}
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        {album.coverImageUrl ? (
          <img
            src={album.coverImageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Disc className="size-[40%] max-w-10 opacity-40" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="truncate text-xs font-medium leading-tight">{album.albumName}</p>
        <p className="mt-0.5 truncate text-[11px] tabular-nums opacity-55">{album.listenCount}회</p>
      </div>
    </button>
  );
}

function GenreDetailPanel({
  item,
  artistProfileUrls,
  onArtistClick,
  onAlbumClick,
}: {
  item: Genre2ListenRankItem | null;
  artistProfileUrls: Record<string, string | null>;
  onArtistClick: (name: string) => void;
  onAlbumClick: (albumId: number) => void;
}) {
  if (!item) {
    return (
      <p className="px-2 py-8 text-center text-sm opacity-60">선택된 장르가 없습니다.</p>
    );
  }

  const artistSlots = padDetailSlots(item.topArtists);
  const albumSlots = padDetailSlots(item.topAlbums);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <h3 className="text-lg font-semibold">{item.label}</h3>
        <p className="mt-1 text-sm opacity-70 tabular-nums">
          앨범 {item.albumCount}장 · 청취 {item.listenCount}회
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <p className="mb-3 text-xs font-semibold opacity-60">대표 아티스트</p>
          {item.topArtists.length > 0 ? (
            <div className="grid grid-cols-3 items-start gap-2 sm:gap-3 lg:grid-cols-5">
              {artistSlots.map((artist, index) => (
                <div key={artist?.name ?? `artist-empty-${index}`} className="min-w-0">
                  {artist ? (
                    <DetailArtistCard
                      artist={artist}
                      profileImageUrl={artistProfileUrls[artist.name] ?? null}
                      onClick={() => onArtistClick(artist.name)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-55">대표 아티스트가 없습니다.</p>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <p className="mb-3 text-xs font-semibold opacity-60">대표 앨범</p>
          {item.topAlbums.length > 0 ? (
            <div className="grid grid-cols-3 items-start gap-2 sm:gap-3 lg:grid-cols-5">
              {albumSlots.map((album, index) => (
                <div key={album?.albumId ?? `album-empty-${index}`} className="min-w-0">
                  {album ? (
                    <DetailAlbumCard album={album} onClick={() => onAlbumClick(album.albumId)} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-55">대표 앨범이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function GenreStatsContent() {
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [artistProfileUrls, setArtistProfileUrls] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);
  const [genreField, setGenreField] = useState<GenreField>('genre1');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingArtistName, setViewingArtistName] = useState<string | null>(null);
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createClient();
      const [albumRes, historyRes, artistsRes] = await Promise.all([
        client.from('album').select('*'),
        client.from('album_listen_history').select('album_id, listened_at'),
        client.from('artists').select('artist_name, profile_image_url'),
      ]);
      const errors: string[] = [];
      if (albumRes.error) {
        errors.push('앨범 목록을 불러오지 못했습니다.');
        setAlbums([]);
      } else {
        setAlbums((albumRes.data ?? []) as Album[]);
      }
      if (historyRes.error) {
        errors.push('청취 기록을 불러오지 못했습니다.');
        setHistoryRows([]);
      } else {
        setHistoryRows((historyRes.data ?? []) as HistoryRow[]);
      }
      if (artistsRes.error) {
        setArtistProfileUrls({});
      } else {
        const profiles: Record<string, string | null> = {};
        for (const row of artistsRes.data ?? []) {
          const name = typeof row.artist_name === 'string' ? row.artist_name.trim() : '';
          if (!name) continue;
          profiles[name] =
            typeof row.profile_image_url === 'string' && row.profile_image_url.trim()
              ? row.profile_image_url.trim()
              : null;
        }
        setArtistProfileUrls(profiles);
      }
      if (errors.length > 0) {
        const message = errors.join(' ');
        setLoadError(message);
        toast.error(message);
      }
    } catch {
      const message = '장르 통계를 불러오지 못했습니다.';
      setLoadError(message);
      toast.error(message);
      setAlbums([]);
      setHistoryRows([]);
      setArtistProfileUrls({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setHeadfiOwnedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id, brand, model')
      .in('category', ['헤드폰', '이어폰'])
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        setHeadfiOwnedHeadphones(
          (data ?? []).map((row) => ({
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
          })),
        );
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!viewingAlbum?.id) {
      setRecommendedHeadphones([]);
      setAudioTags([]);
      return;
    }
    setAudioTags(viewingAlbum.audio_tags ?? []);
    const ids = (viewingAlbum.manual_recommended_headphone_ids ?? []).slice(0, 2);
    if (ids.length === 0) {
      setRecommendedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id, brand, model, image_url')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter(
            (h): h is { id: number; brand: string; model: string; image_url: string | null } => !!h,
          )
          .map((h) => ({
            id: h.id,
            brand: h.brand || '',
            model: h.model || '',
            image_url: h.image_url ?? null,
          }));
        setRecommendedHeadphones(ordered);
      });
  }, [viewingAlbum?.id, viewingAlbum?.manual_recommended_headphone_ids, viewingAlbum?.audio_tags]);

  const refreshHistory = useCallback(async () => {
    const { data, error } = await createClient()
      .from('album_listen_history')
      .select('album_id, listened_at');
    if (error) {
      toast.error('청취 기록을 불러오지 못했습니다.');
      return;
    }
    setHistoryRows((data ?? []) as HistoryRow[]);
  }, []);

  const openAlbum = useCallback(
    (albumId: number) => {
      const cached = albums.find((album) => album.id === albumId);
      if (cached) {
        setViewingAlbum(cached);
        return;
      }
      void createClient()
        .from('album')
        .select('*')
        .eq('id', albumId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error('앨범 정보를 불러오지 못했습니다.');
            return;
          }
          setViewingAlbum(data as Album);
        });
    },
    [albums],
  );

  const closeAlbumModal = () => {
    setViewingAlbum(null);
    void refreshHistory();
  };

  const handleAlbumEditClick = () => {
    if (!viewingAlbum) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingAlbum;
    setViewingAlbum(null);
    setAlbumFormItem(item);
    setAlbumFormData(
      albumToFormData(item, {
        album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
      }),
    );
  };

  const handleAlbumImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setAlbumFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAlbumSave = async () => {
    if (!albumFormItem) return;
    const result = await saveAlbum({ formItem: albumFormItem, formData: albumFormData });
    if (result.status === 'updated') {
      if (result.album) {
        setAlbums((prev) => prev.map((album) => (album.id === result.album!.id ? result.album! : album)));
        setViewingAlbum(result.album);
        setAudioTags(result.album.audio_tags ?? []);
      }
      setAlbumFormItem(null);
      return;
    }
    if (result.status === 'created') {
      await fetchData();
      setAlbumFormItem(null);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!viewingAlbum) return;
    const deletedId = viewingAlbum.id;
    const deleted = await deleteAlbum({ albumId: deletedId });
    if (!deleted) return;
    setViewingAlbum(null);
    setAlbums((prev) => prev.filter((album) => album.id !== deletedId));
    await refreshHistory();
  };

  const handleRefreshAlbumIntro = async () => {
    if (!viewingAlbum) return;
    await refreshAlbumIntro({
      album: viewingAlbum,
      onUpdated: (updated, tags) => {
        setViewingAlbum(updated);
        setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)));
        setAudioTags(tags);
      },
    });
  };

  const yearOptions = useMemo(() => listStatsYears(), []);
  const monthOptions = useMemo(() => listStatsMonths(periodFilter.year), [periodFilter.year]);
  const isAllMonths = periodFilter.month === 'all';
  const rankingLimit = isAllMonths ? 20 : 10;

  const filteredHistoryRows = useMemo(
    () => filterHistoryByPeriod(historyRows, periodFilter),
    [historyRows, periodFilter],
  );

  const ranking = useMemo(
    () =>
      genreField === 'genre1'
        ? buildGenre1ListenRankings(
            albums,
            filteredHistoryRows,
            rankingLimit,
            DETAIL_ARTIST_LIMIT,
            DETAIL_ALBUM_LIMIT,
          )
        : buildGenre2ListenRankings(
            albums,
            filteredHistoryRows,
            rankingLimit,
            DETAIL_ARTIST_LIMIT,
            DETAIL_ALBUM_LIMIT,
          ),
    [albums, filteredHistoryRows, genreField, rankingLimit],
  );

  const selectedItem =
    ranking.find((item) => item.label === selectedLabel) ?? ranking[0] ?? null;
  const activeLabel = selectedItem?.label ?? null;
  const listenHistoryIndex = useMemo(
    () => buildListenHistoryIndex(historyRows),
    [historyRows],
  );

  useEffect(() => {
    if (selectedLabel == null) return;
    if (!ranking.some((item) => item.label === selectedLabel)) {
      setSelectedLabel(null);
    }
  }, [ranking, selectedLabel]);

  const hasAnyListenData = historyRows.length > 0;
  const hasPeriodListenData = filteredHistoryRows.length > 0;

  const handleGenreFieldChange = (field: GenreField) => {
    setGenreField(field);
    setSelectedLabel(null);
  };

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year, month: prev.month }));
    setSelectedLabel(null);
  };

  const handleMonthChange = (month: ListenPeriodMonth) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year: prev.year, month }));
    setSelectedLabel(null);
  };

  if (isAuthenticated !== true) {
    return <p className="py-12 text-center text-sm opacity-70">로그인 후 장르 통계를 확인할 수 있습니다.</p>;
  }

  return (
    <div className="relative">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : (
        <>
          {loadError ? <p className="mb-4 text-sm opacity-70">{loadError}</p> : null}

          <section
            className="mb-6 rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <div
              className="rounded-t-xl border-b px-4 py-3 sm:px-5"
              style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <Trophy className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                장르 통계
              </h2>
            </div>
            <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold opacity-60">연도</span>
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearChange(year)}
                      className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                      style={filterToggleStyle(periodFilter.year === year)}
                      aria-pressed={periodFilter.year === year}
                    >
                      {year}년
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold opacity-60">월</span>
                  {monthOptions.map((month) => (
                    <button
                      key={String(month)}
                      type="button"
                      onClick={() => handleMonthChange(month)}
                      className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                      style={filterToggleStyle(periodFilter.month === month)}
                      aria-pressed={periodFilter.month === month}
                    >
                      {formatStatsMonthOptionLabel(month)}
                    </button>
                  ))}
                </div>
              </div>
              {hasPeriodListenData ? (
                <p className="text-sm font-semibold opacity-90">
                  {formatPeriodLabel(periodFilter)} · 청취 {filteredHistoryRows.length}회
                </p>
              ) : null}
            </div>
          </section>

          {!hasAnyListenData ? (
            <div
              className="rounded-xl border px-6 py-16 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium opacity-80">아직 청취 기록이 없습니다.</p>
              <p className="mt-2 text-sm opacity-60">청취 이력을 기록하면 장르 랭킹이 표시됩니다.</p>
            </div>
          ) : !hasPeriodListenData ? (
            <div
              className="rounded-xl border px-6 py-16 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium opacity-80">
                {formatPeriodLabel(periodFilter)}에 청취 기록이 없습니다.
              </p>
              <p className="mt-2 text-sm opacity-60">다른 연도나 월을 선택해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:h-[min(70vh,40rem)] lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-stretch">
              <section
                className="flex min-h-0 flex-col rounded-xl border lg:h-full"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
              >
                <div
                  className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b px-2.5 py-2.5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGenreFieldChange('genre1')}
                      className="shrink-0 rounded-full px-2 py-1 font-medium transition-colors"
                      style={filterToggleStyle(genreField === 'genre1')}
                      aria-pressed={genreField === 'genre1'}
                    >
                      장르1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenreFieldChange('genre2')}
                      className="shrink-0 rounded-full px-2 py-1 font-medium transition-colors"
                      style={filterToggleStyle(genreField === 'genre2')}
                      aria-pressed={genreField === 'genre2'}
                    >
                      장르2
                    </button>
                  </div>
                  <span className="shrink-0 text-xs font-semibold opacity-60">TOP {rankingLimit}</span>
                </div>
                <div className="min-h-0 max-h-80 flex-1 overflow-y-auto lg:max-h-none">
                  {ranking.length > 0 ? (
                    <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {ranking.map((item) => (
                        <li key={item.label} style={{ borderColor: 'var(--border)' }}>
                          <GenreListItem
                            item={item}
                            selected={item.label === activeLabel}
                            onSelect={setSelectedLabel}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2 py-8 text-center text-sm opacity-60">
                      {genreField === 'genre1'
                        ? '장르1이 설정된 앨범의 청취 기록이 없습니다.'
                        : '장르2가 설정된 앨범의 청취 기록이 없습니다.'}
                    </p>
                  )}
                </div>
              </section>
              <section
                className="flex min-h-0 flex-col rounded-xl border lg:h-full"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
                  <GenreDetailPanel
                    item={selectedItem}
                    artistProfileUrls={artistProfileUrls}
                    onArtistClick={setViewingArtistName}
                    onAlbumClick={openAlbum}
                  />
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={(viewingAlbum.album_intro ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={closeAlbumModal}
          onEdit={handleAlbumEditClick}
          onDelete={() => void handleDeleteFromModal()}
          isDeleting={isDeleting}
          isAuthenticated={isAuthenticated}
          onAlbumPatch={(updated) => {
            setViewingAlbum(updated);
            setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)));
          }}
        />
      ) : null}

      {viewingArtistName ? (
        <ArtistDetailModal
          artistName={viewingArtistName}
          albums={albums}
          listenHistoryIndex={listenHistoryIndex}
          isAuthenticated={isAuthenticated}
          onClose={() => {
            setViewingArtistName(null);
            void refreshHistory();
          }}
          onAlbumClick={(album) => {
            setViewingArtistName(null);
            setViewingAlbum(album);
          }}
          onSelectArtist={setViewingArtistName}
          onArtistNamesUpdated={({ albumArtistName, recordArtistName, newName }) => {
            setViewingArtistName(newName);
            setAlbums((prev) =>
              prev.map((album) =>
                applyAlbumNameRetarget(album, albumArtistName, recordArtistName, newName),
              ),
            );
            setArtistProfileUrls((prev) => {
              const next = { ...prev };
              const sourceKey = albumArtistName in next ? albumArtistName : recordArtistName;
              if (sourceKey in next) {
                next[newName] = next[sourceKey];
                if (sourceKey !== newName) delete next[sourceKey];
              }
              return next;
            });
          }}
        />
      ) : null}

      {albumFormItem ? (
        <AlbumForm
          selectedItem={albumFormItem}
          formData={albumFormData}
          setFormData={setAlbumFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setAlbumFormItem(null)}
          onSave={() => void handleAlbumSave()}
          onImageUpload={handleAlbumImageUpload}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
