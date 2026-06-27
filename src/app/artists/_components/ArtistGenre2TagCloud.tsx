'use client';

import type { Genre2Tag } from '../_hooks/useArtistFilters';

type ArtistGenre2TagCloudProps = {
  tags: Genre2Tag[];
  selected: string;
  onSelect: (genre: string) => void;
};

function tagFontSize(count: number, maxCount: number): string {
  if (maxCount <= 1) return '11px';
  const ratio = count / maxCount;
  if (ratio >= 0.75) return '13px';
  if (ratio >= 0.45) return '12px';
  return '11px';
}

export function ArtistGenre2TagCloud({ tags, selected, onSelect }: ArtistGenre2TagCloudProps) {
  const maxCount = tags.reduce((max, tag) => Math.max(max, tag.count), 0);

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onSelect('전체')}
        className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
        style={{
          fontSize: '11px',
          background: selected === '전체' ? 'var(--foreground)' : 'var(--badge-bg)',
          color: selected === '전체' ? 'var(--background)' : 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
        aria-pressed={selected === '전체'}
      >
        전체
      </button>
      {tags.map((tag) => {
        const active = selected === tag.label;
        return (
          <button
            key={tag.label}
            type="button"
            onClick={() => onSelect(tag.label)}
            className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
            style={{
              fontSize: tagFontSize(tag.count, maxCount),
              background: active ? 'var(--foreground)' : 'var(--badge-bg)',
              color: active ? 'var(--background)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
            aria-pressed={active}
          >
            {tag.label} ({tag.count})
          </button>
        );
      })}
    </div>
  );
}
