'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Headfi } from '@/app/headfi/types';
import { hasPositionCoordinates, isPositionMapCategory } from '@/lib/headfiPosition';

type PositionMapTabProps = {
  library: Headfi[];
  isAuthenticated: boolean | null;
  onRefresh: () => Promise<void>;
};

const PLOT_W = 560;
const PLOT_H = 400;
const AXIS_LABEL_CLASS =
  'pointer-events-none absolute text-[11px] leading-none opacity-70 whitespace-nowrap';

function toPlotX(value: number): number {
  return ((value + 1) / 2) * PLOT_W;
}

function toPlotY(value: number): number {
  return ((1 - value) / 2) * PLOT_H;
}

type StatusFilter = '전체' | '보유중' | '방출';
type CategoryFilter = '전체' | '헤드폰' | '이어폰';

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['전체', '보유중', '방출'];
const CATEGORY_FILTER_OPTIONS: CategoryFilter[] = ['전체', '헤드폰', '이어폰'];

const POSITION_DOT_LEGEND = [
  { label: '오픈형 헤드폰', color: '#57C1FF' },
  { label: '밀폐형 헤드폰', color: '#1E3A8A' },
  { label: '커널형 이어폰', color: '#EF4444' },
  { label: '오픈형 이어폰', color: '#F97316' },
  { label: '기타/미분류', color: '#888888' },
] as const;

function getPositionDotColor(item: Headfi): string {
  if (item.category === '헤드폰' && item.type1 === '오픈형') return '#57C1FF';
  if (item.category === '헤드폰' && item.type1 === '밀폐형') return '#1E3A8A';
  if (item.category === '이어폰' && item.type1 === '커널형') return '#EF4444';
  if (item.category === '이어폰' && item.type1 === '오픈형') return '#F97316';
  return '#888888';
}

function filterToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

function matchesMapFilters(
  item: Headfi,
  statusFilter: StatusFilter,
  categoryFilter: CategoryFilter,
): boolean {
  if (!isPositionMapCategory(item.category)) return false;
  if (statusFilter !== '전체' && item.status2 !== statusFilter) return false;
  if (categoryFilter !== '전체' && item.category !== categoryFilter) return false;
  return true;
}

function deviceLabel(item: Headfi): string {
  const name = (item.model ?? '').trim() || (item.brand ?? '').trim();
  return name.length > 22 ? `${name.slice(0, 20)}…` : name;
}

function patchItemPosition(
  items: Headfi[],
  id: number,
  position: { x: number; y: number; label: string } | null,
): Headfi[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (!position) {
      return { ...item, position_x: null, position_y: null, position_label: null };
    }
    return {
      ...item,
      position_x: position.x,
      position_y: position.y,
      position_label: position.label,
    };
  });
}

export function PositionMapTab({ library, isAuthenticated, onRefresh }: PositionMapTabProps) {
  const [items, setItems] = useState(library);
  const [regenerating, setRegenerating] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(() => new Set());
  const [activePoint, setActivePoint] = useState<Headfi | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(library);
  }, [library]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesMapFilters(item, statusFilter, categoryFilter)),
    [items, statusFilter, categoryFilter],
  );

  const { plotted, unanalyzed } = useMemo(() => {
    const plottedItems = filteredItems.filter((item) => hasPositionCoordinates(item));
    const pendingItems = filteredItems.filter((item) => !hasPositionCoordinates(item));
    return { plotted: plottedItems, unanalyzed: pendingItems };
  }, [filteredItems]);

  useEffect(() => {
    if (activePoint && !filteredItems.some((item) => item.id === activePoint.id)) {
      setActivePoint(null);
      setPopoverPos(null);
    }
  }, [activePoint, filteredItems]);

  const setLoading = (id: number, on: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyPositionResult = (id: number, result: { x: number; y: number; label: string }) => {
    setItems((prev) => patchItemPosition(prev, id, result));
    setActivePoint((prev) =>
      prev?.id === id
        ? { ...prev, position_x: result.x, position_y: result.y, position_label: result.label }
        : prev,
    );
  };

  const analyzeOne = async (id: number, force = false) => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setLoading(id, true);
    try {
      const res = await fetch('/api/headfi-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: id, force }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        x?: number;
        y?: number;
        label?: string;
      };
      if (!res.ok || data.x == null || data.y == null) {
        toast.error(data.error || '포지션 분석에 실패했습니다.');
        return;
      }
      applyPositionResult(id, { x: data.x, y: data.y, label: data.label || '' });
      if (force) toast.success('좌표를 갱신했습니다.');
    } catch {
      toast.error('포지션 분석에 실패했습니다.');
    } finally {
      setLoading(id, false);
    }
  };

  const clearPosition = async (id: number) => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setLoading(id, true);
    try {
      const res = await fetch('/api/headfi-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: id, clearPosition: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || '좌표 삭제에 실패했습니다.');
        return;
      }
      setItems((prev) => patchItemPosition(prev, id, null));
      setActivePoint(null);
      setPopoverPos(null);
      toast.success('미분석 기기로 이동했습니다.');
    } catch {
      toast.error('좌표 삭제에 실패했습니다.');
    } finally {
      setLoading(id, false);
    }
  };

  const handleRegenerateAll = async () => {
    if (plotted.length === 0) {
      toast.error('새로고침할 기기가 없습니다.');
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch('/api/headfi-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateAll: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        results?: { id: number; x: number; y: number; label: string }[];
        failed?: number[];
      };
      if (!res.ok) {
        toast.error(data.error || '전체 새로고침에 실패했습니다.');
        return;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      setItems((prev) =>
        results.reduce(
          (acc, row) => patchItemPosition(acc, row.id, { x: row.x, y: row.y, label: row.label }),
          prev,
        ),
      );
      const fail = Array.isArray(data.failed) ? data.failed.length : 0;
      if (fail > 0) {
        toast.warning(`좌표 갱신 ${results.length}건, 실패 ${fail}건`);
      } else {
        toast.success(`좌표 ${results.length}건을 갱신했습니다.`);
      }
      void onRefresh();
    } catch {
      toast.error('전체 새로고침에 실패했습니다.');
    } finally {
      setRegenerating(false);
    }
  };

  const openPointPopover = (item: Headfi, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const left = Math.min(Math.max(event.clientX - rect.left, 8), rect.width - 168);
    const top = Math.min(Math.max(event.clientY - rect.top + 8, 8), rect.height - 88);
    setActivePoint(item);
    setPopoverPos({ left, top });
  };

  useEffect(() => {
    if (!activePoint) return;
    const onDocClick = () => {
      setActivePoint(null);
      setPopoverPos(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [activePoint]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm opacity-70">
          유선 헤드폰·이어폰 음색 성향을 2D 맵으로 시각화합니다. ({plotted.length}건 표시
          {unanalyzed.length > 0 ? ` · 미분석 ${unanalyzed.length}건` : ''})
        </p>
        {isAuthenticated ? (
          <button
            type="button"
            disabled={regenerating || plotted.length === 0}
            onClick={() => void handleRegenerateAll()}
            className="btn-apple btn-apple-secondary flex h-[38px] min-w-[7.5rem] items-center justify-center gap-1.5 px-3 text-sm disabled:opacity-50"
          >
            {regenerating ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <>
                <RefreshCw className="size-4" strokeWidth={1.75} />
                전체 새로고침
              </>
            )}
          </button>
        ) : null}
      </div>

      <div
        ref={mapWrapRef}
        className="relative overflow-x-auto rounded-xl p-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-semibold opacity-60">보유 상태</span>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                style={filterToggleStyle(statusFilter === option)}
                aria-pressed={statusFilter === option}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        {regenerating ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)' }}
          >
            <Loader2 className="size-8 animate-spin opacity-80" strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="relative mx-auto w-full max-w-3xl pt-7 pb-7 pl-12 pr-12">
          <span className={`${AXIS_LABEL_CLASS} left-1/2 top-0 -translate-x-1/2`}>분석적</span>
          <span className={`${AXIS_LABEL_CLASS} bottom-0 left-1/2 -translate-x-1/2`}>음악적</span>
          <span className={`${AXIS_LABEL_CLASS} left-0 top-1/2 -translate-y-1/2`}>따뜻함</span>
          <span className={`${AXIS_LABEL_CLASS} right-0 top-1/2 -translate-y-1/2`}>밝음</span>
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            className="block w-full"
            role="img"
            aria-label="헤드폰 포지션 맵"
          >
            <rect
              x={0}
              y={0}
              width={PLOT_W}
              height={PLOT_H}
              fill="var(--badge-bg)"
              stroke="var(--border)"
              rx={8}
            />
            <line
              x1={PLOT_W / 2}
              y1={0}
              x2={PLOT_W / 2}
              y2={PLOT_H}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <line
              x1={0}
              y1={PLOT_H / 2}
              x2={PLOT_W}
              y2={PLOT_H / 2}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />

          {plotted.map((item) => {
            const x = toPlotX(Number(item.position_x));
            const y = toPlotY(Number(item.position_y));
            const label = deviceLabel(item);
            const loading = loadingIds.has(item.id) && !regenerating;
            return (
              <g key={item.id}>
                <g
                  className="cursor-pointer"
                  onClick={(e) => openPointPopover(item, e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openPointPopover(item, e as unknown as React.MouseEvent);
                    }
                  }}
                >
                  {loading ? (
                    <g transform={`translate(${x - 8}, ${y - 8})`}>
                      <foreignObject width={16} height={16}>
                        <div className="flex h-4 w-4 items-center justify-center">
                          <Loader2 className="size-4 animate-spin opacity-80" strokeWidth={2} />
                        </div>
                      </foreignObject>
                    </g>
                  ) : (
                    <circle
                      cx={x}
                      cy={y}
                      r={5}
                      fill={getPositionDotColor(item)}
                      stroke={activePoint?.id === item.id ? 'var(--foreground)' : 'var(--card-bg)'}
                      strokeWidth={activePoint?.id === item.id ? 2.5 : 2}
                    />
                  )}
                  {!loading ? (
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      className="fill-[var(--foreground)] text-[9px] pointer-events-none"
                      style={{ fontWeight: 600 }}
                    >
                      {label}
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })}

          {plotted.length === 0 ? (
            <text
              x={PLOT_W / 2}
              y={PLOT_H / 2}
              textAnchor="middle"
              className="fill-[var(--foreground)] text-sm opacity-50"
            >
              표시할 좌표가 없습니다
            </text>
          ) : null}
          </svg>
          <div
            className="pointer-events-none absolute bottom-8 right-12 z-[5] flex max-w-[11rem] flex-col gap-1 rounded-lg px-2.5 py-2"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 82%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 65%, transparent)',
            }}
            aria-label="도트 범례"
          >
            {POSITION_DOT_LEGEND.map((entry) => (
              <div key={entry.label} className="flex items-center gap-1.5 text-[10px] leading-tight opacity-90">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                  aria-hidden
                />
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        </div>

        {activePoint && popoverPos && isAuthenticated ? (
          <div
            className="absolute z-20 w-40 rounded-xl p-2 shadow-lg"
            style={{
              left: popoverPos.left,
              top: popoverPos.top,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 truncate px-1 text-[11px] font-semibold">
              {activePoint.brand} {activePoint.model}
            </p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={loadingIds.has(activePoint.id)}
                onClick={() => void analyzeOne(activePoint.id, true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--badge-bg)' }}
              >
                <RefreshCw className="size-3.5 shrink-0" strokeWidth={1.75} />
                새로고침
              </button>
              <button
                type="button"
                disabled={loadingIds.has(activePoint.id)}
                onClick={() => void clearPosition(activePoint.id)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--badge-bg)' }}
              >
                <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                삭제(미분석으로)
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {unanalyzed.length > 0 ? (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <h2 className="section-title mb-3 text-base">미분석 기기</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unanalyzed.map((item) => {
              const loading = loadingIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!isAuthenticated || loading}
                    onClick={() => void analyzeOne(item.id)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="opacity-70">{item.brand}</span>{' '}
                        <span className="font-semibold">{item.model}</span>
                        <span className="mt-0.5 block text-[11px] opacity-50">
                          {loading ? '분석 중…' : '클릭하여 분석'}
                        </span>
                      </div>
                      {loading ? (
                        <Loader2 className="size-4 shrink-0 animate-spin opacity-70" strokeWidth={2} />
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
