import {
  listExplicitAlbumUuidsFromAlbumRows,
  refineMoodGroupsForDb,
  type AlbumMoodUuidOptions,
} from '@/lib/albumMoodRefs';
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

  const explicitAlbumUuids = listExplicitAlbumUuidsFromAlbumRows(albumRows);
  const moodUuidOptions: AlbumMoodUuidOptions | undefined =
    explicitAlbumUuids.length > 0 ? { promptAllowedUuids: explicitAlbumUuids } : undefined;

  const generated = await generateAlbumMoodGroups(albumRows, moodUuidOptions);
  if (!generated) {
    throw new Error('무드 분류에 실패했습니다.');
  }
  const safeRows = refineMoodGroupsForDb(generated, albumRows, moodUuidOptions);
  await persistGroups(supabase, safeRows);
  return fetchMyMoodGroups(supabase);
}
