import { createClient } from '@/lib/supabase/server';

export type ArchiveMonthCard = {
  month: number;
  listenAlbums: number;
  headfi: number;
  lyrics: number;
  thumbnails: string[];
};

type Bucket = {
  listenAlbums: number;
  headfi: number;
  lyrics: number;
};

type MonthImageLists = {
  listenAlbumIds: number[];
  headfi: string[];
  lyrics: string[];
};

function utcMonth(iso: string): number {
  return new Date(iso).getUTCMonth() + 1;
}

function listenHistoryMonth(listenedAt: string): number | null {
  const s = String(listenedAt).slice(0, 10);
  if (s.length < 10) return null;
  const m = parseInt(s.slice(5, 7), 10);
  return m >= 1 && m <= 12 ? m : null;
}

function emptyMonthImages(): MonthImageLists {
  return { listenAlbumIds: [], headfi: [], lyrics: [] };
}

function pushUrl(list: string[], url: string | null | undefined): void {
  const u = typeof url === 'string' ? url.trim() : '';
  if (!u) return;
  list.push(u);
}

function buildMonthThumbnails(
  lists: MonthImageLists,
  albumCoverById: Map<number, string>,
  max = 6,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url: string | null | undefined): boolean => {
    const u = typeof url === 'string' ? url.trim() : '';
    if (!u || seen.has(u)) return false;
    seen.add(u);
    out.push(u);
    return true;
  };
  let primaryAlbumCovers = 0;
  const primaryAlbumMax = 2;
  for (const aid of lists.listenAlbumIds) {
    if (out.length >= max || primaryAlbumCovers >= primaryAlbumMax) break;
    if (push(albumCoverById.get(aid))) primaryAlbumCovers += 1;
  }
  const pools = [lists.headfi, lists.lyrics].filter((p) => p.length > 0);
  let round = 0;
  while (out.length < max && pools.length > 0) {
    let progressed = false;
    for (const pool of pools) {
      if (out.length >= max) break;
      if (round < pool.length) {
        push(pool[round]);
        progressed = true;
      }
    }
    if (!progressed) break;
    round++;
  }
  for (const aid of lists.listenAlbumIds) {
    if (out.length >= max) break;
    push(albumCoverById.get(aid));
  }
  return out;
}

export async function loadArchiveYearStats(year: number): Promise<ArchiveMonthCard[]> {
  const supabase = await createClient();
  const startIso = new Date(Date.UTC(year, 0, 1)).toISOString();
  const endIso = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
  const buckets: Record<number, Bucket> = {};
  const imagesByMonth: Record<number, MonthImageLists> = {};
  for (let mo = 1; mo <= 12; mo++) {
    buckets[mo] = { listenAlbums: 0, headfi: 0, lyrics: 0 };
    imagesByMonth[mo] = emptyMonthImages();
  }
  const yearStart = `${year}-01-01`;
  const yearEndExclusive = `${year + 1}-01-01`;
  const [headfiRes, lyricsRes, listenRes] = await Promise.all([
    supabase
      .from('headfi')
      .select('purchase_date,image_url')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', startIso)
      .lt('purchase_date', endIso),
    supabase
      .from('lyrics')
      .select('created_at,cover_image_url')
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase
      .from('album_listen_history')
      .select('listened_at, album_id')
      .gte('listened_at', yearStart)
      .lt('listened_at', yearEndExclusive)
      .order('listened_at', { ascending: false }),
  ]);
  if (headfiRes.error) throw new Error(headfiRes.error.message);
  if (lyricsRes.error) throw new Error(lyricsRes.error.message);
  if (listenRes.error) throw new Error(listenRes.error.message);
  for (const row of headfiRes.data ?? []) {
    if (!row.purchase_date) continue;
    const mo = utcMonth(row.purchase_date);
    if (mo < 1 || mo > 12) continue;
    buckets[mo].headfi += 1;
    pushUrl(imagesByMonth[mo].headfi, row.image_url);
  }
  for (const row of lyricsRes.data ?? []) {
    if (!row.created_at) continue;
    const mo = utcMonth(row.created_at);
    if (mo < 1 || mo > 12) continue;
    buckets[mo].lyrics += 1;
    pushUrl(imagesByMonth[mo].lyrics, row.cover_image_url);
  }
  for (const row of listenRes.data ?? []) {
    if (!row.listened_at) continue;
    const mo = listenHistoryMonth(String(row.listened_at));
    if (mo === null) continue;
    buckets[mo].listenAlbums += 1;
    const aid = Number(row.album_id);
    if (Number.isInteger(aid)) imagesByMonth[mo].listenAlbumIds.push(aid);
  }
  const allListenAlbumIds = new Set<number>();
  for (let mo = 1; mo <= 12; mo++) {
    for (const id of imagesByMonth[mo].listenAlbumIds) {
      if (Number.isInteger(id)) allListenAlbumIds.add(id);
    }
  }
  const albumCoverById = new Map<number, string>();
  if (allListenAlbumIds.size > 0) {
    const { data: albRows, error: albErr } = await supabase
      .from('album')
      .select('id, cover_image_url')
      .in('id', [...allListenAlbumIds]);
    if (albErr) throw new Error(albErr.message);
    for (const a of albRows ?? []) {
      const id = Number(a.id);
      const c = a.cover_image_url;
      if (Number.isInteger(id) && typeof c === 'string' && c.trim() !== '') albumCoverById.set(id, c.trim());
    }
  }
  const out: ArchiveMonthCard[] = [];
  for (let mo = 1; mo <= 12; mo++) {
    const b = buckets[mo];
    const total = b.listenAlbums + b.headfi + b.lyrics;
    if (total === 0) continue;
    out.push({
      month: mo,
      listenAlbums: b.listenAlbums,
      headfi: b.headfi,
      lyrics: b.lyrics,
      thumbnails: buildMonthThumbnails(imagesByMonth[mo], albumCoverById, 6),
    });
  }
  return out;
}
