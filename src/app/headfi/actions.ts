'use server'
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { toSupabaseErrorMessage } from '@/lib/supabase-error';
import type { HeadfiFormData } from './types';

function optionalFiniteNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function mapHeadfiData(data: HeadfiFormData) {
  const fr = data.fr_graph_url?.trim() || null;
  const isDacAmp = data.category === 'DAC/AMP';

  const dacColumns = {
    amp_type: data.amp_type?.trim() ?? '',
    output_impedance: optionalFiniteNumber(data.output_impedance),
    chipset: data.chipset?.trim() ?? '',
    vrms_bal: optionalFiniteNumber(data.vrms_bal),
    vrms_single: optionalFiniteNumber(data.vrms_single),
  };

  /** 비 DAC/AMP 행: DAC 컬럼 비움 (텍스트는 NOT NULL 스키마 대비 '') */
  const dacColumnsNull = {
    amp_type: '',
    output_impedance: null as number | null,
    chipset: '',
    vrms_bal: null as number | null,
    vrms_single: null as number | null,
  };

  if (isDacAmp) {
    // 텍스트 컬럼은 스키마에 NOT NULL이 잡혀 있는 경우가 많아 null 대신 ''로 비운다.
    return {
      brand: data.brand,
      model: data.model,
      category: data.category,
      type1: '',
      type2: '',
      impedance: null,
      db1: null,
      db2: null,
      volume: '',
      volume_type: '',
      purchase_date: data.purchase_date || null,
      price: parseInt(data.price, 10) || 0,
      status1: data.status1,
      status2: data.status2,
      cable: '',
      cable_price: 0,
      etc: data.etc,
      matching: '',
      gain: '',
      temp: '',
      bright: '',
      bass_quantity: null,
      bass_depth: null,
      bass_speed: null,
      dynamics_slam: null,
      midrange_body: null,
      tone_warmth: null,
      vocal_position: null,
      midrange_clarity: null,
      treble_brightness: null,
      treble_smoothness: null,
      treble_airiness: null,
      resolution: null,
      separation: null,
      soundstage: null,
      imaging: null,
      timbre: null,
      memo: data.memo,
      image_url: data.image_url,
      fr_graph_url: '',
      ...dacColumns,
    };
  }

  return {
    brand: data.brand,
    model: data.model,
    category: data.category,
    type1: data.type1,
    type2: data.type2,
    impedance: parseInt(data.impedance) || null,
    db1: data.db1 !== undefined && data.db1 !== null && data.db1 !== '' ? parseFloat(data.db1) : null,
    db2: data.db2 !== undefined && data.db2 !== null && data.db2 !== '' ? parseFloat(data.db2) : null,
    volume: data.volume,
    volume_type: data.volume_type,
    purchase_date: data.purchase_date || null,
    price: parseInt(data.price) || 0,
    status1: data.status1,
    status2: data.status2,
    cable: data.cable,
    cable_price: parseInt(data.cable_price) || 0,
    etc: data.etc,
    matching: data.matching,
    gain: data.gain ?? null,
    temp: data.temp,
    bright: data.bright,
    bass_quantity: data.bass_quantity !== '' && data.bass_quantity != null ? parseInt(data.bass_quantity) : null,
    bass_depth: data.bass_depth !== '' && data.bass_depth != null ? parseInt(data.bass_depth) : null,
    bass_speed: data.bass_speed !== '' && data.bass_speed != null ? parseInt(data.bass_speed) : null,
    dynamics_slam: data.dynamics_slam !== '' && data.dynamics_slam != null ? parseInt(data.dynamics_slam) : null,
    midrange_body: data.midrange_body !== '' && data.midrange_body != null ? parseInt(data.midrange_body) : null,
    tone_warmth: data.tone_warmth !== '' && data.tone_warmth != null ? parseInt(data.tone_warmth) : null,
    vocal_position: data.vocal_position !== '' && data.vocal_position != null ? parseInt(data.vocal_position) : null,
    midrange_clarity: data.midrange_clarity !== '' && data.midrange_clarity != null ? parseInt(data.midrange_clarity) : null,
    treble_brightness: data.treble_brightness !== '' && data.treble_brightness != null ? parseInt(data.treble_brightness) : null,
    treble_smoothness: data.treble_smoothness !== '' && data.treble_smoothness != null ? parseInt(data.treble_smoothness) : null,
    treble_airiness: data.treble_airiness !== '' && data.treble_airiness != null ? parseInt(data.treble_airiness) : null,
    resolution: data.resolution !== '' && data.resolution != null ? parseInt(data.resolution) : null,
    separation: data.separation !== '' && data.separation != null ? parseInt(data.separation) : null,
    soundstage: data.soundstage !== '' && data.soundstage != null ? parseInt(data.soundstage) : null,
    imaging: data.imaging !== '' && data.imaging != null ? parseInt(data.imaging) : null,
    timbre: data.timbre !== '' && data.timbre != null ? parseInt(data.timbre) : null,
    memo: data.memo,
    image_url: data.image_url,
    fr_graph_url: fr,
    ...dacColumnsNull,
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