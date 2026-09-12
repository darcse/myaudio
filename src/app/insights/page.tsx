import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/supabase/server';
import { ArchiveLoginPrompt } from '@/app/archive/_components/ArchiveLoginPrompt';
import { ArchiveYearView } from '@/app/archive/_components/ArchiveYearView';
import { loadArchiveYearStats } from '@/app/archive/yearStats';
import { AlbumStatsContent } from '@/app/albums/stats/_components/AlbumStatsContent';
import { HeadfiUsageStatsContent } from '@/app/headfi/stats/_components/HeadfiUsageStatsContent';
import { GenreStatsContent } from './_components/GenreStatsContent';
import { InsightsTabNav, type InsightsTabId } from './_components/InsightsTabNav';

type Props = {
  searchParams: Promise<{ tab?: string; year?: string }>;
};

function normalizeTab(raw: string | undefined): InsightsTabId {
  if (raw === 'trend' || raw === 'usage' || raw === 'genre' || raw === 'archive' || raw === 'ranking') {
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
  const maxY = new Date().getFullYear();
  const rawYear = parseInt(sp.year ?? '', 10);
  const archiveYear = Number.isFinite(rawYear) ? Math.min(Math.max(rawYear, 2026), maxY) : maxY;

  let archiveMonths: Awaited<ReturnType<typeof loadArchiveYearStats>> | null = null;
  let archiveAuthed = false;
  if (tab === 'archive') {
    const user = await getCurrentUser();
    archiveAuthed = !!user;
    if (user) {
      archiveMonths = await loadArchiveYearStats(archiveYear);
    }
  }

  const yearList: number[] = [];
  for (let y = 2026; y <= maxY; y++) yearList.push(y);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <InsightsTabNav activeTab={tab} archiveYear={archiveYear} />

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

      {tab === 'archive' ? (
        archiveAuthed && archiveMonths ? (
          <ArchiveYearView
            year={archiveYear}
            yearList={yearList}
            months={archiveMonths}
            yearHref={(yy) => `/insights?tab=archive&year=${yy}`}
          />
        ) : (
          <ArchiveLoginPrompt />
        )
      ) : null}
    </div>
  );
}
