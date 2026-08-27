import { createClient } from '@/lib/supabase/server';
import type { Album } from '@/app/albums/types';
import type { Headfi } from '@/app/headfi/types';
import { DashboardContent } from './_components/DashboardContent';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1';

type MonthlyListenJoinRow = {
  album_id: number | null;
  listened_at: string | null;
  created_at: string | null;
  album:
    | {
        id: number;
        album_name: string;
        artist: string | null;
        cover_image_url: string | null;
      }
    | {
        id: number;
        album_name: string;
        artist: string | null;
        cover_image_url: string | null;
      }[]
    | null;
};

type RecentLyricsJoinRow = {
  created_at: string | null;
  track_id: string;
  lyrics_translation_tracks:
    | { album_id: number }
    | { album_id: number }[]
    | null;
};

type RecentLyricsAlbum = {
  id: number;
  album_name: string;
  artist: string | null;
  cover_image_url: string | null;
};

function resolveJoinedAlbum(
  album: MonthlyListenJoinRow['album'],
): { id: number; album_name: string; artist: string | null; cover_image_url: string | null } | null {
  if (!album) return null;
  if (Array.isArray(album)) return album[0] ?? null;
  return album;
}

function resolveLyricsAlbumId(
  track: RecentLyricsJoinRow['lyrics_translation_tracks'],
): number | null {
  if (!track) return null;
  const row = Array.isArray(track) ? track[0] : track;
  return Number.isInteger(row?.album_id) ? row.album_id : null;
}

export default async function Home() {
  const supabase = await createClient();

  const [albumsCountRes, headfiCountRes, headfiCatsRes, listenCountRes, recentListenRes, recentAlbumsRes, recentLyricsRes, recentHeadfiRes] =
    await Promise.all([
      supabase.from('album').select('*', { count: 'exact', head: true }),
      supabase.from('headfi').select('*', { count: 'exact', head: true }).eq('status2', '보유중'),
      supabase.from('headfi').select('category, status2').neq('status2', '방출'),
      supabase.from('album_listen_history').select('*', { count: 'exact', head: true }),
      supabase
        .from('album_listen_history')
        .select('album_id, listened_at, created_at, album:album_id(id, album_name, artist, cover_image_url)')
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(80),
      supabase
        .from('album')
        .select('id,album_name,artist,cover_image_url,created_at')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('lyrics_translations')
        .select('created_at, track_id, lyrics_translation_tracks(album_id)')
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('headfi')
        .select('id,brand,model,image_url,purchase_date')
        .order('purchase_date', { ascending: false, nullsFirst: false })
        .limit(5),
    ]);

  const monthlyListenRows = (recentListenRes.data ?? []) as MonthlyListenJoinRow[];
  const monthlyListens = listenCountRes.count ?? 0;

  const listenCountByAlbumId = new Map<number, number>();
  const orderedRows = [...monthlyListenRows].sort((a, b) => {
    const aCreated = a.created_at?.trim() ?? '';
    const bCreated = b.created_at?.trim() ?? '';
    if (aCreated !== bCreated) return bCreated.localeCompare(aCreated);
    const aId = a.album_id ?? 0;
    const bId = b.album_id ?? 0;
    return bId - aId;
  });

  for (const row of orderedRows) {
    const album = resolveJoinedAlbum(row.album);
    if (!album || !Number.isInteger(album.id)) continue;
    listenCountByAlbumId.set(album.id, (listenCountByAlbumId.get(album.id) ?? 0) + 1);
  }

  const monthlyListenAlbums: {
    id: number;
    album_name: string;
    artist: string | null;
    cover_image_url: string | null;
    listenCount: number;
  }[] = [];
  const seenAlbumIds = new Set<number>();

  for (const row of orderedRows) {
    const album = resolveJoinedAlbum(row.album);
    if (!album || !Number.isInteger(album.id) || seenAlbumIds.has(album.id)) continue;
    seenAlbumIds.add(album.id);
    monthlyListenAlbums.push({
      id: album.id,
      album_name: String(album.album_name ?? ''),
      artist: album.artist ?? null,
      cover_image_url: album.cover_image_url ?? null,
      listenCount: listenCountByAlbumId.get(album.id) ?? 1,
    });
    if (monthlyListenAlbums.length >= 7) break;
  }

  const recentLyricsRows = (recentLyricsRes.data ?? []) as RecentLyricsJoinRow[];
  const recentLyricsAlbumIds: number[] = [];
  const seenLyricsAlbumIds = new Set<number>();
  for (const row of recentLyricsRows) {
    const albumId = resolveLyricsAlbumId(row.lyrics_translation_tracks);
    if (albumId == null || seenLyricsAlbumIds.has(albumId)) continue;
    seenLyricsAlbumIds.add(albumId);
    recentLyricsAlbumIds.push(albumId);
    if (recentLyricsAlbumIds.length >= 2) break;
  }

  let recentLyricsAlbums: RecentLyricsAlbum[] = [];
  if (recentLyricsAlbumIds.length > 0) {
    const { data: lyricsAlbumRows } = await supabase
      .from('album')
      .select('id, album_name, artist, cover_image_url')
      .in('id', recentLyricsAlbumIds);
    const albumById = new Map((lyricsAlbumRows ?? []).map((row) => [row.id, row]));
    recentLyricsAlbums = recentLyricsAlbumIds
      .map((id) => albumById.get(id))
      .filter((row): row is RecentLyricsAlbum => !!row);
  }

  return (
    <DashboardContent
      totalAlbums={albumsCountRes.count ?? 0}
      totalHeadfi={headfiCountRes.count ?? 0}
      monthlyListens={monthlyListens}
      headfiCategoryRows={(headfiCatsRes.data ?? []) as Pick<Headfi, 'category'>[]}
      monthlyListenAlbums={monthlyListenAlbums}
      recentAlbums={(recentAlbumsRes.data ?? []) as Album[]}
      recentLyricsAlbums={recentLyricsAlbums}
      recentHeadfi={(recentHeadfiRes.data ?? []) as Headfi[]}
    />
  );
}
