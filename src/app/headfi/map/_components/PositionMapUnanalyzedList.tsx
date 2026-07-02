'use client';

import { Loader2 } from 'lucide-react';
import type { Headfi } from '@/app/headfi/types';

type PositionMapUnanalyzedListProps = {
  items: Headfi[];
  isAuthenticated: boolean | null;
  loadingIds: Set<number>;
  onAnalyze: (id: number) => void;
};

export function PositionMapUnanalyzedList({
  items,
  isAuthenticated,
  loadingIds,
  onAnalyze,
}: PositionMapUnanalyzedListProps) {
  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <h2 className="section-title mb-3 text-base">미분석 기기</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const loading = loadingIds.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!isAuthenticated || loading}
                onClick={() => onAnalyze(item.id)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="opacity-70">{item.brand}</span>{' '}
                    <span className="font-semibold">{item.model}</span>
                    <span className="mt-0.5 block text-[11px] opacity-50">
                      {loading ? '분석 중…' : '클릭하여 분석'}
                    </span>
                  </div>
                  {loading ? (
                    <Loader2 className="size-4 shrink-0 animate-spin opacity-70" strokeWidth={2} />
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
