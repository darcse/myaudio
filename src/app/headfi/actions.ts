'use server'
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { toSupabaseErrorMessage } from '@/lib/supabase-error';
import type { HeadfiFormData } from './types';

function optionalFiniteNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function emptySoundScores() {
  return {
    bass_quantity: null as number | null,
    bass_depth: null as number | null,
    bass_speed: null as number | null,
    dynamics_slam: null as number | null,
    midrange_body: null as number | null,
    tone_warmth: null as number | null,
    vocal_position: null as number | null,
    midrange_clarity: null as number | null,
    treble_brightness: null as number | null,
    treble_smoothness: null as number | null,
    treble_airiness: null as number | null,
    resolution: null as number | null,
    separation: null as number | null,
    soundstage: null as number | null,
    imaging: null as number | null,
    timbre: null as number | null,
  };
}

function emptyDacColumns() {
  return {
    amp_type: '',
    output_impedance: null as number | null,
    chipset: '',
    vrms_bal: null as number | null,
    vrms_single: null as number | null,
  };
}

function accessoryFields(data: HeadfiFormData) {
  return {
    accessory: data.accessory?.trim() ?? '',
    accessory_price: parseInt(data.accessory_price, 10) || 0,
  };
}

function emptyWiredFields() {
  return {
    type1: '',
    type2: '',
    impedance: null as number | null,
    db1: null as number | null,
    db2: null as number | null,
    volume: '',
    volume_type: '',
    cable: '',
    cable_price: 0,
    eartip: '',
    eartip_price: 0,
    accessory: '',
    accessory_price: 0,
    unit: '',
    matching: '',
    gain: null as string | null,
    temp: '',
    bright: '',
    fr_graph_url: '',
    speaker_type1: '',
    speaker_type2: '',
    dap_spec: '',
    dap_output: '',
    ...emptySoundScores(),
    ...emptyDacColumns(),
  };
}

function mapHeadfiData(data: HeadfiFormData) {
  const fr = data.fr_graph_url?.trim() || null;
  const base = {
    brand: data.brand,
    model: data.model,
    category: data.category,
    purchase_date: data.purchase_date || null,
    price: parseInt(data.price, 10) || 0,
    status1: data.status1,
    status2: data.status2,
    etc: data.etc?.trim() ?? '',
    memo: data.memo,
    image_url: data.image_url,
  };

  if (data.category === 'DAC' || data.category === 'AMP' || data.category === 'DAC/AMP') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
      etc: data.etc?.trim() ?? '',
      amp_type: data.amp_type?.trim() ?? '',
      output_impedance: optionalFiniteNumber(data.output_impedance),
      chipset: data.chipset?.trim() ?? '',
      vrms_bal: optionalFiniteNumber(data.vrms_bal),
      vrms_single: optionalFiniteNumber(data.vrms_single),
    };
  }

  if (data.category === 'DAP') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
      chipset: data.chipset?.trim() ?? '',
      dap_spec: data.dap_spec?.trim() ?? '',
      dap_output: data.dap_output?.trim() ?? '',
    };
  }

  if (data.category === '스피커') {
    return {
      ...base,
      ...emptyWiredFields(),
      speaker_type1: data.speaker_type1?.trim() ?? '',
      speaker_type2: data.speaker_type2?.trim() ?? '',
    };
  }

  if (data.category === '무선 헤드폰' || data.category === '무선 이어폰') {
    return {
      ...base,
      ...emptyWiredFields(),
      type1: data.type1,
      type2: data.type2,
      eartip: data.eartip?.trim() ?? '',
      eartip_price: parseInt(data.eartip_price, 10) || 0,
      unit: data.unit?.trim() ?? '',
      matching: data.matching,
    };
  }

  if (data.category === 'Source' || data.category === '기타') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
    };
  }

  if (data.category === '헤드폰') {
    return {
      ...base,
      type1: data.type1,
      type2: data.type2,
      impedance: parseIntOrNull(data.impedance),
      db1: parseFloatOrNull(data.db1),
      db2: parseFloatOrNull(data.db2),
      volume: data.volume,
      volume_type: data.volume_type,
      cable: data.cable,
      cable_price: parseInt(data.cable_price, 10) || 0,
      eartip: data.eartip?.trim() ?? '',
      eartip_price: parseInt(data.eartip_price, 10) || 0,
      unit: data.unit?.trim() ?? '',
      matching: data.matching,
      gain: data.gain ?? null,
      temp: data.temp,
      bright: data.bright,
      bass_quantity: parseIntOrNull(data.bass_quantity),
      bass_depth: parseIntOrNull(data.bass_depth),
      bass_speed: parseIntOrNull(data.bass_speed),
      dynamics_slam: parseIntOrNull(data.dynamics_slam),
      midrange_body: parseIntOrNull(data.midrange_body),
      tone_warmth: parseIntOrNull(data.tone_warmth),
      vocal_position: parseIntOrNull(data.vocal_position),
      midrange_clarity: parseIntOrNull(data.midrange_clarity),
      treble_brightness: parseIntOrNull(data.treble_brightness),
      treble_smoothness: parseIntOrNull(data.treble_smoothness),
      treble_airiness: parseIntOrNull(data.treble_airiness),
      resolution: parseIntOrNull(data.resolution),
      separation: parseIntOrNull(data.separation),
      soundstage: parseIntOrNull(data.soundstage),
      imaging: parseIntOrNull(data.imaging),
      timbre: parseIntOrNull(data.timbre),
      fr_graph_url: fr,
      speaker_type1: '',
      speaker_type2: '',
      dap_spec: '',
      dap_output: '',
      ...emptyDacColumns(),
    };
  }

  if (data.category === '이어폰') {
    return {
      ...base,
      type1: data.type1,
      type2: data.type2,
      impedance: parseIntOrNull(data.impedance),
      db1: parseFloatOrNull(data.db1),
      db2: parseFloatOrNull(data.db2),
      volume: '',
      volume_type: '',
      cable: data.cable,
      cable_price: parseInt(data.cable_price, 10) || 0,
      eartip: data.eartip?.trim() ?? '',
      eartip_price: parseInt(data.eartip_price, 10) || 0,
      unit: data.unit?.trim() ?? '',
      matching: data.matching,
      gain: data.gain ?? null,
      temp: data.temp,
      bright: data.bright,
      bass_quantity: parseIntOrNull(data.bass_quantity),
      bass_depth: parseIntOrNull(data.bass_depth),
      bass_speed: parseIntOrNull(data.bass_speed),
      dynamics_slam: parseIntOrNull(data.dynamics_slam),
      midrange_body: parseIntOrNull(data.midrange_body),
      tone_warmth: parseIntOrNull(data.tone_warmth),
      vocal_position: parseIntOrNull(data.vocal_position),
      midrange_clarity: parseIntOrNull(data.midrange_clarity),
      treble_brightness: parseIntOrNull(data.treble_brightness),
      treble_smoothness: parseIntOrNull(data.treble_smoothness),
      treble_airiness: parseIntOrNull(data.treble_airiness),
      resolution: parseIntOrNull(data.resolution),
      separation: parseIntOrNull(data.separation),
      soundstage: parseIntOrNull(data.soundstage),
      imaging: parseIntOrNull(data.imaging),
      timbre: parseIntOrNull(data.timbre),
      fr_graph_url: fr,
      speaker_type1: '',
      speaker_type2: '',
      dap_spec: '',
      dap_output: '',
      ...emptyDacColumns(),
    };
  }

  return {
    ...base,
    ...emptyWiredFields(),
  };
}

export async function saveHeadfiToDB(data: HeadfiFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi')
    .insert([mapHeadfiData(data)])
    .select('id')
    .single();

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function updateHeadfiInDB(id: number, data: HeadfiFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: existing } = await supabase.from('headfi').select('fr_graph_url').eq('id', id).single();
  const mapped = mapHeadfiData(data);
  const row: Record<string, unknown> = { ...mapped };
  const mappedFr = mapped.fr_graph_url;
  const newFr =
    mappedFr != null && String(mappedFr).trim() !== '' ? String(mappedFr).trim() : null;
  const oldFr = existing?.fr_graph_url?.trim() || null;
  if (newFr !== oldFr) {
    row.fr_interpretation = null;
  }
  const { data: result, error } = await supabase.from('headfi').update(row).eq('id', id);

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

const FR_GRAPH_IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export async function uploadHeadfiFrGraphImage(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!FR_GRAPH_IMAGE_EXT.has(ext)) {
    throw new Error('FR 그래프는 png, jpg, jpeg, webp, gif만 업로드할 수 있습니다.');
  }
  const supabase = await createClient();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('headfi-fr').upload(path, file, {
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw new Error(toSupabaseErrorMessage(error));
  const { data: pub } = supabase.storage.from('headfi-fr').getPublicUrl(data.path);
  return pub.publicUrl;
}

export async function deleteHeadfiFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('headfi').delete().eq('id', id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}