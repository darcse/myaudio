import type { Headfi, HeadfiFormData } from './types';

export const HEADFI_CONNECTOR_OPTIONS = [
  '4.4mm 밸런스',
  '3.5mm',
  '6.35mm',
  'XLR4',
  '2.5mm 밸런스',
  'USB-C',
] as const;

export type HeadfiConnector = (typeof HEADFI_CONNECTOR_OPTIONS)[number];

export function normalizeHeadfiConnector(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return (HEADFI_CONNECTOR_OPTIONS as readonly string[]).includes(trimmed) ? trimmed : null;
}

export function isUsbCMatchExcluded(item: Pick<Headfi, 'connector'>): boolean {
  return item.connector?.trim() === 'USB-C';
}

export const emptyHeadfiFormData: HeadfiFormData = {
  brand: '',
  model: '',
  category: '',
  type1: '',
  type2: '',
  impedance: '',
  connector: '',
  db1: '',
  db2: '',
  volume: '',
  volume_type: '',
  purchase_date: '',
  price: '',
  status1: '',
  status2: '',
  unit: '',
  etc: '',
  speaker_type1: '',
  speaker_type2: '',
  dap_spec: '',
  dap_output: '',
  matching: '',
  pairing_combo_id: '',
  gain: '',
  bass_quantity: '',
  bass_depth: '',
  midrange_body: '',
  treble_smoothness: '',
  treble_airiness: '',
  resolution: '',
  separation: '',
  soundstage: '',
  imaging: '',
  bass_control: '',
  dynamic_range: '',
  musicality: '',
  listening_comfort: '',
  trait_warmth: '',
  trait_brightness: '',
  trait_vocal_position: '',
  trait_bass_decay: '',
  memo: '',
  image_url: '',
  fr_graph_url: '',
  amp_type: '',
  output_impedance: '',
  chipset: '',
  vrms_bal: '',
  vrms_single: '',
};

export function headfiToFormData(item: Headfi): HeadfiFormData {
  const itemWithoutTone: Record<string, unknown> = { ...item };
  delete itemWithoutTone.temp;
  delete itemWithoutTone.bright;
  const normalizedEntries = Object.entries(itemWithoutTone).map(([key, value]) => {
    if (value === null || value === undefined) return [key, ''];
    if (typeof value === 'number') return [key, String(value)];
    return [key, value];
  });
  return { ...emptyHeadfiFormData, ...Object.fromEntries(normalizedEntries) };
}
