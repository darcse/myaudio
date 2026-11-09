/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Music, Play, RefreshCw } from 'lucide-react';
import {
  albumLotteryCoverAsAlbum,
  fetchCatalogAlbumLotteryDraw,
  fetchCatalogLotteryFilterRows,
  type CatalogLotteryFilterRow,
} from '../albumLotteryDraw';
import type { Album } from '../types';
import {
  ALL_GENRE1_FILTER,
  ALL_PERIOD_YEAR_FILTER,
  ALBUM_PERIOD_FILTER_OPTIONS,
  LOTTERY_ALBUM_TYPE_FILTER_OPTIONS,
  albumMatchesCatalogLotteryConditions,
  buildLotteryGenre1Options,
  type AlbumLotteryAlbumTypeFilter,
  type AlbumLotteryCatalogTag,
} from '../utils';

const CATALOG_SELECT_CLASS =
  'select-apple h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] px-3 py-2 text-base disabled:opacity-50';

const CATALOG_CHIP_CLASS =
  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

const COVER_SLOT_CLASS =
  'relative mx-auto aspect-square h-[min(40dvh,15rem)] w-[min(40dvh,15rem)] max-w-full overflow-hidden rounded-xl';

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

type AlbumLotteryModalProps = {
  open: boolean;
  onClose: () => void;
  lotteryPool?: Album[];
  mode?: 'pool' | 'catalog';
  yearLabel?: string;
  subtitle?: string;
  title?: string;
  autoStart?: boolean;
  emptyMessage?: string;
  onAlbumClick: (album: Album) => void;
};

export function AlbumLotteryModal({
  open,
  onClose,
  lotteryPool = [],
  mode = 'pool',
  yearLabel,
  subtitle,
  title = '랜덤 앨범 추천',
  autoStart = true,
  emptyMessage = '추천할 앨범이 없습니다.',
  onAlbumClick,
}: AlbumLotteryModalProps) {
  const isCatalog = mode === 'catalog';
  const showRedraw = !isCatalog;
  const catalogAutoStart = autoStart && !isCatalog;
  const [phase, setPhase] = useState<LotteryPhase>(catalogAutoStart ? 'spinning' : 'idle');
  const [spinAlbum, setSpinAlbum] = useState<Album | null>(null);
  const [resultAlbum, setResultAlbum] = useState<Album | null>(null);
  const [metaVisible, setMetaVisible] = useState(false);
  const [catalogEmpty, setCatalogEmpty] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [catalogYearFilter, setCatalogYearFilter] = useState(ALL_PERIOD_YEAR_FILTER);
  const [catalogTag, setCatalogTag] = useState<AlbumLotteryCatalogTag>('전체');
  const [catalogGenre1Filter, setCatalogGenre1Filter] = useState(ALL_GENRE1_FILTER);
  const [catalogAlbumTypeFilter, setCatalogAlbumTypeFilter] =
    useState<AlbumLotteryAlbumTypeFilter>('전체');
  const [catalogFilterRows, setCatalogFilterRows] = useState<CatalogLotteryFilterRow[]>([]);
  const [catalogRowsLoading, setCatalogRowsLoading] = useState(false);
  const [catalogRowsError, setCatalogRowsError] = useState<string | null>(null);
  const spinTimersRef = useRef<number[]>([]);
  const catalogRequestRef = useRef(0);
  const catalogRowsRequestRef = useRef(0);
  const catalogBusyRef = useRef(false);
  const catalogBusy = drawing;
  const catalogYearDisabled = catalogTag === 'All Time';

  const catalogMatchFilters = useMemo(
    () => ({
      yearFilter: catalogYearFilter,
      tag: catalogTag,
      genre1Filter: catalogGenre1Filter,
      albumTypeFilter: catalogAlbumTypeFilter,
    }),
    [catalogAlbumTypeFilter, catalogGenre1Filter, catalogTag, catalogYearFilter],
  );

  const catalogGenre1Options = useMemo(
    () => buildLotteryGenre1Options(catalogFilterRows),
    [catalogFilterRows],
  );

  const catalogCandidateCount = useMemo(
    () =>
      catalogFilterRows.filter((row) =>
        albumMatchesCatalogLotteryConditions(row as Album, catalogMatchFilters),
      ).length,
    [catalogFilterRows, catalogMatchFilters],
  );

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((id) => window.clearTimeout(id));
    spinTimersRef.current = [];
  }, []);

  const runSpinAnimation = useCallback(
    (pool: Album[], finalAlbum: Album) =>
      new Promise<Album>((resolve) => {
        clearSpinTimers();
        setPhase('spinning');
        setMetaVisible(false);
        const visualPool = pool.length > 0 ? pool : [finalAlbum];
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
          setSpinAlbum(pickRandomAlbum(visualPool));
          const delay = Math.min(40 + step * step * 5, 420);
          step += 1;
          const id = window.setTimeout(tick, delay);
          spinTimersRef.current.push(id);
        };

        setSpinAlbum(pickRandomAlbum(visualPool));
        tick();
      }),
    [clearSpinTimers],
  );

  const startLottery = useCallback(
    (exclude: Album | null) => {
      if (isCatalog || lotteryPool.length === 0) return;
      void runSpinAnimation(lotteryPool, pickRandomAlbum(lotteryPool, exclude));
    },
    [isCatalog, lotteryPool, runSpinAnimation],
  );

  const resetCatalogConditions = useCallback(() => {
    setCatalogYearFilter(ALL_PERIOD_YEAR_FILTER);
    setCatalogTag('전체');
    setCatalogGenre1Filter(ALL_GENRE1_FILTER);
    setCatalogAlbumTypeFilter('전체');
    catalogBusyRef.current = false;
    setDrawing(false);
    setCatalogEmpty(false);
    setDrawError(null);
    setPhase('idle');
    setSpinAlbum(null);
    setResultAlbum(null);
    setMetaVisible(false);
  }, []);

  const startCatalogLottery = useCallback(
    (exclude: Album | null) => {
      if (!isCatalog || catalogBusyRef.current) return;
      if (catalogCandidateCount < 1) {
        setCatalogEmpty(true);
        setPhase('idle');
        setSpinAlbum(null);
        setResultAlbum(null);
        setMetaVisible(false);
        return;
      }
      const requestId = catalogRequestRef.current + 1;
      catalogRequestRef.current = requestId;
      catalogBusyRef.current = true;
      setDrawing(true);
      setCatalogEmpty(false);
      setDrawError(null);
      void fetchCatalogAlbumLotteryDraw({
        yearFilter: catalogYearFilter,
        tag: catalogTag,
        genre1Filter: catalogGenre1Filter,
        albumTypeFilter: catalogAlbumTypeFilter,
        excludeId: exclude?.id,
      })
        .then((draw) => {
          if (catalogRequestRef.current !== requestId) {
            catalogBusyRef.current = false;
            setDrawing(false);
            return;
          }
          if (draw.status === 'empty') {
            catalogBusyRef.current = false;
            setDrawing(false);
            setCatalogEmpty(true);
            setPhase('idle');
            setSpinAlbum(null);
            setResultAlbum(null);
            setMetaVisible(false);
            return;
          }
          if (draw.status === 'error') {
            catalogBusyRef.current = false;
            setDrawing(false);
            setDrawError(draw.message);
            setPhase('idle');
            return;
          }
          const visualPool = draw.spinCovers.map(albumLotteryCoverAsAlbum);
          return runSpinAnimation(visualPool, draw.winner).then(() => {
            if (catalogRequestRef.current !== requestId) {
              catalogBusyRef.current = false;
              setDrawing(false);
              return;
            }
            catalogBusyRef.current = false;
            setDrawing(false);
          });
        })
        .catch(() => {
          if (catalogRequestRef.current !== requestId) return;
          catalogBusyRef.current = false;
          setDrawing(false);
          setDrawError('추천을 불러오지 못했습니다.');
          setPhase('idle');
        });
    },
    [
      catalogAlbumTypeFilter,
      catalogCandidateCount,
      catalogGenre1Filter,
      catalogTag,
      catalogYearFilter,
      isCatalog,
      runSpinAnimation,
    ],
  );

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    catalogRequestRef.current += 1;
    catalogBusyRef.current = false;
    clearSpinTimers();
    resetCatalogConditions();
    if (!open && !isCatalog) {
      setPhase(catalogAutoStart ? 'spinning' : 'idle');
    }
  }, [open, isCatalog, catalogAutoStart, clearSpinTimers, resetCatalogConditions]);

  useEffect(() => {
    if (!open || !isCatalog) {
      catalogRowsRequestRef.current += 1;
      setCatalogFilterRows([]);
      setCatalogRowsLoading(false);
      setCatalogRowsError(null);
      return;
    }
    const requestId = catalogRowsRequestRef.current + 1;
    catalogRowsRequestRef.current = requestId;
    setCatalogRowsLoading(true);
    setCatalogRowsError(null);
    void fetchCatalogLotteryFilterRows().then((result) => {
      if (catalogRowsRequestRef.current !== requestId) return;
      setCatalogRowsLoading(false);
      if (result.status === 'error') {
        setCatalogFilterRows([]);
        setCatalogRowsError(result.message);
        return;
      }
      setCatalogFilterRows(result.rows);
    });
  }, [open, isCatalog]);

  useEffect(() => {
    if (!isCatalog) return;
    setCatalogEmpty(false);
    setDrawError(null);
  }, [
    catalogAlbumTypeFilter,
    catalogGenre1Filter,
    catalogTag,
    catalogYearFilter,
    isCatalog,
  ]);

  useEffect(() => {
    if (!open || isCatalog) return;
    if (lotteryPool.length === 0) return;
    if (autoStart) {
      startLottery(null);
    } else {
      setPhase('idle');
      setSpinAlbum(null);
      setResultAlbum(null);
      setMetaVisible(false);
    }
  }, [open, isCatalog, autoStart, lotteryPool.length, startLottery]);

  const caption = subtitle ?? (yearLabel ? `${yearLabel} 기준` : null);

  useEffect(() => {
    if (phase !== 'result' || !resultAlbum) return;
    setMetaVisible(false);
    const id = window.requestAnimationFrame(() => setMetaVisible(true));
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 추첨 결과 id 변경 시에만 메타 페이드인 재실행, 앨범 객체 전체 deps 시 불필요 재애니메이션
  }, [phase, resultAlbum?.id]);

  if (!open) return null;

  const displayAlbum = phase === 'spinning' ? spinAlbum : resultAlbum;
  const catalogHasCandidates =
    !catalogRowsLoading &&
    !catalogRowsError &&
    !catalogEmpty &&
    catalogCandidateCount > 0;
  const catalogShowStage = isCatalog && catalogHasCandidates && !drawError;
  const poolShowStage =
    !isCatalog && !drawError && lotteryPool.length > 0;
  const showStage = catalogShowStage || poolShowStage;
  const resultDetailLabel = resultAlbum
    ? `${resultAlbum.album_name} 상세 보기`
    : '앨범 상세 보기';

  const coverSlot = (album: Album | null, spinning: boolean) => (
    <div
      className={COVER_SLOT_CLASS}
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)', background: 'var(--badge-bg)' }}
    >
      {album?.cover_image_url ? (
        <img
          key={album.id}
          src={album.cover_image_url}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-100"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Music className="size-12 opacity-35" strokeWidth={1.5} aria-hidden />
        </div>
      )}
      {spinning ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-sm font-semibold text-white">추천 중…</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-lottery-title"
    >
      <button
        type="button"
        className="modal-overlay-apple absolute inset-0"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="modal-panel-apple pointer-events-auto relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 z-10 text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100"
          aria-label="닫기"
        >
          &times;
        </button>

        <div className="mb-1 flex shrink-0 items-center gap-1.5 pr-8">
          <h2 id="album-lottery-title" className="section-title shrink-0 text-xl">
            {title}
          </h2>
          {showRedraw && lotteryPool.length > 0 && (autoStart || phase === 'result') ? (
            <button
              type="button"
              disabled={phase === 'spinning'}
              onClick={() => startLottery(resultAlbum)}
              className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ color: 'var(--foreground)' }}
              title="재추천"
              aria-label="재추천"
            >
              <RefreshCw className={`size-4 ${phase === 'spinning' ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {isCatalog ? (
          <div className="mt-3 shrink-0 space-y-2.5">
            <div className="flex flex-wrap gap-2">
              <select
                className={CATALOG_SELECT_CLASS}
                value={catalogYearFilter}
                disabled={catalogYearDisabled || catalogBusy}
                onChange={(e) => setCatalogYearFilter(e.target.value)}
                aria-label="기간 선택"
              >
                {ALBUM_PERIOD_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className={CATALOG_SELECT_CLASS}
                value={catalogGenre1Filter}
                disabled={catalogBusy || catalogRowsLoading}
                onChange={(e) => setCatalogGenre1Filter(e.target.value)}
                aria-label="장르1 선택"
              >
                <option value={ALL_GENRE1_FILTER}>{ALL_GENRE1_FILTER}</option>
                {catalogGenre1Options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} ({option.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="radiogroup"
                aria-label="앨범 타입"
              >
                {LOTTERY_ALBUM_TYPE_FILTER_OPTIONS.map((option) => {
                  const active = catalogAlbumTypeFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      disabled={catalogBusy}
                      onClick={() => setCatalogAlbumTypeFilter(option.value)}
                      className={CATALOG_CHIP_CLASS}
                      style={{
                        background: active ? 'var(--foreground)' : 'var(--badge-bg)',
                        color: active ? 'var(--background)' : 'var(--foreground)',
                        border: '1px solid var(--border)',
                      }}
                      aria-checked={active}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <span
                className="mx-0.5 h-4 w-px shrink-0 self-center"
                style={{ background: 'var(--border)' }}
                aria-hidden
              />
              <button
                type="button"
                disabled={catalogBusy}
                onClick={() =>
                  setCatalogTag((prev) => (prev === 'All Time' ? '전체' : 'All Time'))
                }
                className={CATALOG_CHIP_CLASS}
                style={{
                  background: catalogYearDisabled ? 'var(--foreground)' : 'var(--badge-bg)',
                  color: catalogYearDisabled ? 'var(--background)' : 'var(--foreground)',
                  border: catalogYearDisabled
                    ? '1px solid var(--foreground)'
                    : '1px dashed var(--border)',
                }}
                aria-pressed={catalogYearDisabled}
                aria-label="All Time"
              >
                All Time
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-h-4 min-w-0 items-center gap-1.5 text-xs tabular-nums opacity-60" aria-live="polite">
                {catalogRowsLoading ? (
                  <>
                    <span
                      className="inline-block size-3.5 animate-spin rounded-full border-2"
                      style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
                      aria-hidden
                    />
                    <span>후보 집계 중</span>
                  </>
                ) : catalogRowsError ? (
                  <span className="truncate">{catalogRowsError}</span>
                ) : (
                  <span>후보 {catalogCandidateCount}장</span>
                )}
              </div>
              <button
                type="button"
                disabled={
                  catalogBusy ||
                  catalogRowsLoading ||
                  Boolean(catalogRowsError) ||
                  catalogCandidateCount < 1
                }
                onClick={() => startCatalogLottery(phase === 'result' ? resultAlbum : null)}
                className="btn-apple btn-apple-primary inline-flex size-11 shrink-0 items-center justify-center rounded-full p-0 disabled:pointer-events-none disabled:opacity-40"
                aria-label={resultAlbum || phase === 'result' ? '다시 추천' : '추천 받기'}
                title={resultAlbum || phase === 'result' ? '다시 추천' : '추천 받기'}
              >
                {resultAlbum || phase === 'result' ? (
                  <RefreshCw size={18} strokeWidth={2} aria-hidden />
                ) : (
                  <Play size={18} strokeWidth={2} className="translate-x-[1px]" aria-hidden />
                )}
              </button>
            </div>
          </div>
        ) : caption ? (
          <p className="mb-4 shrink-0 text-sm opacity-70">{caption}</p>
        ) : (
          <div className="mb-4 shrink-0" />
        )}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {drawError ? (
            <p className="py-6 text-center text-sm opacity-70">{drawError}</p>
          ) : isCatalog &&
            !catalogRowsLoading &&
            !catalogRowsError &&
            (catalogEmpty || catalogCandidateCount < 1) ? (
            <p className="py-6 text-center text-sm opacity-60">조건에 맞는 앨범이 없어요</p>
          ) : !isCatalog && lotteryPool.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">{emptyMessage}</p>
          ) : lotteryPool.length === 1 && !autoStart ? (
            <p className="mb-3 text-center text-xs opacity-60">이 무드에 속한 앨범이 1장입니다.</p>
          ) : null}

          {showStage ? (
            <div className="flex flex-col items-center">
              {phase === 'idle' ? (
                <>
                  {coverSlot(null, false)}
                  {!isCatalog ? (
                    <button
                      type="button"
                      onClick={() => startLottery(null)}
                      className="btn-apple btn-apple-primary mt-4 h-[44px] min-w-[140px] px-8"
                    >
                      추천
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  disabled={phase === 'spinning'}
                  onClick={() => {
                    if (phase === 'result' && resultAlbum) {
                      onAlbumClick(resultAlbum);
                      onClose();
                    }
                  }}
                  className={`w-full rounded-2xl text-left transition-opacity ${
                    phase === 'result' ? 'cursor-pointer hover:opacity-95' : 'cursor-default'
                  }`}
                  aria-label={phase === 'result' ? resultDetailLabel : undefined}
                >
                  {coverSlot(displayAlbum, phase === 'spinning')}
                  <div className="mx-auto mt-3 min-h-[4.75rem] max-w-[15rem] space-y-1 text-center">
                    {phase === 'result' && resultAlbum ? (
                      <div
                        className={`space-y-1 transition-opacity duration-500 ease-out ${
                          metaVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <h3 className="truncate text-base font-bold leading-tight">
                          {resultAlbum.album_name}
                        </h3>
                        <p className="truncate text-sm opacity-70">
                          {resultAlbum.artist || '아티스트 미상'}
                        </p>
                        <div className="flex flex-nowrap justify-center gap-1 overflow-hidden">
                          {resultAlbum.genre1 ? (
                            <span className="badge-apple max-w-[48%] truncate px-2 py-0.5 text-[11px]">
                              {resultAlbum.genre1}
                            </span>
                          ) : null}
                          {resultAlbum.genre2 ? (
                            <span className="badge-apple max-w-[48%] truncate px-2 py-0.5 text-[11px]">
                              {resultAlbum.genre2}
                            </span>
                          ) : null}
                        </div>
                        {resultAlbum.release_date ? (
                          <p className="truncate text-xs opacity-60">
                            발매일 {resultAlbum.release_date.slice(0, 10)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
