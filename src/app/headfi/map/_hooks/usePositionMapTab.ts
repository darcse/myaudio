'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Headfi } from '@/app/headfi/types';
import { hasPositionCoordinates } from '@/lib/headfiPosition';
import type {
  ActivePopover,
  CategoryFilter,
  HoverTooltip,
  MapMarker,
  StatusFilter,
} from '../_components/positionMapTypes';
import {
  TOOLTIP_HIDE_DELAY_MS,
  clampPopoverPosition,
  clampTooltipPosition,
  clusterPlottedPoints,
  deviceDisplayName,
  matchesMapFilters,
  patchItemPosition,
  popoverRowHeight,
  toPlotX,
  toPlotY,
} from '../_components/positionMapUtils';

type UsePositionMapTabParams = {
  library: Headfi[];
  isAuthenticated: boolean | null;
  onRefresh: () => Promise<void>;
};

export function usePositionMapTab({ library, isAuthenticated, onRefresh }: UsePositionMapTabParams) {
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
    const popoverHeight = Math.min(
      280,
      12 + popoverItems.reduce((sum, item) => sum + popoverRowHeight(item), 0),
    );
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

  const handleDevicePickerToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDevicePickerOpen((open) => !open);
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

  return {
    mapWrapRef,
    devicePickerRef,
    statusFilter,
    categoryFilter,
    devicePickerOpen,
    devicePickerLabel,
    filteredItems,
    visibleItems,
    pickerItems,
    selectedDeviceIds,
    plotted,
    unanalyzed,
    filteredPlottedCount,
    mapMarkers,
    regenerating,
    loadingIds,
    activePopover,
    hoverTooltip,
    setStatusFilter,
    setCategoryFilter,
    handleDevicePickerToggle,
    toggleDeviceSelection,
    selectAllDevices,
    clearAllDevices,
    handleRegenerateAll,
    analyzeOne,
    clearPosition,
    openMarkerPopover,
    showMarkerTooltip,
    scheduleTooltipHide,
    cancelTooltipHide,
  };
}
