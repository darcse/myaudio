'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { AlbumFormData } from './types';

const formatReleaseDate = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr.length === 4) return `${dateStr}-01-01`;
  if (dateStr.length === 7) return `${dateStr}-01`;
  return dateStr;
};

function mapAlbumData(data: AlbumFormData) {
  const seen = new Set<number>();
  const manualIds = [data.recommended_hp1, data.recommended_hp2, data.recommended_hp3]
    .map((s) => parseInt(String(s || '').trim(), 10))
    .filter((n) => {
      if (Number.isNaN(n) || seen.has(n)) return false;
      seen.add(n);
      return true;
    })
    .slice(0, 3);
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
    cover_image_url: data.cover_image_url,
    matching1: data.matching1,
    matching2: data.matching2,
    title_song_url: data.title_song_url,
    wiki_url: data.wiki_url || null,
    album_intro: data.album_intro?.trim() || null,
    manual_recommended_headphone_ids: manualIds.length > 0 ? manualIds : null,
  };
}

type MusicBrainzSearchResult = {
  items: {
    mbid: string;
    album_name: string;
    artist: string;
    album_type: string;
    release_date: string;
    cover_image_url: string;
  }[];
  total: number;
  error?: string;
};

async function resolveMusicBrainzContact(): Promise<string | null> {
  const fromEnv = process.env.MUSICBRAINZ_CONTACT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  const user = await getCurrentUser();
  return user?.email?.trim() || null;
}

export async function searchMusicBrainz(
  query: string,
  page: number = 1,
  display: number = 30,
): Promise<MusicBrainzSearchResult> {
  try {
    const contact = await resolveMusicBrainzContact();
    if (!contact) {
      return {
        items: [],
        total: 0,
        error: 'MusicBrainz 연락처를 확인할 수 없습니다. 로그인 후 다시 시도해 주세요.',
      };
    }

    const headers = {
      'User-Agent': `MyAudio/1.0.0 (${contact})`,
      Accept: 'application/json',
    };

    let artistRes: Response;
    try {
      artistRes = await fetch(
        `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query)}&limit=1&fmt=json`,
        { headers },
      );
    } catch {
      throw new Error('MusicBrainz 서버에 연결할 수 없습니다.');
    }

    if (!artistRes.ok) {
      throw new Error('아티스트 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }

    let artistData: { artists?: { id: string; name: string }[] };
    try {
      artistData = await artistRes.json();
    } catch {
      throw new Error('아티스트 검색 응답을 읽을 수 없습니다.');
    }

    if (!artistData.artists || artistData.artists.length === 0) {
      return { items: [], total: 0 };
    }

    const exactArtist = artistData.artists[0];
    const artistId = exactArtist.id;
    const artistName = exactArtist.name;

    const limit = display;
    const offset = (page - 1) * limit;

    let releaseRes: Response;
    try {
      releaseRes = await fetch(
        `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&limit=${limit}&offset=${offset}&fmt=json`,
        { headers },
      );
    } catch {
      throw new Error('MusicBrainz 서버에 연결할 수 없습니다.');
    }

    if (!releaseRes.ok) {
      throw new Error('앨범 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }

    let releaseData: {
      'release-groups'?: {
        id: string;
        title: string;
        'primary-type'?: string;
        'first-release-date'?: string;
      }[];
      'release-group-count'?: number;
    };
    try {
      releaseData = await releaseRes.json();
    } catch {
      throw new Error('앨범 검색 응답을 읽을 수 없습니다.');
    }

    const releaseGroups = releaseData['release-groups'];
    if (!Array.isArray(releaseGroups)) {
      throw new Error('앨범 검색 응답 형식이 올바르지 않습니다.');
    }

    const formattedItems = releaseGroups.map((item) => {
      const coverUrl = `https://coverartarchive.org/release-group/${item.id}/front`;
      const releaseDate = item['first-release-date'] || '';

      return {
        mbid: item.id,
        album_name: item.title,
        artist: artistName,
        album_type: item['primary-type'] || 'Album',
        release_date: releaseDate,
        cover_image_url: coverUrl,
      };
    });

    return {
      items: formattedItems,
      total: releaseData['release-group-count'] || 0,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : '검색 중 오류가 발생했습니다.';
    return { items: [], total: 0, error: message };
  }
}

export async function saveAlbumToDB(data: AlbumFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('album')
    .insert([mapAlbumData(data)])
    .select('id')
    .single();

  if (error) throw error;
  return result;
}

export async function updateAlbumInDB(id: number, data: AlbumFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('album')
    .update(mapAlbumData(data))
    .eq('id', id);

  if (error) throw error;
  return result;
}

export async function deleteAlbumFromDB(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase.from('album').delete().eq('id', id);
  if (error) throw error;
  return true;
}
