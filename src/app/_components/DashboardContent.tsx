/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Headphones, Music, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import type { Album } from '@/app/albums/types';
import type { Headfi } from '@/app/headfi/types';
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
    const ids = viewingAlbum.manual_recommended_headphone_ids ?? [];
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
            <span className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-500 tabular-nums">
              {ownedHeadfiTotal}대
            </span>
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
            <span className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-500 tabular-nums">
              {monthlyListens}회
            </span>
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
          albumIntro={(viewingAlbum.album_intro ?? viewingAlbum.ai_recommended_headphone_reason ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => setViewingAlbum(null)}
          onEdit={() => {
            const id = viewingAlbum.id;
            setViewingAlbum(null);
            router.push(`/albums?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 앨범 화면에서 진행해 주세요.')}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          matchedAlbums={matchedAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={() => setViewingHeadfi(null)}
          onEdit={() => {
            const id = viewingHeadfi.id;
            setViewingHeadfi(null);
            router.push(`/headfi?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}
