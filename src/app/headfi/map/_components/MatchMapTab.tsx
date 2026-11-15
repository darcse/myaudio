'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Headfi, HeadfiCombo } from '@/app/headfi/types';
import { buildGearByIdMap, formatComboMapLabel } from '@/app/headfi/headfiComboUtils';
import {
  computeMatchScoreDisplay,
  formatMatchScoreTotalLine,
  isWiredHeadphoneEarphoneCategory,
} from '@/lib/headfiMatchScore';

type CacheRow = {
  combo_id: string;
  target_gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

type MatchMapTabProps = {
  library: Headfi[];
  combos: HeadfiCombo[];
  matchCache: CacheRow[];
  isAuthenticated: boolean | null;
};

type SelectedCell = {
  comboId: string;
  hpId: number;
  comboName: string;
  hpName: string;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

type RowBatchState = {
  running: boolean;
  current: number;
  total: number;
  failedComboIds: string[];
  force: boolean;
};

type CategoryFilter = '전체' | '헤드폰' | '이어폰';

const CATEGORY_FILTER_OPTIONS: CategoryFilter[] = ['전체', '헤드폰', '이어폰'];

const COMBO_HEADER_MIN_WIDTH = '5.5rem';
const ROW_LABEL_COL_WIDTH = '10rem';

const HEATMAP_SCROLL_MAX_HEIGHT = 'min(80dvh, 48rem)';

function stickyHeaderCellStyle(border: 'bottom' | 'right' | 'both'): CSSProperties {
  const style: CSSProperties = { background: 'var(--card-bg)' };
  if (border === 'bottom' || border === 'both') {
    style.borderBottom = '1px solid var(--border)';
    style.boxShadow = '0 2px 4px -2px color-mix(in srgb, var(--foreground) 10%, transparent)';
  }
  if (border === 'right' || border === 'both') {
    style.borderRight = '1px solid var(--border)';
    style.boxShadow =
      border === 'both'
        ? '2px 2px 4px -2px color-mix(in srgb, var(--foreground) 10%, transparent)'
        : '2px 0 4px -2px color-mix(in srgb, var(--foreground) 10%, transparent)';
  }
  return style;
}

function filterToggleStyle(active: boolean): CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

function deviceName(brand: string | null | undefined, model: string | null | undefined): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '—';
}

function hpModelLabel(item: Headfi): string {
  return (item.model || item.brand || '').trim();
}

function compareHpModelNames(a: Headfi, b: Headfi): number {
  return hpModelLabel(a).localeCompare(hpModelLabel(b), 'en', { numeric: true, sensitivity: 'base' });
}

function cellKey(comboId: string, hpId: number): string {
  return `${comboId}-${hpId}`;
}

function findCacheEntry(cache: CacheRow[], comboId: string, hpId: number): CacheRow | null {
  return cache.find((row) => row.combo_id === comboId && row.target_gear_id === hpId) ?? null;
}

function scoreCellBackground(total: number): string {
  if (total >= 285) {
    return 'color-mix(in srgb, #22a06b 62%, var(--card-bg))';
  }
  if (total >= 270) {
    return 'color-mix(in srgb, #e5a100 62%, var(--card-bg))';
  }
  if (total >= 240) {
    return 'color-mix(in srgb, #5bb8e8 55%, var(--card-bg))';
  }
  if (total >= 210) {
    return 'var(--match-score-gray-strong)';
  }
  return 'var(--match-score-gray-soft)';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--badge-bg)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, background: 'var(--foreground)' }}
        />
      </div>
    </div>
  );
}

export function MatchMapTab({ library, combos, matchCache, isAuthenticated }: MatchMapTabProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [reanalyzeConfirm, setReanalyzeConfirm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const [cache, setCache] = useState<CacheRow[]>(matchCache);
  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set());
  const [rowBatchByHp, setRowBatchByHp] = useState<Record<number, RowBatchState>>({});
  const [includeRescoreByHp, setIncludeRescoreByHp] = useState<Record<number, boolean>>({});
  const abortBatchHpIdsRef = useRef<Set<number>>(new Set());
  const rowBatchByHpRef = useRef(rowBatchByHp);
  rowBatchByHpRef.current = rowBatchByHp;
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    setCache(matchCache);
  }, [matchCache]);

  const setCellLoading = useCallback((key: string, loading: boolean) => {
    setLoadingCells((prev) => {
      const next = new Set(prev);
      if (loading) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const analyzeCell = useCallback(
    async (combo: HeadfiCombo, hp: Headfi, force = false, silent = false) => {
      if (!isAuthenticated) return null;
      const key = cellKey(combo.id, hp.id);
      setCellLoading(key, true);
      try {
        const res = await fetch('/api/headfi-match-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comboId: combo.id,
            targetGearId: hp.id,
            force,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          results?: {
            gear_id: number;
            drive: number;
            synergy: number;
            genre: number;
            comment: string;
          }[];
        };
        if (!res.ok) {
          if (!silent) toast.error(data.error || '궁합 분석에 실패했습니다.');
          return null;
        }
        const result = data.results?.find((row) => row.gear_id === hp.id) ?? data.results?.[0];
        if (!result) {
          if (!silent) toast.error('궁합 분석에 실패했습니다.');
          return null;
        }
        const row: CacheRow = {
          combo_id: combo.id,
          target_gear_id: hp.id,
          drive: result.drive,
          synergy: result.synergy,
          genre: result.genre,
          comment: result.comment || '',
        };
        setCache((prev) => {
          const filtered = prev.filter(
            (item) => !(item.combo_id === combo.id && item.target_gear_id === hp.id),
          );
          return [...filtered, row];
        });
        return row;
      } catch {
        if (!silent) toast.error('궁합 분석에 실패했습니다.');
        return null;
      } finally {
        setCellLoading(key, false);
      }
    },
    [isAuthenticated, setCellLoading],
  );

  const runRowBatch = useCallback(
    async (hp: Headfi, options: { force: boolean; onlyFailed?: boolean }) => {
      if (!isAuthenticated) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      if (combos.length === 0) {
        toast.error('등록된 조합이 없습니다.');
        return;
      }
      if (rowBatchByHpRef.current[hp.id]?.running) return;

      const currentCache = cacheRef.current;
      const prevFailed = rowBatchByHpRef.current[hp.id]?.failedComboIds ?? [];
      let targets: HeadfiCombo[];
      if (options.onlyFailed) {
        targets = combos.filter((combo) => prevFailed.includes(combo.id));
      } else if (options.force) {
        targets = [...combos];
      } else {
        targets = combos.filter((combo) => !findCacheEntry(currentCache, combo.id, hp.id));
      }

      if (targets.length === 0) {
        toast.info(options.onlyFailed ? '재시도할 실패 셀이 없습니다.' : '새로 채점할 셀이 없습니다.');
        return;
      }

      abortBatchHpIdsRef.current.delete(hp.id);
      setRowBatchByHp((prev) => ({
        ...prev,
        [hp.id]: {
          running: true,
          current: 0,
          total: targets.length,
          failedComboIds: options.onlyFailed ? [] : prev[hp.id]?.failedComboIds ?? [],
          force: options.force,
        },
      }));

      const failedComboIds: string[] = [];
      for (let i = 0; i < targets.length; i += 1) {
        if (abortBatchHpIdsRef.current.has(hp.id)) break;
        const combo = targets[i];
        setRowBatchByHp((prev) => ({
          ...prev,
          [hp.id]: {
            running: true,
            current: i + 1,
            total: targets.length,
            failedComboIds: prev[hp.id]?.failedComboIds ?? [],
            force: options.force,
          },
        }));
        const row = await analyzeCell(combo, hp, options.force, true);
        if (!row) failedComboIds.push(combo.id);
      }

      const aborted = abortBatchHpIdsRef.current.has(hp.id);
      abortBatchHpIdsRef.current.delete(hp.id);
      setRowBatchByHp((prev) => ({
        ...prev,
        [hp.id]: {
          running: false,
          current: aborted
            ? (prev[hp.id]?.current ?? targets.length)
            : targets.length,
          total: targets.length,
          failedComboIds,
          force: options.force,
        },
      }));
      if (aborted) {
        toast.info('전체 매칭을 중단했습니다. 완료된 셀은 유지됩니다.');
      } else if (failedComboIds.length > 0) {
        toast.error(`전체 매칭 완료 · 실패 ${failedComboIds.length}개`);
      } else {
        toast.success('전체 매칭을 완료했습니다.');
      }
    },
    [analyzeCell, combos, isAuthenticated],
  );

  const stopRowBatch = useCallback((hpId: number) => {
    abortBatchHpIdsRef.current.add(hpId);
  }, []);

  const gearById = useMemo(() => buildGearByIdMap(library), [library]);

  const runReanalyze = useCallback(
    async (cell: SelectedCell) => {
      if (!isAuthenticated) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      const combo = combos.find((item) => item.id === cell.comboId);
      const hp = gearById.get(cell.hpId);
      if (!combo) {
        toast.error('조합 정보를 찾을 수 없습니다.');
        return;
      }
      if (!hp) {
        toast.error('헤드폰·이어폰 정보를 찾을 수 없습니다.');
        return;
      }
      const row = await analyzeCell(combo, hp, true);
      if (!row) return;
      setSelected({
        comboId: row.combo_id,
        hpId: row.target_gear_id,
        comboName: cell.comboName,
        hpName: cell.hpName,
        drive: row.drive,
        synergy: row.synergy,
        genre: row.genre,
        comment: row.comment,
      });
      setReanalyzeConfirm(false);
    },
    [analyzeCell, combos, gearById, isAuthenticated],
  );

  useEffect(() => {
    if (!selected) {
      setReanalyzeConfirm(false);
    }
  }, [selected]);

  useLockBodyScroll(Boolean(selected));

  const { allHpRows } = useMemo(() => {
    const owned = library.filter((item) => item.status2 === '보유중');
    const hps = owned.filter((item) => isWiredHeadphoneEarphoneCategory(item.category));
    return { allHpRows: hps };
  }, [library]);

  const hpRows = useMemo(() => {
    const filtered =
      categoryFilter === '전체' ? allHpRows : allHpRows.filter((item) => item.category === categoryFilter);
    return [...filtered].sort(compareHpModelNames);
  }, [allHpRows, categoryFilter]);

  const selectedScoreDisplay = useMemo(() => {
    if (!selected) return null;
    const hp = gearById.get(selected.hpId);
    return computeMatchScoreDisplay(
      selected.drive,
      selected.synergy,
      selected.genre,
      hp?.pairing_combo_id,
      selected.comboId,
    );
  }, [selected, gearById]);

  if (combos.length === 0) {
    return (
      <p className="py-12 text-center text-sm opacity-60">
        등록된 조합이 없습니다. 헤드파이 → 기기 매칭에서 조합을 먼저 등록해 주세요.
      </p>
    );
  }

  if (allHpRows.length === 0) {
    return (
      <p className="py-12 text-center text-sm opacity-60">
        매칭맵을 표시하려면 보유중인 유선 헤드폰·이어폰이 필요합니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm opacity-70">
          헤드폰·이어폰(행) × 조합(열) 궁합 점수 히트맵. 평가된 셀은 상세 확인·재분석, 미평가 셀은 클릭 시 분석합니다.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs font-semibold opacity-60">카테고리</span>
          {CATEGORY_FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategoryFilter(option)}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(categoryFilter === option)}
              aria-pressed={categoryFilter === option}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-3"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div
          className="overflow-auto"
          style={{ maxHeight: HEATMAP_SCROLL_MAX_HEIGHT }}
        >
          <table
            className="w-full table-fixed border-collapse text-xs"
            style={{
              minWidth: `max(100%, calc(${ROW_LABEL_COL_WIDTH} + ${combos.length} * ${COMBO_HEADER_MIN_WIDTH}))`,
            }}
          >
          <colgroup>
            <col style={{ width: ROW_LABEL_COL_WIDTH }} />
            {combos.map((combo) => (
              <col key={combo.id} style={{ minWidth: COMBO_HEADER_MIN_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-40 px-2 py-2 text-left font-semibold"
                style={stickyHeaderCellStyle('both')}
              />
              {combos.map((combo) => {
                const label = formatComboMapLabel(combo, gearById);
                return (
                  <th
                    key={combo.id}
                    className="sticky top-0 z-20 overflow-hidden px-1 py-2 text-center font-medium leading-tight"
                    style={{ ...stickyHeaderCellStyle('bottom'), minWidth: COMBO_HEADER_MIN_WIDTH }}
                    title={label}
                  >
                    <span className="mx-auto block line-clamp-3 text-center text-[10px] break-words">
                      {label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hpRows.map((hp) => {
              const batch = rowBatchByHp[hp.id];
              const includeRescore = includeRescoreByHp[hp.id] ?? false;
              const canBatch = Boolean(isAuthenticated) && !batch?.running;
              return (
              <tr key={hp.id}>
                <th
                  className="sticky left-0 z-10 overflow-hidden px-2 py-1.5 text-left font-medium leading-tight"
                  style={stickyHeaderCellStyle('right')}
                  title={deviceName(hp.brand, hp.model)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="line-clamp-2 break-words">{hp.model || hp.brand}</span>
                    {batch?.running ? (
                      <div className="flex flex-nowrap items-center gap-1.5">
                        <span className="shrink-0 text-[10px] font-normal tabular-nums opacity-70">
                          {batch.current}/{batch.total}
                        </span>
                        <button
                          type="button"
                          onClick={() => stopRowBatch(hp.id)}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: 'var(--badge-bg)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          중단
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-normal opacity-70">
                            <input
                              type="checkbox"
                              checked={includeRescore}
                              disabled={!isAuthenticated}
                              onChange={(e) =>
                                setIncludeRescoreByHp((prev) => ({
                                  ...prev,
                                  [hp.id]: e.target.checked,
                                }))
                              }
                            />
                            재채점
                          </label>
                          <button
                            type="button"
                            disabled={!canBatch}
                            onClick={() =>
                              void runRowBatch(hp, { force: includeRescore })
                            }
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-40"
                            style={{
                              background: 'var(--foreground)',
                              color: 'var(--background)',
                            }}
                          >
                            전체 매칭
                          </button>
                        </div>
                        {(batch?.failedComboIds.length ?? 0) > 0 && (
                          <button
                            type="button"
                            disabled={!canBatch}
                            onClick={() =>
                              void runRowBatch(hp, {
                                force: batch?.force ?? includeRescore,
                                onlyFailed: true,
                              })
                            }
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-40"
                            style={{
                              background: 'var(--badge-bg)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            실패 {batch!.failedComboIds.length}개 재시도
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
                {combos.map((combo) => {
                  const entry = findCacheEntry(cache, combo.id, hp.id);
                  const scoreDisplay = entry
                    ? computeMatchScoreDisplay(
                        entry.drive,
                        entry.synergy,
                        entry.genre,
                        hp.pairing_combo_id,
                        combo.id,
                      )
                    : null;
                  const total = scoreDisplay?.displayTotal ?? null;
                  const isSelected = selected?.comboId === combo.id && selected?.hpId === hp.id;
                  const key = cellKey(combo.id, hp.id);
                  const isLoading = loadingCells.has(key);
                  const hasMasterBonus = scoreDisplay?.hasMasterBonus ?? false;
                  const cellStyle = entry
                    ? {
                        background: scoreCellBackground(total!),
                        border: hasMasterBonus
                          ? '2px solid color-mix(in srgb, #e5a100 75%, var(--border))'
                          : '1px solid var(--border)',
                      }
                    : {
                        background: 'var(--badge-bg)',
                        border: '1px solid var(--border)',
                        opacity: 0.55,
                      };

                  return (
                    <td key={combo.id} className="overflow-hidden p-0.5 text-center align-middle">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          if (entry) {
                            setSelected({
                              comboId: combo.id,
                              hpId: hp.id,
                              comboName: formatComboMapLabel(combo, gearById),
                              hpName: hpModelLabel(hp),
                              drive: entry.drive,
                              synergy: entry.synergy,
                              genre: entry.genre,
                              comment: entry.comment,
                            });
                            return;
                          }
                          void analyzeCell(combo, hp);
                        }}
                        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-opacity hover:opacity-90 disabled:cursor-default"
                        style={{
                          ...cellStyle,
                          outline: isSelected ? '2px solid var(--foreground)' : undefined,
                        }}
                        title={
                          entry && scoreDisplay
                            ? `${formatMatchScoreTotalLine(scoreDisplay)} · 드라이브 ${entry.drive} · 시너지 ${entry.synergy} · 장르 ${entry.genre}`
                            : isAuthenticated
                              ? '클릭하여 궁합 분석'
                              : '미평가'
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin opacity-70" />
                        ) : entry ? (
                          <>
                            {total}
                            {hasMasterBonus ? (
                              <span
                                className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full text-[7px] font-bold leading-none"
                                style={{ background: '#e5a100', color: 'var(--background)' }}
                                aria-hidden
                              >
                                M
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[9px] font-medium opacity-70">미평가</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {selected
        ? createPortal(
            <div
              className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setSelected(null)}
            >
              <div
                className="modal-panel-apple relative w-full max-w-md px-6 pb-6 pt-2 sm:px-8 sm:pb-8 sm:pt-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-1.5 right-3 flex size-7 items-center justify-center text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100 sm:top-2 sm:right-4"
                  onClick={() => setSelected(null)}
                  aria-label="닫기"
                >
                  &times;
                </button>
                <div className="mb-4 border-b pb-3 pr-9" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="section-title pt-7 text-lg leading-snug">
                    {selected.comboName} × {selected.hpName}
                  </h2>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="드라이브 능력" value={selected.drive} />
                  <ScoreBar label="음색 시너지" value={selected.synergy} />
                  <ScoreBar label="장르 매칭" value={selected.genre} />
                </div>
                <p className="mt-4 text-sm font-semibold tabular-nums">
                  {selectedScoreDisplay ? formatMatchScoreTotalLine(selectedScoreDisplay) : null}
                </p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed opacity-80">
                  {selected.comment || '—'}
                </p>
                {isAuthenticated ? (
                  reanalyzeConfirm ? (
                    <div className="mt-6 space-y-3">
                      <p className="text-sm opacity-70">캐시를 삭제하고 다시 분석합니다.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-apple btn-apple-secondary flex h-[42px] flex-1 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={loadingCells.has(cellKey(selected.comboId, selected.hpId))}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReanalyzeConfirm(false);
                          }}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className="btn-apple btn-apple-primary flex h-[42px] flex-1 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={loadingCells.has(cellKey(selected.comboId, selected.hpId))}
                          onClick={(e) => {
                            e.stopPropagation();
                            void runReanalyze(selected);
                          }}
                        >
                          {loadingCells.has(cellKey(selected.comboId, selected.hpId)) ? (
                            <Loader2 className="size-5 animate-spin opacity-70" />
                          ) : (
                            '확인'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-apple btn-apple-secondary mt-6 flex h-[42px] w-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loadingCells.has(cellKey(selected.comboId, selected.hpId))}
                      onClick={(e) => {
                        e.stopPropagation();
                        setReanalyzeConfirm(true);
                      }}
                    >
                      {loadingCells.has(cellKey(selected.comboId, selected.hpId)) ? (
                        <Loader2 className="size-5 animate-spin opacity-70" />
                      ) : (
                        '재분석'
                      )}
                    </button>
                  )
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
