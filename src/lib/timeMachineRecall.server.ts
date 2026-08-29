import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildTimeMachineWindows,
  isDateInWindow,
  pickRandomItem,
  type TimeMachineRecall,
} from './timeMachineRecall';

type ListenRow = {
  id: number;
  listened_at: string;
  captured_at: string | null;
  weather_condition: string | null;
  temperature: number | null;
  album_id: number | null;
  headphone_id: number | null;
  dac_amp_id: number | null;
  dac_amp2_id: number | null;
  album:
    | {
        id: number;
        album_name: string;
        artist: string | null;
        cover_image_url: string | null;
      }
    | {
        id: number;
        album_name: string;
        artist: string | null;
        cover_image_url: string | null;
      }[]
    | null;
};

function resolveAlbum(album: ListenRow['album']) {
  if (!album) return null;
  return Array.isArray(album) ? (album[0] ?? null) : album;
}

function resolveGearLabel(
  row: ListenRow,
  gearById: Map<number, { brand: string; model: string }>,
): string | null {
  if (row.headphone_id != null) {
    const gear = gearById.get(row.headphone_id);
    if (!gear) return null;
    return gear.model?.trim() || `${gear.brand} ${gear.model}`.trim() || null;
  }
  const gearId = row.dac_amp_id ?? row.dac_amp2_id;
  if (gearId == null) return null;
  const gear = gearById.get(gearId);
  if (!gear) return null;
  return `${gear.brand} ${gear.model}`.trim() || null;
}

export async function fetchTimeMachineRecall(
  supabase: SupabaseClient,
  referenceDate = new Date(),
): Promise<TimeMachineRecall | null> {
  const windows = buildTimeMachineWindows(referenceDate);
  const minDate = windows.reduce((min, w) => (w.start < min ? w.start : min), windows[0]?.start ?? '');
  const maxDate = windows.reduce((max, w) => (w.end > max ? w.end : max), windows[0]?.end ?? '');

  const { data, error } = await supabase
    .from('album_listen_history')
    .select(
      'id, listened_at, captured_at, weather_condition, temperature, album_id, headphone_id, dac_amp_id, dac_amp2_id, album:album_id(id, album_name, artist, cover_image_url)',
    )
    .gte('listened_at', minDate)
    .lte('listened_at', maxDate);

  if (error || !data?.length) return null;

  const rows = (data as ListenRow[]).filter((row) => row.album_id != null && row.listened_at);
  if (rows.length === 0) return null;

  let picked: ListenRow | null = null;
  let pickedWindow = windows[0];
  for (const window of windows) {
    const candidates = rows.filter((row) => isDateInWindow(row.listened_at, window));
    if (candidates.length === 0) continue;
    picked = pickRandomItem(candidates);
    pickedWindow = window;
    break;
  }

  if (!picked || !pickedWindow) return null;
  const album = resolveAlbum(picked.album);
  if (!album) return null;

  const gearIds = new Set<number>();
  if (picked.headphone_id != null) gearIds.add(picked.headphone_id);
  if (picked.dac_amp_id != null) gearIds.add(picked.dac_amp_id);
  if (picked.dac_amp2_id != null) gearIds.add(picked.dac_amp2_id);

  const gearById = new Map<number, { brand: string; model: string }>();
  if (gearIds.size > 0) {
    const { data: gearRows } = await supabase
      .from('headfi')
      .select('id, brand, model')
      .in('id', [...gearIds]);
    for (const gear of gearRows ?? []) {
      gearById.set(gear.id, { brand: gear.brand || '', model: gear.model || '' });
    }
  }

  return {
    period: pickedWindow.key,
    periodLabel: pickedWindow.label,
    historyId: picked.id,
    albumId: album.id,
    albumName: String(album.album_name ?? ''),
    artist: album.artist ?? null,
    coverImageUrl: album.cover_image_url ?? null,
    capturedAt: picked.captured_at,
    weatherCondition: picked.weather_condition,
    temperature: picked.temperature,
    gearLabel: resolveGearLabel(picked, gearById),
  };
}
