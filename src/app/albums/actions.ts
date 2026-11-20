'use server';

import { after } from 'next/server';
import { extractDominantColorsFromCoverUrl } from '@/lib/albumCoverColors.server';
import { runNewAlbumEnrichment } from '@/lib/albumEnrichment';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { Album, AlbumFormData, AlbumTrack } from './types';
import { parseAppleMusicAlbumInput } from '@/lib/appleMusic';
import { parseYoutubePlaylistInput } from '@/lib/youtubePlaylist';
import {
  isClassicGenre,
  normalizeAlbumTracksFromDb,
  normalizeStagePlusUrl,
  sanitizeAlbumTagsForSave,
  sanitizeAlbumTracksForSave,
  sanitizeComposersForSave,
} from './utils';

const formatReleaseDate = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr.length === 4) return `${dateStr}-01-01`;
  if (dateStr.length === 7) return `${dateStr}-01`;
  return dateStr;
};

function mapAlbumData(data: AlbumFormData) {
  const seen = new Set<number>();
  const manualIds = [data.recommended_hp1, data.recommended_hp2]
    .map((s) => parseInt(String(s || '').trim(), 10))
    .filter((n) => {
      if (Number.isNaN(n) || seen.has(n)) return false;
      seen.add(n);
      return true;
    })
    .slice(0, 2);
  return {
    artist: data.artist,
    artist_type: data.artist_type,
    country: data.country,
    album_name: data.album_name,
    album_type: data.album_type,
    year: (() => {
      const arr = Array.isArray(data.year)
        ? [...new Set(data.year.map((x) => String(x).trim()).filter(Boolean))]
        : [];
      return arr.length > 0 ? arr : null;
    })(),
    release_date: formatReleaseDate(data.release_date || '') || null,
    genre1: data.genre1,
    genre2: data.genre2,
    classic_instrument: isClassicGenre(data.genre1)
      ? data.classic_instrument.trim() || null
      : null,
    cover_image_url: data.cover_image_url,
    matching1: data.matching1,
    matching2: data.matching2,
    title_song_url: (() => {
      if (!isClassicGenre(data.genre1)) return data.title_song_url;
      const raw = data.title_song_url?.trim() ?? '';
      if (!raw) return data.title_song_url;
      const stage = normalizeStagePlusUrl(raw);
      return stage.status === 'ok' && stage.url ? stage.url : raw;
    })(),
    youtube_playlist_id: parseYoutubePlaylistInput(data.youtube_playlist_id ?? '').id,
    apple_music_url: parseAppleMusicAlbumInput(data.apple_music_url ?? '').url,
    tracks: sanitizeAlbumTracksForSave(data.tracks),
    wiki_url: data.wiki_url || null,
    album_intro: data.album_intro?.trim() || null,
    manual_recommended_headphone_ids: manualIds.length > 0 ? manualIds : null,
    owns_cd: Boolean(data.owns_cd),
    owns_lp: Boolean(data.owns_lp),
    owns_cassette: Boolean(data.owns_cassette),
    ...(isClassicGenre(data.genre1)
      ? (() => {
          const composers = sanitizeComposersForSave(data.composers);
          const primary = composers[0];
          return {
            composers: composers.length > 0 ? composers : null,
            composer: primary?.name ?? null,
            composer_country: primary?.country ?? null,
            composer_era: primary?.era ?? null,
            composer_wiki_url: primary?.wiki_url ?? null,
          };
        })()
      : {
          tags: sanitizeAlbumTagsForSave(data.tags),
        }),
  };
}

async function resolveDominantColors(coverUrl: string | null | undefined): Promise<string[] | null> {
  const trimmed = coverUrl?.trim();
  if (!trimmed) return null;
  try {
    const colors = await extractDominantColorsFromCoverUrl(trimmed);
    return colors.length > 0 ? colors : null;
  } catch {
    return null;
  }
}

export async function saveAlbumToDB(data: AlbumFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const dominant_colors = await resolveDominantColors(data.cover_image_url);
  const { data: result, error } = await supabase
    .from('album')
    .insert([{ ...mapAlbumData(data), dominant_colors }])
    .select('id')
    .single();

  if (error) throw error;

  const albumId = (result as { id: number }).id;
  after(async () => {
    try {
      await runNewAlbumEnrichment(albumId);
    } catch (error) {
      const err = error as { message?: string };
      console.error('[album-enrichment]', {
        step: 'unhandled',
        albumId,
        error: (typeof err.message === 'string' && err.message ? err.message : String(error))
          .replace(/\s+/g, ' ')
          .slice(0, 300),
      });
    }
  });

  return result;
}

export async function updateAlbumInDB(id: number, data: AlbumFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const dominant_colors = await resolveDominantColors(data.cover_image_url);
  const mapped = mapAlbumData(data);
  const { data: existing } = await supabase
    .from('album')
    .select('youtube_playlist_id, genre1')
    .eq('id', id)
    .maybeSingle();
  if (
    existing &&
    isClassicGenre(existing.genre1) !== isClassicGenre(data.genre1)
  ) {
    throw new Error(
      '클래식 여부는 변경할 수 없습니다. Pop & Rock과 Classic은 각각 해당 메뉴에서 등록해 주세요.',
    );
  }
  const previousId =
    existing && typeof existing.youtube_playlist_id === 'string'
      ? existing.youtube_playlist_id
      : null;
  const playlistChanged = previousId !== (mapped.youtube_playlist_id ?? null);
  const { data: result, error } = await supabase
    .from('album')
    .update({
      ...mapped,
      dominant_colors,
      ...(playlistChanged ? { youtube_tracks: null } : {}),
    })
    .eq('id', id);

  if (error) throw error;
  console.error('[album-enrichment]', { reason: 'update_no_assign', albumId: id });
  return result;
}

export async function saveAlbumAppleMusicUrl(albumId: number, url: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = parseAppleMusicAlbumInput(url);
  if (parsed.status !== 'ok' || !parsed.url) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from('album')
    .select('apple_music_url')
    .eq('id', albumId)
    .maybeSingle();
  if (typeof data?.apple_music_url === 'string' && data.apple_music_url.trim()) return;
  const { error } = await supabase
    .from('album')
    .update({ apple_music_url: parsed.url })
    .eq('id', albumId)
    .is('apple_music_url', null);
  if (error) throw error;
}

export type FillAlbumTracksResult =
  | { status: 'filled'; album: Album }
  | { status: 'already_filled'; album: Album }
  | { status: 'empty_tracks' }
  | { status: 'unauthorized' }
  | { status: 'not_found' };

export async function fillAlbumTracksIfEmpty(
  albumId: number,
  tracksInput: AlbumTrack[] | unknown,
): Promise<FillAlbumTracksResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'unauthorized' };

  const tracks = sanitizeAlbumTracksForSave(
    Array.isArray(tracksInput) ? (tracksInput as AlbumTrack[]) : [],
  );
  if (tracks.length === 0) return { status: 'empty_tracks' };

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from('album')
    .select('*')
    .eq('id', albumId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!existing) return { status: 'not_found' };

  const currentTracks = normalizeAlbumTracksFromDb(
    (existing as { tracks?: unknown }).tracks,
  );
  if (currentTracks.length > 0) {
    return { status: 'already_filled', album: existing as Album };
  }

  const { data: updated, error: updateError } = await supabase
    .from('album')
    .update({ tracks })
    .eq('id', albumId)
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return { status: 'not_found' };

  const savedTracks = normalizeAlbumTracksFromDb((updated as { tracks?: unknown }).tracks);
  if (savedTracks.length === 0) {
    return { status: 'already_filled', album: updated as Album };
  }
  return { status: 'filled', album: updated as Album };
}

export async function deleteAlbumFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('album').delete().eq('id', id);
  if (error) throw error;
  return true;
}
