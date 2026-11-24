'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LISTEN_HISTORY_AMP_CATEGORIES,
  LISTEN_HISTORY_DEFAULT_MEDIA,
  LISTEN_HISTORY_RECEIVER_CATEGORIES,
  LISTEN_HISTORY_SOURCE_CATEGORIES,
  listenHistoryMediaForForm,
  type ListenHistoryMedia,
} from '@/lib/listenHistoryGear';
import { comboHasSpeaker, fillListenHistoryFromCombo } from '@/lib/listenHistoryCombo';
import { useListenHistoryComboOptions } from './useListenHistoryComboOptions';

type GearOption = { id: number; brand: string; model: string };

type GearOptionSource = { id: number; brand: string; model: string };

type ListenHistoryGearRecord = {
  media: string | null;
  comboId: string | null;
  sourceId: number | null;
  dacAmpId: number | null;
  dacAmp2Id: number | null;
  headphoneId: number | null;
  source?: GearOptionSource | null;
  dacAmp?: GearOptionSource | null;
  dacAmp2?: GearOptionSource | null;
  headphone?: GearOptionSource | null;
};

function parseOptionalId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

function ensureGearOption(
  gear: GearOptionSource | null | undefined,
  setter: (updater: (prev: GearOption[]) => GearOption[]) => void,
) {
  if (!gear) return;
  setter((prev) => {
    if (prev.some((g) => g.id === gear.id)) return prev;
    return [...prev, { id: gear.id, brand: gear.brand, model: gear.model }].sort(
      (a, b) => a.brand.localeCompare(b.brand, 'ko') || a.model.localeCompare(b.model, 'ko'),
    );
  });
}

export function mapGearOptions(
  rows: { id: number; brand: string | null; model: string | null }[] | null,
): GearOption[] {
  return (rows ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' }));
}

export function useListenHistoryGearForm(isAuthenticated: boolean | null) {
  const [selectedMedia, setSelectedMedia] = useState<ListenHistoryMedia>(LISTEN_HISTORY_DEFAULT_MEDIA);
  const [selectedComboId, setSelectedComboId] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedDacAmpId, setSelectedDacAmpId] = useState('');
  const [selectedDacAmp2Id, setSelectedDacAmp2Id] = useState('');
  const [selectedHeadphoneId, setSelectedHeadphoneId] = useState('');
  const [sourceOptions, setSourceOptions] = useState<GearOption[]>([]);
  const [dacAmpOptions, setDacAmpOptions] = useState<GearOption[]>([]);
  const [headphoneOptions, setHeadphoneOptions] = useState<GearOption[]>([]);
  const {
    comboById,
    gearById: comboGearById,
    selectableOptions: comboOptions,
    getComboLabel,
  } = useListenHistoryComboOptions(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setSourceOptions([]);
      setDacAmpOptions([]);
      setHeadphoneOptions([]);
      return;
    }
    const categories: readonly string[][] = [
      [...LISTEN_HISTORY_SOURCE_CATEGORIES],
      [...LISTEN_HISTORY_AMP_CATEGORIES],
      [...LISTEN_HISTORY_RECEIVER_CATEGORIES],
    ];
    void createClient()
      .from('headfi')
      .select('id, brand, model, category')
      .in('category', [...new Set(categories.flat())])
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        const rows = data ?? [];
        const [sourceRows, ampRows, hpRows] = categories.map((list) =>
          rows.filter((row) => list.includes(row.category)),
        );
        setSourceOptions(mapGearOptions(sourceRows));
        setDacAmpOptions(mapGearOptions(ampRows));
        setHeadphoneOptions(mapGearOptions(hpRows));
      });
  }, [isAuthenticated]);

  const resetGearFields = useCallback(() => {
    setSelectedMedia(LISTEN_HISTORY_DEFAULT_MEDIA);
    setSelectedComboId('');
    setSelectedSourceId('');
    setSelectedDacAmpId('');
    setSelectedDacAmp2Id('');
    setSelectedHeadphoneId('');
  }, []);

  const loadGearFields = useCallback((record: ListenHistoryGearRecord) => {
    ensureGearOption(record.source, setSourceOptions);
    ensureGearOption(record.dacAmp, setDacAmpOptions);
    ensureGearOption(record.dacAmp2, setDacAmpOptions);
    ensureGearOption(record.headphone, setHeadphoneOptions);
    setSelectedMedia(listenHistoryMediaForForm(record.media));
    setSelectedComboId(record.comboId?.trim() || '');
    setSelectedSourceId(record.sourceId != null ? String(record.sourceId) : '');
    setSelectedDacAmpId(record.dacAmpId != null ? String(record.dacAmpId) : '');
    setSelectedDacAmp2Id(record.dacAmp2Id != null ? String(record.dacAmp2Id) : '');
    setSelectedHeadphoneId(record.headphoneId != null ? String(record.headphoneId) : '');
  }, []);

  const applySelectedCombo = (comboId: string): boolean => {
    setSelectedComboId(comboId);
    if (!comboId) return false;
    const combo = comboById.get(comboId);
    if (!combo) return false;
    const fill = fillListenHistoryFromCombo(combo, comboGearById);
    setSelectedSourceId(fill.sourceId);
    setSelectedDacAmpId(fill.dacAmpId);
    setSelectedDacAmp2Id(fill.dacAmp2Id);
    if (fill.headphoneId != null) setSelectedHeadphoneId(fill.headphoneId);
    const sourceGear = fill.sourceId ? comboGearById.get(Number(fill.sourceId)) : null;
    const amp1Gear = fill.dacAmpId ? comboGearById.get(Number(fill.dacAmpId)) : null;
    const amp2Gear = fill.dacAmp2Id ? comboGearById.get(Number(fill.dacAmp2Id)) : null;
    const receiverGear =
      fill.headphoneId != null && fill.headphoneId
        ? comboGearById.get(Number(fill.headphoneId))
        : null;
    ensureGearOption(sourceGear ?? null, setSourceOptions);
    ensureGearOption(amp1Gear ?? null, setDacAmpOptions);
    ensureGearOption(amp2Gear ?? null, setDacAmpOptions);
    ensureGearOption(receiverGear ?? null, setHeadphoneOptions);
    return Boolean(fill.headphoneId);
  };

  const clearComboSelection = () => {
    if (selectedComboId) setSelectedComboId('');
  };

  const changeSource = (value: string) => {
    setSelectedSourceId(value);
    clearComboSelection();
  };

  const changeDacAmp = (value: string) => {
    setSelectedDacAmpId(value);
    clearComboSelection();
  };

  const changeDacAmp2 = (value: string) => {
    setSelectedDacAmp2Id(value);
    clearComboSelection();
  };

  const changeHeadphone = (value: string) => {
    setSelectedHeadphoneId(value);
    const combo = selectedComboId ? comboById.get(selectedComboId) : undefined;
    if (combo && comboHasSpeaker(combo, comboGearById)) clearComboSelection();
  };

  const buildGearPayload = () => ({
    media: selectedMedia,
    source_id: parseOptionalId(selectedSourceId),
    dac_amp_id: parseOptionalId(selectedDacAmpId),
    dac_amp2_id: parseOptionalId(selectedDacAmp2Id),
    headphone_id: parseOptionalId(selectedHeadphoneId),
    combo_id: selectedComboId.trim() || null,
  });

  return {
    selectedMedia,
    setSelectedMedia,
    selectedComboId,
    selectedSourceId,
    selectedDacAmpId,
    selectedDacAmp2Id,
    selectedHeadphoneId,
    sourceOptions,
    dacAmpOptions,
    headphoneOptions,
    comboOptions,
    getComboLabel,
    resetGearFields,
    loadGearFields,
    applySelectedCombo,
    changeSource,
    changeDacAmp,
    changeDacAmp2,
    changeHeadphone,
    buildGearPayload,
  };
}
