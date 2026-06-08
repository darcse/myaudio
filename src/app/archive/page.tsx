import Link from 'next/link';
import { Archive } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { ArchiveGrid } from '@/app/archive/_components/ArchiveGrid';
import { ArchiveLoginPrompt } from '@/app/archive/_components/ArchiveLoginPrompt';
import { loadArchiveYearStats } from '@/app/archive/yearStats';

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function ArchivePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) return <ArchiveLoginPrompt />;
  const sp = await searchParams;
  const maxY = new Date().getFullYear();
  const raw = parseInt(sp.year ?? '', 10);
  const year = Number.isFinite(raw) ? Math.min(Math.max(raw, 2026), maxY) : maxY;
  const months = await loadArchiveYearStats(year);
  const yearList: number[] = [];
  for (let y = 2026; y <= maxY; y++) yearList.push(y);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 min-h-screen" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <Archive className="size-7 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
          Archive
        </h1>
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {yearList.map((yy) => {
          const active = yy === year;
          return (
            <Link
              key={yy}
              href={`/archive?year=${yy}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-opacity ${
                active ? 'opacity-100' : 'opacity-65 hover:opacity-100'
              }`}
              style={{
                borderColor: 'var(--border)',
                background: active ? 'var(--badge-bg)' : 'var(--card-bg)',
              }}
            >
              {yy}년
            </Link>
          );
        })}
      </div>
      <ArchiveGrid year={year} months={months} />
    </div>
  );
}
