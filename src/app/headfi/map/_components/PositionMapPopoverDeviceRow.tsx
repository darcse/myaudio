'use client';

import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { Headfi } from '@/app/headfi/types';
import { deviceDisplayName } from './positionMapUtils';

type PositionMapPopoverDeviceRowProps = {
  item: Headfi;
  loading: boolean;
  showDivider: boolean;
  onRefresh: () => void;
  onDelete: () => void;
};

export function PositionMapPopoverDeviceRow({
  item,
  loading,
  showDivider,
  onRefresh,
  onDelete,
}: PositionMapPopoverDeviceRowProps) {
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
