'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { BarChart3, Disc, Mic2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { AlbumPageHeader, AlbumSubHeader } from '@/app/albums/_components/AlbumPageHeader';
import { useAlbumMutations } from '@/app/albums/_hooks/useAlbumMutations';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { ArtistDetailModal } from '@/app/artists/_components/ArtistDetailModal';
import { shouldRetargetAlbumArtist } from '@/app/artists/lib/updateArtistNames';
import { updateHeadfiInDB, uploadHeadfiFrGraphImage, uploadHeadfiDeviceImage } from '@/app/headfi/actions';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import { HeadfiForm } from '@/app/headfi/_components/HeadfiForm';
import type { Headfi, HeadfiFormData, SelectedHeadfi } from '@/app/headfi/types';
import { emptyHeadfiFormData, headfiToFormData } from '@/app/headfi/utils';
import { DAC_AMP_DAP_CATEGORIES, isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import { buildListenHistoryIndex } from '@/app/artists/utils';
import {
  buildAlbumListenRankings,
  buildArtistListenRankings,
  buildWeeklyHotAlbumRankings,
  clampListenPeriodFilter,
  filterHistoryByPeriod,
  formatPeriodLabel,
  formatStatsMonthOptionLabel,
  getRollingSevenDayRange,
  getDefaultListenPeriodFilter,
  LISTEN_RANKING_LIMIT,
  listStatsMonths,
  listStatsYears,
  type AlbumListenRankItem,
  type ArtistListenRankItem,
  type GearListenHistoryRow,
  type GearSummary,
  type ListenPeriodFilter,
  type ListenPeriodMonth,
} from '../albumListenStats';
import { WeeklyHotAlbumsSection } from './WeeklyHotAlbumsSection';
import { ListenTrendSection } from './ListenTrendSection';

type HistoryRow = GearListenHistoryRow;

type AlbumStatsTab = 'ranking' | 'trend';

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
  owns_cd: false,
  owns_lp: false,
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
  profileImageUrl,
  onClick,
}: {
  item: ArtistListenRankItem;
  rank: number;
  profileImageUrl: string | null;
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
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profileImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
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
  const [artistProfileUrls, setArtistProfileUrls] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsTab, setStatsTab] = useState<AlbumStatsTab>('ranking');
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);
  const [gearById, setGearById] = useState<Map<number, GearSummary>>(() => new Map());
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingArtistName, setViewingArtistName] = useState<string | null>(null);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [registeredAlbums, setRegisteredAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{
    id: number;
    brand: string;
    model: string;
  } | null>(null);
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string; image_url?: string | null }[]
  >([]);
  const [headfiFormItem, setHeadfiFormItem] = useState<SelectedHeadfi | null>(null);
  const [headfiFormData, setHeadfiFormData] = useState<HeadfiFormData>(emptyHeadfiFormData);
  const [isSavingHeadfi, setIsSavingHeadfi] = useState(false);
  const [dacAmpList, setDacAmpList] = useState<{ id: number; brand: string; model: string }[]>([]);
  const [wirelessMatchingList, setWirelessMatchingList] = useState<{ id: number; brand: string; model: string }[]>([]);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [now, setNow] = useState(() => new Date());
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createClient();
      const [albumRes, historyRes, artistsRes, headfiRes] = await Promise.all([
        client.from('album').select('*').order('release_date', { ascending: false }),
        client.from('album_listen_history').select('album_id, listened_at, headphone_id'),
        client.from('artists').select('artist_name, profile_image_url'),
        client.from('headfi').select('id, brand, model, category, image_url'),
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
        setHistoryRows(historyRes.data ?? []);
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
      if (headfiRes.error) {
        setGearById(new Map());
      } else {
        const map = new Map<number, GearSummary>();
        for (const row of headfiRes.data ?? []) {
          map.set(row.id, {
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
            category: row.category || '',
            image_url: row.image_url ?? null,
          });
        }
        setGearById(map);
      }
      if (errors.length > 0) {
        setLoadError(errors.join(' '));
        toast.error(errors[0]);
      }
    } catch {
      const message = '통계 데이터를 불러오지 못했습니다.';
      setLoadError(message);
      toast.error(message);
      setAlbums([]);
      setHistoryRows([]);
      setArtistProfileUrls({});
      setGearById(new Map());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    const { data, error } = await createClient()
      .from('album_listen_history')
      .select('album_id, listened_at, headphone_id');
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
    if (isAuthenticated !== true) {
      setDacAmpList([]);
      setWirelessMatchingList([]);
      return;
    }
    const client = createClient();
    void Promise.all([
      client
        .from('headfi')
        .select('id,brand,model')
        .in('category', [...DAC_AMP_DAP_CATEGORIES])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      client
        .from('headfi')
        .select('id,brand,model')
        .eq('category', '기타')
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
    ]).then(([dacRes, wirelessRes]) => {
      setDacAmpList(
        (dacRes.data ?? []).map((row) => ({
          id: row.id,
          brand: row.brand || '',
          model: row.model || '',
        })),
      );
      setWirelessMatchingList(
        (wirelessRes.data ?? []).map((row) => ({
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

  const periodListenSummary = useMemo(() => {
    const listenCount = filteredHistoryRows.length;
    const albumIds = new Set(
      filteredHistoryRows
        .map((row) => row.album_id)
        .filter((id): id is number => id != null),
    );
    const albumById = new Map(albums.map((album) => [album.id, album]));
    const uniqueArtistCount = new Set(
      [...albumIds]
        .map((id) => albumById.get(id)?.artist?.trim())
        .filter((name): name is string => Boolean(name)),
    ).size;
    return {
      listenCount,
      uniqueAlbumCount: albumIds.size,
      uniqueArtistCount,
    };
  }, [albums, filteredHistoryRows]);

  const openHeadfiById = useCallback(async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(data as Headfi);
  }, []);

  useEffect(() => {
    if (!viewingHeadfi?.id) {
      setRegisteredAlbums([]);
      return;
    }
    const id = viewingHeadfi.id;
    void createClient()
      .from('album')
      .select('id, album_name, artist, cover_image_url, release_date')
      .contains('manual_recommended_headphone_ids', [id])
      .then(({ data }) => {
        const rows = data || [];
        rows.sort(
          (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
        );
        setRegisteredAlbums(rows);
      });
  }, [viewingHeadfi?.id]);

  useEffect(() => {
    if (
      !viewingHeadfi ||
      !['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingHeadfi.category)
    ) {
      setMatchedMatchingDevice(null);
      return;
    }
    const m = viewingHeadfi.matching;
    if (!m || m === ' ' || !/^\d+$/.test(String(m))) {
      setMatchedMatchingDevice(null);
      return;
    }
    const matchId = Number(m);
    const cached = gearById.get(matchId);
    if (cached) {
      setMatchedMatchingDevice({ id: cached.id, brand: cached.brand, model: cached.model });
      return;
    }
    void createClient()
      .from('headfi')
      .select('id,brand,model')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        setMatchedMatchingDevice(
          data ? { id: data.id, brand: data.brand || '', model: data.model || '' } : null,
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id/category/matching만 추적
  }, [viewingHeadfi?.id, viewingHeadfi?.category, viewingHeadfi?.matching, gearById]);

  useEffect(() => {
    if (!viewingHeadfi?.id || !isDacAmpDapCategory(viewingHeadfi.category)) {
      setMatchedHeadphones([]);
      return;
    }
    const idStr = String(viewingHeadfi.id);
    void createClient()
      .from('headfi')
      .select('id,brand,model,category,image_url')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', idStr)
      .order('brand')
      .order('model')
      .then(({ data }) => setMatchedHeadphones(data || []));
  }, [viewingHeadfi?.id, viewingHeadfi?.category]);

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
      return;
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

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ ...prev, year }));
  };

  const handleMonthChange = (month: ListenPeriodMonth) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ ...prev, month }));
  };

  const refreshGearEntry = useCallback(async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    const row = data as Headfi;
    setGearById((prev) => {
      const next = new Map(prev);
      next.set(row.id, {
        id: row.id,
        brand: row.brand || '',
        model: row.model || '',
        category: row.category || '',
        image_url: row.image_url ?? null,
      });
      return next;
    });
    return row;
  }, []);

  const handleHeadfiEditClick = () => {
    if (!viewingHeadfi) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setHeadfiFormItem(viewingHeadfi);
    setHeadfiFormData(headfiToFormData(viewingHeadfi));
    setViewingHeadfi(null);
  };

  const handleHeadfiImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleHeadfiFrGraphFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleHeadfiSave = async () => {
    if (!headfiFormItem || !('id' in headfiFormItem && headfiFormItem.id)) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setIsSavingHeadfi(true);
    try {
      const id = Number(headfiFormItem.id);
      await updateHeadfiInDB(id, headfiFormData);
      toast.success('기기 정보가 수정되었습니다.');
      setHeadfiFormItem(null);
      const updated = await refreshGearEntry(id);
      if (updated) setViewingHeadfi(updated);
    } catch (err) {
      toast.error(getClientErrorMessage(err));
    } finally {
      setIsSavingHeadfi(false);
    }
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <AlbumPageHeader activeNav="stats" isAuthenticated={isAuthenticated} showDivider />
      <AlbumSubHeader
        icon={BarChart3}
        title="청취 통계"
        trailing={
          <>
            <button
              type="button"
              onClick={() => setStatsTab('ranking')}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(statsTab === 'ranking')}
              aria-pressed={statsTab === 'ranking'}
            >
              랭킹
            </button>
            <button
              type="button"
              onClick={() => setStatsTab('trend')}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(statsTab === 'trend')}
              aria-pressed={statsTab === 'trend'}
            >
              청취 추이
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : statsTab === 'trend' ? (
        <ListenTrendSection historyRows={historyRows} now={now} loadError={loadError} />
      ) : (
        <>
          <WeeklyHotAlbumsSection
            items={weeklyHotAlbums}
            weekRange={weekRange}
            onAlbumClick={openAlbum}
          />

          <div
            className="border-t"
            style={{ borderColor: 'var(--border)' }}
            aria-hidden
          />

          <section
            className="mb-6 mt-8 rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <div
              className="rounded-t-xl border-b px-4 py-3 sm:px-5"
              style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <Trophy className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                청취 랭킹
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

              {hasAnyListenData ? (
                <p className="text-sm font-semibold opacity-90">
                  총 청취 아티스트 {periodListenSummary.uniqueArtistCount}명, 앨범{' '}
                  {periodListenSummary.uniqueAlbumCount}장, {periodListenSummary.listenCount}회 청취
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
              <p className="mt-2 text-sm opacity-60">
                앨범을 재생하거나 청취 이력을 기록하면 랭킹이 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {!hasPeriodListenData ? (
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
                              profileImageUrl={artistProfileUrls[item.artistName] ?? null}
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
          onHeadfiClick={(id) => void openHeadfiById(id)}
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
                shouldRetargetAlbumArtist(album.artist, albumArtistName, recordArtistName)
                  ? { ...album, artist: newName }
                  : album,
              ),
            );
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

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={registeredAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={() => setViewingHeadfi(null)}
          onEdit={handleHeadfiEditClick}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={(albumId) => {
            setViewingHeadfi(null);
            openAlbum(albumId);
          }}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {headfiFormItem ? (
        <HeadfiForm
          selectedItem={headfiFormItem}
          formData={headfiFormData}
          setFormData={setHeadfiFormData}
          dacAmpList={dacAmpList}
          wirelessMatchingList={wirelessMatchingList}
          onClose={() => setHeadfiFormItem(null)}
          onSave={() => void handleHeadfiSave()}
          onImageUpload={(e) => void handleHeadfiImageUpload(e)}
          onFrGraphFileChange={(e) => void handleHeadfiFrGraphFileChange(e)}
          isSaving={isSavingHeadfi}
        />
      ) : null}
    </div>
  );
}
