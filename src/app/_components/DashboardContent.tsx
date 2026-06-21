/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Headphones, Music, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { updateAlbumInDB } from '@/app/albums/actions';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import type { Album, AlbumFormData } from '@/app/albums/types';
import { updateHeadfiInDB, uploadHeadfiFrGraphImage } from '@/app/headfi/actions';
import { HeadfiForm } from '@/app/headfi/_components/HeadfiForm';
import type { Headfi } from '@/app/headfi/types';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import { buildSortedHeadfiCategories, HEADFI_CATEGORY_ICON } from './dashboard-icons';
import { DashboardTodayAlbumCard } from './DashboardTodayAlbumCard';

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
  lotteryPool: Album[];
  recentAlbums: Album[];
  recentHeadfi: Headfi[];
};

const recentGridClass = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6';

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

const initialHeadfiFormData = {
  brand: '',
  model: '',
  category: '헤드폰',
  type1: '',
  type2: '',
  impedance: '',
  db1: '',
  db2: '',
  volume: '',
  volume_type: '',
  purchase_date: '',
  price: '',
  status1: '',
  status2: '',
  cable: '',
  cable_price: '',
  etc: '',
  matching: '',
  gain: '',
  temp: '',
  bright: '',
  bass_quantity: '',
  bass_depth: '',
  bass_speed: '',
  dynamics_slam: '',
  midrange_body: '',
  tone_warmth: '',
  vocal_position: '',
  midrange_clarity: '',
  treble_brightness: '',
  treble_smoothness: '',
  treble_airiness: '',
  resolution: '',
  separation: '',
  soundstage: '',
  imaging: '',
  timbre: '',
  memo: '',
  image_url: '',
  fr_graph_url: '',
  amp_type: '',
  output_impedance: '',
  chipset: '',
  vrms_bal: '',
  vrms_single: '',
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
    cover_image_url: item.cover_image_url ?? '',
    matching1: item.matching1 ?? '',
    matching2: item.matching2 ?? '',
    title_song_url: item.title_song_url ?? '',
    wiki_url: item.wiki_url ?? '',
    album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
    recommended_hp1: mids[0] != null ? String(mids[0]) : '',
    recommended_hp2: mids[1] != null ? String(mids[1]) : '',
    recommended_hp3: '',
    mood_names: Array.isArray(item.mood_names) ? [...item.mood_names] : [],
  };
}

function headfiFormDataFromItem(item: Headfi) {
  const normalizedEntries = Object.entries(item).map(([key, value]) => {
    if (value === null || value === undefined) return [key, ''];
    if (typeof value === 'number') return [key, String(value)];
    return [key, value];
  });
  return { ...initialHeadfiFormData, ...Object.fromEntries(normalizedEntries) };
}

export function DashboardContent({
  totalAlbums,
  totalHeadfi,
  monthlyListens,
  headfiCategoryRows,
  monthlyListenAlbums,
  lotteryPool,
  recentAlbums,
  recentHeadfi,
}: DashboardContentProps) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const currentMonthArchiveHref = (() => {
    const now = new Date();
    return `/archive/${now.getFullYear()}/${now.getMonth() + 1}`;
  })();
  const ownedHeadfiListHref = `/headfi?status=${encodeURIComponent('보유중')}`;
  const sortedHeadfiCategories = buildSortedHeadfiCategories(headfiCategoryRows);
  const ownedHeadfiTotal = sortedHeadfiCategories.reduce((sum, [, n]) => sum + n, 0);

  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [matchedAlbums, setMatchedAlbums] = useState<MatchedAlbum[]>([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{
    id: number;
    brand: string;
    model: string;
  } | null>(null);
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string }[]
  >([]);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [editingHeadfi, setEditingHeadfi] = useState<Headfi | null>(null);
  const [headfiFormData, setHeadfiFormData] = useState(initialHeadfiFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [dacAmpList, setDacAmpList] = useState<{ id: number; brand: string; model: string }[]>([]);

  const openAlbumById = useCallback(async (albumId: number) => {
    const { data, error } = await createClient().from('album').select('*').eq('id', albumId).maybeSingle();
    if (error || !data) {
      toast.error('앨범 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingAlbum(data as Album);
  }, []);

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
      setMatchedAlbums([]);
      return;
    }
    const client = createClient();
    const id = viewingHeadfi.id;
    void Promise.all([
      client
        .from('album')
        .select('id, album_name, artist, cover_image_url, release_date')
        .contains('manual_recommended_headphone_ids', [id]),
      client
        .from('album')
        .select('id, album_name, artist, cover_image_url, release_date')
        .contains('ai_recommended_headphone_ids', [id]),
    ]).then(([manualRes, aiRes]) => {
      const map = new Map<number, MatchedAlbum>();
      (manualRes.data || []).forEach((a) => {
        const row = a as MatchedAlbum;
        map.set(row.id, row);
      });
      (aiRes.data || []).forEach((a) => {
        const row = a as MatchedAlbum;
        map.set(row.id, row);
      });
      const merged = Array.from(map.values());
      merged.sort(
        (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
      );
      setMatchedAlbums(merged);
    });
  }, [viewingHeadfi?.id]);

  useEffect(() => {
    if (!viewingHeadfi || (viewingHeadfi.category !== '헤드폰' && viewingHeadfi.category !== '이어폰')) {
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
  }, [viewingHeadfi?.id, viewingHeadfi?.category, viewingHeadfi?.matching]);

  useEffect(() => {
    if (!viewingHeadfi?.id || viewingHeadfi.category !== 'DAC/AMP') {
      setMatchedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id,brand,model,category')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', String(viewingHeadfi.id))
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setMatchedHeadphones(
          (data as { id: number; brand: string; model: string; category: string }[]) || [],
        ),
      );
  }, [viewingHeadfi?.id, viewingHeadfi?.category]);

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
      .select('id, brand, model')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter((h): h is { id: number; brand: string; model: string } => !!h);
        setRecommendedHeadphones(ordered);
      });
  }, [viewingAlbum?.id, viewingAlbum?.manual_recommended_headphone_ids, viewingAlbum?.audio_tags]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .eq('category', '헤드폰')
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
      .eq('category', 'DAC/AMP')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setDacAmpList((data || []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' }))),
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
    setHeadfiFormData(headfiFormDataFromItem(item));
  }, [viewingHeadfi, isAuthenticated]);

  const handleAlbumImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setAlbumFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleHeadfiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setHeadfiFormData((prev) => ({ ...prev, image_url: reader.result as string }));
    reader.readAsDataURL(file);
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

  const handleHeadfiSave = async () => {
    if (!editingHeadfi || isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setIsSaving(true);
    try {
      await updateHeadfiInDB(editingHeadfi.id, headfiFormData);
      toast.success('기기 정보가 수정되었습니다.');
      setEditingHeadfi(null);
      router.refresh();
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 min-h-screen" style={{ color: 'var(--foreground)' }}>
      <h1 className="section-title text-[28px] mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="flex items-center gap-2">
          <BarChart3 className="size-5 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
          Summary
        </span>
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
          <span className="opacity-60">이번 달 청취</span> {monthlyListens}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-apple flex min-h-[280px] flex-col p-4">
          <div className="mb-5 flex items-center justify-between gap-2">
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
          <div className="min-h-[40px]">
            {sortedHeadfiCategories.length === 0 ? (
              <p className="text-sm opacity-60">보유 중인 기기가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {sortedHeadfiCategories.map(([cat, count]) => (
                  <Link
                    key={cat}
                    href={`/headfi?category=${encodeURIComponent(cat)}&status=${encodeURIComponent('보유중')}`}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-opacity hover:opacity-90"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      {HEADFI_CATEGORY_ICON[cat] ?? <Package className="size-5" strokeWidth={1.5} />}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{count}</span>
                    <span className="text-center text-[10px] leading-tight opacity-60">{cat}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-apple flex min-h-[280px] flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold opacity-80">
              <Music className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
              이번 달 청취
            </h2>
            <Link
              href={currentMonthArchiveHref}
              className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-500 tabular-nums transition-opacity hover:opacity-90"
            >
              {monthlyListens}회
            </Link>
          </div>
          {monthlyListenAlbums.length === 0 ? (
            <p className="text-sm opacity-60">이번 달 청취 기록이 없습니다.</p>
          ) : (
            <div className="grid flex-1 grid-cols-3 gap-1.5">
              {monthlyListenAlbums.slice(0, 6).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => void openAlbumById(row.id)}
                  className="group relative aspect-square overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                  style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
                  title={`${row.artist ?? ''} — ${row.album_name} (${row.listenCount}회)`}
                >
                  {row.cover_image_url ? (
                    <img src={row.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="size-5 opacity-35" strokeWidth={1.5} aria-hidden />
                    </div>
                  )}
                  {row.listenCount > 1 ? (
                    <span className="absolute bottom-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                      {row.listenCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <DashboardTodayAlbumCard
          lotteryPool={lotteryPool}
          onAlbumClick={(album) => void openAlbumById(album.id)}
        />
      </div>

      <div className="card-apple mb-8 flex flex-col p-5">
        <div className="mb-5 flex items-center justify-between pt-0.5">
          <h3 className="text-[15px] font-semibold">최근 등록 앨범</h3>
          <Link href="/albums" className="link-apple text-sm">
            더보기 &rarr;
          </Link>
        </div>
        {recentAlbums.length === 0 ? (
          <p className="py-6 text-center text-sm opacity-60">등록된 앨범이 없습니다.</p>
        ) : (
          <div className={recentGridClass}>
            {recentAlbums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => void openAlbumById(album.id)}
                className="group w-full cursor-pointer text-left"
              >
                <div
                  className="relative mb-3 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{ boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}
                >
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs opacity-50"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      No Cover
                    </div>
                  )}
                </div>
                <p className="truncate text-sm font-bold leading-tight">{album.artist ?? '—'}</p>
                <p className="mt-1 truncate text-xs opacity-70">{album.album_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card-apple mb-8 flex flex-col p-5">
        <div className="mb-5 flex items-center justify-between pt-0.5">
          <h3 className="text-[15px] font-semibold">최근 등록 기기</h3>
          <Link href="/headfi" className="link-apple text-sm">
            더보기 &rarr;
          </Link>
        </div>
        {recentHeadfi.length === 0 ? (
          <p className="py-6 text-center text-sm opacity-60">등록된 기기가 없습니다.</p>
        ) : (
          <div className={recentGridClass}>
            {recentHeadfi.map((headfi) => (
              <button
                key={headfi.id}
                type="button"
                onClick={() => void openHeadfiById(headfi.id)}
                className="group w-full cursor-pointer text-left"
              >
                <div
                  className="relative mb-3 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{ boxShadow: 'var(--shadow)', border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
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
                <p className="truncate text-sm font-bold leading-tight">{headfi.brand ?? '—'}</p>
                <p className="mt-1 truncate text-xs opacity-70">{headfi.model ?? '—'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

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
          matchedAlbums={matchedAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={() => setViewingHeadfi(null)}
          onEdit={handleHeadfiEditClick}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
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
          dacAmpList={dacAmpList}
          onClose={() => setEditingHeadfi(null)}
          onSave={() => void handleHeadfiSave()}
          onImageUpload={handleHeadfiImageUpload}
          onFrGraphFileChange={handleHeadfiFrGraphFileChange}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
