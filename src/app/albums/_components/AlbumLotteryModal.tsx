/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, RefreshCw } from 'lucide-react';
import type { Album } from '../types';

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

type LotteryPhase = 'spinning' | 'result';

type AlbumLotteryModalProps = {
  open: boolean;
  onClose: () => void;
  lotteryPool: Album[];
  yearLabel: string;
  onAlbumClick: (album: Album) => void;
};

export function AlbumLotteryModal({
  open,
  onClose,
  lotteryPool,
  yearLabel,
  onAlbumClick,
}: AlbumLotteryModalProps) {
  const [phase, setPhase] = useState<LotteryPhase>('spinning');
  const [spinAlbum, setSpinAlbum] = useState<Album | null>(null);
  const [resultAlbum, setResultAlbum] = useState<Album | null>(null);
  const [metaVisible, setMetaVisible] = useState(false);
  const spinTimersRef = useRef<number[]>([]);

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((id) => window.clearTimeout(id));
    spinTimersRef.current = [];
  }, []);

  const runSpinAnimation = useCallback(
    (pool: Album[], exclude: Album | null) =>
      new Promise<Album>((resolve) => {
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
            resolve(finalAlbum);
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
      }),
    [clearSpinTimers],
  );

  const startLottery = useCallback(
    (exclude: Album | null) => {
      if (lotteryPool.length === 0) return;
      void runSpinAnimation(lotteryPool, exclude);
    },
    [lotteryPool, runSpinAnimation],
  );

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    if (!open) {
      clearSpinTimers();
      setPhase('spinning');
      setSpinAlbum(null);
      setResultAlbum(null);
      setMetaVisible(false);
      return;
    }
    if (lotteryPool.length === 0) return;
    startLottery(null);
  }, [open, clearSpinTimers, lotteryPool.length, startLottery]);

  useEffect(() => {
    if (phase !== 'result' || !resultAlbum) return;
    setMetaVisible(false);
    const id = window.requestAnimationFrame(() => setMetaVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [phase, resultAlbum?.id]);

  if (!open) return null;

  const displayAlbum = phase === 'spinning' ? spinAlbum : resultAlbum;

  return (
    <div
      className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-lottery-title"
      onClick={onClose}
    >
      <div
        className="modal-panel-apple relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-5 text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity"
          aria-label="닫기"
        >
          &times;
        </button>

        <div className="flex items-center gap-1.5 mb-1 pr-8">
          <h2 id="album-lottery-title" className="section-title text-xl shrink-0">
            랜덤 앨범 추천
          </h2>
          {lotteryPool.length > 0 ? (
            <button
              type="button"
              disabled={phase === 'spinning'}
              onClick={() => startLottery(resultAlbum)}
              className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
              style={{ color: 'var(--foreground)' }}
              title="다시 추천"
              aria-label="다시 추천"
            >
              <RefreshCw className={`size-4 ${phase === 'spinning' ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <p className="text-sm opacity-70 mb-6">{yearLabel} 기준</p>

        {lotteryPool.length === 0 ? (
          <p className="text-center text-sm opacity-60 py-12">이 연도에 등록된 앨범이 없습니다.</p>
        ) : (
          <>
            {displayAlbum ? (
              <button
                type="button"
                disabled={phase === 'spinning'}
                onClick={() => {
                  if (phase === 'result' && resultAlbum) {
                    onAlbumClick(resultAlbum);
                    onClose();
                  }
                }}
                className={`w-full text-left rounded-2xl transition-opacity ${
                  phase === 'result' ? 'hover:opacity-95 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className="relative aspect-square w-full max-w-[280px] mx-auto overflow-hidden rounded-xl"
                  style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  {displayAlbum.cover_image_url ? (
                    <img
                      key={displayAlbum.id}
                      src={displayAlbum.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover transition-opacity duration-100"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      <Music className="size-12 opacity-35" strokeWidth={1.5} aria-hidden />
                    </div>
                  )}
                  {phase === 'spinning' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-sm font-semibold text-white">추천 중…</span>
                    </div>
                  ) : null}
                </div>

                {phase === 'result' && resultAlbum ? (
                  <div
                    className={`mt-5 space-y-2 text-center transition-opacity duration-500 ease-out ${
                      metaVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <h3 className="text-lg font-bold leading-snug">{resultAlbum.album_name}</h3>
                    <p className="text-sm opacity-70">{resultAlbum.artist || '아티스트 미상'}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {resultAlbum.genre1 ? (
                        <span className="badge-apple px-2 py-0.5 text-[11px]">{resultAlbum.genre1}</span>
                      ) : null}
                      {resultAlbum.genre2 ? (
                        <span className="badge-apple px-2 py-0.5 text-[11px]">{resultAlbum.genre2}</span>
                      ) : null}
                    </div>
                    {resultAlbum.release_date ? (
                      <p className="text-xs opacity-60 pt-0.5">
                        발매일 {resultAlbum.release_date.slice(0, 10)}
                      </p>
                    ) : null}
                    <p className="text-xs opacity-50 pt-2">탭하여 상세 보기</p>
                  </div>
                ) : null}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
