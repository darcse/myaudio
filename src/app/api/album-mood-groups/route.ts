import { NextResponse } from 'next/server';
import {
  listExplicitAlbumUuidsFromAlbumRows,
  refineMoodGroupsForDb,
  type AlbumMoodUuidOptions,
} from '@/lib/albumMoodRefs';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import {
  generateAlbumMoodGroups,
  MOOD_GROUP_MUST_BE_NINE_MSG,
  type AlbumMoodGroupRow,
} from '@/lib/gemini';

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

async function ensureMoodGroups(
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

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();
    const { data: albumRows, error: albumErr } = await supabase
      .from('album')
      .select('id, genre1, genre2, audio_tags');
    if (albumErr) {
      return NextResponse.json({ error: albumErr.message }, { status: 500 });
    }
    const albums = (albumRows ?? []) as AlbumRow[];
    const groups = await ensureMoodGroups(supabase, albums, false);
    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof Error && err.message === MOOD_GROUP_MUST_BE_NINE_MSG) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message =
      err instanceof Error && err.message.trim().length > 0
        ? err.message
        : '서버에서 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();
    const { data: albumRows, error: albumErr } = await supabase
      .from('album')
      .select('id, genre1, genre2, audio_tags');
    if (albumErr) {
      return NextResponse.json({ error: albumErr.message }, { status: 500 });
    }
    const albums = (albumRows ?? []) as AlbumRow[];
    const groups = await ensureMoodGroups(supabase, albums, true);
    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof Error && err.message === MOOD_GROUP_MUST_BE_NINE_MSG) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message =
      err instanceof Error && err.message.trim().length > 0
        ? err.message
        : '서버에서 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
