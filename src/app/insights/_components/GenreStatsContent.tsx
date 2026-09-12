'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Mic2, Music2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import type { Album } from '@/app/albums/types';
import {
  buildArtistTypeListenRankings,
  buildGenreListenRankings,
  clampListenPeriodFilter,
  filterHistoryByPeriod,
  formatPeriodLabel,
  formatStatsMonthOptionLabel,
  getDefaultListenPeriodFilter,
  LISTEN_RANKING_LIMIT,
  listStatsMonths,
  listStatsYears,
  type LabelListenRankItem,
  type ListenPeriodFilter,
  type ListenPeriodMonth,
} from '@/app/albums/stats/albumListenStats';

type HistoryRow = { album_id: number | null; listened_at: string | null };
type AlbumLabelRow = Pick<Album, 'id' | 'genre1' | 'artist_type'>;

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

function RankingPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="flex min-h-[20rem] flex-col rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--border)' }}
      >
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function LabelRankRow({ item }: { item: LabelListenRankItem }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5">
      <RankBadge rank={item.rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.label}</p>
        <p className="mt-0.5 text-xs opacity-60 tabular-nums">앨범 {item.albumCount}장</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{item.listenCount}회</span>
    </div>
  );
}

export function GenreStatsContent() {
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<AlbumLabelRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createClient();
      const [albumRes, historyRes] = await Promise.all([
        client.from('album').select('id, genre1, artist_type'),
        client.from('album_listen_history').select('album_id, listened_at'),
      ]);
      const errors: string[] = [];
      if (albumRes.error) {
        errors.push('앨범 목록을 불러오지 못했습니다.');
        setAlbums([]);
      } else {
        setAlbums((albumRes.data ?? []) as AlbumLabelRow[]);
      }
      if (historyRes.error) {
        errors.push('청취 기록을 불러오지 못했습니다.');
        setHistoryRows([]);
      } else {
        setHistoryRows((historyRes.data ?? []) as HistoryRow[]);
      }
      if (errors.length > 0) {
        const message = errors.join(' ');
        setLoadError(message);
        toast.error(message);
      }
    } catch {
      const message = '장르 통계를 불러오지 못했습니다.';
      setLoadError(message);
      toast.error(message);
      setAlbums([]);
      setHistoryRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [isAuthenticated, fetchData]);

  const yearOptions = useMemo(() => listStatsYears(), []);
  const monthOptions = useMemo(() => listStatsMonths(periodFilter.year), [periodFilter.year]);

  const filteredHistoryRows = useMemo(
    () => filterHistoryByPeriod(historyRows, periodFilter),
    [historyRows, periodFilter],
  );

  const genreRanking = useMemo(
    () => buildGenreListenRankings(albums, filteredHistoryRows),
    [albums, filteredHistoryRows],
  );

  const artistTypeRanking = useMemo(
    () => buildArtistTypeListenRankings(albums, filteredHistoryRows),
    [albums, filteredHistoryRows],
  );

  const hasAnyListenData = historyRows.length > 0;
  const hasPeriodListenData = filteredHistoryRows.length > 0;

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year, month: prev.month }));
  };

  const handleMonthChange = (month: ListenPeriodMonth) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year: prev.year, month }));
  };

  if (isAuthenticated !== true) {
    return <p className="py-12 text-center text-sm opacity-70">로그인 후 장르 통계를 확인할 수 있습니다.</p>;
  }

  return (
    <div className="relative">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : (
        <>
          {loadError ? <p className="mb-4 text-sm opacity-70">{loadError}</p> : null}

          <section
            className="mb-6 rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <div
              className="rounded-t-xl border-b px-4 py-3 sm:px-5"
              style={{ borderColor: 'var(--border)', background: 'var(--badge-bg)' }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <Trophy className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                장르 통계
              </h2>
            </div>
            <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold opacity-60">연도</span>
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearChange(year)}
                      className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                      style={filterToggleStyle(periodFilter.year === year)}
                      aria-pressed={periodFilter.year === year}
                    >
                      {year}년
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold opacity-60">월</span>
                  {monthOptions.map((month) => (
                    <button
                      key={String(month)}
                      type="button"
                      onClick={() => handleMonthChange(month)}
                      className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                      style={filterToggleStyle(periodFilter.month === month)}
                      aria-pressed={periodFilter.month === month}
                    >
                      {formatStatsMonthOptionLabel(month)}
                    </button>
                  ))}
                </div>
              </div>
              {hasPeriodListenData ? (
                <p className="text-sm font-semibold opacity-90">
                  {formatPeriodLabel(periodFilter)} · 청취 {filteredHistoryRows.length}회
                </p>
              ) : null}
            </div>
          </section>

          {!hasAnyListenData ? (
            <div
              className="rounded-xl border px-6 py-16 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium opacity-80">아직 청취 기록이 없습니다.</p>
              <p className="mt-2 text-sm opacity-60">청취 이력을 기록하면 장르·아티스트 구분 랭킹이 표시됩니다.</p>
            </div>
          ) : !hasPeriodListenData ? (
            <div
              className="rounded-xl border px-6 py-16 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium opacity-80">
                {formatPeriodLabel(periodFilter)}에 청취 기록이 없습니다.
              </p>
              <p className="mt-2 text-sm opacity-60">다른 연도나 월을 선택해 보세요.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <RankingPanel
                title={`최다 청취 장르 TOP ${LISTEN_RANKING_LIMIT}`}
                icon={<Music2 className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              >
                {genreRanking.length > 0 ? (
                  <ul className="space-y-0.5">
                    {genreRanking.map((item) => (
                      <li key={item.label}>
                        <LabelRankRow item={item} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-8 text-center text-sm opacity-60">
                    장르1이 설정된 앨범의 청취 기록이 없습니다.
                  </p>
                )}
              </RankingPanel>
              <RankingPanel
                title={`최다 청취 아티스트 구분 TOP ${LISTEN_RANKING_LIMIT}`}
                icon={<Mic2 className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              >
                {artistTypeRanking.length > 0 ? (
                  <ul className="space-y-0.5">
                    {artistTypeRanking.map((item) => (
                      <li key={item.label}>
                        <LabelRankRow item={item} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-8 text-center text-sm opacity-60">
                    아티스트 구분이 설정된 앨범의 청취 기록이 없습니다.
                  </p>
                )}
              </RankingPanel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
