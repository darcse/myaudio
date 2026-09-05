import { generateAlbumIntroAndTags, pickAlbumMoodGroupName } from '@/lib/gemini';
import { moveAlbumBetweenMoodGroups } from '@/lib/albumMoodMembership';
import { createClient } from '@/lib/supabase/server';

export async function runAlbumIntroGeneration(
  albumId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: album, error: albumError } = await supabase
    .from('album')
    .select('id, artist, album_name, genre1, genre2, release_date, country')
    .eq('id', albumId)
    .single();

  if (albumError || !album) {
    return { ok: false, error: 'Album not found' };
  }

  const generated = await generateAlbumIntroAndTags(album);
  if (!generated) {
    return { ok: false, error: 'Generation failed' };
  }

  const { error: updateError } = await supabase
    .from('album')
    .update({
      audio_tags: generated.audio_tags.length ? generated.audio_tags : null,
      album_intro: generated.album_intro || null,
      ai_recommended_headphone_ids: null,
      ai_recommended_headphone_reason: null,
    })
    .eq('id', albumId);

  if (updateError) {
    return { ok: false, error: 'Update failed' };
  }

  return { ok: true };
}

export async function runAlbumMoodAssign(
  albumId: number,
): Promise<
  | { ok: true; mood_name: string; skipped?: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: album, error: albumError } = await supabase
    .from('album')
    .select('id, artist, album_name, genre1, genre2, audio_tags, mood_name, mood_manually_set')
    .eq('id', albumId)
    .single();
  if (albumError || !album) {
    return { ok: false, error: 'Album not found' };
  }

  if ((album as { mood_manually_set?: boolean | null }).mood_manually_set === true) {
    const manualMood = String((album as { mood_name?: unknown }).mood_name ?? '').trim();
    if (manualMood) {
      return { ok: true, mood_name: manualMood, skipped: true };
    }
  }

  const { data: moodRows, error: moodError } = await supabase
    .from('album_mood_groups')
    .select('id, mood_name, album_ids')
    .order('id', { ascending: true });
  if (moodError) {
    return { ok: false, error: moodError.message };
  }

  const groups = moodRows ?? [];
  const moodNames = groups
    .map((r) => String((r as { mood_name?: unknown }).mood_name ?? '').trim())
    .filter(Boolean);
  if (moodNames.length === 0) {
    return { ok: false, error: 'Mood groups not found' };
  }

  const existingMood = String((album as { mood_name?: unknown }).mood_name ?? '').trim();
  const alreadyInGroup = groups.some((g) => {
    const ids = (g as { album_ids?: unknown }).album_ids;
    return Array.isArray(ids) && ids.some((id) => Number(id) === albumId);
  });

  if (existingMood && alreadyInGroup) {
    return { ok: true, mood_name: existingMood, skipped: true };
  }

  const mood_name =
    existingMood && moodNames.includes(existingMood)
      ? existingMood
      : await pickAlbumMoodGroupName(album, moodNames);
  if (!mood_name) {
    return { ok: false, error: 'Mood classification failed' };
  }

  if (!existingMood) {
    const { error: moodColErr } = await supabase.from('album').update({ mood_name }).eq('id', albumId);
    if (moodColErr) {
      return { ok: false, error: moodColErr.message };
    }
  }

  const targetGroup = groups.find(
    (g) => String((g as { mood_name?: unknown }).mood_name ?? '').trim() === mood_name,
  ) as { id: number; album_ids: (number | string)[] } | undefined;

  if (!targetGroup) {
    return { ok: false, error: 'Mood group not found' };
  }

  const current = Array.isArray(targetGroup.album_ids) ? targetGroup.album_ids : [];
  const next = current.some((id) => Number(id) === albumId) ? current : [...current, albumId];
  if (next.length !== current.length) {
    const { error: groupErr } = await supabase
      .from('album_mood_groups')
      .update({ album_ids: next, updated_at: new Date().toISOString() })
      .eq('id', targetGroup.id);
    if (groupErr) {
      return { ok: false, error: groupErr.message };
    }
  }

  return { ok: true, mood_name };
}

export async function setAlbumMoodManually(
  albumId: number,
  moodName: string,
): Promise<{ ok: true; mood_name: string } | { ok: false; error: string }> {
  const trimmed = moodName.trim();
  if (!trimmed) {
    return { ok: false, error: 'mood_name required' };
  }

  const supabase = await createClient();
  const { data: album, error: albumError } = await supabase
    .from('album')
    .select('id')
    .eq('id', albumId)
    .single();
  if (albumError || !album) {
    return { ok: false, error: 'Album not found' };
  }

  const { data: moodRows, error: moodError } = await supabase
    .from('album_mood_groups')
    .select('id, mood_name, album_ids')
    .order('id', { ascending: true });
  if (moodError) {
    return { ok: false, error: moodError.message };
  }

  const groups = (moodRows ?? []) as { id: number; mood_name: string; album_ids: unknown }[];
  const moodNames = groups.map((g) => String(g.mood_name ?? '').trim()).filter(Boolean);
  if (!moodNames.includes(trimmed)) {
    return { ok: false, error: 'Invalid mood_name' };
  }

  const move = await moveAlbumBetweenMoodGroups(supabase, groups, albumId, trimmed);
  if (!move.ok) return move;

  const { error: updateError } = await supabase
    .from('album')
    .update({ mood_name: trimmed, mood_manually_set: true })
    .eq('id', albumId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, mood_name: trimmed };
}

export async function runNewAlbumEnrichment(albumId: number): Promise<void> {
  const intro = await runAlbumIntroGeneration(albumId);
  if (!intro.ok) return;
  await runAlbumMoodAssign(albumId);
}
