'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows, selectCountOptions } from '@/lib/supabase/fetchAllRows';
import {
  buildGearByIdMap,
  buildListenHistoryComboLabels,
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
      fetchAllRows<HeadfiCombo>(({ countExact }) =>
        client
          .from('headfi_combos')
          .select(HEADFI_COMBO_SELECT, selectCountOptions(countExact))
          .order('created_at', { ascending: false }),
      ),
      fetchAllRows<Headfi>(({ countExact }) =>
        client
          .from('headfi')
          .select('id, brand, model, category, status2', selectCountOptions(countExact)),
      ),
    ]).then(([comboRes, gearRes]) => {
      setCombos(comboRes.data);
      setGearLibrary(gearRes.data);
    });
  }, [isAuthenticated]);

  const gearById = useMemo(() => buildGearByIdMap(gearLibrary), [gearLibrary]);

  const selectableOptions = useMemo((): ListenHistoryComboOption[] => {
    const active = combos.filter(
      (combo) => isActiveHeadfiCombo(combo) && !isReleasedHeadfiCombo(combo, gearById),
    );
    const labels = buildListenHistoryComboLabels(active, gearById);
    return active.map((combo) => ({
      id: combo.id,
      label: labels.get(combo.id) ?? formatListenHistoryComboBaseLabel(combo, gearById),
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
