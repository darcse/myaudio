'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { toSupabaseErrorMessage } from '@/lib/supabase-error';
import type { LyricsFormData } from './types';

function mapLyricsData(data: LyricsFormData) {
  const title = data.title?.trim();
  if (!title) {
    throw new Error('제목은 필수입니다.');
  }
  const album = data.album?.trim();
  if (!album) {
    throw new Error('앨범명은 필수입니다.');
  }
  return {
    title,
    album,
    genre1: data.genre1?.trim() || null,
    genre2: data.genre2?.trim() || null,
    lyrics: data.lyrics?.trim() || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    audio_url: data.audio_url?.trim() || null,
    youtube_url: data.youtube_url?.trim() || null,
  };
}

export async function saveLyricsToDB(data: LyricsFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('lyrics')
    .insert([mapLyricsData(data)])
    .select('id')
    .single();
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function updateLyricsInDB(id: number, data: LyricsFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('lyrics')
    .update(mapLyricsData(data))
    .eq('id', id)
    .select();
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return result;
}

export async function deleteLyricsFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('lyrics').delete().eq('id', id);
  if (error) throw new Error(toSupabaseErrorMessage(error));
  return true;
}

const AUDIO_EXT = new Set(['mp3', 'wav', 'flac']);

export async function uploadAudioFile(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!AUDIO_EXT.has(ext)) {
    throw new Error('오디오는 mp3, wav, flac만 업로드할 수 있습니다.');
  }
  const supabase = await createClient();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('lyrics-audio').upload(path, file, {
    contentType: file.type || `audio/${ext === 'mp3' ? 'mpeg' : ext}`,
    upsert: false,
  });
  if (error) throw new Error(toSupabaseErrorMessage(error));
  const { data: pub } = supabase.storage.from('lyrics-audio').getPublicUrl(data.path);
  return pub.publicUrl;
}

export async function uploadCoverImage(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('lyrics-covers').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(toSupabaseErrorMessage(error));
  const { data: pub } = supabase.storage.from('lyrics-covers').getPublicUrl(data.path);
  return pub.publicUrl;
}
