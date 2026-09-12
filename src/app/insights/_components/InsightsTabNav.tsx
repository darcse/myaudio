'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export type InsightsTabId = 'ranking' | 'trend' | 'usage' | 'genre' | 'archive';

const TABS: { id: InsightsTabId; label: string }[] = [
  { id: 'ranking', label: '청취 랭킹' },
  { id: 'trend', label: '청취 추이' },
  { id: 'usage', label: '기기 사용 통계' },
  { id: 'genre', label: '장르 통계' },
  { id: 'archive', label: 'Archive' },
];

function tabHref(id: InsightsTabId, archiveYear?: number): string {
  if (id === 'archive' && archiveYear != null) {
    return `/insights?tab=archive&year=${archiveYear}`;
  }
  return `/insights?tab=${id}`;
}

function tabButtonClass(active: boolean): string {
  return `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? '' : 'opacity-70 hover:opacity-100'
  }`;
}

type InsightsTabNavProps = {
  activeTab: InsightsTabId;
  archiveYear?: number;
};

export function InsightsTabNav({ activeTab, archiveYear }: InsightsTabNavProps) {
  return (
    <div
      className="mb-6 flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: 'var(--border)' }}
    >
      <h1 className="page-title flex shrink-0 items-center gap-2">
        <BarChart3 className="size-7 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
        Insights
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id, archiveYear)}
              className={tabButtonClass(active)}
              style={{
                background: active ? 'var(--foreground)' : 'var(--badge-bg)',
                color: active ? 'var(--background)' : 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
