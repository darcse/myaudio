'use client';

export type TagCloudItem = {
  label: string;
  count: number;
};

type TagCloudProps = {
  items: readonly TagCloudItem[];
  selected: string;
  onSelect: (label: string) => void;
  showAllChip?: boolean;
  allLabel?: string;
  emptyMessage?: string;
};

function tagFontSize(count: number, maxCount: number): string {
  if (maxCount <= 1) return '11px';
  const ratio = count / maxCount;
  if (ratio >= 0.75) return '13px';
  if (ratio >= 0.45) return '12px';
  return '11px';
}

export function TagCloud({
  items,
  selected,
  onSelect,
  showAllChip = true,
  allLabel = '전체',
  emptyMessage,
}: TagCloudProps) {
  const maxCount = items.reduce((max, item) => Math.max(max, item.count), 0);

  return (
    <div className="flex flex-wrap gap-1.5">
      {showAllChip ? (
        <button
          type="button"
          onClick={() => onSelect(allLabel)}
          className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
          style={{
            fontSize: '11px',
            background: selected === allLabel ? 'var(--foreground)' : 'var(--badge-bg)',
            color: selected === allLabel ? 'var(--background)' : 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
          aria-pressed={selected === allLabel}
        >
          {allLabel}
        </button>
      ) : null}
      {items.length === 0 ? (
        emptyMessage ? (
          <p className="px-1 py-1 text-sm opacity-60">{emptyMessage}</p>
        ) : null
      ) : (
        items.map((item) => {
          const active = selected === item.label;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.label)}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={{
                fontSize: tagFontSize(item.count, maxCount),
                background: active ? 'var(--foreground)' : 'var(--badge-bg)',
                color: active ? 'var(--background)' : 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
              aria-pressed={active}
            >
              {item.label} ({item.count})
            </button>
          );
        })
      )}
    </div>
  );
}
