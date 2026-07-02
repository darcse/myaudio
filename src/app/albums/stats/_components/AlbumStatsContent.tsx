'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { BarChart3, ChevronLeft, Disc, Mic2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { deleteAlbumFromDB, saveAlbumToDB, updateAlbumInDB } from '@/app/albums/actions';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { ArtistDetailModal } from '@/app/artists/_components/ArtistDetailModal';
import { buildListenHistoryIndex } from '@/app/artists/utils';
import {
  buildAlbumListenRankings,
  buildArtistListenRankings,
  buildWeeklyHotAlbumRankings,
  clampListenPeriodFilter,
  filterHistoryByPeriod,
  formatPeriodLabel,
  getRollingSevenDayRange,
  getDefaultListenPeriodFilter,
  LISTEN_RANKING_LIMIT,
  listStatsMonths,
  listStatsYears,
  type AlbumListenRankItem,
  type ArtistListenRankItem,
  type ListenPeriodFilter,
} from '../albumListenStats';
import { WeeklyHotAlbumsSection } from './WeeklyHotAlbumsSection';

type HistoryRow = { album_id: number | null; listened_at: string | null };

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
};

function filterToggleStyle(active: boolean): React.CSSProperties {
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

function RankingPanel({
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
      className="flex min-h-[20rem] flex-col rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--border)' }}
      >
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function AlbumRankRow({
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
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-opacity hover:opacity-90"
    >
      <RankBadge rank={rank} />
      <div
        className="relative size-11 shrink-0 overflow-hidden rounded-md"
        style={{ background: 'var(--badge-bg)' }}
      >
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center opacity-40">
            <Disc className="size-4" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.albumName}</p>
        <p className="truncate text-xs opacity-60">{item.artist || '—'}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </button>
  );
}

function ArtistRankRow({
  item,
  rank,
  onClick,
}: {
  item: ArtistListenRankItem;
  rank: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-opacity hover:opacity-90"
    >
      <RankBadge rank={rank} />
      <div
        className="relative size-11 shrink-0 overflow-hidden rounded-full"
        style={{ background: 'var(--badge-bg)' }}
      >
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center opacity-40">
            <Mic2 className="size-4" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.artistName}</p>
        <p className="truncate text-xs opacity-60">{item.albumCount}장 청취</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </button>
  );
}

export function AlbumStatsContent() {
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingArtistName, setViewingArtistName] = useState<string | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [now, setNow] = useState(() => new Date());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const [albumRes, historyRes] = await Promise.all([
        client.from('album').select('*').order('release_date', { ascending: false }),
        client.from('album_listen_history').select('album_id, listened_at'),
      ]);
      if (albumRes.error) {
        toast.error('앨범 목록을 불러오지 못했습니다.');
        setAlbums([]);
      } else {
        setAlbums((albumRes.data ?? []) as Album[]);
      }
      if (historyRes.error) {
        toast.error('청취 기록을 불러오지 못했습니다.');
        setHistoryRows([]);
      } else {
        setHistoryRows(historyRes.data ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    const { data, error } = await createClient()
      .from('album_listen_history')
      .select('album_id, listened_at');
    if (error) {
      toast.error('청취 기록을 불러오지 못했습니다.');
      return;
    }
    setHistoryRows(data ?? []);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true) return;
    void createClient()
      .from('headfi')
      .select('id, brand, model')
      .eq('category', '헤드폰')
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

  const yearOptions = useMemo(() => listStatsYears(), []);
  const monthOptions = useMemo(() => listStatsMonths(periodFilter.year), [periodFilter.year]);
  const filteredHistoryRows = useMemo(
    () => filterHistoryByPeriod(historyRows, periodFilter),
    [historyRows, periodFilter],
  );
  const listenHistoryIndex = useMemo(
    () => buildListenHistoryIndex(filteredHistoryRows),
    [filteredHistoryRows],
  );
  const albumRanking = useMemo(
    () => buildAlbumListenRankings(albums, filteredHistoryRows),
    [albums, filteredHistoryRows],
  );
  const artistRanking = useMemo(
    () => buildArtistListenRankings(albums, filteredHistoryRows),
    [albums, filteredHistoryRows],
  );
  const weekRange = useMemo(() => getRollingSevenDayRange(now), [now]);
  const weeklyHotAlbums = useMemo(
    () => buildWeeklyHotAlbumRankings(albums, historyRows, now),
    [albums, historyRows, now],
  );
  const hasAnyListenData = historyRows.length > 0;
  const hasPeriodListenData = albumRanking.length > 0 || artistRanking.length > 0;

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
    if (isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!albumFormItem) return;
    setIsSaving(true);
    try {
      const data = {
        ...albumFormData,
        matching1: albumFormData.matching1 === ' ' ? '' : albumFormData.matching1,
        matching2: albumFormData.matching2 === ' ' ? '' : albumFormData.matching2,
      };
      const updateId =
        'id' in albumFormItem && typeof albumFormItem.id === 'number' ? albumFormItem.id : null;
      if (updateId != null) {
        await updateAlbumInDB(updateId, data);
        const { data: updatedRow } = await createClient()
          .from('album')
          .select('*')
          .eq('id', updateId)
          .single();
        if (updatedRow) {
          const updated = updatedRow as Album;
          setAlbums((prev) => prev.map((album) => (album.id === updateId ? updated : album)));
          setViewingAlbum(updated);
          setAudioTags(updated.audio_tags ?? []);
        }
        toast.success('앨범 정보가 수정되었습니다.');
      } else {
        await saveAlbumToDB(data);
        toast.success('앨범이 등록되었습니다.');
        await fetchData();
      }
      setAlbumFormItem(null);
    } catch (e) {
      const message =
        e instanceof Error && e.message === 'Unauthorized'
          ? '로그인이 필요합니다.'
          : '저장 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromModal = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!viewingAlbum) return;
    if (!confirm('정말 이 앨범을 삭제하시겠습니까?')) return;
    const deletedId = viewingAlbum.id;
    setIsDeleting(true);
    try {
      await deleteAlbumFromDB(deletedId);
      toast.success('앨범이 삭제되었습니다.');
      setViewingAlbum(null);
      setAlbums((prev) => prev.filter((album) => album.id !== deletedId));
      await refreshHistory();
    } catch (e) {
      const message =
        e instanceof Error && e.message === 'Unauthorized'
          ? '로그인이 필요합니다.'
          : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshAlbumIntro = async () => {
    if (!viewingAlbum || isAuthenticated === false) return;
    setAlbumIntroLoading(true);
    try {
      const res = await fetch('/api/album-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: viewingAlbum.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      const updated: Album = {
        ...viewingAlbum,
        audio_tags: payload.audio_tags ?? [],
        album_intro: payload.album_intro ?? '',
        ai_recommended_headphone_ids: null,
        ai_recommended_headphone_reason: null,
      };
      setViewingAlbum(updated);
      setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)));
      setAudioTags((payload.audio_tags as string[]) ?? []);
      toast.success('앨범 소개와 태그를 갱신했습니다.');
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ ...prev, year }));
  };

  const handleMonthChange = (month: number | 'all') => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ ...prev, month }));
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6">
        <Link
          href="/albums"
          className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          Albums
        </Link>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
          앨범 통계
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : (
        <>
          <WeeklyHotAlbumsSection
            items={weeklyHotAlbums}
            weekRange={weekRange}
            onAlbumClick={openAlbum}
          />

          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
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
                  key={month === 'all' ? 'all' : month}
                  type="button"
                  onClick={() => handleMonthChange(month)}
                  className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                  style={filterToggleStyle(periodFilter.month === month)}
                  aria-pressed={periodFilter.month === month}
                >
                  {month === 'all' ? '전체' : `${month}월`}
                </button>
              ))}
            </div>
          </div>

          {!hasAnyListenData ? (
            <div
              className="rounded-xl border px-6 py-16 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium opacity-80">아직 청취 기록이 없습니다.</p>
              <p className="mt-2 text-sm opacity-60">
                앨범을 재생하거나 청취 이력을 기록하면 랭킹이 표시됩니다.
              </p>
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
            <div className="grid gap-6 lg:grid-cols-2">
              <RankingPanel
                title={`최다 청취 앨범 TOP ${LISTEN_RANKING_LIMIT}`}
                icon={<Disc className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              >
                {albumRanking.length > 0 ? (
                  <ul className="space-y-0.5">
                    {albumRanking.map((item, index) => (
                      <li key={item.albumId}>
                        <AlbumRankRow
                          item={item}
                          rank={index + 1}
                          onClick={() => openAlbum(item.albumId)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-8 text-center text-sm opacity-60">청취 기록이 있는 앨범이 없습니다.</p>
                )}
              </RankingPanel>
              <RankingPanel
                title={`최다 청취 아티스트 TOP ${LISTEN_RANKING_LIMIT}`}
                icon={<Mic2 className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              >
                {artistRanking.length > 0 ? (
                  <ul className="space-y-0.5">
                    {artistRanking.map((item, index) => (
                      <li key={item.artistName}>
                        <ArtistRankRow
                          item={item}
                          rank={index + 1}
                          onClick={() => setViewingArtistName(item.artistName)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-8 text-center text-sm opacity-60">청취 기록이 있는 아티스트가 없습니다.</p>
                )}
              </RankingPanel>
            </div>
          )}
        </>
      )}

      <section
        className="mt-10 min-h-[12rem] border-t pt-8"
        style={{ borderColor: 'var(--border)' }}
        aria-label="청취 추이"
      />

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
