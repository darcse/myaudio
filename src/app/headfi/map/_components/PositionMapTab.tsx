'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import type { Headfi } from '@/app/headfi/types';
import { usePositionMapTab } from '../_hooks/usePositionMapTab';
import { PositionMapFilterBar } from './PositionMapFilterBar';
import { PositionMapScatterPlot } from './PositionMapScatterPlot';
import { PositionMapUnanalyzedList } from './PositionMapUnanalyzedList';

type PositionMapTabProps = {
  library: Headfi[];
  isAuthenticated: boolean | null;
  onRefresh: () => Promise<void>;
};

export function PositionMapTab({ library, isAuthenticated, onRefresh }: PositionMapTabProps) {
  const {
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
  } = usePositionMapTab({ library, isAuthenticated, onRefresh });

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
        <PositionMapFilterBar
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          devicePickerOpen={devicePickerOpen}
          devicePickerLabel={devicePickerLabel}
          devicePickerRef={devicePickerRef}
          filteredItemsCount={filteredItems.length}
          visibleItemsCount={visibleItems.length}
          pickerItems={pickerItems}
          selectedDeviceIds={selectedDeviceIds}
          onStatusFilterChange={setStatusFilter}
          onCategoryFilterChange={setCategoryFilter}
          onDevicePickerToggle={handleDevicePickerToggle}
          onSelectAllDevices={selectAllDevices}
          onClearAllDevices={clearAllDevices}
          onToggleDeviceSelection={toggleDeviceSelection}
        />
        <PositionMapScatterPlot
          mapMarkers={mapMarkers}
          selectedDeviceCount={selectedDeviceIds.size}
          plottedCount={plotted.length}
          regenerating={regenerating}
          loadingIds={loadingIds}
          activePopover={activePopover}
          hoverTooltip={hoverTooltip}
          isAuthenticated={isAuthenticated}
          onOpenMarkerPopover={openMarkerPopover}
          onShowMarkerTooltip={showMarkerTooltip}
          onScheduleTooltipHide={scheduleTooltipHide}
          onCancelTooltipHide={cancelTooltipHide}
          onAnalyzeOne={(id, force) => void analyzeOne(id, force)}
          onClearPosition={(id) => void clearPosition(id)}
        />
      </div>

      <PositionMapUnanalyzedList
        items={unanalyzed}
        isAuthenticated={isAuthenticated}
        loadingIds={loadingIds}
        onAnalyze={(id) => void analyzeOne(id)}
      />
    </div>
  );
}
