'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildGearByIdMap, formatComboLabel, HEADFI_COMBO_SELECT, isActiveHeadfiCombo, resolvePairingComboLabel } from './headfiComboUtils';
import type { Headfi, HeadfiCombo } from './types';

export function useHeadfiComboOptions(isAuthenticated: boolean | null) {
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
      client
        .from('headfi_combos')
        .select(HEADFI_COMBO_SELECT)
        .order('created_at', { ascending: false }),
      client.from('headfi').select('id, brand, model, category'),
    ]).then(([comboRes, gearRes]) => {
      setCombos((comboRes.data as HeadfiCombo[]) ?? []);
      setGearLibrary((gearRes.data as Headfi[]) ?? []);
    });
  }, [isAuthenticated]);

  const gearById = useMemo(() => buildGearByIdMap(gearLibrary), [gearLibrary]);

  const comboOptions = useMemo(
    () =>
      combos
        .filter(isActiveHeadfiCombo)
        .map((combo) => ({
          id: combo.id,
          label: formatComboLabel(combo, gearById),
        })),
    [combos, gearById],
  );

  const getPairingComboLabel = useCallback(
    (item: Headfi) => resolvePairingComboLabel(item.pairing_combo_id, combos, gearById),
    [combos, gearById],
  );

  return { combos, comboOptions, gearById, getPairingComboLabel };
}
