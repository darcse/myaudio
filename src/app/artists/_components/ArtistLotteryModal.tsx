/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic2, RefreshCw, UserCircle } from 'lucide-react';

export type ArtistLotteryEntry = {
  name: string;
  profileImageUrl: string | null;
  country: string | null;
  artistType: string | null;
  genre1: string | null;
  albumCount: number;
  totalListenCount: number;
};

function pickRandomArtist(pool: ArtistLotteryEntry[], exclude: ArtistLotteryEntry | null = null): ArtistLotteryEntry {
  if (pool.length === 1) return pool[0];
  let next: ArtistLotteryEntry;
  let guard = 0;
  do {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  } while (exclude && next.name === exclude.name && guard < 12);
  return next;
}

type LotteryPhase = 'idle' | 'spinning' | 'result';

type ArtistLotteryModalProps = {
  open: boolean;
  onClose: () => void;
  lotteryPool: ArtistLotteryEntry[];
  onArtistClick: (name: string) => void;
};

function ArtistProfileSpin({
  artist,
  spinning,
}: {
  artist: ArtistLotteryEntry | null;
  spinning: boolean;
}) {
  return (
    <div
      className="relative mx-auto size-[200px] overflow-hidden rounded-full sm:size-[220px]"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)', background: 'var(--badge-bg)' }}
    >
      {artist?.profileImageUrl ? (
        <img
          key={artist.name}
          src={artist.profileImageUrl}
          alt=""
          className="size-full object-cover transition-opacity duration-100"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <UserCircle className="size-24 opacity-35" strokeWidth={1.25} aria-hidden />
        </div>
      )}
      {spinning ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-sm font-semibold text-white">추천 중…</span>
        </div>
      ) : null}
    </div>
  );
}

export function ArtistLotteryModal({
  open,
  onClose,
  lotteryPool,
  onArtistClick,
}: ArtistLotteryModalProps) {
  const [phase, setPhase] = useState<LotteryPhase>('idle');
  const [spinArtist, setSpinArtist] = useState<ArtistLotteryEntry | null>(null);
  const [resultArtist, setResultArtist] = useState<ArtistLotteryEntry | null>(null);
  const [metaVisible, setMetaVisible] = useState(false);
  const spinTimersRef = useRef<number[]>([]);

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((id) => window.clearTimeout(id));
    spinTimersRef.current = [];
  }, []);

  const runSpinAnimation = useCallback(
    (pool: ArtistLotteryEntry[], exclude: ArtistLotteryEntry | null) =>
      new Promise<ArtistLotteryEntry>((resolve) => {
        clearSpinTimers();
        setPhase('spinning');
        setMetaVisible(false);
        const finalArtist = pickRandomArtist(pool, exclude);
        const totalSteps = 18 + Math.floor(Math.random() * 6);
        let step = 0;

        const tick = () => {
          if (step >= totalSteps) {
            setSpinArtist(finalArtist);
            setResultArtist(finalArtist);
            setPhase('result');
            resolve(finalArtist);
            return;
          }
          setSpinArtist(pickRandomArtist(pool));
          const delay = Math.min(40 + step * step * 5, 420);
          step += 1;
          const id = window.setTimeout(tick, delay);
          spinTimersRef.current.push(id);
        };

        setSpinArtist(pickRandomArtist(pool));
        tick();
      }),
    [clearSpinTimers],
  );

  const startLottery = useCallback(
    (exclude: ArtistLotteryEntry | null) => {
      if (lotteryPool.length === 0) return;
      void runSpinAnimation(lotteryPool, exclude);
    },
    [lotteryPool, runSpinAnimation],
  );

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    if (!open) {
      clearSpinTimers();
      setPhase('idle');
      setSpinArtist(null);
      setResultArtist(null);
      setMetaVisible(false);
    }
  }, [open, clearSpinTimers]);

  useEffect(() => {
    if (phase !== 'result' || !resultArtist) return;
    setMetaVisible(false);
    const id = window.requestAnimationFrame(() => setMetaVisible(true));
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 추첨 결과 name 변경 시에만 메타 페이드인 재실행
  }, [phase, resultArtist?.name]);

  if (!open) return null;

  const displayArtist =
    phase === 'spinning' ? spinArtist : phase === 'result' ? resultArtist : null;

  return (
    <div
      className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="artist-lottery-title"
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

        <div className="flex items-center gap-1.5 mb-6 pr-8">
          <h2 id="artist-lottery-title" className="section-title text-xl shrink-0">
            추천 아티스트
          </h2>
          {lotteryPool.length > 0 && phase === 'result' ? (
            <button
              type="button"
              onClick={() => startLottery(resultArtist)}
              className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ color: 'var(--foreground)' }}
              title="재추천"
              aria-label="재추천"
            >
              <RefreshCw className="size-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {lotteryPool.length === 0 ? (
          <p className="text-center text-sm opacity-60 py-12">등록된 아티스트가 없습니다.</p>
        ) : lotteryPool.length === 1 ? (
          <p className="mb-4 text-center text-xs opacity-60">등록된 아티스트가 1명입니다.</p>
        ) : null}

        {lotteryPool.length > 0 ? (
          <>
            {phase === 'idle' ? (
              <div className="flex flex-col items-center gap-6">
                <div
                  className="flex size-[200px] items-center justify-center rounded-full sm:size-[220px]"
                  style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
                >
                  <Mic2 className="size-16 opacity-30" strokeWidth={1.25} aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={() => startLottery(null)}
                  className="btn-apple btn-apple-primary h-[44px] min-w-[140px] px-8"
                >
                  추천
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={phase === 'spinning'}
                onClick={() => {
                  if (phase === 'result' && resultArtist) {
                    onArtistClick(resultArtist.name);
                    onClose();
                  }
                }}
                className={`w-full text-left rounded-2xl transition-opacity ${
                  phase === 'result' ? 'hover:opacity-95 cursor-pointer' : 'cursor-default'
                }`}
              >
                <ArtistProfileSpin artist={displayArtist} spinning={phase === 'spinning'} />

                {phase === 'result' && resultArtist ? (
                  <div
                    className={`mt-5 space-y-2 text-center transition-opacity duration-500 ease-out ${
                      metaVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <h3 className="text-lg font-bold leading-snug">{resultArtist.name}</h3>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {resultArtist.country ? (
                        <span className="badge-apple px-2 py-0.5 text-[11px]">{resultArtist.country}</span>
                      ) : null}
                      {resultArtist.artistType ? (
                        <span className="badge-apple px-2 py-0.5 text-[11px]">{resultArtist.artistType}</span>
                      ) : null}
                      {resultArtist.genre1 ? (
                        <span className="badge-apple px-2 py-0.5 text-[11px]">{resultArtist.genre1}</span>
                      ) : null}
                    </div>
                    <p className="text-sm opacity-70 pt-1">
                      등록 앨범 {resultArtist.albumCount}장 · 총 청취 {resultArtist.totalListenCount}회
                    </p>
                    <p className="text-xs opacity-50 pt-2">탭하여 상세 보기</p>
                  </div>
                ) : null}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
