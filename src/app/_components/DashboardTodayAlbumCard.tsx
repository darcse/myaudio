/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc, Music, RefreshCw } from 'lucide-react';
import type { Album } from '@/app/albums/types';
import { extractCoverDominantGradient } from './cover-dominant-gradient';

function pickRandomAlbum(pool: Album[], exclude: Album | null = null): Album {
  if (pool.length === 1) return pool[0];
  let next: Album;
  let guard = 0;
  do {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  } while (exclude && next.id === exclude.id && guard < 12);
  return next;
}

type LotteryPhase = 'idle' | 'spinning' | 'result';

type DashboardTodayAlbumCardProps = {
  lotteryPool: Album[];
  onAlbumClick: (album: Album) => void;
};

export function DashboardTodayAlbumCard({ lotteryPool, onAlbumClick }: DashboardTodayAlbumCardProps) {
  const [phase, setPhase] = useState<LotteryPhase>('idle');
  const [spinAlbum, setSpinAlbum] = useState<Album | null>(null);
  const [resultAlbum, setResultAlbum] = useState<Album | null>(null);
  const [metaVisible, setMetaVisible] = useState(false);
  const [bgGradient, setBgGradient] = useState<string | null>(null);
  const spinTimersRef = useRef<number[]>([]);

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((id) => window.clearTimeout(id));
    spinTimersRef.current = [];
  }, []);

  const runSpinAnimation = useCallback(
    (pool: Album[], exclude: Album | null) => {
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
    (exclude: Album | null) => {
      if (lotteryPool.length === 0) return;
      runSpinAnimation(lotteryPool, exclude);
    },
    [lotteryPool, runSpinAnimation],
  );

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    if (phase !== 'result' || !resultAlbum) return;
    setMetaVisible(false);
    const id = window.requestAnimationFrame(() => setMetaVisible(true));
    return () => window.cancelAnimationFrame(id);
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
    <div className="card-apple flex h-[280px] max-h-[280px] min-h-[280px] flex-col overflow-hidden p-0">
      {lotteryPool.length === 0 ? (
        <div className="flex h-full flex-col p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold opacity-80">
            <Disc className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            오늘의 추천 앨범
          </h2>
          <p className="text-sm opacity-60">등록된 앨범이 없습니다.</p>
        </div>
      ) : phase === 'idle' ? (
        <div className="flex h-full flex-col p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold opacity-80">
            <Disc className="size-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            오늘의 추천 앨범
          </h2>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-center text-sm opacity-70">전체 컬렉션에서 랜덤으로 한 장을 추천해 드립니다.</p>
            <button
              type="button"
              onClick={() => startLottery(null)}
              className="btn-apple btn-apple-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <span>🎰</span>
              추천 받기
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
              onAlbumClick(resultAlbum);
            }
          }}
          onClick={() => {
            if (phase === 'result' && resultAlbum) onAlbumClick(resultAlbum);
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
                  startLottery(resultAlbum);
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
