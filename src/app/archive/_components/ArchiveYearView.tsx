import Link from 'next/link';
import { ArchiveGrid } from '@/app/archive/_components/ArchiveGrid';
import type { ArchiveMonthCard } from '@/app/archive/yearStats';

type ArchiveYearViewProps = {
  year: number;
  yearList: number[];
  months: ArchiveMonthCard[];
  yearHref: (year: number) => string;
};

export function ArchiveYearView({ year, yearList, months, yearHref }: ArchiveYearViewProps) {
  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {yearList.map((yy) => {
          const active = yy === year;
          return (
            <Link
              key={yy}
              href={yearHref(yy)}
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
    </>
  );
}
