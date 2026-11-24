import { HEADFI_STATUS2_OWNED } from './headfiStatus';
import type { Headfi, HeadfiCombo } from './types';

export const HEADFI_COMBO_SELECT =
  'id, source_id, select1_id, select2_id, is_matching, created_at, deleted_at';

export function isActiveHeadfiCombo(combo: Pick<HeadfiCombo, 'deleted_at'>): boolean {
  return combo.deleted_at == null;
}

export function isMatchingHeadfiCombo(
  combo: Pick<HeadfiCombo, 'is_matching' | 'deleted_at'>,
): boolean {
  return isActiveHeadfiCombo(combo) && combo.is_matching !== false;
}

export function isComboSourceCategory(category: string | null | undefined): boolean {
  return category === 'Source' || category === 'DAP';
}

export function isComboDeviceCategory(category: string | null | undefined): boolean {
  return (
    category === 'DAC' ||
    category === 'DAC/AMP' ||
    category === 'AMP' ||
    category === 'DAP' ||
    category === '기타'
  );
}

export function isOwnedHeadfi(item: Pick<Headfi, 'status2'>): boolean {
  return item.status2 === HEADFI_STATUS2_OWNED;
}

export function isReleasedHeadfiCombo(
  combo: Pick<HeadfiCombo, 'source_id' | 'select1_id' | 'select2_id'>,
  gearById: Map<number, Headfi>,
): boolean {
  const ids = [combo.source_id, combo.select1_id, combo.select2_id].filter(
    (id): id is number => id != null,
  );
  if (ids.length === 0) return true;
  return ids.some((id) => {
    const gear = gearById.get(id);
    return !gear || !isOwnedHeadfi(gear);
  });
}

export const HEADFI_COMBOS_CHANGED_EVENT = 'headfi-combos-changed';

export function notifyHeadfiCombosChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HEADFI_COMBOS_CHANGED_EVENT));
  }
}

export function formatGearShortLabel(item: Headfi | undefined): string {
  if (!item) return '알 수 없는 기기';
  const name = `${item.brand} ${item.model}`.trim() || '—';
  return `${name} (${item.category})`;
}

function formatComboDevicesLabel(
  combo: HeadfiCombo,
  gearById: Map<number, Headfi>,
  formatGear: (item: Headfi | undefined) => string,
): string {
  const first = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const second = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  const firstLabel = formatGear(first);
  if (!second) return firstLabel;
  return `${firstLabel} + ${formatGear(second)}`;
}

function formatComboWithOptionalSource(
  combo: HeadfiCombo,
  gearById: Map<number, Headfi>,
  formatGear: (item: Headfi | undefined) => string,
): string {
  const devices = formatComboDevicesLabel(combo, gearById, formatGear);
  const source =
    combo.source_id != null ? gearById.get(combo.source_id) : undefined;
  if (!source) return devices;
  return `${formatGear(source)} → ${devices}`;
}

export function formatComboLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  return formatComboWithOptionalSource(combo, gearById, formatGearShortLabel);
}

function formatGearPairingDisplayLabel(item: Headfi | undefined): string {
  if (!item) return '알 수 없는 기기';
  return `${item.brand} ${item.model}`.trim() || '—';
}

export function formatComboPairingDisplayLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  return formatComboWithOptionalSource(combo, gearById, formatGearPairingDisplayLabel);
}

export function resolvePairingComboLabel(
  pairingComboId: string | null | undefined,
  combos: HeadfiCombo[],
  gearById: Map<number, Headfi>,
): string | null {
  if (!pairingComboId?.trim()) return null;
  const combo = combos.find((item) => item.id === pairingComboId);
  if (!combo) return null;
  return formatComboPairingDisplayLabel(combo, gearById);
}

export function formatGearMapLabel(item: Headfi | undefined): string {
  if (!item) return '알 수 없는 기기';
  return (item.model || item.brand || '—').trim();
}

export function formatComboMapLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  return formatComboWithOptionalSource(combo, gearById, formatGearMapLabel);
}

export function buildGearByIdMap(library: Headfi[]): Map<number, Headfi> {
  return new Map(library.map((item) => [item.id, item]));
}
