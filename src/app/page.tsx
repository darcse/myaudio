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

export default async function Home() {
  const supabase = await createClient();
  const { start, endExclusive } = monthListenRange();

  const [albumsCountRes, headfiCountRes, listensCountRes, headfiCatsRes, monthlyListenRes, lotteryPoolRes, recentAlbumsRes, recentHeadfiRes] =
    await Promise.all([
      supabase.from('album').select('*', { count: 'exact', head: true }),
      supabase.from('headfi').select('*', { count: 'exact', head: true }).eq('status2', '보유중'),
      supabase
        .from('album_listen_history')
        .select('*', { count: 'exact', head: true })
        .gte('listened_at', start)
        .lt('listened_at', endExclusive),
      supabase.from('headfi').select('category, status2').neq('status2', '방출'),
      supabase
        .from('album_listen_history')
        .select('album_id, listened_at')
        .gte('listened_at', start)
        .lt('listened_at', endExclusive),
      supabase
        .from('album')
        .select('id,album_name,artist,country,release_date,genre1,genre2,cover_image_url,created_at')
        .order('created_at', { ascending: false }),
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

  const albumListenMeta = new Map<number, { count: number; latestListenedAt: string }>();
  for (const row of monthlyListenRes.data ?? []) {
    const id = row.album_id as number;
    const listenedAt = String(row.listened_at ?? '');
    if (!Number.isInteger(id) || !listenedAt) continue;
    const prev = albumListenMeta.get(id);
    if (!prev) {
      albumListenMeta.set(id, { count: 1, latestListenedAt: listenedAt });
      continue;
    }
    albumListenMeta.set(id, {
      count: prev.count + 1,
      latestListenedAt: listenedAt > prev.latestListenedAt ? listenedAt : prev.latestListenedAt,
    });
  }
  const sortedListenIds = [...albumListenMeta.entries()]
    .sort((a, b) => b[1].latestListenedAt.localeCompare(a[1].latestListenedAt))
    .map(([id]) => id);
  let monthlyListenAlbums: { id: number; album_name: string; artist: string | null; cover_image_url: string | null; listenCount: number }[] = [];
  if (sortedListenIds.length > 0) {
    const { data: listenAlbumRows } = await supabase
      .from('album')
      .select('id,album_name,artist,cover_image_url')
      .in('id', sortedListenIds);
    const albumMap = new Map((listenAlbumRows ?? []).map((a) => [a.id as number, a]));
    monthlyListenAlbums = sortedListenIds
      .map((id) => {
        const al = albumMap.get(id);
        if (!al) return null;
        return {
          id: al.id as number,
          album_name: String(al.album_name ?? ''),
          artist: (al.artist as string | null) ?? null,
          cover_image_url: (al.cover_image_url as string | null) ?? null,
          listenCount: albumListenMeta.get(id)?.count ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }

  return (
    <DashboardContent
      totalAlbums={albumsCountRes.count ?? 0}
      totalHeadfi={headfiCountRes.count ?? 0}
      monthlyListens={listensCountRes.count ?? 0}
      headfiCategoryRows={(headfiCatsRes.data ?? []) as Pick<Headfi, 'category'>[]}
      monthlyListenAlbums={monthlyListenAlbums}
      lotteryPool={(lotteryPoolRes.data ?? []) as Album[]}
      recentAlbums={(recentAlbumsRes.data ?? []) as Album[]}
      recentHeadfi={(recentHeadfiRes.data ?? []) as Headfi[]}
    />
  );
}
