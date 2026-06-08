import Link from 'next/link';
import type { ArchiveMonthCard } from '@/app/archive/yearStats';

type Props = {
  year: number;
  months: ArchiveMonthCard[];
};

function MonthCollage({ urls }: { urls: string[] }) {
  const slots = Array.from({ length: 6 }, (_, i) => urls[i] ?? null);
  return (
    <div className="mb-3 grid aspect-[3/2] w-full grid-cols-3 gap-1">
      {slots.map((url, i) => (
        <div
          key={i}
          className="relative aspect-square min-h-0 w-full overflow-hidden rounded-md"
          style={{ background: 'var(--badge-bg)' }}
        >
          {url ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${JSON.stringify(url)})`,
                backgroundPosition: 'top center',
                backgroundSize: 'cover',
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">—</div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatStats(row: ArchiveMonthCard): string {
  const parts: string[] = [];
  if (row.listenAlbums > 0) parts.push(`앨범 ${row.listenAlbums}`);
  if (row.headfi > 0) parts.push(`헤드파이 ${row.headfi}`);
  if (row.lyrics > 0) parts.push(`가사 ${row.lyrics}`);
  return parts.join(' · ');
}

export function ArchiveGrid({ year, months }: Props) {
  if (months.length === 0) {
    return (
      <p className="text-sm opacity-80" style={{ color: 'var(--foreground)' }}>
        이 연도에 표시할 활동이 있는 달이 없습니다.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((row) => {
        const total = row.listenAlbums + row.headfi + row.lyrics;
        return (
          <Link
            key={row.month}
            href={`/archive/${year}/${row.month}`}
            className="card-apple rounded-2xl p-4 text-left transition-opacity hover:opacity-95"
            style={{ color: 'var(--foreground)' }}
          >
            <MonthCollage urls={row.thumbnails} />
            <h2 className="truncate text-sm font-bold leading-tight">
              {year}년 {row.month}월
            </h2>
            <p className="mt-1 text-xs opacity-60 tabular-nums">총 {total}건</p>
            <p className="mt-0.5 text-xs opacity-75 tabular-nums">{formatStats(row)}</p>
          </Link>
        );
      })}
    </div>
  );
}
