'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import type { Headfi } from '../types';
import {
  buildHeadfiSpendingStats,
  formatCategorySpendingLabel,
  formatKrw,
  type SpendingCategoryBucket,
  type SpendingMonthBucket,
  type SpendingYearBucket,
} from '../spendingStats';

type HeadfiSpendingStatsModalProps = {
  open: boolean;
  onClose: () => void;
  library: Headfi[];
};

type BarDatum = {
  label: string;
  value: number;
};

function formatBarAmount(amount: number): string {
  if (amount === 0) return '-';
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1).replace(/\.0$/, '')}억`;
  }
  if (amount >= 10000) return `${Math.round(amount / 10000)}만`;
  return amount.toLocaleString('ko-KR');
}

function MonthlyBarChart({ data }: { data: BarDatum[] }) {
  const chartHeight = 200;
  const barWidth = 24;
  const gap = 8;
  const valueLabelHeight = 26;
  const monthLabelHeight = 22;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const slotWidth = barWidth + gap;
  const width = data.length * slotWidth + gap;
  const height = valueLabelHeight + chartHeight + monthLabelHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full min-h-[260px]"
      role="img"
      aria-label="월별 지출 바 차트"
    >
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
        const x = gap / 2 + index * slotWidth;
        const barTop = valueLabelHeight + chartHeight - barHeight;
        return (
          <g key={item.label} aria-label={`${item.label}월 ${formatKrw(item.value)}`}>
            <title>{`${item.label}월 ${formatKrw(item.value)}`}</title>
            {item.value > 0 ? (
              <text
                x={x + barWidth / 2}
                y={barTop - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="var(--foreground)"
              >
                {formatBarAmount(item.value)}
              </text>
            ) : null}
            <rect
              x={x}
              y={barTop}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="var(--link)"
              opacity={item.value > 0 ? 1 : 0.25}
            />
            <text
              x={x + barWidth / 2}
              y={valueLabelHeight + chartHeight + 14}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SpendingTable({
  rows,
  labelHeader = '항목',
  amountHeader = '지출',
}: {
  rows: SpendingYearBucket[];
  labelHeader?: string;
  amountHeader?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full">
        <thead style={{ background: 'var(--badge-bg)' }}>
          <tr>
            <th className="px-3 py-2 text-left font-semibold opacity-80">{labelHeader}</th>
            <th className="px-3 py-2 text-right font-semibold opacity-80">{amountHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="px-3 py-2 opacity-90">{row.label}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{formatKrw(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearlyTable({ rows }: { rows: SpendingYearBucket[] }) {
  return <SpendingTable rows={rows} labelHeader="연도" amountHeader="지출" />;
}

function CategorySpendingTable({ rows }: { rows: SpendingCategoryBucket[] }) {
  return (
    <div className="overflow-hidden rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full">
        <thead style={{ background: 'var(--badge-bg)' }}>
          <tr>
            <th className="px-3 py-2 text-left font-semibold opacity-80">항목</th>
            <th className="px-3 py-2 text-right font-semibold opacity-80">지출</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="px-3 py-2 opacity-90">{formatCategorySpendingLabel(row)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{formatKrw(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeadfiSpendingStatsModal({ open, onClose, library }: HeadfiSpendingStatsModalProps) {
  const [statsTab, setStatsTab] = useState<'period' | 'type'>('period');
  const [monthlyYear, setMonthlyYear] = useState<2025 | 2026>(2026);
  const stats = useMemo(() => buildHeadfiSpendingStats(library), [library]);

  const monthlyChartData = useMemo<BarDatum[]>(
    () =>
      stats.monthlyByYear[monthlyYear].map((row: SpendingMonthBucket) => ({
        label: String(row.month),
        value: row.amount,
      })),
    [stats.monthlyByYear, monthlyYear],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-panel-apple relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title flex items-center gap-2 text-xl">
            <BarChart2 className="size-5 opacity-80" strokeWidth={1.5} aria-hidden />
            소비 통계
          </h2>
          <button
            type="button"
            className="text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100"
            onClick={onClose}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <section className="mb-6 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">전체 지출</p>
          <p className="text-3xl font-bold tabular-nums">{formatKrw(stats.total)}</p>
          <p className="mt-1 text-xs opacity-55">구매가 + 케이블 가격 + 이어팁·이어패드 가격 (방출 포함)</p>
        </section>

        <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--badge-bg)' }}>
          {([
            { id: 'period' as const, label: '기간별' },
            { id: 'type' as const, label: '종류별' },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="btn-apple flex-1 px-3 py-2 text-sm font-medium"
              style={{
                background: statsTab === tab.id ? 'var(--foreground)' : 'transparent',
                color: statsTab === tab.id ? 'var(--background)' : 'var(--foreground)',
              }}
              onClick={() => setStatsTab(tab.id)}
              aria-pressed={statsTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statsTab === 'period' ? (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold opacity-90">연도별 지출</h3>
          <YearlyTable rows={stats.yearly} />
          {stats.unclassified > 0 ? (
            <p className="text-xs opacity-70">
              <strong className="opacity-90">미분류</strong> (구입일 없음): {formatKrw(stats.unclassified)}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            <h3 className="text-sm font-semibold opacity-90">월별 지출</h3>
            <div className="flex gap-1">
              {([2025, 2026] as const).map((year) => (
                <button
                  key={year}
                  type="button"
                  className="btn-apple px-3 py-1.5 text-xs"
                  style={{
                    background: monthlyYear === year ? 'var(--foreground)' : 'var(--badge-bg)',
                    color: monthlyYear === year ? 'var(--background)' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={() => setMonthlyYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <MonthlyBarChart data={monthlyChartData} />
          <p className="text-xs opacity-55">구매 없는 달은 0원으로 표시됩니다. 바 위 금액은 만·억 단위로 축약 표시됩니다.</p>
        </section>
        ) : (
        <section className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold opacity-90">카테고리별 지출</h3>
            {stats.byCategory.length > 0 ? (
              <CategorySpendingTable rows={stats.byCategory} />
            ) : (
              <p className="text-sm opacity-70">표시할 지출이 없습니다.</p>
            )}
          </div>
          {stats.byAccessory.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold opacity-90">액세서리별 지출</h3>
              <CategorySpendingTable rows={stats.byAccessory} />
            </div>
          ) : null}
        </section>
        )}
      </div>
    </div>
  );
}
