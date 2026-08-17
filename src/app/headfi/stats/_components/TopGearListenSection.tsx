'use client';

import { Headphones } from 'lucide-react';
import type { GearCategoryFilter, GearListenRankItem, ListenPeriodFilter } from '@/app/albums/stats/albumListenStats';
import {
  GEAR_CATEGORY_FILTER_OPTIONS,
  GEAR_LISTEN_RANKING_LIMIT,
  gearCategoryFilterLabel,
  formatPeriodLabel,
} from '@/app/albums/stats/albumListenStats';

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
  title: string;
  icon?: React.ReactNode;
  items: GearListenRankItem[];
  periodFilter: ListenPeriodFilter;
  categoryFilter?: GearCategoryFilter;
  onCategoryFilterChange?: (value: GearCategoryFilter) => void;
  onGearClick: (headfiId: number) => void;
  emptyDetail?: string;
};

export function TopGearListenSection({
  title,
  icon,
  items,
  periodFilter,
  categoryFilter,
  onCategoryFilterChange,
  onGearClick,
  emptyDetail,
}: TopGearListenSectionProps) {
  const periodLabel = formatPeriodLabel(periodFilter);
  const categoryLabel =
    categoryFilter != null ? gearCategoryFilterLabel(categoryFilter) : null;

  return (
    <section
      className="flex min-h-[20rem] flex-col rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex min-h-[4.5rem] items-center justify-between gap-2 border-b px-4 py-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon ?? <Headphones className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
          <span className="truncate">{title}</span>
        </div>
        {categoryFilter != null && onCategoryFilterChange ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
            {GEAR_CATEGORY_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onCategoryFilterChange(option)}
                className="shrink-0 rounded-full px-2 py-1 font-medium transition-colors"
                style={filterToggleStyle(categoryFilter === option)}
                aria-pressed={categoryFilter === option}
              >
                {gearCategoryFilterLabel(option)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length > 0 ? (
          <ul className="space-y-0.5">
            {items.slice(0, GEAR_LISTEN_RANKING_LIMIT).map((item, index) => (
              <li key={item.headfiId}>
                <GearRankRow item={item} rank={index + 1} onClick={() => onGearClick(item.headfiId)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-2 py-8 text-center">
            <p className="text-sm font-medium opacity-80">
              {emptyDetail ??
                (categoryLabel
                  ? `${periodLabel} · ${categoryLabel}에 태깅된 청취 기록이 없습니다.`
                  : `${periodLabel}에 태깅된 청취 기록이 없습니다.`)}
            </p>
            <p className="mt-2 text-sm opacity-60">
              {categoryLabel ? '다른 연도, 월 또는 카테고리를 선택해 보세요.' : '다른 연도나 월을 선택해 보세요.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
