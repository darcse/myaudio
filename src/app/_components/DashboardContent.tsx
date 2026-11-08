/* eslint-disable @next/next/no-img-element */
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Headphones, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { updateAlbumInDB } from '@/app/albums/actions';
import type { Album, AlbumFormData } from '@/app/albums/types';
import {
  buildReceiverListenRankings,
  type GearListenHistoryRow,
  type GearListenRankItem,
  type GearSummary,
} from '@/app/albums/stats/albumListenStats';
import { updateHeadfiInDB, uploadHeadfiFrGraphImage, uploadHeadfiDeviceImage } from '@/app/headfi/actions';
import type { Headfi } from '@/app/headfi/types';
import { emptyHeadfiFormData, headfiToFormData } from '@/app/headfi/utils';
import { formatListenHistoryOptionLabel } from '@/lib/listenHistoryGear';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { WeeklyHotSnapshot } from '@/lib/weeklyHot';
import { buildSortedHeadfiCategories, HEADFI_CATEGORY_ICON } from './dashboard-icons';
import { useHeadfiComboOptions } from '@/app/headfi/useHeadfiComboOptions';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import { useHeadfiDacAmpMapLazyAnalysis } from '@/app/headfi/useHeadfiDacAmpMapLazyAnalysis';
import { applyAlbumNameRetarget } from '@/app/artists/lib/updateArtistNames';
import { buildListenHistoryIndex } from '@/app/artists/utils';
import type { ListenHistoryEntry } from '@/app/artists/types';
import { DashboardMonthlyListenCarousel } from './DashboardMonthlyListenCarousel';
import { DashboardThisWeekPanel } from './DashboardThisWeekPanel';

const AlbumDetailModal = dynamic(
  () => import('@/app/albums/_components/AlbumDetailModal').then((m) => ({ default: m.AlbumDetailModal })),
  { ssr: false },
);
const ArtistDetailModal = dynamic(
  () => import('@/app/artists/_components/ArtistDetailModal').then((m) => ({ default: m.ArtistDetailModal })),
  { ssr: false },
);
const AlbumLotteryModal = dynamic(
  () => import('@/app/albums/_components/AlbumLotteryModal').then((m) => ({ default: m.AlbumLotteryModal })),
  { ssr: false },
);
const HeadfiDetailModal = dynamic(
  () => import('@/app/headfi/_components/HeadfiDetailModal').then((m) => ({ default: m.HeadfiDetailModal })),
  { ssr: false },
);
const AlbumForm = dynamic(
  () => import('@/app/albums/_components/AlbumForm').then((m) => ({ default: m.AlbumForm })),
  { ssr: false },
);
const HeadfiForm = dynamic(
  () => import('@/app/headfi/_components/HeadfiForm').then((m) => ({ default: m.HeadfiForm })),
  { ssr: false },
);

export type MonthlyListenAlbum = {
  id: number;
  album_name: string;
  artist: string | null;
  cover_image_url: string | null;
  listenCount: number;
};

type MatchedAlbum = {
  id: number;
  album_name: string;
  artist: string;
  cover_image_url: string | null;
  release_date?: string | null;
};

type DashboardContentProps = {
  totalAlbums: number;
  totalHeadfi: number;
  monthlyListens: number;
  headfiCategoryRows: Pick<Headfi, 'category'>[];
  monthlyListenAlbums: MonthlyListenAlbum[];
  recentAlbums: Album[];
  recentHeadfi: Headfi[];
  weeklyHot: WeeklyHotSnapshot;
  weeklyHotArtistProfileUrl: string | null;
};

const recentAlbumGridClass = 'grid grid-cols-2 gap-4 sm:gap-6';
const recentHeadfiGridClass = 'grid grid-cols-2 gap-4 sm:gap-6';
const summaryCardClass = 'card-apple flex flex-col overflow-hidden p-4';
const bottomListenCarouselClass = 'card-apple flex flex-col overflow-hidden p-5 lg:col-span-3';
const bottomRowClass = 'grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch lg:gap-6';

function padMonthDay(n: number) {
  return String(n).padStart(2, '0');
}

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

function formYearsFromAlbum(year: Album['year']): string[] {
  if (year == null) return ['2026'];
  if (Array.isArray(year)) return year.length > 0 ? [...year] : ['2026'];
  const s = String(year).trim();
  return s ? [s] : ['2026'];
}

function albumFormDataFromItem(item: Album): AlbumFormData {
  const mids = (item.manual_recommended_headphone_ids ?? []).slice(0, 2);
  return {
    artist: item.artist ?? '',
    artist_type: item.artist_type ?? '',
    country: item.country ?? '',
    album_name: item.album_name ?? '',
    album_type: item.album_type ?? '',
    year: formYearsFromAlbum(item.year),
    release_date: item.release_date ?? '',
    genre1: item.genre1 ?? '',
    genre2: item.genre2 ?? '',
    composer: item.composer ?? '',
    composer_country: item.composer_country ?? '',
    composer_era: item.composer_era ?? '',
    composer_wiki_url: item.composer_wiki_url ?? '',
    cover_image_url: item.cover_image_url ?? '',
    matching1: item.matching1 ?? '',
    matching2: item.matching2 ?? '',
    title_song_url: item.title_song_url ?? '',
    youtube_playlist_id: item.youtube_playlist_id ?? '',
    wiki_url: item.wiki_url ?? '',
    album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
    recommended_hp1: mids[0] != null ? String(mids[0]) : '',
    recommended_hp2: mids[1] != null ? String(mids[1]) : '',
    recommended_hp3: '',
    mood_names: Array.isArray(item.mood_names) ? [...item.mood_names] : [],
    owns_cd: Boolean(item.owns_cd),
    owns_lp: Boolean(item.owns_lp),
    owns_cassette: Boolean(item.owns_cassette),
  };
}

export function DashboardContent({
  totalAlbums,
  totalHeadfi,
  monthlyListens,
  headfiCategoryRows,
  monthlyListenAlbums,
  recentAlbums,
  recentHeadfi,
  weeklyHot,
  weeklyHotArtistProfileUrl,
}: DashboardContentProps) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const { comboOptions, getPairingComboLabel } = useHeadfiComboOptions(isAuthenticated);
  const ownedHeadfiListHref = `/headfi?status=${encodeURIComponent('보유중')}`;
  const sortedHeadfiCategories = buildSortedHeadfiCategories(headfiCategoryRows);
  const ownedHeadfiTotal = sortedHeadfiCategories.reduce((sum, [, n]) => sum + n, 0);

  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [registeredAlbums, setRegisteredAlbums] = useState<MatchedAlbum[]>([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{
    id: number;
    brand: string;
    model: string;
  } | null>(null);
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string; image_url?: string | null }[]
  >([]);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [editingHeadfi, setEditingHeadfi] = useState<Headfi | null>(null);
  const [headfiFormData, setHeadfiFormData] = useState(emptyHeadfiFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [wirelessMatchingList, setWirelessMatchingList] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [randomLotteryOpen, setRandomLotteryOpen] = useState(false);
  const [viewingArtistName, setViewingArtistName] = useState<string | null>(null);
  const [artistModalAlbums, setArtistModalAlbums] = useState<Album[]>([]);
  const [artistListenHistoryIndex, setArtistListenHistoryIndex] = useState<
    Map<number, ListenHistoryEntry>
  >(() => new Map());
  const [artistModalLoading, setArtistModalLoading] = useState(false);
  const [monthlyReceivers, setMonthlyReceivers] = useState<GearListenRankItem[]>([]);
  const [monthlyReceiversLoading, setMonthlyReceiversLoading] = useState(true);

  const openAlbumById = useCallback(async (albumId: number) => {
    const { data, error } = await createClient().from('album').select('*').eq('id', albumId).maybeSingle();
    if (error || !data) {
      toast.error('앨범 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingAlbum(data as Album);
  }, []);

  const openArtistByName = useCallback(async (artistName: string) => {
    if (artistModalLoading) return;
    setArtistModalLoading(true);
    try {
      const client = createClient();
      const [albumRes, historyRes] = await Promise.all([
        client.from('album').select('*'),
        client.from('album_listen_history').select('album_id, listened_at'),
      ]);
      if (albumRes.error || historyRes.error) {
        toast.error('아티스트 정보를 불러오지 못했습니다.');
        return;
      }
      setArtistModalAlbums((albumRes.data ?? []) as Album[]);
      setArtistListenHistoryIndex(buildListenHistoryIndex(historyRes.data ?? []));
      setViewingArtistName(artistName);
    } catch {
      toast.error('아티스트 정보를 불러오지 못했습니다.');
    } finally {
      setArtistModalLoading(false);
    }
  }, [artistModalLoading]);

  const openHeadfiById = useCallback(async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(data as Headfi);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMonthlyReceivers = async () => {
      setMonthlyReceiversLoading(true);
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStart = `${year}-${padMonthDay(month)}-01`;
        const client = createClient();
        const { data: historyData, error: historyError } = await client
          .from('album_listen_history')
          .select('album_id, listened_at, headphone_id')
          .gte('listened_at', monthStart)
          .not('headphone_id', 'is', null);
        if (cancelled) return;
        if (historyError) {
          setMonthlyReceivers([]);
          return;
        }
        const historyRows = (historyData ?? []) as GearListenHistoryRow[];
        const headfiIds = [
          ...new Set(
            historyRows
              .map((row) => row.headphone_id)
              .filter((id): id is number => Number.isInteger(id)),
          ),
        ];
        if (headfiIds.length === 0) {
          setMonthlyReceivers([]);
          return;
        }
        const { data: headfiData, error: headfiError } = await client
          .from('headfi')
          .select('id, brand, model, category, image_url')
          .in('id', headfiIds);
        if (cancelled) return;
        if (headfiError) {
          setMonthlyReceivers([]);
          return;
        }
        const gearById = new Map<number, GearSummary>();
        for (const row of headfiData ?? []) {
          gearById.set(row.id, {
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
            category: row.category || '',
            image_url: row.image_url ?? null,
          });
        }
        setMonthlyReceivers(
          buildReceiverListenRankings(gearById, historyRows, { year, month }, 'all', 3),
        );
      } catch {
        if (!cancelled) setMonthlyReceivers([]);
      } finally {
        if (!cancelled) setMonthlyReceiversLoading(false);
      }
    };
    void loadMonthlyReceivers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewingHeadfi?.id) {
      setRegisteredAlbums([]);
      return;
    }
    const client = createClient();
    const id = viewingHeadfi.id;
    void client
      .from('album')
      .select('id, album_name, artist, cover_image_url, release_date')
      .contains('manual_recommended_headphone_ids', [id])
      .then(({ data }) => {
        const merged = (data || []) as MatchedAlbum[];
        merged.sort(
          (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
        );
        setRegisteredAlbums(merged);
      });
  }, [viewingHeadfi?.id]);

  const viewingPairingComboLabel = useMemo(
    () => (viewingHeadfi ? getPairingComboLabel(viewingHeadfi) : null),
    [viewingHeadfi, getPairingComboLabel],
  );

  useEffect(() => {
    if (
      !viewingHeadfi ||
      !['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingHeadfi.category)
    ) {
      setMatchedMatchingDevice(null);
      return;
    }
    if (viewingHeadfi.pairing_combo_id) {
      setMatchedMatchingDevice(null);
      return;
    }
    const m = viewingHeadfi.matching;
    if (!m || m === ' ' || !/^\d+$/.test(String(m))) {
      setMatchedMatchingDevice(null);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id,brand,model')
      .eq('id', Number(m))
      .single()
      .then(({ data }) => {
        setMatchedMatchingDevice(
          data ? { id: data.id, brand: data.brand || '', model: data.model || '' } : null,
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id/category/matching만 추적, 객체 전체 deps 시 상세 모달 필드 병합마다 재조회됨
  }, [viewingHeadfi?.id, viewingHeadfi?.category, viewingHeadfi?.matching, viewingHeadfi?.pairing_combo_id]);

  useEffect(() => {
    if (!viewingHeadfi?.id || !isDacAmpDapCategory(viewingHeadfi.category)) {
      setMatchedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id,brand,model,category,image_url')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', String(viewingHeadfi.id))
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setMatchedHeadphones(
          (data as { id: number; brand: string; model: string; category: string; image_url?: string | null }[]) ||
            [],
        ),
      );
  }, [viewingHeadfi?.id, viewingHeadfi?.category]);

  useHeadfiDacAmpMapLazyAnalysis(viewingHeadfi, (patch) => {
    setViewingHeadfi((v) => (v ? { ...v, ...patch } : null));
  });

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

  useEffect(() => {
    if (!isAuthenticated) return;
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .in('category', ['헤드폰', '이어폰'])
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        setHeadfiOwnedHeadphones(
          (data || []).map((r) => ({
            id: r.id,
            brand: r.brand || '',
            model: r.model || '',
          })),
        );
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .eq('category', '기타')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setWirelessMatchingList(
          (data || []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
        ),
      );
  }, [isAuthenticated]);

  const handleAlbumEditClick = useCallback(() => {
    if (!viewingAlbum) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingAlbum;
    setViewingAlbum(null);
    setEditingAlbum(item);
    setAlbumFormData(albumFormDataFromItem(item));
  }, [viewingAlbum, isAuthenticated]);

  const handleHeadfiEditClick = useCallback(() => {
    if (!viewingHeadfi) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingHeadfi;
    setViewingHeadfi(null);
    setEditingHeadfi(item);
    setHeadfiFormData(headfiToFormData(item));
  }, [viewingHeadfi, isAuthenticated]);

  const handleAlbumImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setAlbumFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleHeadfiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadHeadfiDeviceImage(file);
      setHeadfiFormData((prev) => ({ ...prev, image_url: url }));
      toast.success('기기 이미지를 업로드했습니다. 저장하면 반영됩니다.');
    } catch (err) {
      toast.error(getClientErrorMessage(err) || '기기 이미지 업로드에 실패했습니다.');
    }
    e.target.value = '';
  };

  const handleHeadfiFrGraphFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadHeadfiFrGraphImage(file);
      setHeadfiFormData((prev) => ({ ...prev, fr_graph_url: url }));
      toast.success('FR 그래프 이미지를 업로드했습니다. 저장하면 반영됩니다.');
    } catch {
      toast.error('FR 그래프 업로드에 실패했습니다. Storage 버킷 headfi-fr 설정을 확인해 주세요.');
    }
    e.target.value = '';
  };

  const handleAlbumSave = async () => {
    if (!editingAlbum || isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        ...albumFormData,
        matching1: albumFormData.matching1 === ' ' ? '' : albumFormData.matching1,
        matching2: albumFormData.matching2 === ' ' ? '' : albumFormData.matching2,
      };
      await updateAlbumInDB(editingAlbum.id, data);
      toast.success('앨범 정보가 수정되었습니다.');
      setEditingAlbum(null);
      router.refresh();
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

  const handleHeadfiSave = async (): Promise<number | null> => {
    if (!editingHeadfi || isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return null;
    }
    setIsSaving(true);
    try {
      await updateHeadfiInDB(editingHeadfi.id, headfiFormData);
      return editingHeadfi.id;
    } catch (e) {
      toast.error(getClientErrorMessage(e));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleHeadfiSaveFinished = () => {
    toast.success('기기 정보가 수정되었습니다.');
    setEditingHeadfi(null);
    router.refresh();
  };

  const handleRefreshAlbumIntro = useCallback(async () => {
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
      setAudioTags((payload.audio_tags as string[]) ?? []);
      toast.success('앨범 소개와 태그를 갱신했습니다.');
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  }, [viewingAlbum, isAuthenticated]);

  const handleSummaryRefresh = () => {
    setSummaryRefreshing(true);
    router.refresh();
    window.setTimeout(() => setSummaryRefreshing(false), 600);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-2 pt-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <h1
        className="section-title mb-4 flex items-center justify-between gap-3 border-b pb-2 text-[28px]"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="flex items-center gap-2">
          <BarChart3 className="size-5 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
          Summary
        </span>
        <button
          type="button"
          onClick={handleSummaryRefresh}
          className="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
          aria-label="새로고침"
          title="새로고침"
        >
          <RefreshCw
            className={`size-4 ${summaryRefreshing ? 'animate-spin' : ''}`}
            strokeWidth={2}
          />
        </button>
      </h1>

      <div
        className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-4 text-sm tabular-nums"
        style={{ borderColor: 'var(--border)' }}
      >
        <span>
          <span className="opacity-60">앨범</span> {totalAlbums}
        </span>
        <span className="opacity-40" aria-hidden>
          ·
        </span>
        <span>
          <span className="opacity-60">기기</span> {totalHeadfi}
        </span>
        <span className="opacity-40" aria-hidden>
          ·
        </span>
        <span>
          <span className="opacity-60">최근 청취</span> {monthlyListens}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className={summaryCardClass}>
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <Link
              href={`/headfi?status=${encodeURIComponent('보유중')}`}
              className="inline-flex min-w-0 items-center rounded-lg transition-opacity hover:opacity-90"
            >
              <h2 className="flex items-center gap-2 text-[15px] font-semibold opacity-80">
                <Headphones className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                보유 기기
              </h2>
            </Link>
            <Link
              href={ownedHeadfiListHref}
              className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-500 tabular-nums transition-opacity hover:opacity-90"
            >
              {ownedHeadfiTotal}대
            </Link>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {sortedHeadfiCategories.length === 0 ? (
              <p className="flex flex-1 items-center text-sm opacity-60">보유 중인 기기가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-3 xl:grid-cols-4">
                {sortedHeadfiCategories.map(([cat, count]) => (
                  <Link
                    key={cat}
                    href={`/headfi?category=${encodeURIComponent(cat)}&status=${encodeURIComponent('보유중')}`}
                    className="flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-lg p-1.5 transition-opacity hover:opacity-90"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    <span className="shrink-0 [&_svg]:size-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      {HEADFI_CATEGORY_ICON[cat] ?? <Package className="size-4" strokeWidth={1.5} />}
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums leading-none">{count}</span>
                    <span className="w-full shrink-0 truncate text-center text-[9px] leading-tight opacity-60">
                      {cat}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${summaryCardClass} lg:col-span-2`}>
          <DashboardThisWeekPanel
            weekRange={weeklyHot.weekRange}
            hotArtist={weeklyHot.hotArtist}
            hotAlbums={weeklyHot.hotAlbums}
            stats={weeklyHot.stats}
            artistProfileUrl={weeklyHotArtistProfileUrl}
            onAlbumClick={(albumId) => void openAlbumById(albumId)}
            onArtistClick={(artistName) => void openArtistByName(artistName)}
            onRandomClick={() => setRandomLotteryOpen(true)}
          />
        </div>
      </div>

      <div className={`mb-8 ${bottomRowClass}`}>
        <section className={bottomListenCarouselClass}>
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2 pt-0.5">
            <h3 className="text-[15px] font-semibold">최근 청취 앨범</h3>
            <Link href="/albums/diary" className="link-apple shrink-0 text-sm">
              더보기 &rarr;
            </Link>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {monthlyListenAlbums.length === 0 ? (
              <p className="flex flex-1 items-center text-sm opacity-60">최근 청취 기록이 없습니다.</p>
            ) : (
              <DashboardMonthlyListenCarousel
                albums={monthlyListenAlbums}
                onAlbumClick={(albumId) => void openAlbumById(albumId)}
                layout="multi"
              />
            )}
          </div>
        </section>

        <section className="card-apple flex flex-col p-5 lg:col-span-2">
          <div className="mb-3 flex shrink-0 items-center justify-between pt-0.5">
            <h3 className="text-[15px] font-semibold">최근 등록 앨범</h3>
            <Link href="/albums" className="link-apple text-sm">
              더보기 &rarr;
            </Link>
          </div>
          {recentAlbums.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-sm opacity-60">등록된 앨범이 없습니다.</p>
          ) : (
            <div className={`min-h-0 flex-1 content-center ${recentAlbumGridClass}`}>
              {recentAlbums.slice(0, 2).map((album) => {
                const label = album.album_name?.trim() || '앨범';
                return (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => void openAlbumById(album.id)}
                    className="group w-full cursor-pointer text-left"
                    aria-label={label}
                  >
                    <div
                      className="relative aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                      style={{ boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}
                    >
                      {album.cover_image_url ? (
                        <img
                          src={album.cover_image_url}
                          alt={label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-xs opacity-50"
                          style={{ background: 'var(--badge-bg)' }}
                        >
                          No Cover
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className={bottomRowClass}>
        <section className={bottomListenCarouselClass}>
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2 pt-0.5">
            <h3 className="text-[15px] font-semibold">이달의 리시버</h3>
            <Link href="/insights?tab=usage" className="link-apple shrink-0 text-sm">
              더보기 &rarr;
            </Link>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {monthlyReceiversLoading ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <div
                  className="size-6 animate-spin rounded-full border-2"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
                  aria-label="로딩 중"
                />
              </div>
            ) : monthlyReceivers.length === 0 ? (
              <p className="flex flex-1 items-center text-sm opacity-60">이번 달 청취 기록이 없습니다</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {monthlyReceivers.map((item) => {
                  const modelLabel = formatListenHistoryOptionLabel(item);
                  return (
                    <button
                      key={item.headfiId}
                      type="button"
                      onClick={() => void openHeadfiById(item.headfiId)}
                      className="group min-w-0 w-full cursor-pointer text-left"
                      aria-label={`${modelLabel} 리시버 상세`}
                    >
                      <div
                        className="relative mb-2 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02] sm:mb-3"
                        style={{
                          boxShadow: 'var(--shadow)',
                          border: '1px solid var(--border)',
                          background: 'var(--badge-bg)',
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
                            <Headphones className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
                          </div>
                        )}
                      </div>
                      <p className="truncate text-xs font-bold leading-tight sm:text-sm">{modelLabel}</p>
                      <p className="mt-0.5 text-xs font-semibold tabular-nums opacity-70 sm:mt-1">
                        {item.listenCount}회
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="card-apple flex flex-col p-5 lg:col-span-2">
          <div className="mb-3 flex shrink-0 items-center justify-between pt-0.5">
            <h3 className="text-[15px] font-semibold">최근 구매 기기</h3>
            <Link href="/headfi" className="link-apple text-sm">
              더보기 &rarr;
            </Link>
          </div>
          {recentHeadfi.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-sm opacity-60">구매한 기기가 없습니다.</p>
          ) : (
            <div className={`min-h-0 flex-1 content-center ${recentHeadfiGridClass}`}>
              {recentHeadfi.map((headfi) => (
                <button
                  key={headfi.id}
                  type="button"
                  onClick={() => void openHeadfiById(headfi.id)}
                  className="group w-full cursor-pointer text-left"
                >
                  <div
                    className="relative mb-3 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{
                      boxShadow: 'var(--shadow)',
                      border: '1px solid var(--border)',
                      background: 'var(--badge-bg)',
                    }}
                  >
                    {headfi.image_url ? (
                      <img
                        src={headfi.image_url}
                        alt="기기"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
                        <Headphones className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-bold leading-tight">{headfi.model ?? '—'}</p>
                  <p className="mt-1 truncate text-xs opacity-70">{headfi.brand ?? '—'}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <AlbumLotteryModal
        open={randomLotteryOpen}
        mode="catalog"
        onClose={() => setRandomLotteryOpen(false)}
        onAlbumClick={(album) => {
          setRandomLotteryOpen(false);
          void openAlbumById(album.id);
        }}
      />

      {viewingArtistName ? (
        <ArtistDetailModal
          artistName={viewingArtistName}
          albums={artistModalAlbums}
          listenHistoryIndex={artistListenHistoryIndex}
          isAuthenticated={isAuthenticated}
          onClose={() => setViewingArtistName(null)}
          onAlbumClick={(album) => {
            setViewingArtistName(null);
            setViewingAlbum(album);
          }}
          onSelectArtist={setViewingArtistName}
          onArtistNamesUpdated={({ albumArtistName, recordArtistName, newName }) => {
            setViewingArtistName(newName);
            setArtistModalAlbums((prev) =>
              prev.map((album) =>
                applyAlbumNameRetarget(album, albumArtistName, recordArtistName, newName),
              ),
            );
          }}
        />
      ) : null}

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={(viewingAlbum.album_intro ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => setViewingAlbum(null)}
          onEdit={handleAlbumEditClick}
          onDelete={() => toast.info('삭제는 앨범 화면에서 진행해 주세요.')}
          isAuthenticated={isAuthenticated}
          onAlbumPatch={(updated) => setViewingAlbum(updated)}
          onHeadfiClick={(id) => void openHeadfiById(id)}
        />
      ) : null}

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={registeredAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          pairingComboLabel={viewingPairingComboLabel}
          matchedHeadphones={matchedHeadphones}
          onClose={() => setViewingHeadfi(null)}
          onEdit={handleHeadfiEditClick}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={(id) => void openAlbumById(id)}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {editingAlbum ? (
        <AlbumForm
          selectedItem={editingAlbum}
          formData={albumFormData}
          setFormData={setAlbumFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setEditingAlbum(null)}
          onSave={() => void handleAlbumSave()}
          onImageUpload={handleAlbumImageUpload}
          isSaving={isSaving}
        />
      ) : null}

      {editingHeadfi ? (
        <HeadfiForm
          selectedItem={editingHeadfi}
          formData={headfiFormData}
          setFormData={setHeadfiFormData}
          comboOptions={comboOptions}
          wirelessMatchingList={wirelessMatchingList}
          onClose={() => setEditingHeadfi(null)}
          onSave={handleHeadfiSave}
          onSaved={handleHeadfiSaveFinished}
          onImageUpload={handleHeadfiImageUpload}
          onFrGraphFileChange={handleHeadfiFrGraphFileChange}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
