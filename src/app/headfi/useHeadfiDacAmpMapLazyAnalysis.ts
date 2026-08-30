'use client';

import { useEffect } from 'react';
import type { Headfi } from './types';
import { hasPositionCoordinates } from '@/lib/headfiPosition';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';

export function triggerHeadfiMatchCacheClear(gearId: number) {
  void fetch('/api/headfi-match-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearCacheForGearId: gearId }),
  }).catch(() => {});
}

export function triggerHeadfiDacAmpPositionAnalysis(headfiId: number, force = false) {
  void fetch('/api/headfi-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headfiId, force }),
  }).catch(() => {});
}

export function useHeadfiDacAmpMapLazyAnalysis(
  viewingItem: Headfi | null,
  onPatch?: (patch: Partial<Headfi>) => void,
) {
  const viewingItemId = viewingItem?.id;
  const viewingItemCategory = viewingItem?.category;
  const positionX = viewingItem?.position_x;
  const positionY = viewingItem?.position_y;

  useEffect(() => {
    if (!viewingItemId || !viewingItemCategory || !isDacAmpDapCategory(viewingItemCategory)) return;
    if (hasPositionCoordinates({ position_x: positionX, position_y: positionY })) return;

    void fetch('/api/headfi-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headfiId: viewingItemId }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          x?: number;
          y?: number;
          label?: string;
        };
        if (!res.ok || data.x == null || data.y == null) return;
        onPatch?.({
          id: viewingItemId,
          position_x: data.x,
          position_y: data.y,
          position_label: data.label || '',
        });
      })
      .catch(() => {});
  }, [viewingItemId, viewingItemCategory, positionX, positionY, onPatch]);
}
