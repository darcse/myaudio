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

function resolveJoinedAlbum(
  album: MonthlyListenJoinRow['album'],
): { id: number; album_name: string; artist: string | null; cover_image_url: string | null } | null {
  if (!album) return null;
  if (Array.isArray(album)) return album[0] ?? null;
  return album;
}

export default async function Home() {
  const supabase = await createClient();

  const [albumsCountRes, headfiCountRes, headfiCatsRes, listenCountRes, recentListenRes, recentAlbumsRes, recentHeadfiRes] =
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
        .limit(5),
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

  return (
    <DashboardContent
      totalAlbums={albumsCountRes.count ?? 0}
      totalHeadfi={headfiCountRes.count ?? 0}
      monthlyListens={monthlyListens}
      headfiCategoryRows={(headfiCatsRes.data ?? []) as Pick<Headfi, 'category'>[]}
      monthlyListenAlbums={monthlyListenAlbums}
      recentAlbums={(recentAlbumsRes.data ?? []) as Album[]}
      recentHeadfi={(recentHeadfiRes.data ?? []) as Headfi[]}
    />
  );
}
