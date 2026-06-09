import { NextRequest, NextResponse } from 'next/server';
import { pickAlbumMoodGroupName } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = await req.json();
    if (!albumId) {
      return NextResponse.json({ error: 'albumId required' }, { status: 400 });
    }

    const idNum =
      typeof albumId === 'number' && Number.isFinite(albumId)
        ? Math.trunc(albumId)
        : parseInt(String(albumId), 10);
    if (!Number.isInteger(idNum)) {
      return NextResponse.json({ error: 'Invalid albumId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: album, error: albumError } = await supabase
      .from('album')
      .select('id, artist, album_name, genre1, genre2, audio_tags')
      .eq('id', idNum)
      .single();
    if (albumError || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const { data: moodRows, error: moodError } = await supabase
      .from('album_mood_groups')
      .select('id, mood_name, album_ids')
      .order('id', { ascending: true });
    if (moodError) {
      return NextResponse.json({ error: moodError.message }, { status: 500 });
    }

    const groups = moodRows ?? [];

    const moodNames = groups
      .map((r) => String((r as { mood_name?: unknown }).mood_name ?? '').trim())
      .filter(Boolean);
    if (moodNames.length === 0) {
      return NextResponse.json({ error: 'Mood groups not found' }, { status: 400 });
    }

    const mood_name = await pickAlbumMoodGroupName(album, moodNames);
    if (!mood_name) {
      return NextResponse.json({ error: 'Mood classification failed' }, { status: 502 });
    }

    const { error: moodColErr } = await supabase.from('album').update({ mood_name }).eq('id', idNum);
    if (moodColErr) {
      return NextResponse.json({ error: moodColErr.message }, { status: 500 });
    }

    const targetGroup = groups.find(
      (g) => String((g as { mood_name?: unknown }).mood_name ?? '').trim() === mood_name,
    ) as { id: number; album_ids: (number | string)[] } | undefined;

    if (targetGroup) {
      const current = Array.isArray(targetGroup.album_ids) ? targetGroup.album_ids : [];
      const next = current.some((id) => Number(id) === idNum) ? current : [...current, idNum];
      if (next.length !== current.length) {
        const { error: groupErr } = await supabase
          .from('album_mood_groups')
          .update({ album_ids: next, updated_at: new Date().toISOString() })
          .eq('id', targetGroup.id);
        if (groupErr) {
          return NextResponse.json({ error: groupErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ mood_name });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
