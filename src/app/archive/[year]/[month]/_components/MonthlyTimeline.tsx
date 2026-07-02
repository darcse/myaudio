/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthState } from '@/hooks/useAuthState';
import { createClient } from '@/lib/supabase/client';
import type { MonthlyReviewTimeline } from '@/app/api/monthly-review-comment/route';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import { LyricsDetailModal } from '@/app/lyrics/_components/LyricsDetailModal';
import type { Headfi } from '@/app/headfi/types';
import type { Lyrics } from '@/app/lyrics/types';
import type { Album } from '@/app/albums/types';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';

function sortCreated<T extends { created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function sortHeadfiByPurchase<T extends { purchase_date: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(),
  );
}

type MatchedAlbum = {
  id: number;
  album_name: string;
  artist: string;
  cover_image_url: string | null;
  release_date?: string | null;
};

export type ListenGearSummary = {
  id: number;
  brand: string;
  model: string;
};

export type ListenAlbumCard = {
  listenId: number;
  listened_at: string;
  impression: string | null;
  album: Album;
  dac_amp?: ListenGearSummary | null;
  headphone?: ListenGearSummary | null;
};

type Props = {
  year: number;
  month: number;
  initialListenRows: ListenAlbumCard[];
};

const bookGridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
const mediaGridClass = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6';

export function MonthlyTimeline({ year, month, initialListenRows }: Props) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [timeline, setTimeline] = useState<MonthlyReviewTimeline | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [viewingLyrics, setViewingLyrics] = useState<Lyrics | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [listenRows] = useState<ListenAlbumCard[]>(initialListenRows);
  const [registeredAlbums, setRegisteredAlbums] = useState<MatchedAlbum[]>([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{
    id: number;
    brand: string;
    model: string;
  } | null>(null);
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string; image_url?: string | null }[]
  >([]);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);

  const openAlbumById = useCallback(async (albumId: number) => {
    const { data, error } = await createClient().from('album').select('*').eq('id', albumId).maybeSingle();
    if (error || !data) {
      toast.error('앨범 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingAlbum(data as Album);
  }, []);

  const load = useCallback(
    async (opts: { refresh?: boolean; signal?: AbortSignal }) => {
      const refresh = opts.refresh ?? false;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const q = new URLSearchParams({ year: String(year), month: String(month) });
        if (refresh) q.set('refresh', '1');
        const res = await fetch(`/api/monthly-review-comment?${q.toString()}`, { signal: opts.signal });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          comment?: string | null;
          timeline?: MonthlyReviewTimeline;
        };
        if (!res.ok) {
          toast.error(body.error ?? '불러오지 못했습니다.');
          if (!refresh) {
            setTimeline(null);
            setComment(null);
          }
          return;
        }
        if (body.timeline) {
          const t = body.timeline;
          setTimeline({
            albums: t.albums,
            headfi: sortHeadfiByPurchase(t.headfi),
            lyrics: sortCreated(t.lyrics),
          });
        } else {
          setTimeline(null);
        }
        setComment(body.comment ?? null);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        toast.error('네트워크 오류가 났습니다.');
      } finally {
        if (refresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [year, month],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load({ signal: ac.signal });
    return () => ac.abort();
  }, [load]);

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
        const rows = (data || []).map((a) => {
          const row = a as {
            id: number;
            album_name: string;
            artist: string | null;
            cover_image_url: string | null;
            release_date?: string | null;
          };
          return {
            id: row.id,
            album_name: row.album_name,
            artist: row.artist ?? '',
            cover_image_url: row.cover_image_url,
            release_date: row.release_date,
          };
        });
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
    const client = createClient();
    void client
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
  }, [viewingHeadfi?.id, viewingHeadfi?.category, viewingHeadfi?.matching]);

  useEffect(() => {
    if (!viewingHeadfi?.id || !isDacAmpDapCategory(viewingHeadfi.category)) {
      setMatchedHeadphones([]);
      return;
    }
    const idStr = String(viewingHeadfi.id);
    const client = createClient();
    void client
      .from('headfi')
      .select('id,brand,model,category,image_url')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', idStr)
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setMatchedHeadphones(
          (data as { id: number; brand: string; model: string; category: string; image_url?: string | null }[]) ||
            [],
        ),
      );
  }, [viewingHeadfi?.id, viewingHeadfi?.category]);

  const openHeadfiById = async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(data as Headfi);
  };

  const renderListenGearLine = (row: ListenAlbumCard) => {
    const parts: { id: number; name: string }[] = [];
    if (row.dac_amp) {
      const name = `${row.dac_amp.brand} ${row.dac_amp.model}`.trim() || '—';
      parts.push({ id: row.dac_amp.id, name });
    }
    if (row.headphone) {
      const name = `${row.headphone.brand} ${row.headphone.model}`.trim() || '—';
      parts.push({ id: row.headphone.id, name });
    }
    if (parts.length === 0) return null;

    return (
      <p className="mt-2 text-xs opacity-80">
        {parts.map((part, idx) => (
          <span key={part.id}>
            {idx > 0 ? <span className="opacity-50"> / </span> : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void openHeadfiById(part.id);
              }}
              className="underline-offset-2 transition-opacity hover:opacity-100 hover:underline"
            >
              {part.name}
            </button>
          </span>
        ))}
      </p>
    );
  };

  const openLyricsById = async (id: number) => {
    const { data, error } = await createClient().from('lyrics').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('가사 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingLyrics(data as Lyrics);
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

  const busy = loading || refreshing;
  const t = timeline;
  const hasAny =
    listenRows.length > 0 ||
    (t != null && t.albums.length + t.headfi.length + t.lyrics.length > 0);
  const timelineItemsCount = t != null ? t.headfi.length + t.lyrics.length : 0;
  const displayHasAny = listenRows.length > 0 || loading || timelineItemsCount > 0;

  const listenAlbumSection =
    listenRows.length > 0 ? (
      <section>
        <h2 className="mb-3 text-sm font-semibold opacity-90">🎵 감상 앨범</h2>
        <div className={bookGridClass}>
          {listenRows.map((row, idx) => (
            <div
              key={`${row.listenId}-${row.listened_at}-${row.album.id}-${idx}`}
              className="card-apple flex items-start gap-4 p-4 text-left"
              style={{ color: 'var(--foreground)' }}
            >
              <button
                type="button"
                onClick={() => setViewingAlbum(row.album)}
                className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-95 sm:w-36"
                style={{ border: '1px solid var(--border)' }}
              >
                {row.album.cover_image_url ? (
                  <img src={row.album.cover_image_url} alt="표지" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs opacity-50"
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Image
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1 overflow-hidden pt-1">
                <button
                  type="button"
                  onClick={() => setViewingAlbum(row.album)}
                  className="w-full text-left transition-opacity hover:opacity-95"
                >
                  <h3 className="truncate text-base font-bold leading-tight tracking-tight">{row.album.artist ?? '—'}</h3>
                  <p className="mb-2 truncate text-sm font-medium opacity-85">{row.album.album_name}</p>
                  <p className="mt-2 text-xs tabular-nums opacity-75">감상일 {row.listened_at}</p>
                  {row.impression?.trim() ? (
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs opacity-80">{row.impression}</p>
                  ) : null}
                </button>
                {renderListenGearLine(row)}
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null;

  const headfiSection =
    t && t.headfi.length > 0 ? (
      <section>
        <h2 className="mb-3 text-sm font-semibold opacity-90">🎧 등록 기기</h2>
        <div className={mediaGridClass}>
          {t.headfi.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => void openHeadfiById(h.id)}
              className="group flex cursor-pointer flex-col rounded-xl p-4 text-left transition-all duration-300"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <div
                className="relative mb-4 aspect-square overflow-hidden rounded-lg"
                style={{ background: 'var(--badge-bg)' }}
              >
                {h.image_url ? (
                  <img
                    src={h.image_url}
                    alt="기기 이미지"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
                    <Headphones className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
                  </div>
                )}
              </div>
              <span className="badge-apple mb-2 inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold">
                {h.category ?? '—'}
              </span>
              <h3 className="mb-0.5 truncate text-sm font-bold leading-tight">{h.model ?? '—'}</h3>
              <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                {h.brand ?? '—'}
              </p>
            </button>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div
        className="relative overflow-hidden rounded-xl border-2 p-5 sm:p-6"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(165deg, var(--badge-bg) 0%, var(--card-bg) 55%, var(--card-bg) 100%)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full opacity-90"
          style={{ background: 'var(--link)' }}
          aria-hidden
        />
        <div className="mb-3 flex items-center justify-between gap-3 pl-3 sm:pl-4">
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            이달의 활동
          </span>
          {isAuthenticated === true ? (
            <button
              type="button"
              onClick={() => void load({ refresh: true })}
              disabled={busy || !hasAny}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
              aria-label="코멘트 새로고침"
              title="코멘트 새로고침"
            >
              <RefreshCw className={`size-[18px] shrink-0 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        <div className="pl-3 sm:pl-4">
          {loading && !refreshing ? (
            <p className="flex items-center gap-2 text-sm opacity-70">
              <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
              불러오는 중…
            </p>
          ) : comment != null && comment.trim() !== '' ? (
            <p
              className="whitespace-pre-line text-[15px] font-medium leading-relaxed sm:text-base"
              style={{ color: 'var(--foreground)' }}
            >
              {comment}
            </p>
          ) : !hasAny ? (
            <p className="text-sm opacity-70">이달 활동이 없어 코멘트가 없습니다.</p>
          ) : (
            <p className="text-sm opacity-70">코멘트를 불러오지 못했습니다.</p>
          )}
        </div>
      </div>

      {headfiSection}

      {listenAlbumSection}

      {loading && !refreshing ? (
        <div
          className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border py-10"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-8 shrink-0 animate-spin opacity-70" strokeWidth={1.75} aria-hidden />
          <p className="text-sm opacity-80">타임라인을 불러오는 중…</p>
        </div>
      ) : !displayHasAny ? (
        <p className="text-sm opacity-80">이달에는 표시할 활동이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {t && t.lyrics.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold opacity-90">🎶 등록 가사</h2>
              <div className={mediaGridClass}>
                {t.lyrics.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => void openLyricsById(l.id)}
                    className="group w-full cursor-pointer text-left"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <div
                      className="relative mb-3 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                      style={{ boxShadow: 'var(--shadow)' }}
                    >
                      {l.cover_image_url ? (
                        <img src={l.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-xs opacity-50"
                          style={{ background: 'var(--badge-bg)' }}
                        >
                          No Cover
                        </div>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-bold leading-tight">{l.title}</h3>
                    <p className="mt-1 truncate text-xs opacity-70 tabular-nums">{l.album ?? '—'}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={registeredAlbums}
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
          onAlbumClick={(id) => void openAlbumById(id)}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {viewingLyrics ? (
        <LyricsDetailModal
          viewingItem={viewingLyrics}
          onClose={() => setViewingLyrics(null)}
          onEdit={() => {
            const id = viewingLyrics.id;
            setViewingLyrics(null);
            router.push(`/lyrics?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 가사 화면에서 진행해 주세요.')}
          isAuthenticated={isAuthenticated}
          hideAudioSection
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
    </div>
  );
}
