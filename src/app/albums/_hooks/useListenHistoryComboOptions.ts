'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  buildGearByIdMap,
  formatComboConnectionSuffix,
  formatListenHistoryComboBaseLabel,
  HEADFI_COMBO_SELECT,
  isActiveHeadfiCombo,
  isReleasedHeadfiCombo,
} from '@/app/headfi/headfiComboUtils';
import type { Headfi, HeadfiCombo } from '@/app/headfi/types';

export type ListenHistoryComboOption = {
  id: string;
  label: string;
};

export function useListenHistoryComboOptions(isAuthenticated: boolean | null) {
  const [combos, setCombos] = useState<HeadfiCombo[]>([]);
  const [gearLibrary, setGearLibrary] = useState<Headfi[]>([]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setCombos([]);
      setGearLibrary([]);
      return;
    }
    const client = createClient();
    void Promise.all([
      client.from('headfi_combos').select(HEADFI_COMBO_SELECT).order('created_at', { ascending: false }),
      client.from('headfi').select('id, brand, model, category, status2'),
    ]).then(([comboRes, gearRes]) => {
      setCombos((comboRes.data as HeadfiCombo[]) ?? []);
      setGearLibrary((gearRes.data as Headfi[]) ?? []);
    });
  }, [isAuthenticated]);

  const gearById = useMemo(() => buildGearByIdMap(gearLibrary), [gearLibrary]);

  const selectableOptions = useMemo((): ListenHistoryComboOption[] => {
    const active = combos.filter(
      (combo) => isActiveHeadfiCombo(combo) && !isReleasedHeadfiCombo(combo, gearById),
    );
    const withBase = active.map((combo) => ({
      combo,
      base: formatListenHistoryComboBaseLabel(combo, gearById),
    }));
    const baseCounts = new Map<string, number>();
    for (const item of withBase) {
      baseCounts.set(item.base, (baseCounts.get(item.base) ?? 0) + 1);
    }
    return withBase.map(({ combo, base }) => ({
      id: combo.id,
      label:
        (baseCounts.get(base) ?? 0) > 1
          ? base + formatComboConnectionSuffix(combo, true)
          : base,
    }));
  }, [combos, gearById]);

  const comboById = useMemo(() => new Map(combos.map((combo) => [combo.id, combo])), [combos]);

  const getComboLabel = (comboId: string | null | undefined): string | null => {
    if (!comboId?.trim()) return null;
    const combo = comboById.get(comboId);
    if (!combo) return null;
    return formatListenHistoryComboBaseLabel(combo, gearById);
  };

  return {
    combos,
    comboById,
    gearById,
    selectableOptions,
    getComboLabel,
  };
}
