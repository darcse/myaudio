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

  const payload = {
    user_id: user.id,
    track_id: input.trackId,
    youtube_url: input.youtubeUrl.trim() || null,
    lyrics_text: lyricsText,
    translated_lines: lines,
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
  const supabase = await createClient();
  const { error } = await supabase
    .from('lyrics_translation_tracks')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', user.id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}
