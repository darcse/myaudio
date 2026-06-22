import Link from 'next/link';
import { Archive } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { ListenAlbumCard } from '@/app/archive/[year]/[month]/_components/MonthlyTimeline';
import type { Album } from '@/app/albums/types';
import { ArchiveLoginPrompt } from '@/app/archive/_components/ArchiveLoginPrompt';
import { MonthlyTimeline } from '@/app/archive/[year]/[month]/_components/MonthlyTimeline';

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export default async function ArchiveMonthPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return <ArchiveLoginPrompt />;
  const { year: ys, month: ms } = await params;
  const y = parseInt(ys, 10);
  const m = parseInt(ms, 10);
  const maxY = new Date().getFullYear();
  const maxM = new Date().getMonth() + 1;
  if (!Number.isInteger(y) || !Number.isInteger(m) || y < 2026 || y > maxY || m < 1 || m > 12) {
    notFound();
  }
  if (y === maxY && m > maxM) notFound();

  const supabase = await createClient();
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m)}-01`;
  const endExclusive = `${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01`;
  const { data: histRows } = await supabase
    .from('album_listen_history')
    .select('id, listened_at, impression, album_id, dac_amp_id, headphone_id')
    .gte('listened_at', start)
    .lt('listened_at', endExclusive)
    .order('listened_at', { ascending: false });
  const list = histRows ?? [];
  let initialListenRows: ListenAlbumCard[] = [];
  if (list.length > 0) {
    const albumIds = [...new Set(list.map((r) => r.album_id as number).filter((id) => id != null))];
    const gearIds = new Set<number>();
    for (const r of list) {
      const dacId = r.dac_amp_id as number | null;
      const hpId = r.headphone_id as number | null;
      if (dacId != null) gearIds.add(dacId);
      if (hpId != null) gearIds.add(hpId);
    }
    const gearMap = new Map<number, { id: number; brand: string; model: string }>();
    if (gearIds.size > 0) {
      const { data: gearRows } = await supabase
        .from('headfi')
        .select('id, brand, model')
        .in('id', [...gearIds]);
      for (const g of gearRows ?? []) {
        gearMap.set(g.id, { id: g.id, brand: g.brand || '', model: g.model || '' });
      }
    }
    if (albumIds.length > 0) {
      const { data: albumData } = await supabase.from('album').select('*').in('id', albumIds);
      const albumMap = new Map<number, Album>();
      for (const a of (albumData ?? []) as Album[]) {
        if (a.id != null) albumMap.set(a.id, a);
      }
      initialListenRows = list.flatMap((r) => {
          const aid = r.album_id as number | null;
          if (aid == null) return [];
          const al = albumMap.get(aid);
          if (!al) return [];
          const listenId = r.id as number | null;
          if (!listenId) return [];
          const imp = r.impression as string | null;
          const dacId = r.dac_amp_id as number | null;
          const hpId = r.headphone_id as number | null;
          return [
            {
              listenId,
              listened_at: (r.listened_at as string).slice(0, 10),
              impression: typeof imp === 'string' && imp.trim() !== '' ? imp : null,
              album: al,
              dac_amp: dacId != null ? gearMap.get(dacId) ?? null : null,
              headphone: hpId != null ? gearMap.get(hpId) ?? null : null,
            },
          ];
        });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <Archive className="size-7 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
          Archive
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href={`/archive?year=${y}`}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium opacity-85 transition-opacity hover:opacity-100"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
            aria-label="Archive 목록으로 돌아가기"
          >
            ← 목록
          </Link>
          <p className="text-lg font-medium opacity-85">
            {y}년 {m}월
          </p>
        </div>
      </div>
      <MonthlyTimeline key={`${y}-${m}`} year={y} month={m} initialListenRows={initialListenRows} />
    </div>
  );
}
