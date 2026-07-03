import type { Headfi, HeadfiFormData } from './types';

/** DAC/AMP Vrms를 32Ω 기준 표기로 변환 (GEAR-013) */
export function formatVrmsAt32Ohm(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return null;
  return `${n}V@32Ω`;
}

export const emptyHeadfiFormData: HeadfiFormData = {
  brand: '',
  model: '',
  category: '',
  type1: '',
  type2: '',
  impedance: '',
  db1: '',
  db2: '',
  volume: '',
  volume_type: '',
  purchase_date: '',
  price: '',
  status1: '',
  status2: '',
  cable: '',
  cable_price: '',
  eartip: '',
  eartip_price: '',
  accessory: '',
  accessory_price: '',
  unit: '',
  etc: '',
  speaker_type1: '',
  speaker_type2: '',
  dap_spec: '',
  dap_output: '',
  matching: '',
  gain: '',
  temp: '',
  bright: '',
  bass_quantity: '',
  bass_depth: '',
  bass_speed: '',
  dynamics_slam: '',
  midrange_body: '',
  tone_warmth: '',
  vocal_position: '',
  midrange_clarity: '',
  treble_brightness: '',
  treble_smoothness: '',
  treble_airiness: '',
  resolution: '',
  separation: '',
  soundstage: '',
  imaging: '',
  timbre: '',
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
  const normalizedEntries = Object.entries(item).map(([key, value]) => {
    if (value === null || value === undefined) return [key, ''];
    if (typeof value === 'number') return [key, String(value)];
    return [key, value];
  });
  return { ...emptyHeadfiFormData, ...Object.fromEntries(normalizedEntries) };
}
