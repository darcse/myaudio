'use client';

import type { ListenTrendPoint, ListenTrendUnit } from '../albumListenStats';

type ListenTrendChartProps = {
  data: ListenTrendPoint[];
  unit: ListenTrendUnit;
};

function formatCountLabel(count: number): string {
  if (count === 0) return '';
  return `${count}회`;
}

function axisSuffix(unit: ListenTrendUnit): string {
  if (unit === 'month') return '월';
  if (unit === 'week') return '주';
  return '';
}

export function ListenTrendChart({ data, unit }: ListenTrendChartProps) {
  const maxValue = Math.max(...data.map((item) => item.count), 1);
  const suffix = axisSuffix(unit);

  return (
    <div
      className="flex h-44 items-end justify-between gap-1 sm:gap-1.5"
      role="img"
      aria-label="청취 추이 바 차트"
    >
      {data.map((item) => {
        const barHeightPct = item.count > 0 ? Math.max((item.count / maxValue) * 100, 6) : 0;
        const axisLabel = suffix ? `${item.label}${suffix}` : item.label;
        return (
          <div
            key={item.key}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            aria-label={`${axisLabel} ${item.count}회`}
            title={`${axisLabel} ${item.count}회`}
          >
            <span className="h-4 shrink-0 text-[10px] font-medium tabular-nums leading-4 opacity-70">
              {formatCountLabel(item.count)}
            </span>
            <div className="flex h-28 w-full items-end justify-center sm:h-32">
              <div
                className="w-full max-w-6 rounded-sm sm:max-w-7"
                style={{
                  height: barHeightPct > 0 ? `${barHeightPct}%` : '2px',
                  background: 'var(--link)',
                  opacity: item.count > 0 ? 1 : 0.2,
                }}
              />
            </div>
            <span className="shrink-0 text-[11px] leading-none" style={{ color: 'var(--muted)' }}>
              {axisLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
