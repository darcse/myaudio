'use client';

import { useEffect } from 'react';
import type { Headfi } from './types';
import { hasPositionCoordinates } from '@/lib/headfiPosition';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';

export function triggerHeadfiDacAmpMatchReanalysis(baseGearId: number) {
  void fetch('/api/headfi-match-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'dac_amp', baseGearId, force: true }),
  }).catch(() => {});
}

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
  useEffect(() => {
    if (!viewingItem?.id || !isDacAmpDapCategory(viewingItem.category)) return;
    if (hasPositionCoordinates(viewingItem)) return;

    void fetch('/api/headfi-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headfiId: viewingItem.id }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          x?: number;
          y?: number;
          label?: string;
        };
        if (!res.ok || data.x == null || data.y == null) return;
        onPatch?.({
          id: viewingItem.id,
          position_x: data.x,
          position_y: data.y,
          position_label: data.label || '',
        });
      })
      .catch(() => {});
  }, [viewingItem?.id, viewingItem?.category, viewingItem?.position_x, viewingItem?.position_y, onPatch]);
}
