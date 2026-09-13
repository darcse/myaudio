'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { toSupabaseErrorMessage } from '@/lib/supabase-error';
import type { TranslatedLine } from './types';

export async function replaceAlbumTracks(
  albumId: number,
  tracks: { track_number: number; track_title: string }[],
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(albumId)) throw new Error('앨범 ID가 올바르지 않습니다.');
  const cleaned = tracks
    .map((t) => ({
      track_number: Number(t.track_number),
      track_title: String(t.track_title || '').trim(),
    }))
    .filter((t) => t.track_title && Number.isFinite(t.track_number) && t.track_number > 0);
  if (cleaned.length === 0) throw new Error('저장할 트랙이 없습니다.');

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (existingError) throw new Error(toSupabaseErrorMessage(existingError));
  if (existing && existing.length > 0) {
    const ids = existing.map((t) => t.id);
    const { error: trDelError } = await supabase
      .from('lyrics_translations')
      .delete()
      .in('track_id', ids)
      .eq('user_id', user.id);
    if (trDelError) throw new Error(toSupabaseErrorMessage(trDelError));
  }

  const { error: delError } = await supabase
    .from('lyrics_translation_tracks')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (delError) throw new Error(toSupabaseErrorMessage(delError));

  const { data, error } = await supabase
    .from('lyrics_translation_tracks')
    .insert(
      cleaned.map((t) => ({
        user_id: user.id,
        album_id: albumId,
        track_number: t.track_number,
        track_title: t.track_title,
      })),
    )
    .select('*')
    .order('track_number');
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return data;
}

export async function saveLyricsTranslation(input: {
  trackId: string;
  youtubeUrl: string;
  lyricsText?: string;
  translatedLines: TranslatedLine[];
  translatedTitle?: string | null;
  language?: string | null;
  translationId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!input.trackId) throw new Error('트랙 ID가 없습니다.');
  if (!Array.isArray(input.translatedLines) || input.translatedLines.length === 0) {
    throw new Error('가사 텍스트는 필수입니다.');
  }
  const lines = input.translatedLines
    .map((line) => ({
      original: String(line.original || '').trim(),
      translation: String(line.translation || '').trim(),
      ...(line.phonetic?.trim() ? { phonetic: line.phonetic.trim() } : {}),
    }))
    .filter((line) => line.original);
  if (lines.length === 0) throw new Error('가사 텍스트는 필수입니다.');

  const lyricsText =
    (typeof input.lyricsText === 'string' && input.lyricsText.trim()) ||
    lines.map((line) => line.original).join('\n');
  if (!lyricsText.trim()) throw new Error('가사 텍스트는 필수입니다.');

  const translatedTitle =
    typeof input.translatedTitle === 'string' && input.translatedTitle.trim()
      ? input.translatedTitle.trim()
      : null;

  const payload = {
    user_id: user.id,
    track_id: input.trackId,
    youtube_url: input.youtubeUrl.trim() || null,
    lyrics_text: lyricsText,
    translated_lines: lines,
    translated_title: translatedTitle,
    language: input.language?.trim() || null,
  };

  const supabase = await createClient();
  if (input.translationId) {
    const { data, error } = await supabase
      .from('lyrics_translations')
      .update(payload)
      .eq('id', input.translationId)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(toSupabaseErrorMessage(error));
    return data;
  }

  const { data, error } = await supabase
    .from('lyrics_translations')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return data;
}

export async function deleteLyricsTranslation(translationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  const supabase = await createClient();
  const { error } = await supabase
    .from('lyrics_translations')
    .delete()
    .eq('id', translationId)
    .eq('user_id', user.id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

export async function deleteAlbumTracks(albumId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(albumId)) throw new Error('앨범 ID가 올바르지 않습니다.');

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (existingError) throw new Error(toSupabaseErrorMessage(existingError));

  if (existing && existing.length > 0) {
    const ids = existing.map((t) => t.id);
    const { error: trDelError } = await supabase
      .from('lyrics_translations')
      .delete()
      .in('track_id', ids)
      .eq('user_id', user.id);
    if (trDelError) throw new Error(toSupabaseErrorMessage(trDelError));
  }

  const { error } = await supabase
    .from('lyrics_translation_tracks')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

export async function updateAlbumTrackMeta(
  albumId: number,
  tracks: { id: string; track_number: number; track_title: string }[],
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(albumId)) throw new Error('앨범 ID가 올바르지 않습니다.');
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error('저장할 트랙이 없습니다.');

  const cleaned = tracks.map((t) => ({
    id: String(t.id || '').trim(),
    track_number: Number(t.track_number),
    track_title: String(t.track_title || '').trim(),
  }));

  for (const t of cleaned) {
    if (!t.id) throw new Error('트랙 ID가 올바르지 않습니다.');
    if (!t.track_title) throw new Error('트랙 제목은 필수입니다.');
    if (!Number.isFinite(t.track_number) || t.track_number <= 0) {
      throw new Error('트랙 번호는 1 이상의 숫자여야 합니다.');
    }
  }

  const numbers = cleaned.map((t) => t.track_number);
  if (new Set(numbers).size !== numbers.length) {
    throw new Error('트랙 번호가 중복됩니다.');
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (existingError) throw new Error(toSupabaseErrorMessage(existingError));

  const existingIds = new Set((existing ?? []).map((t) => t.id));
  if (cleaned.length !== existingIds.size || cleaned.some((t) => !existingIds.has(t.id))) {
    throw new Error('트랙 목록이 최신이 아닙니다. 새로고침 후 다시 시도해 주세요.');
  }

  for (let i = 0; i < cleaned.length; i++) {
    const { error } = await supabase
      .from('lyrics_translation_tracks')
      .update({ track_number: 100000 + i })
      .eq('id', cleaned[i].id)
      .eq('album_id', albumId)
      .eq('user_id', user.id);
    if (error) throw new Error(toSupabaseErrorMessage(error));
  }

  for (const t of cleaned) {
    const { error } = await supabase
      .from('lyrics_translation_tracks')
      .update({
        track_number: t.track_number,
        track_title: t.track_title,
      })
      .eq('id', t.id)
      .eq('album_id', albumId)
      .eq('user_id', user.id);
    if (error) throw new Error(toSupabaseErrorMessage(error));
  }

  return true;
}

export async function addLyricsTrack(
  albumId: number,
  track: { track_number: number; track_title: string },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(albumId)) throw new Error('앨범 ID가 올바르지 않습니다.');

  const track_number = Number(track.track_number);
  const track_title = String(track.track_title || '').trim();
  if (!track_title) throw new Error('트랙 제목은 필수입니다.');
  if (!Number.isFinite(track_number) || track_number <= 0) {
    throw new Error('트랙 번호는 1 이상의 숫자여야 합니다.');
  }

  const supabase = await createClient();
  const { data: siblings, error: siblingsError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id, track_number')
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (siblingsError) throw new Error(toSupabaseErrorMessage(siblingsError));
  if ((siblings ?? []).some((t) => t.track_number === track_number)) {
    throw new Error('트랙 번호가 중복됩니다.');
  }

  const { data, error } = await supabase
    .from('lyrics_translation_tracks')
    .insert([
      {
        user_id: user.id,
        album_id: albumId,
        track_number,
        track_title,
      },
    ])
    .select('*')
    .single();
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return data;
}

export async function deleteLyricsTrack(trackId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  const id = String(trackId || '').trim();
  if (!id) throw new Error('트랙 ID가 없습니다.');

  const supabase = await createClient();
  const { data: track, error: trackError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (trackError) throw new Error(toSupabaseErrorMessage(trackError));
  if (!track) throw new Error('트랙을 찾을 수 없습니다.');

  const { error: trDelError } = await supabase
    .from('lyrics_translations')
    .delete()
    .eq('track_id', id)
    .eq('user_id', user.id);
  if (trDelError) throw new Error(toSupabaseErrorMessage(trDelError));

  const { error } = await supabase
    .from('lyrics_translation_tracks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

export async function commitAlbumTrackListDraft(
  albumId: number,
  draft: { id: string | null; track_number: number; track_title: string }[],
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(albumId)) throw new Error('앨범 ID가 올바르지 않습니다.');
  if (!Array.isArray(draft)) throw new Error('트랙 목록이 올바르지 않습니다.');

  const cleaned = draft.map((t) => ({
    id: t.id ? String(t.id).trim() : null,
    track_number: Number(t.track_number),
    track_title: String(t.track_title || '').trim(),
  }));

  for (const t of cleaned) {
    if (!t.track_title) throw new Error('트랙 제목은 필수입니다.');
    if (!Number.isFinite(t.track_number) || !Number.isInteger(t.track_number) || t.track_number <= 0) {
      throw new Error('트랙 번호는 1 이상의 정수여야 합니다.');
    }
  }
  const numbers = cleaned.map((t) => t.track_number);
  if (new Set(numbers).size !== numbers.length) {
    throw new Error('트랙 번호가 중복됩니다.');
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from('lyrics_translation_tracks')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (existingError) throw new Error(toSupabaseErrorMessage(existingError));

  const existingIds = new Set((existing ?? []).map((t) => t.id));
  for (const t of cleaned) {
    if (t.id && !existingIds.has(t.id)) {
      throw new Error('트랙 목록이 최신이 아닙니다. 새로고침 후 다시 시도해 주세요.');
    }
  }

  const keepIds = new Set(cleaned.map((t) => t.id).filter((id): id is string => !!id));
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  const toUpdate = cleaned.filter((t): t is { id: string; track_number: number; track_title: string } => !!t.id);
  const toCreate = cleaned.filter((t) => !t.id);

  if (toDelete.length > 0) {
    try {
      const { error: trDelError } = await supabase
        .from('lyrics_translations')
        .delete()
        .in('track_id', toDelete)
        .eq('user_id', user.id);
      if (trDelError) throw new Error(toSupabaseErrorMessage(trDelError));

      const { error: delError } = await supabase
        .from('lyrics_translation_tracks')
        .delete()
        .in('id', toDelete)
        .eq('album_id', albumId)
        .eq('user_id', user.id);
      if (delError) throw new Error(toSupabaseErrorMessage(delError));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      throw new Error(`트랙 삭제 중 실패: ${msg}`);
    }
  }

  if (toUpdate.length > 0) {
    try {
      await updateAlbumTrackMeta(albumId, toUpdate);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      throw new Error(`트랙 수정 중 실패: ${msg}`);
    }
  }

  if (toCreate.length > 0) {
    try {
      const { error: insertError } = await supabase.from('lyrics_translation_tracks').insert(
        toCreate.map((t) => ({
          user_id: user.id,
          album_id: albumId,
          track_number: t.track_number,
          track_title: t.track_title,
        })),
      );
      if (insertError) throw new Error(toSupabaseErrorMessage(insertError));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      throw new Error(`트랙 추가 중 실패: ${msg}`);
    }
  }

  return true;
}
