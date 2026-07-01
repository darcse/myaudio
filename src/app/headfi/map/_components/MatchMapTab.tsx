'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Headfi } from '@/app/headfi/types';
import { isDacAmpDapCategory, isWiredHeadphoneEarphoneCategory } from '@/lib/headfiMatchScore';

type CacheRow = {
  base_gear_id: number;
  target_gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

type MatchMapTabProps = {
  library: Headfi[];
  matchCache: CacheRow[];
  isAuthenticated: boolean | null;
};

type SelectedCell = {
  dacId: number;
  hpId: number;
  dacName: string;
  hpName: string;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

type CategoryFilter = '전체' | '헤드폰' | '이어폰';

const CATEGORY_FILTER_OPTIONS: CategoryFilter[] = ['전체', '헤드폰', '이어폰'];

const STICKY_HEADER_TOP_CLASS = 'top-14';

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

function cellKey(dacId: number, hpId: number): string {
  return `${dacId}-${hpId}`;
}

function findCacheEntry(cache: CacheRow[], dacId: number, hpId: number): CacheRow | null {
  return (
    cache.find(
      (row) =>
        (row.base_gear_id === dacId && row.target_gear_id === hpId) ||
        (row.base_gear_id === hpId && row.target_gear_id === dacId),
    ) ?? null
  );
}

function scoreCellBackground(total: number): string {
  if (total >= 270) {
    return 'color-mix(in srgb, #e5a100 62%, var(--card-bg))';
  }
  if (total >= 240) {
    return 'color-mix(in srgb, var(--link) 50%, var(--card-bg))';
  }
  if (total >= 200) {
    return 'color-mix(in srgb, var(--link) 42%, var(--card-bg))';
  }
  return 'color-mix(in srgb, var(--link) 22%, var(--card-bg))';
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

export function MatchMapTab({ library, matchCache, isAuthenticated }: MatchMapTabProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const [cache, setCache] = useState<CacheRow[]>(matchCache);
  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set());

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
    async (dac: Headfi, hp: Headfi) => {
      if (!isAuthenticated) return;
      const key = cellKey(dac.id, hp.id);
      setCellLoading(key, true);
      try {
        const res = await fetch('/api/headfi-match-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'dac_amp',
            baseGearId: dac.id,
            targetGearId: hp.id,
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
          toast.error(data.error || '궁합 분석에 실패했습니다.');
          return;
        }
        const result = data.results?.find((row) => row.gear_id === hp.id) ?? data.results?.[0];
        if (!result) {
          toast.error('궁합 분석에 실패했습니다.');
          return;
        }
        setCache((prev) => {
          const filtered = prev.filter(
            (row) =>
              !(
                (row.base_gear_id === dac.id && row.target_gear_id === hp.id) ||
                (row.base_gear_id === hp.id && row.target_gear_id === dac.id)
              ),
          );
          return [
            ...filtered,
            {
              base_gear_id: dac.id,
              target_gear_id: hp.id,
              drive: result.drive,
              synergy: result.synergy,
              genre: result.genre,
              comment: result.comment || '',
            },
          ];
        });
      } catch {
        toast.error('궁합 분석에 실패했습니다.');
      } finally {
        setCellLoading(key, false);
      }
    },
    [isAuthenticated, setCellLoading],
  );

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const { allHpRows, dacCols } = useMemo(() => {
    const owned = library.filter((item) => item.status2 === '보유중');
    const dacs = owned.filter((item) => isDacAmpDapCategory(item.category));
    const hps = owned.filter((item) => isWiredHeadphoneEarphoneCategory(item.category));
    return { allHpRows: hps, dacCols: dacs };
  }, [library]);

  const hpRows = useMemo(() => {
    if (categoryFilter === '전체') return allHpRows;
    return allHpRows.filter((item) => item.category === categoryFilter);
  }, [allHpRows, categoryFilter]);

  if (allHpRows.length === 0 || dacCols.length === 0) {
    return (
      <p className="py-12 text-center text-sm opacity-60">
        매칭맵을 표시하려면 보유중인 DAC/AMP·DAP와 유선 헤드폰·이어폰이 필요합니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm opacity-70">
          헤드폰·이어폰(행) × DAC/AMP·DAP(열) 궁합 점수 히트맵. 셀을 클릭하면 상세 스코어를 확인할 수 있습니다.
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
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr>
              <th
                className={`sticky left-0 z-30 min-w-[7rem] px-2 py-2 text-left font-semibold ${STICKY_HEADER_TOP_CLASS}`}
                style={stickyHeaderCellStyle('both')}
              />
              {dacCols.map((dac) => (
                <th
                  key={dac.id}
                  className={`sticky z-20 max-w-[4.5rem] px-1 py-2 text-center font-medium leading-tight ${STICKY_HEADER_TOP_CLASS}`}
                  style={stickyHeaderCellStyle('bottom')}
                  title={deviceName(dac.brand, dac.model)}
                >
                  <span className="mx-auto block line-clamp-2 text-center">{dac.model || dac.brand}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hpRows.map((hp) => (
              <tr key={hp.id}>
                <th
                  className="sticky left-0 z-10 max-w-[8rem] px-2 py-1.5 text-left font-medium leading-tight"
                  style={stickyHeaderCellStyle('right')}
                  title={deviceName(hp.brand, hp.model)}
                >
                  <span className="line-clamp-2">{hp.model || hp.brand}</span>
                </th>
                {dacCols.map((dac) => {
                  const entry = findCacheEntry(cache, dac.id, hp.id);
                  const total = entry ? entry.drive + entry.synergy + entry.genre : null;
                  const isSelected = selected?.dacId === dac.id && selected?.hpId === hp.id;
                  const key = cellKey(dac.id, hp.id);
                  const isLoading = loadingCells.has(key);
                  const cellStyle = entry
                    ? {
                        background: scoreCellBackground(total!),
                        border: '1px solid var(--border)',
                      }
                    : {
                        background: 'var(--badge-bg)',
                        border: '1px solid var(--border)',
                        opacity: 0.55,
                      };

                  return (
                    <td key={dac.id} className="p-0.5 text-center align-middle">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          if (entry) {
                            setSelected({
                              dacId: dac.id,
                              hpId: hp.id,
                              dacName: deviceName(dac.brand, dac.model),
                              hpName: deviceName(hp.brand, hp.model),
                              drive: entry.drive,
                              synergy: entry.synergy,
                              genre: entry.genre,
                              comment: entry.comment,
                            });
                            return;
                          }
                          void analyzeCell(dac, hp);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-opacity hover:opacity-90 disabled:cursor-default"
                        style={{
                          ...cellStyle,
                          outline: isSelected ? '2px solid var(--foreground)' : undefined,
                        }}
                        title={
                          entry
                            ? `합계 ${total} · 드라이브 ${entry.drive} · 시너지 ${entry.synergy} · 장르 ${entry.genre}`
                            : isAuthenticated
                              ? '클릭하여 궁합 분석'
                              : '캐시 없음'
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin opacity-70" />
                        ) : entry ? (
                          total
                        ) : (
                          '—'
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
                    {selected.dacName} × {selected.hpName}
                  </h2>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="드라이브 능력" value={selected.drive} />
                  <ScoreBar label="음색 시너지" value={selected.synergy} />
                  <ScoreBar label="장르 매칭" value={selected.genre} />
                </div>
                <p className="mt-4 text-sm font-semibold tabular-nums">
                  합계 {selected.drive + selected.synergy + selected.genre}
                </p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed opacity-80">
                  {selected.comment || '—'}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
