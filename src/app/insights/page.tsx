import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AlbumStatsContent } from '@/app/albums/stats/_components/AlbumStatsContent';
import { HeadfiUsageStatsContent } from '@/app/headfi/stats/_components/HeadfiUsageStatsContent';
import { GenreStatsContent } from './_components/GenreStatsContent';
import { InsightsTabNav, type InsightsTabId } from './_components/InsightsTabNav';

type Props = {
  searchParams: Promise<{ tab?: string; year?: string; hfYear?: string; hfMonth?: string }>;
};

function normalizeTab(raw: string | undefined): InsightsTabId | 'archive' {
  if (raw === 'trend' || raw === 'usage' || raw === 'genre' || raw === 'ranking' || raw === 'archive') {
    return raw;
  }
  return 'ranking';
}

function LoadingFallback() {
  return <div className="py-16 text-center text-sm opacity-70">로딩 중...</div>;
}

export default async function InsightsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = normalizeTab(sp.tab);

  if (tab === 'archive') {
    const year = sp.year ?? sp.hfYear;
    const qs = new URLSearchParams({ tab: 'trend' });
    if (year) qs.set('hfYear', year);
    redirect(`/insights?${qs.toString()}`);
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <InsightsTabNav activeTab={tab} />

      {tab === 'ranking' ? (
        <Suspense fallback={<LoadingFallback />}>
          <AlbumStatsContent embedded fixedTab="ranking" />
        </Suspense>
      ) : null}

      {tab === 'trend' ? (
        <Suspense fallback={<LoadingFallback />}>
          <AlbumStatsContent embedded fixedTab="trend" />
        </Suspense>
      ) : null}

      {tab === 'usage' ? (
        <Suspense fallback={<LoadingFallback />}>
          <HeadfiUsageStatsContent embedded />
        </Suspense>
      ) : null}

      {tab === 'genre' ? (
        <Suspense fallback={<LoadingFallback />}>
          <GenreStatsContent />
        </Suspense>
      ) : null}
    </div>
  );
}
