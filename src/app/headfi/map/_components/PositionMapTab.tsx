'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ListChecks, Loader2, RefreshCw, Trash2 } from 'lucide-react';
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
const PLOT_PAD = 28;
const VIEW_PAD_TOP = 18;
const VIEW_PAD_SIDE = 42;
const VIEW_PAD_BOTTOM = 8;
const VIEW_W = PLOT_W + VIEW_PAD_SIDE * 2;
const VIEW_H = PLOT_H + VIEW_PAD_TOP + VIEW_PAD_BOTTOM;
const COORD_SPREAD = 1.2;
const TOOLTIP_HIDE_DELAY_MS = 120;
const AXIS_LABEL_CLASS =
  'pointer-events-none absolute text-[11px] leading-none opacity-70 whitespace-nowrap';

function toPlotX(value: number): number {
  const scaled = Math.max(-1, Math.min(1, value * COORD_SPREAD));
  return PLOT_PAD + ((scaled + 1) / 2) * (PLOT_W - 2 * PLOT_PAD);
}

function toPlotY(value: number): number {
  const scaled = Math.max(-1, Math.min(1, value * COORD_SPREAD));
  return PLOT_PAD + ((1 - scaled) / 2) * (PLOT_H - 2 * PLOT_PAD);
}

const CLUSTER_THRESHOLD = 30;
const MIXED_CLUSTER_COLOR = '#888888';

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

type PlottedPoint = { item: Headfi; x: number; y: number };

type MapSingleMarker = {
  kind: 'single';
  id: string;
  x: number;
  y: number;
  item: Headfi;
  color: string;
};

type MapClusterMarker = {
  kind: 'cluster';
  id: string;
  x: number;
  y: number;
  items: Headfi[];
  color: string;
  count: number;
};

type MapMarker = MapSingleMarker | MapClusterMarker;

type HoverTooltip = {
  kind: 'single' | 'cluster';
  left: number;
  top: number;
  placement: 'above' | 'below';
  item?: Headfi;
  items?: Headfi[];
};

type ActivePopover = {
  left: number;
  top: number;
  items: Headfi[];
};

function clusterPlottedPoints(points: PlottedPoint[]): MapMarker[] {
  const count = points.length;
  if (count === 0) return [];

  const parent = points.map((_, index) => index);

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) <= CLUSTER_THRESHOLD) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, PlottedPoint[]>();
  for (let i = 0; i < count; i++) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(points[i]);
    groups.set(root, group);
  }

  const markers: MapMarker[] = [];
  let clusterIndex = 0;
  for (const group of groups.values()) {
    const x = group.reduce((sum, point) => sum + point.x, 0) / group.length;
    const y = group.reduce((sum, point) => sum + point.y, 0) / group.length;
    if (group.length === 1) {
      const item = group[0].item;
      markers.push({
        kind: 'single',
        id: `single-${item.id}`,
        x,
        y,
        item,
        color: getPositionDotColor(item),
      });
      continue;
    }
    const colors = new Set(group.map((point) => getPositionDotColor(point.item)));
    markers.push({
      kind: 'cluster',
      id: `cluster-${clusterIndex}`,
      x,
      y,
      items: group.map((point) => point.item),
      color: colors.size === 1 ? [...colors][0] : MIXED_CLUSTER_COLOR,
      count: group.length,
    });
    clusterIndex += 1;
  }
  return markers;
}

function deviceDisplayName(item: Headfi): string {
  return `${item.brand ?? ''} ${item.model ?? ''}`.trim() || '—';
}

function popoverRowHeight(item: Headfi): number {
  return item.position_label ? 52 : 36;
}

function PopoverDeviceRow({
  item,
  loading,
  showDivider,
  onRefresh,
  onDelete,
}: {
  item: Headfi;
  loading: boolean;
  showDivider: boolean;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={showDivider ? 'border-t pt-2' : ''}
      style={showDivider ? { borderColor: 'var(--border)' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug">
          {deviceDisplayName(item)}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="flex size-7 items-center justify-center rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--badge-bg)' }}
            aria-label={`${deviceDisplayName(item)} 재분석`}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <RefreshCw className="size-3.5" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDelete}
            className="flex size-7 items-center justify-center rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--badge-bg)' }}
            aria-label={`${deviceDisplayName(item)} 삭제`}
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {item.position_label ? (
        <p className="mt-1 text-[10px] leading-snug opacity-70">{item.position_label}</p>
      ) : null}
    </div>
  );
}

function clampPopoverPosition(
  wrap: HTMLDivElement,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const rect = wrap.getBoundingClientRect();
  const left = Math.min(Math.max(clientX - rect.left, 8), rect.width - width - 8);
  const top = Math.min(Math.max(clientY - rect.top + 8, 8), rect.height - height - 8);
  return { left, top };
}

function clampTooltipPosition(
  wrap: HTMLDivElement,
  clientX: number,
  clientY: number,
  tooltipWidth: number,
  tooltipHeight: number,
): { left: number; top: number; placement: 'above' | 'below' } {
  const rect = wrap.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  const left = Math.min(Math.max(relativeX, tooltipWidth / 2 + 8), rect.width - tooltipWidth / 2 - 8);
  let placement: 'above' | 'below' = 'above';
  let top = relativeY - 10;
  if (top - tooltipHeight < 8) {
    placement = 'below';
    top = relativeY + 16;
  }
  top = Math.min(Math.max(top, 8), rect.height - 8);
  return { left, top, placement };
}

type StatusFilter = '전체' | '보유중' | '방출';
type CategoryFilter = '전체' | '헤드폰' | '이어폰';

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['전체', '보유중', '방출'];
const CATEGORY_FILTER_OPTIONS: CategoryFilter[] = ['전체', '헤드폰', '이어폰'];

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
  const [activePopover, setActivePopover] = useState<ActivePopover | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체');
  const [deviceSelection, setDeviceSelection] = useState<Set<number> | 'all'>('all');
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const devicePickerRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTooltipHide = () => {
    if (tooltipHideTimerRef.current) {
      clearTimeout(tooltipHideTimerRef.current);
      tooltipHideTimerRef.current = null;
    }
  };

  const scheduleTooltipHide = () => {
    cancelTooltipHide();
    tooltipHideTimerRef.current = setTimeout(() => {
      setHoverTooltip(null);
      tooltipHideTimerRef.current = null;
    }, TOOLTIP_HIDE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      cancelTooltipHide();
    };
  }, []);

  useEffect(() => {
    setItems(library);
  }, [library]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesMapFilters(item, statusFilter, categoryFilter)),
    [items, statusFilter, categoryFilter],
  );

  const selectedDeviceIds = useMemo(() => {
    if (deviceSelection === 'all') return new Set(filteredItems.map((item) => item.id));
    return deviceSelection;
  }, [deviceSelection, filteredItems]);

  const visibleItems = useMemo(
    () => filteredItems.filter((item) => selectedDeviceIds.has(item.id)),
    [filteredItems, selectedDeviceIds],
  );

  const pickerItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) =>
        deviceDisplayName(a).localeCompare(deviceDisplayName(b), 'ko'),
      ),
    [filteredItems],
  );

  const { plotted, unanalyzed } = useMemo(() => {
    const plottedItems = visibleItems.filter((item) => hasPositionCoordinates(item));
    const pendingItems = visibleItems.filter((item) => !hasPositionCoordinates(item));
    return { plotted: plottedItems, unanalyzed: pendingItems };
  }, [visibleItems]);

  const filteredPlottedCount = useMemo(
    () => filteredItems.filter((item) => hasPositionCoordinates(item)).length,
    [filteredItems],
  );

  const mapMarkers = useMemo(() => {
    const points = plotted.map((item) => ({
      item,
      x: toPlotX(Number(item.position_x)),
      y: toPlotY(Number(item.position_y)),
    }));
    return clusterPlottedPoints(points);
  }, [plotted]);

  useEffect(() => {
    if (!activePopover) return;
    const stillVisible = activePopover.items.every((item) =>
      visibleItems.some((row) => row.id === item.id),
    );
    if (!stillVisible) setActivePopover(null);
  }, [activePopover, visibleItems]);

  const toggleDeviceSelection = (id: number) => {
    setDeviceSelection((prev) => {
      const current =
        prev === 'all' ? new Set(filteredItems.map((item) => item.id)) : new Set(prev);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      if (current.size === filteredItems.length) return 'all';
      return current;
    });
  };

  const selectAllDevices = () => setDeviceSelection('all');

  const clearAllDevices = () => setDeviceSelection(new Set());

  const devicePickerLabel = useMemo(() => {
    const selectedCount = visibleItems.length;
    const totalCount = filteredItems.length;
    if (selectedCount === totalCount) return '기기 선택';
    return `기기 선택 (${selectedCount}/${totalCount})`;
  }, [visibleItems.length, filteredItems.length]);

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
    setActivePopover((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((item) =>
        item.id === id
          ? { ...item, position_x: result.x, position_y: result.y, position_label: result.label }
          : item,
      );
      return { ...prev, items: nextItems };
    });
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
      setActivePopover(null);
      setHoverTooltip(null);
      toast.success('미분석 기기로 이동했습니다.');
    } catch {
      toast.error('좌표 삭제에 실패했습니다.');
    } finally {
      setLoading(id, false);
    }
  };

  const handleRegenerateAll = async () => {
    if (filteredPlottedCount === 0) {
      toast.error('새로고침할 기기가 없습니다.');
      return;
    }
    if (
      !confirm(
        '모든 기기의 포지션 좌표를 다시 생성합니다. 기존 좌표가 덮어씌워집니다. 계속하시겠습니까?',
      )
    ) {
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

  const openMarkerPopover = (marker: MapMarker, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    setHoverTooltip(null);
    cancelTooltipHide();
    const popoverItems = marker.kind === 'single' ? [marker.item] : marker.items;
    const popoverHeight = Math.min(280, 12 + popoverItems.reduce((sum, item) => sum + popoverRowHeight(item), 0));
    const { left, top } = clampPopoverPosition(wrap, event.clientX, event.clientY, 224, popoverHeight);
    setActivePopover({
      left,
      top,
      items: popoverItems,
    });
  };

  const showMarkerTooltip = (marker: MapMarker, event: React.MouseEvent) => {
    const wrap = mapWrapRef.current;
    if (!wrap || activePopover) return;
    cancelTooltipHide();
    if (marker.kind === 'single') {
      const { left, top, placement } = clampTooltipPosition(wrap, event.clientX, event.clientY, 180, 44);
      setHoverTooltip({ kind: 'single', left, top, placement, item: marker.item });
      return;
    }
    const height = Math.min(140, 24 + marker.items.length * 18);
    const { left, top, placement } = clampTooltipPosition(wrap, event.clientX, event.clientY, 200, height);
    setHoverTooltip({ kind: 'cluster', left, top, placement, items: marker.items });
  };

  useEffect(() => {
    if (!activePopover) return;
    const onDocClick = () => {
      setActivePopover(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [activePopover]);

  useEffect(() => {
    if (!devicePickerOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (devicePickerRef.current?.contains(event.target as Node)) return;
      setDevicePickerOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [devicePickerOpen]);

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
            disabled={regenerating || filteredPlottedCount === 0}
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
          <div className="relative" ref={devicePickerRef}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDevicePickerOpen((open) => !open);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(devicePickerOpen || visibleItems.length !== filteredItems.length)}
              aria-expanded={devicePickerOpen}
              aria-haspopup="listbox"
            >
              <ListChecks className="size-3.5 opacity-80" strokeWidth={1.75} />
              {devicePickerLabel}
              <ChevronDown
                className={`size-3.5 opacity-60 transition-transform ${devicePickerOpen ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
              />
            </button>
            {devicePickerOpen ? (
              <div
                className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl p-3 shadow-lg md:w-[36rem]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                onClick={(event) => event.stopPropagation()}
                role="listbox"
                aria-label="기기 선택"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold opacity-70">표시할 기기</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAllDevices}
                      className="opacity-70 transition-opacity hover:opacity-100"
                    >
                      전체 선택
                    </button>
                    <span className="opacity-30">|</span>
                    <button
                      type="button"
                      onClick={clearAllDevices}
                      className="opacity-70 transition-opacity hover:opacity-100"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
                {pickerItems.length === 0 ? (
                  <p className="py-4 text-center text-xs opacity-60">표시할 기기가 없습니다.</p>
                ) : (
                  <div className="grid max-h-64 grid-cols-1 gap-x-1 gap-y-0.5 overflow-y-auto md:grid-cols-2">
                    {pickerItems.map((item) => {
                      const checked = selectedDeviceIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:opacity-90"
                          style={{ background: checked ? 'var(--badge-bg)' : 'transparent' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDeviceSelection(item.id)}
                            className="mt-0.5 size-3.5 shrink-0 accent-[var(--foreground)]"
                          />
                          <span className="min-w-0 text-xs leading-snug">
                            <span className="font-semibold">{deviceDisplayName(item)}</span>
                            {!hasPositionCoordinates(item) ? (
                              <span className="mt-0.5 block text-[10px] opacity-50">미분석</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
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
        <div className="relative w-full pt-3 pb-7 pl-7 pr-7">
          <span className={`${AXIS_LABEL_CLASS} left-1/2 top-3 -translate-x-1/2 -translate-y-full`}>분석적</span>
          <span className={`${AXIS_LABEL_CLASS} bottom-0 left-1/2 -translate-x-1/2`}>음악적</span>
          <span className={`${AXIS_LABEL_CLASS} left-7 top-1/2 -translate-x-full -translate-y-1/2`}>따뜻함</span>
          <span className={`${AXIS_LABEL_CLASS} right-7 top-1/2 translate-x-full -translate-y-1/2`}>차가움</span>
          <svg
            viewBox={`${-VIEW_PAD_SIDE} ${-VIEW_PAD_TOP} ${VIEW_W} ${VIEW_H}`}
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

          {mapMarkers.map((marker) => {
            const { x, y } = marker;
            const isCluster = marker.kind === 'cluster';
            const markerItems = isCluster ? marker.items : [marker.item];
            const loading =
              !regenerating && markerItems.some((item) => loadingIds.has(item.id));
            const isActive =
              activePopover != null &&
              markerItems.some((item) => activePopover.items.some((row) => row.id === item.id));
            const radius = isCluster ? 10 : 5;
            return (
              <g key={marker.id}>
                <g
                  className="cursor-pointer"
                  onClick={(e) => openMarkerPopover(marker, e)}
                  onMouseEnter={(e) => showMarkerTooltip(marker, e)}
                  onMouseMove={(e) => showMarkerTooltip(marker, e)}
                  onMouseLeave={scheduleTooltipHide}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openMarkerPopover(marker, e as unknown as React.MouseEvent);
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
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={marker.color}
                        stroke={isActive ? 'var(--foreground)' : 'var(--card-bg)'}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {isCluster ? (
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          className="fill-[var(--card-bg)] text-[9px] pointer-events-none"
                          style={{ fontWeight: 700 }}
                        >
                          {marker.count}
                        </text>
                      ) : null}
                    </>
                  )}
                </g>
              </g>
            );
          })}

          {selectedDeviceIds.size === 0 ? (
            <text
              x={PLOT_W / 2}
              y={PLOT_H / 2 - 8}
              textAnchor="middle"
              className="fill-[var(--foreground)] text-sm font-medium opacity-70"
            >
              선택된 기기가 없습니다
            </text>
          ) : plotted.length === 0 ? (
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
              <div key={entry.label} className="flex items-center gap-1.5 text-[11px] leading-tight opacity-90">
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

        {hoverTooltip && !activePopover ? (
          <div
            className={`absolute z-30 max-w-[13rem] -translate-x-1/2 rounded-lg px-2.5 py-2 text-[11px] leading-snug shadow-lg ${
              hoverTooltip.placement === 'above' ? '-translate-y-full' : 'translate-y-1'
            }`}
            style={{
              left: hoverTooltip.left,
              top: hoverTooltip.top,
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={cancelTooltipHide}
            onMouseLeave={scheduleTooltipHide}
          >
            {hoverTooltip.kind === 'single' && hoverTooltip.item ? (
              <>
                <p className="font-semibold">{deviceDisplayName(hoverTooltip.item)}</p>
                {hoverTooltip.item.position_label ? (
                  <p className="mt-1 opacity-70">{hoverTooltip.item.position_label}</p>
                ) : null}
              </>
            ) : hoverTooltip.items ? (
              <ul className="space-y-1">
                {hoverTooltip.items.map((item) => (
                  <li key={item.id}>
                    <p className="font-semibold">{deviceDisplayName(item)}</p>
                    {item.position_label ? (
                      <p className="opacity-70">{item.position_label}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {activePopover && isAuthenticated ? (
          <div
            className="absolute z-20 w-56 rounded-xl p-2.5 shadow-lg"
            style={{
              left: activePopover.left,
              top: activePopover.top,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {activePopover.items.map((item, index) => (
                <PopoverDeviceRow
                  key={item.id}
                  item={item}
                  loading={loadingIds.has(item.id)}
                  showDivider={index > 0}
                  onRefresh={() => void analyzeOne(item.id, true)}
                  onDelete={() => void clearPosition(item.id)}
                />
              ))}
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
