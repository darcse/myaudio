import type { Headfi, HeadfiFormData } from './types';

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
  unit: '',
  etc: '',
  speaker_type1: '',
  speaker_type2: '',
  dap_spec: '',
  dap_output: '',
  matching: '',
  pairing_combo_id: '',
  gain: '',
  temp: '',
  bright: '',
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
  const normalizedEntries = Object.entries(item).map(([key, value]) => {
    if (value === null || value === undefined) return [key, ''];
    if (typeof value === 'number') return [key, String(value)];
    return [key, value];
  });
  return { ...emptyHeadfiFormData, ...Object.fromEntries(normalizedEntries) };
}
