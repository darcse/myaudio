import {
  listExplicitAlbumUuidsFromAlbumRows,
  refineMoodGroupsForDb,
  type AlbumMoodUuidOptions,
} from '@/lib/albumMoodRefs';
import { mergeManualPinsIntoMoodGroups, type ManualMoodPin } from '@/lib/albumMoodMembership';
import { createClient } from '@/lib/supabase/server';
import { generateAlbumMoodGroups, type AlbumMoodGroupRow } from '@/lib/gemini';

type AlbumRow = {
  id: number | string;
  genre1: string | null;
  genre2: string | null;
  audio_tags: string[] | null;
};

type MoodGroupRow = { mood_name: string; album_ids: (number | string)[] };

async function deleteAllMyMoodGroups(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from('album_mood_groups').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
}

async function fetchMyMoodGroups(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from('album_mood_groups')
    .select('mood_name, album_ids')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MoodGroupRow[];
}

async function persistGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AlbumMoodGroupRow[],
) {
  await deleteAllMyMoodGroups(supabase);
  if (rows.length === 0) return;
  const ins = rows.map((r) => ({
    mood_name: r.mood_name,
    album_ids: r.album_ids,
    updated_at: new Date().toISOString(),
  }));
  const { error: insError } = await supabase.from('album_mood_groups').insert(ins);
  if (insError) throw new Error(insError.message);
}

async function fetchManualMoodPins(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ManualMoodPin[]> {
  const { data, error } = await supabase
    .from('album')
    .select('id, mood_name')
    .eq('mood_manually_set', true);
  if (error) throw new Error(error.message);
  const pins: ManualMoodPin[] = [];
  for (const row of data ?? []) {
    const id = typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10);
    const mood_name = typeof row.mood_name === 'string' ? row.mood_name.trim() : '';
    if (!Number.isInteger(id) || !mood_name) continue;
    pins.push({ id, mood_name });
  }
  return pins;
}

export async function ensureAlbumMoodGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  albumRows: AlbumRow[],
  forceRegenerate: boolean,
) {
  if (albumRows.length === 0) {
    await deleteAllMyMoodGroups(supabase);
    return [] as MoodGroupRow[];
  }
  const cached = await fetchMyMoodGroups(supabase);
  if (!forceRegenerate && cached.length === 9) return cached;

  const manualPins = await fetchManualMoodPins(supabase);
  const manualIdSet = new Set(manualPins.map((p) => p.id));
  const autoRows = albumRows.filter((row) => {
    const id = typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10);
    return !manualIdSet.has(id);
  });

  const fixedMoodNames =
    cached.length === 9 ? cached.map((g) => String(g.mood_name ?? '').trim()).filter(Boolean) : [];
  if (fixedMoodNames.length === 9) {
    for (const pin of manualPins) {
      if (fixedMoodNames.includes(pin.mood_name)) continue;
      let replaceIdx = 0;
      let minManual = Number.POSITIVE_INFINITY;
      for (let i = 0; i < fixedMoodNames.length; i += 1) {
        const name = fixedMoodNames[i];
        const manualCount = manualPins.filter((p) => p.mood_name === name).length;
        if (manualCount < minManual) {
          minManual = manualCount;
          replaceIdx = i;
        }
      }
      if (minManual === 0) fixedMoodNames[replaceIdx] = pin.mood_name;
    }
  }

  let generated: AlbumMoodGroupRow[] | null;
  if (autoRows.length === 0) {
    const names =
      fixedMoodNames.length === 9
        ? fixedMoodNames
        : Array.from(new Set(manualPins.map((p) => p.mood_name))).slice(0, 9);
    while (names.length < 9) names.push(`무드 ${names.length + 1}`);
    generated = names.slice(0, 9).map((mood_name) => ({ mood_name, album_ids: [] }));
  } else {
    const explicitAlbumUuids = listExplicitAlbumUuidsFromAlbumRows(autoRows);
    const moodUuidOptions: AlbumMoodUuidOptions = {
      ...(explicitAlbumUuids.length > 0 ? { promptAllowedUuids: explicitAlbumUuids } : {}),
      ...(fixedMoodNames.length === 9 ? { fixedMoodNames } : {}),
    };
    generated = await generateAlbumMoodGroups(autoRows, moodUuidOptions);
    if (!generated) {
      throw new Error('무드 분류에 실패했습니다.');
    }
    generated = refineMoodGroupsForDb(generated, autoRows, moodUuidOptions);
  }

  const merged = mergeManualPinsIntoMoodGroups(generated, manualPins);
  await persistGroups(supabase, merged);
  return fetchMyMoodGroups(supabase);
}
