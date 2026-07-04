/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc, Music, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Album } from '@/app/albums/types';
import { extractCoverDominantGradient } from './cover-dominant-gradient';

type LotteryAlbum = Pick<Album, 'id' | 'album_name' | 'artist' | 'genre1' | 'genre2' | 'cover_image_url'>;

function pickRandomAlbum(pool: LotteryAlbum[], exclude: LotteryAlbum | null = null): LotteryAlbum {
  if (pool.length === 1) return pool[0];
  let next: LotteryAlbum;
  let guard = 0;
  do {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  } while (exclude && next.id === exclude.id && guard < 12);
  return next;
}

type LotteryPhase = 'idle' | 'loading' | 'spinning' | 'result';

type DashboardTodayAlbumCardProps = {
  totalAlbums: number;
  onAlbumClick: (album: Album) => void;
};

export function DashboardTodayAlbumCard({ totalAlbums, onAlbumClick }: DashboardTodayAlbumCardProps) {
  const [phase, setPhase] = useState<LotteryPhase>('idle');
  const [lotteryPool, setLotteryPool] = useState<LotteryAlbum[]>([]);
  const [spinAlbum, setSpinAlbum] = useState<LotteryAlbum | null>(null);
  const [resultAlbum, setResultAlbum] = useState<LotteryAlbum | null>(null);
  const [metaVisible, setMetaVisible] = useState(false);
  const [bgGradient, setBgGradient] = useState<string | null>(null);
  const spinTimersRef = useRef<number[]>([]);
  const poolFetchRef = useRef<Promise<LotteryAlbum[] | null> | null>(null);

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((id) => window.clearTimeout(id));
    spinTimersRef.current = [];
  }, []);

  const fetchLotteryPool = useCallback(async (): Promise<LotteryAlbum[] | null> => {
    if (lotteryPool.length > 0) return lotteryPool;
    if (poolFetchRef.current) return poolFetchRef.current;

    const pending = (async () => {
      const { data, error } = await createClient()
        .from('album')
        .select('id, album_name, artist, genre1, genre2, cover_image_url');
      if (error) {
        toast.error('추천 앨범 목록을 불러오지 못했습니다.');
        return null;
      }
      const pool = (data ?? []) as LotteryAlbum[];
      setLotteryPool(pool);
      return pool;
    })();

    poolFetchRef.current = pending;
    try {
      return await pending;
    } finally {
      poolFetchRef.current = null;
    }
  }, [lotteryPool]);

  const runSpinAnimation = useCallback(
    (pool: LotteryAlbum[], exclude: LotteryAlbum | null) => {
      clearSpinTimers();
      setPhase('spinning');
      setMetaVisible(false);
      const finalAlbum = pickRandomAlbum(pool, exclude);
      const totalSteps = 18 + Math.floor(Math.random() * 6);
      let step = 0;

      const tick = () => {
        if (step >= totalSteps) {
          setSpinAlbum(finalAlbum);
          setResultAlbum(finalAlbum);
          setPhase('result');
          return;
        }
        setSpinAlbum(pickRandomAlbum(pool));
        const delay = Math.min(40 + step * step * 5, 420);
        step += 1;
        const id = window.setTimeout(tick, delay);
        spinTimersRef.current.push(id);
      };

      setSpinAlbum(pickRandomAlbum(pool));
      tick();
    },
    [clearSpinTimers],
  );

  const startLottery = useCallback(
    async (exclude: LotteryAlbum | null) => {
      if (totalAlbums === 0) return;
      setPhase('loading');
      const pool = await fetchLotteryPool();
      if (!pool || pool.length === 0) {
        setPhase('idle');
        return;
      }
      runSpinAnimation(pool, exclude);
    },
    [totalAlbums, fetchLotteryPool, runSpinAnimation],
  );

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    if (phase !== 'result' || !resultAlbum) return;
    setMetaVisible(false);
    const id = window.requestAnimationFrame(() => setMetaVisible(true));
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 추첨 결과 id 변경 시에만 메타 페이드인 재실행, 앨범 객체 전체 deps 시 불필요 재애니메이션
  }, [phase, resultAlbum?.id]);

  const displayAlbum = phase === 'spinning' ? spinAlbum : resultAlbum;

  useEffect(() => {
    const url = displayAlbum?.cover_image_url?.trim();
    if (!url) {
      setBgGradient(null);
      return;
    }
    let cancelled = false;
    void extractCoverDominantGradient(url).then((gradient) => {
      if (!cancelled) setBgGradient(gradient);
    });
    return () => {
      cancelled = true;
    };
  }, [displayAlbum?.id, displayAlbum?.cover_image_url]);

  return (
    <div className="card-apple flex h-72 max-h-72 min-h-72 flex-col overflow-hidden p-0">
      {totalAlbums === 0 ? (
        <div className="flex h-full flex-col p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold opacity-80">
            <Disc className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            오늘의 추천 앨범
          </h2>
          <p className="text-sm opacity-60">등록된 앨범이 없습니다.</p>
        </div>
      ) : phase === 'idle' || phase === 'loading' ? (
        <div className="flex h-full flex-col p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold opacity-80">
            <Disc className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            오늘의 추천 앨범
          </h2>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-center text-sm opacity-70">전체 컬렉션에서 랜덤으로 한 장을 추천해 드립니다.</p>
            <button
              type="button"
              onClick={() => void startLottery(null)}
              disabled={phase === 'loading'}
              className="btn-apple btn-apple-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              <span>🎰</span>
              {phase === 'loading' ? '불러오는 중…' : '추천 받기'}
            </button>
          </div>
        </div>
      ) : displayAlbum ? (
        <div
          role={phase === 'result' ? 'button' : undefined}
          tabIndex={phase === 'result' ? 0 : undefined}
          onKeyDown={(e) => {
            if (phase !== 'result' || !resultAlbum) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAlbumClick(resultAlbum as Album);
            }
          }}
          onClick={() => {
            if (phase === 'result' && resultAlbum) onAlbumClick(resultAlbum as Album);
          }}
          className={`relative h-full w-full overflow-hidden text-left ${
            phase === 'result' ? 'cursor-pointer hover:opacity-95' : 'cursor-default'
          }`}
          style={{
            background: bgGradient ?? 'var(--badge-bg)',
          }}
        >
          {displayAlbum.cover_image_url ? (
            <>
              <div className="absolute inset-0 overflow-hidden" aria-hidden>
                <img
                  key={`${displayAlbum.id}-blur`}
                  src={displayAlbum.cover_image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
                />
              </div>
              <img
                key={`${displayAlbum.id}-cover`}
                src={displayAlbum.cover_image_url}
                alt=""
                className="absolute inset-0 z-[1] h-full w-full object-cover"
              />
            </>
          ) : (
            <div
              className="absolute inset-0 z-[1] flex items-center justify-center"
              style={{ background: 'var(--badge-bg)' }}
            >
              <Music className="size-10 opacity-30" strokeWidth={1.5} aria-hidden />
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-28"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}
          />

          <div className="absolute left-0 right-0 top-0 z-[4] flex items-start justify-between gap-2 px-3 pt-3">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-white/70">
              <Disc className="size-3.5 shrink-0 opacity-90" strokeWidth={1.5} aria-hidden />
              <span className="leading-tight">오늘의 추천 앨범</span>
            </span>
            {phase === 'result' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void startLottery(resultAlbum);
                }}
                className="shrink-0 rounded-lg p-1.5 text-white/90 transition-transform duration-300 hover:rotate-180 hover:bg-white/15"
                aria-label="다시 추천"
                title="다시 추천"
              >
                <RefreshCw className="size-[14px]" strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {phase === 'spinning' ? (
            <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/40">
              <span className="text-sm font-semibold text-white">추천 중…</span>
            </div>
          ) : null}

          {phase === 'result' && resultAlbum ? (
            <div
              className={`absolute bottom-0 left-0 right-0 z-[4] p-4 transition-opacity duration-500 ease-out ${
                metaVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="mb-1.5 flex flex-wrap gap-1">
                {resultAlbum.genre1 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    {resultAlbum.genre1}
                  </span>
                ) : null}
                {resultAlbum.genre2 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    {resultAlbum.genre2}
                  </span>
                ) : null}
              </div>
              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">
                {resultAlbum.album_name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-white/70">{resultAlbum.artist || '—'}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
