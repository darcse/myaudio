'use server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { hasHeadfiMatchAffectingChange } from '@/lib/headfiMatchCacheInvalidation';
import { toSupabaseErrorMessage } from '@/lib/supabase-error';
import type { HeadfiAccessoryFormData, HeadfiComboFormData, HeadfiDeviceSettingFormData, HeadfiFormData, HeadfiSaleFormData } from './types';

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
    pairing_combo_id: null as string | null,
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

function normalizePersistedImageUrl(url: string | undefined): string {
  const trimmed = url?.trim() ?? '';
  if (trimmed.startsWith('data:')) {
    throw new Error('이미지 파일 업로드가 완료되지 않았습니다. 파일을 다시 선택해 주세요.');
  }
  return trimmed;
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
    image_url: normalizePersistedImageUrl(data.image_url),
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
      output_impedance: optionalFiniteNumber(data.output_impedance),
      vrms_bal: optionalFiniteNumber(data.vrms_bal),
      vrms_single: optionalFiniteNumber(data.vrms_single),
      dap_spec: data.dap_spec?.trim() ?? '',
      dap_output: data.dap_output?.trim() ?? '',
    };
  }

  if (data.category === '스피커') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
      speaker_type1: data.speaker_type1?.trim() ?? '',
      speaker_type2: data.speaker_type2?.trim() ?? '',
    };
  }

  if (data.category === '무선 헤드폰' || data.category === '무선 이어폰') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
      type1: data.type1,
      type2: data.type2,
      eartip: data.eartip?.trim() ?? '',
      eartip_price: parseInt(data.eartip_price, 10) || 0,
      unit: data.unit?.trim() ?? '',
      matching: data.matching,
    };
  }

  if (data.category === 'Source') {
    return {
      ...base,
      ...emptyWiredFields(),
      ...accessoryFields(data),
      amp_type: data.amp_type?.trim() ?? '',
      output_impedance: optionalFiniteNumber(data.output_impedance),
      chipset: data.chipset?.trim() ?? '',
      vrms_bal: optionalFiniteNumber(data.vrms_bal),
      vrms_single: optionalFiniteNumber(data.vrms_single),
    };
  }

  if (data.category === '기타') {
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
      pairing_combo_id: data.pairing_combo_id?.trim() || null,
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
      pairing_combo_id: data.pairing_combo_id?.trim() || null,
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
  const { data: existing, error: fetchError } = await supabase.from('headfi').select('*').eq('id', id).single();
  if (fetchError || !existing) {
    throw new Error(fetchError ? toSupabaseErrorMessage(fetchError) : 'Headfi not found');
  }
  const mapped = mapHeadfiData(data);
  const row: Record<string, unknown> = { ...mapped };
  const mappedFr = mapped.fr_graph_url;
  const newFr =
    mappedFr != null && String(mappedFr).trim() !== '' ? String(mappedFr).trim() : null;
  const oldFr = existing.fr_graph_url?.trim() || null;
  if (newFr !== oldFr) {
    row.fr_interpretation = null;
  }
  const nextRow = { ...existing, ...row };
  const shouldClearMatchCache = hasHeadfiMatchAffectingChange(existing, nextRow);
  const { data: result, error } = await supabase.from('headfi').update(row).eq('id', id);

  if (error) throw new Error(toSupabaseErrorMessage(error));

  if (shouldClearMatchCache) {
    const { data: combos } = await supabase
      .from('headfi_combos')
      .select('id')
      .or(`select1_id.eq.${id},select2_id.eq.${id}`);
    const comboIds = (combos ?? []).map((row) => row.id as string);
    if (comboIds.length > 0) {
      const { error: comboCacheError } = await supabase
        .from('headfi_match_cache')
        .delete()
        .in('combo_id', comboIds);
      if (comboCacheError) throw new Error(toSupabaseErrorMessage(comboCacheError));
    }
    const { error: cacheError } = await supabase
      .from('headfi_match_cache')
      .delete()
      .eq('target_gear_id', id);
    if (cacheError) throw new Error(toSupabaseErrorMessage(cacheError));
  }

  return result;
}

const FR_GRAPH_IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const DEVICE_IMAGE_EXT = FR_GRAPH_IMAGE_EXT;
const MAX_HEADFI_IMAGE_BYTES = 5 * 1024 * 1024;

function assertHeadfiImageFile(file: File, label: string): string {
  if (file.size > MAX_HEADFI_IMAGE_BYTES) {
    throw new Error(`${label}은(는) 5MB 이하만 업로드할 수 있습니다.`);
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!DEVICE_IMAGE_EXT.has(ext)) {
    throw new Error(`${label}은(는) png, jpg, jpeg, webp, gif만 업로드할 수 있습니다.`);
  }
  return ext;
}

export async function uploadHeadfiFrGraphImage(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const ext = assertHeadfiImageFile(file, 'FR 그래프');
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

const HEADFI_DEVICE_IMAGE_BUCKET = 'lyrics-covers';

export async function uploadHeadfiDeviceImage(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const ext = assertHeadfiImageFile(file, '기기 이미지');
  const supabase = await createClient();
  const path = `${user.id}/headfi-device/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(HEADFI_DEVICE_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw new Error(toSupabaseErrorMessage(error));
  const { data: pub } = supabase.storage.from(HEADFI_DEVICE_IMAGE_BUCKET).getPublicUrl(data.path);
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

function mapHeadfiAccessoryData(data: HeadfiAccessoryFormData) {
  const category = data.category.trim();
  const name = data.name.trim();
  if (!category) throw new Error('카테고리를 선택해 주세요.');
  if (!name) throw new Error('액세서리 이름을 입력해 주세요.');
  const status = data.status === 'released' ? 'released' : 'owned';
  return {
    category,
    name,
    price: parseIntOrNull(data.price) ?? 0,
    purchase_date: data.purchase_date.trim() || null,
    status,
  };
}

export async function saveHeadfiAccessoryToDB(data: HeadfiAccessoryFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_accessories')
    .insert([mapHeadfiAccessoryData(data)])
    .select('id')
    .single();

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function updateHeadfiAccessoryInDB(id: number, data: HeadfiAccessoryFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_accessories')
    .update(mapHeadfiAccessoryData(data))
    .eq('id', id);

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function deleteHeadfiAccessoryFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('headfi_accessories').delete().eq('id', id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

function mapHeadfiSaleData(data: HeadfiSaleFormData) {
  const category = data.category.trim();
  const gearId = parseIntOrNull(data.gear_id);
  const price = parseIntOrNull(data.price);
  const saleDate = data.sale_date.trim();
  if (!category) throw new Error('카테고리를 선택해 주세요.');
  if (gearId == null) throw new Error('기기를 선택해 주세요.');
  if (price == null || price <= 0) throw new Error('가격을 입력해 주세요.');
  if (!saleDate) throw new Error('판매일을 입력해 주세요.');
  return {
    category,
    gear_id: gearId,
    price,
    sale_date: saleDate,
  };
}

export async function saveHeadfiSaleToDB(data: HeadfiSaleFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_sales')
    .insert([{ ...mapHeadfiSaleData(data), user_id: user.id }])
    .select('id')
    .single();

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function updateHeadfiSaleInDB(id: number, data: HeadfiSaleFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_sales')
    .update(mapHeadfiSaleData(data))
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function deleteHeadfiSaleFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('headfi_sales').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

function mapHeadfiDeviceSettingData(data: HeadfiDeviceSettingFormData) {
  const dacAmpId = parseIntOrNull(data.dac_amp_id);
  if (dacAmpId == null) throw new Error('DAC/AMP/DAP를 선택해 주세요.');
  if (!Number.isFinite(data.headfi_id)) throw new Error('기기 정보가 올바르지 않습니다.');
  return {
    headfi_id: data.headfi_id,
    dac_amp_id: dacAmpId,
    setting_text: data.setting_text.trim(),
  };
}

export async function saveHeadfiDeviceSettingToDB(data: HeadfiDeviceSettingFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_device_settings')
    .insert([mapHeadfiDeviceSettingData(data)])
    .select('id, headfi_id, dac_amp_id, setting_text, created_at')
    .single();

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function updateHeadfiDeviceSettingInDB(id: number, data: HeadfiDeviceSettingFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_device_settings')
    .update(mapHeadfiDeviceSettingData(data))
    .eq('id', id)
    .select('id, headfi_id, dac_amp_id, setting_text, created_at')
    .single();

  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function deleteHeadfiDeviceSettingFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('headfi_device_settings').delete().eq('id', id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

function mapHeadfiComboData(data: HeadfiComboFormData) {
  const select1Id = parseIntOrNull(data.select1_id);
  if (select1Id == null) throw new Error('기기 1을 선택해 주세요.');
  const select2Raw = data.select2_id.trim();
  const select2Id = select2Raw ? parseIntOrNull(select2Raw) : null;
  if (select2Raw && select2Id == null) throw new Error('기기 2 선택값이 올바르지 않습니다.');
  if (select2Id != null && select2Id === select1Id) throw new Error('같은 기기는 조합할 수 없습니다.');
  return {
    select1_id: select1Id,
    select2_id: select2Id,
  };
}

export async function saveHeadfiComboToDB(data: HeadfiComboFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('headfi_combos')
    .insert([mapHeadfiComboData(data)])
    .select('id, select1_id, select2_id, created_at')
    .single();
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function deleteHeadfiComboFromDB(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase
    .from('headfi_combos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}