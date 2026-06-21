/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Disc3, Headphones, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Album } from '@/app/albums/types';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import type { Headfi } from '../../types';

type MatchDevice = Pick<Headfi, 'id' | 'brand' | 'model' | 'category' | 'image_url'>;

type MatchResult = {
  album_id: number;
  reason: string;
  album: Album;
};

function DeviceSelectCard({
  item,
  selected,
  onSelect,
}: {
  item: MatchDevice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all duration-200"
      style={{
        background: selected ? 'var(--badge-bg)' : 'var(--card-bg)',
        border: selected ? '2px solid var(--foreground)' : '1px solid var(--border)',
        boxShadow: selected ? 'var(--shadow)' : undefined,
      }}
    >
      <div
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md"
        style={{ background: 'var(--badge-bg)' }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Headphones className="size-4 opacity-40" strokeWidth={1.25} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] opacity-70">{item.brand || '—'}</p>
        <p className="truncate text-xs font-semibold leading-tight">{item.model || '—'}</p>
      </div>
    </button>
  );
}

function DeviceSelectColumn({
  title,
  emptyMessage,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  emptyMessage: string;
  items: MatchDevice[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <h2 className="section-title mb-2 shrink-0 text-base">{title}</h2>
      <div
        className="h-[280px] overflow-y-auto rounded-xl p-2"
        style={{ border: '1px solid var(--border)', background: 'var(--card-bg)' }}
      >
        {items.length === 0 ? (
          <p className="px-1 py-2 text-sm opacity-60">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <DeviceSelectCard
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={() => onSelect(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeadfiMatchContent() {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [library, setLibrary] = useState<Headfi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDacAmpId, setSelectedDacAmpId] = useState<number | null>(null);
  const [selectedHeadphoneId, setSelectedHeadphoneId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [registeredAlbums, setRegisteredAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const { data } = await client.from('headfi').select('*').order('brand').order('model');
      setLibrary((data as Headfi[]) || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  const ownedDacAmps = useMemo(
    () =>
      library.filter((item) => item.category === 'DAC/AMP' && item.status2 === '보유중') as MatchDevice[],
    [library],
  );

  const ownedWiredHeadphones = useMemo(
    () =>
      library.filter(
        (item) =>
          (item.category === '헤드폰' || item.category === '이어폰') && item.status2 === '보유중',
      ) as MatchDevice[],
    [library],
  );

  const canRecommend = selectedDacAmpId != null && selectedHeadphoneId != null;

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

  const handleRecommend = async () => {
    if (!canRecommend || loading) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/headfi-album-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dacAmpId: selectedDacAmpId,
          headphoneId: selectedHeadphoneId,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        recommendations?: MatchResult[];
      };
      if (!res.ok) {
        throw new Error(payload.error || '추천에 실패했습니다.');
      }
      const list = payload.recommendations ?? [];
      if (list.length === 0) {
        throw new Error('추천 결과가 없습니다.');
      }
      setResults(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '추천에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
    const client = createClient();
    void client
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
      setAudioTags((payload.audio_tags as string[]) ?? []);
      toast.success('앨범 소개와 태그를 갱신했습니다.');
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6">
        <Link
          href="/headfi"
          className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          Head-fi
        </Link>
        <h1 className="page-title flex items-center gap-2">
          <Sparkles className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
          매칭 앨범 추천
        </h1>
        <p className="mt-2 text-sm opacity-70">보유 기기 조합으로 최적의 앨범을 찾아드립니다</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <DeviceSelectColumn
                title="DAC / AMP"
                emptyMessage="보유중인 DAC/AMP가 없습니다."
                items={ownedDacAmps}
                selectedId={selectedDacAmpId}
                onSelect={(id) => {
                  setSelectedDacAmpId(id);
                  setResults([]);
                }}
              />
              <DeviceSelectColumn
                title="헤드폰 / 이어폰"
                emptyMessage="보유중인 유선 기기가 없습니다."
                items={ownedWiredHeadphones}
                selectedId={selectedHeadphoneId}
                onSelect={(id) => {
                  setSelectedHeadphoneId(id);
                  setResults([]);
                }}
              />
            </div>
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                className="btn-apple btn-apple-primary flex h-[44px] items-center justify-center px-16 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canRecommend || loading}
                onClick={() => void handleRecommend()}
              >
                {loading ? (
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2"
                    style={{ borderColor: 'var(--border)', borderTopColor: 'var(--background)' }}
                  />
                ) : (
                  '추천 받기'
                )}
              </button>
            </div>
          </div>

          {results.length > 0 ? (
            <section className="mt-12 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
              <h2 className="section-title mb-6 text-lg">추천 앨범</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {results.map((item) => (
                  <li key={item.album_id}>
                    <button
                      type="button"
                      onClick={() => void openAlbumById(item.album_id)}
                      className="card-apple flex h-full w-full gap-4 p-4 text-left transition-opacity hover:opacity-95"
                    >
                      <div
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                        style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
                      >
                        {item.album.cover_image_url ? (
                          <img
                            src={item.album.cover_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Disc3 className="size-8 opacity-40" strokeWidth={1.25} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.album.artist || '—'}</p>
                        <p className="truncate text-sm opacity-80">{item.album.album_name}</p>
                        <p className="mt-2 line-clamp-4 text-xs leading-relaxed opacity-70 whitespace-pre-line">
                          {item.reason}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
          onClose={() => setViewingAlbum(null)}
          onEdit={() => {
            const id = viewingAlbum.id;
            setViewingAlbum(null);
            router.push(`/albums?view=${id}`);
          }}
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
          matchedMatchingDevice={null}
          matchedHeadphones={[]}
          onClose={() => setViewingHeadfi(null)}
          onEdit={() => {
            const id = viewingHeadfi.id;
            setViewingHeadfi(null);
            router.push(`/headfi?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={(id) => void openAlbumById(id)}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}
