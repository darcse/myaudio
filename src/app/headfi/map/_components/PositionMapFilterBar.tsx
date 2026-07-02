'use client';

import type { MouseEvent, RefObject } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import type { Headfi } from '@/app/headfi/types';
import { hasPositionCoordinates } from '@/lib/headfiPosition';
import type { CategoryFilter, StatusFilter } from './positionMapTypes';
import {
  CATEGORY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  deviceDisplayName,
  filterToggleStyle,
} from './positionMapUtils';

type PositionMapFilterBarProps = {
  statusFilter: StatusFilter;
  categoryFilter: CategoryFilter;
  devicePickerOpen: boolean;
  devicePickerLabel: string;
  devicePickerRef: RefObject<HTMLDivElement | null>;
  filteredItemsCount: number;
  visibleItemsCount: number;
  pickerItems: Headfi[];
  selectedDeviceIds: Set<number>;
  onStatusFilterChange: (value: StatusFilter) => void;
  onCategoryFilterChange: (value: CategoryFilter) => void;
  onDevicePickerToggle: (event: MouseEvent) => void;
  onSelectAllDevices: () => void;
  onClearAllDevices: () => void;
  onToggleDeviceSelection: (id: number) => void;
};

export function PositionMapFilterBar({
  statusFilter,
  categoryFilter,
  devicePickerOpen,
  devicePickerLabel,
  devicePickerRef,
  filteredItemsCount,
  visibleItemsCount,
  pickerItems,
  selectedDeviceIds,
  onStatusFilterChange,
  onCategoryFilterChange,
  onDevicePickerToggle,
  onSelectAllDevices,
  onClearAllDevices,
  onToggleDeviceSelection,
}: PositionMapFilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs font-semibold opacity-60">보유 상태</span>
        {STATUS_FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onStatusFilterChange(option)}
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
            onClick={() => onCategoryFilterChange(option)}
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
          onClick={onDevicePickerToggle}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors"
          style={filterToggleStyle(devicePickerOpen || visibleItemsCount !== filteredItemsCount)}
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
                  onClick={onSelectAllDevices}
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  전체 선택
                </button>
                <span className="opacity-30">|</span>
                <button
                  type="button"
                  onClick={onClearAllDevices}
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
                      style={{
                        background: checked
                          ? 'color-mix(in srgb, var(--link) 16%, var(--card-bg))'
                          : 'transparent',
                        border: checked
                          ? '1px solid color-mix(in srgb, var(--link) 35%, var(--border))'
                          : '1px solid transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleDeviceSelection(item.id)}
                        className="mt-0.5 size-3.5 shrink-0 rounded-sm"
                        style={{ accentColor: 'var(--link)' }}
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
  );
}
