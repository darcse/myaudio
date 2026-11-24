import { HEADFI_STATUS2_OWNED } from './headfiStatus';
import type { Headfi, HeadfiCombo } from './types';

export const HEADFI_COMBO_SELECT =
  'id, source_id, select1_id, select2_id, source_media, source_link, device_link, is_matching, created_at, deleted_at';

export const COMBO_SOURCE_MEDIA_OPTIONS = [
  '스트리밍',
  '로컬 파일',
  'CD',
  'SACD',
  'LP',
  'Cassette',
] as const;

export const COMBO_SOURCE_LINK_OPTIONS = [
  'USB',
  '광(옵티컬)',
  '동축',
  '아날로그 라인아웃',
  '포노 아웃',
  '블루투스',
  'AirPlay',
] as const;

export const COMBO_DEVICE_LINK_OPTIONS = [
  'RCA',
  'XLR',
  '4.4mm to 4.4mm',
  '블루투스',
  '스피커 케이블',
] as const;

export type ComboSourceMedia = (typeof COMBO_SOURCE_MEDIA_OPTIONS)[number];
export type ComboSourceLink = (typeof COMBO_SOURCE_LINK_OPTIONS)[number];
export type ComboDeviceLink = (typeof COMBO_DEVICE_LINK_OPTIONS)[number];

export function normalizeComboOptionValue(
  value: string | null | undefined,
  options: readonly string[],
): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return options.includes(trimmed) ? trimmed : null;
}

function shortenConnectionLabel(value: string): string {
  if (value === '광(옵티컬)') return '광';
  if (value === '아날로그 라인아웃') return '라인';
  if (value === '포노 아웃') return '포노';
  if (value === '4.4mm to 4.4mm') return '4.4';
  if (value === '로컬 파일') return '로컬';
  if (value === '스피커 케이블') return '스피커선';
  return value;
}

export function formatComboConnectionParts(
  combo: Pick<HeadfiCombo, 'source_media' | 'source_link' | 'device_link'>,
): string[] {
  const parts: string[] = [];
  const media = combo.source_media?.trim();
  const sourceLink = combo.source_link?.trim();
  const deviceLink = combo.device_link?.trim();
  if (media) parts.push(media);
  if (sourceLink) parts.push(sourceLink);
  if (deviceLink) parts.push(deviceLink);
  return parts;
}

export function formatComboConnectionSuffix(
  combo: Pick<HeadfiCombo, 'source_media' | 'source_link' | 'device_link'>,
  compact = false,
): string {
  const parts = formatComboConnectionParts(combo);
  if (parts.length === 0) return '';
  if (compact) return ` · ${parts.map(shortenConnectionLabel).join('/')}`;
  return ` · ${parts.join(' · ')}`;
}

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

export function isComboDevice1Category(category: string | null | undefined): boolean {
  return isComboDeviceCategory(category) || category === 'Source' || category === '스피커';
}

export function isComboDevice2Category(category: string | null | undefined): boolean {
  return isComboDeviceCategory(category) || category === '스피커';
}

export function isSpeakerCombo(
  combo: Pick<HeadfiCombo, 'select1_id' | 'select2_id'>,
  gearById: Map<number, Headfi>,
): boolean {
  const device1 = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const device2 = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  return device1?.category === '스피커' || device2?.category === '스피커';
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
  return (
    formatComboWithOptionalSource(combo, gearById, formatGearShortLabel) +
    formatComboConnectionSuffix(combo)
  );
}

function formatGearPairingDisplayLabel(item: Headfi | undefined): string {
  if (!item) return '알 수 없는 기기';
  return `${item.brand} ${item.model}`.trim() || '—';
}

export function formatComboPairingDisplayLabel(combo: HeadfiCombo, gearById: Map<number, Headfi>): string {
  return (
    formatComboWithOptionalSource(combo, gearById, formatGearPairingDisplayLabel) +
    formatComboConnectionSuffix(combo)
  );
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
  return (
    formatComboWithOptionalSource(combo, gearById, formatGearMapLabel) +
    formatComboConnectionSuffix(combo, true)
  );
}

export function buildGearByIdMap(library: Headfi[]): Map<number, Headfi> {
  return new Map(library.map((item) => [item.id, item]));
}
