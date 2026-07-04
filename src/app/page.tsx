import { createClient } from '@/lib/supabase/server';
import type { Album } from '@/app/albums/types';
import type { Headfi } from '@/app/headfi/types';
import { DashboardContent } from './_components/DashboardContent';

export const dynamic = 'force-dynamic';

function monthListenRange(): { start: string; endExclusive: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const endExclusive = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  return { start, endExclusive };
}

type MonthlyListenJoinRow = {
  album_id: number | null;
  listened_at: string | null;
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
  const { start, endExclusive } = monthListenRange();

  const [albumsCountRes, headfiCountRes, headfiCatsRes, monthlyListenRes, recentAlbumsRes, recentHeadfiRes] =
    await Promise.all([
      supabase.from('album').select('*', { count: 'exact', head: true }),
      supabase.from('headfi').select('*', { count: 'exact', head: true }).eq('status2', '보유중'),
      supabase.from('headfi').select('category, status2').neq('status2', '방출'),
      supabase
        .from('album_listen_history')
        .select('album_id, listened_at, album:album_id(id, album_name, artist, cover_image_url)')
        .gte('listened_at', start)
        .lt('listened_at', endExclusive),
      supabase
        .from('album')
        .select('id,album_name,artist,cover_image_url,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('headfi')
        .select('id,brand,model,image_url,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  const monthlyListenRows = (monthlyListenRes.data ?? []) as MonthlyListenJoinRow[];
  const monthlyListens = monthlyListenRows.length;

  const albumListenMeta = new Map<
    number,
    {
      count: number;
      latestListenedAt: string;
      album: NonNullable<ReturnType<typeof resolveJoinedAlbum>>;
    }
  >();

  for (const row of monthlyListenRows) {
    const listenedAt = row.listened_at?.trim() ?? '';
    const album = resolveJoinedAlbum(row.album);
    if (!album || !listenedAt) continue;
    const id = album.id;
    if (!Number.isInteger(id)) continue;
    const prev = albumListenMeta.get(id);
    if (!prev) {
      albumListenMeta.set(id, { count: 1, latestListenedAt: listenedAt, album });
      continue;
    }
    albumListenMeta.set(id, {
      count: prev.count + 1,
      latestListenedAt: listenedAt > prev.latestListenedAt ? listenedAt : prev.latestListenedAt,
      album: prev.album,
    });
  }

  const monthlyListenAlbums = [...albumListenMeta.entries()]
    .sort((a, b) => b[1].latestListenedAt.localeCompare(a[1].latestListenedAt))
    .map(([, data]) => ({
      id: data.album.id,
      album_name: String(data.album.album_name ?? ''),
      artist: data.album.artist ?? null,
      cover_image_url: data.album.cover_image_url ?? null,
      listenCount: data.count,
    }));

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
