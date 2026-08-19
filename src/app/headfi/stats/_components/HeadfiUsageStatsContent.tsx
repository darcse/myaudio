'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Cpu, Headphones, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import { HeadfiPageHeader, HeadfiSubHeader } from '@/app/headfi/_components/HeadfiPageHeader';
import type { Headfi } from '@/app/headfi/types';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import {
  buildDacAmpListenRankings,
  buildGearListenRankings,
  buildWeeklyHotReceiverRankings,
  clampListenPeriodFilter,
  filterGearHistoryByPeriod,
  formatPeriodLabel,
  formatStatsMonthOptionLabel,
  GEAR_LISTEN_RANKING_LIMIT,
  getDefaultListenPeriodFilter,
  getRollingSevenDayRange,
  listStatsMonths,
  listStatsYears,
  type GearCategoryFilter,
  type GearListenHistoryRow,
  type GearSummary,
  type ListenPeriodFilter,
  type ListenPeriodMonth,
} from '@/app/albums/stats/albumListenStats';
import { TopGearListenSection } from './TopGearListenSection';
import { WeeklyHotReceiversSection } from './WeeklyHotReceiversSection';

function filterToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

export function HeadfiUsageStatsContent() {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<GearListenHistoryRow[]>([]);
  const [gearById, setGearById] = useState<Map<number, GearSummary>>(() => new Map());
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);
  const [gearCategoryFilter, setGearCategoryFilter] = useState<GearCategoryFilter>('all');
  const [now, setNow] = useState(() => new Date());
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [registeredAlbums, setRegisteredAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{
    id: number;
    brand: string;
    model: string;
  } | null>(null);
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string; image_url?: string | null }[]
  >([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createClient();
      const [historyRes, headfiRes] = await Promise.all([
        client
          .from('album_listen_history')
          .select('album_id, listened_at, headphone_id, dac_amp_id, dac_amp2_id'),
        client.from('headfi').select('id, brand, model, category, image_url'),
      ]);
      const errors: string[] = [];
      if (historyRes.error) {
        errors.push('청취 기록을 불러오지 못했습니다.');
        setHistoryRows([]);
      } else {
        setHistoryRows((historyRes.data ?? []) as GearListenHistoryRow[]);
      }
      if (headfiRes.error) {
        errors.push('기기 목록을 불러오지 못했습니다.');
        setGearById(new Map());
      } else {
        const map = new Map<number, GearSummary>();
        for (const row of headfiRes.data ?? []) {
          map.set(row.id, {
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
            category: row.category || '',
            image_url: row.image_url ?? null,
          });
        }
        setGearById(map);
      }
      if (errors.length > 0) {
        setLoadError(errors.join(' '));
        toast.error(errors[0]);
      }
    } catch {
      const message = '사용 통계를 불러오지 못했습니다.';
      setLoadError(message);
      toast.error(message);
      setHistoryRows([]);
      setGearById(new Map());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!viewingHeadfi?.id) {
      setRegisteredAlbums([]);
      return;
    }
    const id = viewingHeadfi.id;
    void createClient()
      .from('album')
      .select('id, album_name, artist, cover_image_url, release_date')
      .contains('manual_recommended_headphone_ids', [id])
      .then(({ data }) => {
        const rows = data || [];
        rows.sort(
          (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
        );
        setRegisteredAlbums(rows);
      });
  }, [viewingHeadfi?.id]);

  useEffect(() => {
    if (
      !viewingHeadfi ||
      !['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingHeadfi.category)
    ) {
      setMatchedMatchingDevice(null);
      return;
    }
    const m = viewingHeadfi.matching;
    if (!m || m === ' ' || !/^\d+$/.test(String(m))) {
      setMatchedMatchingDevice(null);
      return;
    }
    createClient()
      .from('headfi')
      .select('id,brand,model')
      .eq('id', Number(m))
      .single()
      .then(({ data }) => {
        setMatchedMatchingDevice(data ? { id: data.id, brand: data.brand || '', model: data.model || '' } : null);
      });
  }, [viewingHeadfi?.id, viewingHeadfi?.category, viewingHeadfi?.matching]);

  useEffect(() => {
    if (!viewingHeadfi?.id || !isDacAmpDapCategory(viewingHeadfi.category)) {
      setMatchedHeadphones([]);
      return;
    }
    const idStr = String(viewingHeadfi.id);
    createClient()
      .from('headfi')
      .select('id,brand,model,category,image_url')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', idStr)
      .order('brand')
      .order('model')
      .then(({ data }) => setMatchedHeadphones(data || []));
  }, [viewingHeadfi?.id, viewingHeadfi?.category]);

  const yearOptions = useMemo(() => listStatsYears(), []);
  const monthOptions = useMemo(() => listStatsMonths(periodFilter.year), [periodFilter.year]);
  const filteredHistoryRows = useMemo(
    () => filterGearHistoryByPeriod(historyRows, periodFilter),
    [historyRows, periodFilter],
  );
  const receiverRanking = useMemo(
    () => buildGearListenRankings(gearById, filteredHistoryRows, gearCategoryFilter),
    [gearById, filteredHistoryRows, gearCategoryFilter],
  );
  const dacAmpRanking = useMemo(
    () => buildDacAmpListenRankings(gearById, filteredHistoryRows),
    [gearById, filteredHistoryRows],
  );
  const weekRange = useMemo(() => getRollingSevenDayRange(now), [now]);
  const weeklyHotReceivers = useMemo(
    () => buildWeeklyHotReceiverRankings(gearById, historyRows, now),
    [gearById, historyRows, now],
  );

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year, month: prev.month }));
  };
  const handleMonthChange = (month: ListenPeriodMonth) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year: prev.year, month }));
  };

  const openHeadfiById = useCallback(async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(data as Headfi);
  }, []);

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <HeadfiPageHeader activeNav="usage" isAuthenticated={isAuthenticated} showDivider />
      <HeadfiSubHeader icon={BarChart3} title="사용 통계" />

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

          <WeeklyHotReceiversSection
            items={weeklyHotReceivers}
            weekRange={weekRange}
            onGearClick={(id) => void openHeadfiById(id)}
          />

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
                사용 랭킹
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
              <p className="text-xs opacity-60">{formatPeriodLabel(periodFilter)} 기준</p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopGearListenSection
              title={`최다 사용 리시버 TOP ${GEAR_LISTEN_RANKING_LIMIT}`}
              icon={<Headphones className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              items={receiverRanking}
              periodFilter={periodFilter}
              categoryFilter={gearCategoryFilter}
              onCategoryFilterChange={setGearCategoryFilter}
              onGearClick={(id) => void openHeadfiById(id)}
            />

            <TopGearListenSection
              title={`최다 사용 DAC/AMP/DAP TOP ${GEAR_LISTEN_RANKING_LIMIT}`}
              icon={<Cpu className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />}
              items={dacAmpRanking}
              periodFilter={periodFilter}
              onGearClick={(id) => void openHeadfiById(id)}
              emptyDetail={`${formatPeriodLabel(periodFilter)}에 태깅된 DAC/AMP/DAP 청취 기록이 없습니다.`}
            />
          </div>
        </>
      )}

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={registeredAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={() => setViewingHeadfi(null)}
          onEdit={() => {
            const id = viewingHeadfi.id;
            setViewingHeadfi(null);
            router.push(`/headfi?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={(id) => {
            setViewingHeadfi(null);
            router.push(`/albums?view=${id}`);
          }}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}
