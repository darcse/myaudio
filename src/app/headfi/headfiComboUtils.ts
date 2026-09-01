import type { Headfi, HeadfiCombo } from './types';

export const HEADFI_COMBO_SELECT = 'id, select1_id, select2_id, created_at, deleted_at';

export function isActiveHeadfiCombo(combo: Pick<HeadfiCombo, 'deleted_at'>): boolean {
  return combo.deleted_at == null;
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

export function formatComboLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  const first = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const second = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  const firstLabel = formatGearShortLabel(first);
  if (!second) return firstLabel;
  return `${firstLabel} + ${formatGearShortLabel(second)}`;
}

function formatGearPairingDisplayLabel(item: Headfi | undefined): string {
  if (!item) return '알 수 없는 기기';
  return `${item.brand} ${item.model}`.trim() || '—';
}

export function formatComboPairingDisplayLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  const first = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const second = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  const firstLabel = formatGearPairingDisplayLabel(first);
  if (!second) return firstLabel;
  return `${firstLabel} + ${formatGearPairingDisplayLabel(second)}`;
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
  const first = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const second = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  const firstLabel = formatGearMapLabel(first);
  if (!second) return firstLabel;
  return `${firstLabel} + ${formatGearMapLabel(second)}`;
}

export function buildGearByIdMap(library: Headfi[]): Map<number, Headfi> {
  return new Map(library.map((item) => [item.id, item]));
}
