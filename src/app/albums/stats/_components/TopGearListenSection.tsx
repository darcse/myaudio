'use client';

import { Headphones } from 'lucide-react';
import type { GearCategoryFilter, GearListenRankItem, ListenPeriodFilter } from '../albumListenStats';
import {
  GEAR_CATEGORY_FILTER_OPTIONS,
  GEAR_LISTEN_RANKING_LIMIT,
  gearCategoryFilterLabel,
  formatPeriodLabel,
} from '../albumListenStats';

function filterToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

function RankBadge({ rank }: { rank: number }) {
  const highlight = rank <= 3;
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
      style={{
        background: highlight ? 'var(--foreground)' : 'var(--badge-bg)',
        color: highlight ? 'var(--background)' : 'var(--foreground)',
        opacity: highlight ? 1 : 0.75,
      }}
    >
      {rank}
    </span>
  );
}

function GearRankRow({
  item,
  rank,
  onClick,
}: {
  item: GearListenRankItem;
  rank: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-opacity hover:opacity-90"
    >
      <RankBadge rank={rank} />
      <div
        className="relative size-11 shrink-0 overflow-hidden rounded-md"
        style={{ background: 'var(--badge-bg)' }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center opacity-40">
            <Headphones className="size-4" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.brand} {item.model}
        </p>
        <p className="truncate text-xs opacity-60">{item.category}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </button>
  );
}

type TopGearListenSectionProps = {
  items: GearListenRankItem[];
  periodFilter: ListenPeriodFilter;
  categoryFilter: GearCategoryFilter;
  onCategoryFilterChange: (value: GearCategoryFilter) => void;
  onGearClick: (headfiId: number) => void;
};

export function TopGearListenSection({
  items,
  periodFilter,
  categoryFilter,
  onCategoryFilterChange,
  onGearClick,
}: TopGearListenSectionProps) {
  const leftColumn = items.slice(0, 10);
  const rightColumn = items.slice(10, GEAR_LISTEN_RANKING_LIMIT);
  const periodLabel = formatPeriodLabel(periodFilter);
  const categoryLabel = gearCategoryFilterLabel(categoryFilter);

  return (
    <section
      className="mt-8 rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Headphones className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />
          최다 청취 기기 TOP {GEAR_LISTEN_RANKING_LIMIT}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {GEAR_CATEGORY_FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onCategoryFilterChange(option)}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(categoryFilter === option)}
              aria-pressed={categoryFilter === option}
            >
              {gearCategoryFilterLabel(option)}
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-y-0.5 p-2 sm:grid-cols-2">
          <ul
            className="min-w-0 space-y-0.5 sm:border-r sm:pr-3"
            style={{ borderColor: 'var(--border)' }}
          >
            {leftColumn.map((item, index) => (
              <li key={item.headfiId}>
                <GearRankRow item={item} rank={index + 1} onClick={() => onGearClick(item.headfiId)} />
              </li>
            ))}
          </ul>
          <ul className="min-w-0 space-y-0.5 sm:pl-3">
            {rightColumn.map((item, index) => (
              <li key={item.headfiId}>
                <GearRankRow
                  item={item}
                  rank={index + 11}
                  onClick={() => onGearClick(item.headfiId)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium opacity-80">
            {periodLabel} · {categoryLabel}에 태깅된 청취 기록이 없습니다.
          </p>
          <p className="mt-2 text-sm opacity-60">다른 연도, 월 또는 카테고리를 선택해 보세요.</p>
        </div>
      )}
    </section>
  );
}
