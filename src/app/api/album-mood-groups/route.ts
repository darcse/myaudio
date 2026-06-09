import { NextResponse } from 'next/server';
import { ensureAlbumMoodGroups } from '@/lib/albumMoodGroupsServer';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { MOOD_GROUP_MUST_BE_NINE_MSG } from '@/lib/gemini';

type AlbumRow = {
  id: number | string;
  genre1: string | null;
  genre2: string | null;
  audio_tags: string[] | null;
};

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
    const groups = await ensureAlbumMoodGroups(supabase, albums, false);
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
    const groups = await ensureAlbumMoodGroups(supabase, albums, true);
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
