'use client';

import { useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import {
  buildMonthlyListenTrend,
  buildWeeklyListenTrend,
  buildYearlyListenTrend,
  formatListenTrendUnitLabel,
  listStatsYears,
  STATS_MIN_YEAR,
  type ListenTrendUnit,
} from '../albumListenStats';
import { ListenTrendChart } from './ListenTrendChart';

type HistoryRow = { album_id: number | null; listened_at: string | null };

type ListenTrendSectionProps = {
  historyRows: HistoryRow[];
  now: Date;
  loadError: string | null;
};

function filterToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

const TREND_UNITS: ListenTrendUnit[] = ['year', 'month', 'week'];

export function ListenTrendSection({ historyRows, now, loadError }: ListenTrendSectionProps) {
  const [trendUnit, setTrendUnit] = useState<ListenTrendUnit>('month');
  const [trendYear, setTrendYear] = useState(() => Math.max(STATS_MIN_YEAR, now.getFullYear()));
  const yearOptions = useMemo(() => listStatsYears(), []);

  const trendData = useMemo(() => {
    if (trendUnit === 'year') return buildYearlyListenTrend(historyRows, now);
    if (trendUnit === 'month') return buildMonthlyListenTrend(historyRows, trendYear);
    return buildWeeklyListenTrend(historyRows, now);
  }, [historyRows, now, trendUnit, trendYear]);

  const totalCount = useMemo(
    () => trendData.reduce((sum, point) => sum + point.count, 0),
    [trendData],
  );

  const trendTitle = useMemo(() => {
    if (trendUnit === 'year') return '연도별 청취 추이';
    if (trendUnit === 'month') return `${trendYear}년 월별 청취 추이`;
    return `최근 ${trendData.length}주 청취 추이`;
  }, [trendData.length, trendUnit, trendYear]);

  if (loadError) {
    return (
      <div
        className="rounded-xl border px-6 py-16 text-center"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <p className="text-sm font-medium opacity-80">청취 기록을 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm opacity-60">{loadError}</p>
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--border)' }}
      >
        <LineChart className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />
        청취 추이
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-semibold opacity-60">기간 단위</span>
            {TREND_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setTrendUnit(unit)}
                className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                style={filterToggleStyle(trendUnit === unit)}
                aria-pressed={trendUnit === unit}
              >
                {formatListenTrendUnitLabel(unit)}
              </button>
            ))}
          </div>

          {trendUnit === 'month' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-semibold opacity-60">연도</span>
              {yearOptions.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setTrendYear(year)}
                  className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                  style={filterToggleStyle(trendYear === year)}
                  aria-pressed={trendYear === year}
                >
                  {year}년
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-semibold opacity-90">{trendTitle}</h2>
          <p className="mt-1 text-xs opacity-55">
            {trendUnit === 'week'
              ? '월요일 기준 주간 집계입니다. 청취 없는 주는 0회로 표시됩니다.'
              : '청취 기록이 없는 기간은 0회로 표시됩니다.'}
          </p>
        </div>

        <ListenTrendChart data={trendData} unit={trendUnit} />

        {totalCount === 0 ? (
          <p className="text-center text-sm opacity-60">선택한 기간에 청취 기록이 없습니다.</p>
        ) : null}
      </div>
    </section>
  );
}
