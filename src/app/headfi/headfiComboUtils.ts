import type { Headfi, HeadfiCombo } from './types';

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
