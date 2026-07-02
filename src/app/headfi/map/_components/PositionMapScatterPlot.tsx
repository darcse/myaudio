'use client';

import type { MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { ActivePopover, HoverTooltip, MapMarker } from './positionMapTypes';
import { PositionMapPopoverDeviceRow } from './PositionMapPopoverDeviceRow';
import {
  AXIS_LABEL_CLASS,
  PLOT_H,
  PLOT_W,
  POSITION_DOT_LEGEND,
  VIEW_H,
  VIEW_PAD_SIDE,
  VIEW_PAD_TOP,
  VIEW_W,
  deviceDisplayName,
} from './positionMapUtils';

type PositionMapScatterPlotProps = {
  mapMarkers: MapMarker[];
  selectedDeviceCount: number;
  plottedCount: number;
  regenerating: boolean;
  loadingIds: Set<number>;
  activePopover: ActivePopover | null;
  hoverTooltip: HoverTooltip | null;
  isAuthenticated: boolean | null;
  onOpenMarkerPopover: (marker: MapMarker, event: MouseEvent) => void;
  onShowMarkerTooltip: (marker: MapMarker, event: MouseEvent) => void;
  onScheduleTooltipHide: () => void;
  onCancelTooltipHide: () => void;
  onAnalyzeOne: (id: number, force?: boolean) => void;
  onClearPosition: (id: number) => void;
};

export function PositionMapScatterPlot({
  mapMarkers,
  selectedDeviceCount,
  plottedCount,
  regenerating,
  loadingIds,
  activePopover,
  hoverTooltip,
  isAuthenticated,
  onOpenMarkerPopover,
  onShowMarkerTooltip,
  onScheduleTooltipHide,
  onCancelTooltipHide,
  onAnalyzeOne,
  onClearPosition,
}: PositionMapScatterPlotProps) {
  return (
    <>
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
            const loading = !regenerating && markerItems.some((item) => loadingIds.has(item.id));
            const isActive =
              activePopover != null &&
              markerItems.some((item) => activePopover.items.some((row) => row.id === item.id));
            const radius = isCluster ? 10 : 5;
            return (
              <g key={marker.id}>
                <g
                  className="cursor-pointer"
                  onClick={(e) => onOpenMarkerPopover(marker, e)}
                  onMouseEnter={(e) => onShowMarkerTooltip(marker, e)}
                  onMouseMove={(e) => onShowMarkerTooltip(marker, e)}
                  onMouseLeave={onScheduleTooltipHide}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenMarkerPopover(marker, e as unknown as MouseEvent);
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

          {selectedDeviceCount === 0 ? (
            <text
              x={PLOT_W / 2}
              y={PLOT_H / 2 - 8}
              textAnchor="middle"
              className="fill-[var(--foreground)] text-sm font-medium opacity-70"
            >
              선택된 기기가 없습니다
            </text>
          ) : plottedCount === 0 ? (
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
          onMouseEnter={onCancelTooltipHide}
          onMouseLeave={onScheduleTooltipHide}
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
              <PositionMapPopoverDeviceRow
                key={item.id}
                item={item}
                loading={loadingIds.has(item.id)}
                showDivider={index > 0}
                onRefresh={() => onAnalyzeOne(item.id, true)}
                onDelete={() => onClearPosition(item.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
