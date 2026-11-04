/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { MonthlyHeadfiActivity } from '@/app/archive/[year]/[month]/_components/MonthlyHeadfiActivity';
import {
  fetchMonthlyHeadfiActivity,
  listHeadfiTrendYears,
  loadHeadfiTrendYearMonths,
  type HeadfiTrendMonthCard,
} from '@/app/archive/lib/headfiTrendData';

const SCROLL_KEY = 'insights-headfi-trend-scroll';

function formatOverlayWon(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return `${Math.round(value).toLocaleString()}원`;
}

function parseYearParam(raw: string | null, fallback: number, allowed: number[]): number {
  const n = parseInt(raw ?? '', 10);
  if (Number.isInteger(n) && (allowed.length === 0 || allowed.includes(n))) return n;
  if (allowed.includes(fallback)) return fallback;
  return allowed[0] ?? fallback;
}

function parseMonthParam(raw: string | null): number | null {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="size-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
      />
    </div>
  );
}

function HeadfiMonthDetail({
  year,
  month,
  openedFromListRef,
}: {
  year: number;
  month: number;
  openedFromListRef: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMonthlyHeadfiActivity>> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchMonthlyHeadfiActivity(year, month)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '불러오지 못했습니다.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const goList = useCallback(() => {
    const listHref = `/insights?tab=trend&hfYear=${year}`;
    if (openedFromListRef.current) {
      openedFromListRef.current = false;
      router.back();
      return;
    }
    router.replace(listHref);
  }, [openedFromListRef, router, year]);

  return (
    <div style={{ color: 'var(--foreground)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goList}
          className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium opacity-85 transition-opacity hover:opacity-100"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
          aria-label="목록으로 돌아가기"
        >
          ← 목록
        </button>
        <p className="text-lg font-medium opacity-85">
          {year}년 {month}월
        </p>
      </div>
      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <p className="mt-6 text-sm opacity-70">{error}</p>
      ) : null}
      {!loading && !error && data ? <MonthlyHeadfiActivity key={`${year}-${month}`} data={data} /> : null}
    </div>
  );
}

export function HeadfiTrendSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nowYear = new Date().getFullYear();

  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(nowYear);
  const [months, setMonths] = useState<HeadfiTrendMonthCard[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [monthsError, setMonthsError] = useState<string | null>(null);
  const restoredScrollRef = useRef(false);
  const openedFromListRef = useRef(false);

  const detailMonth = parseMonthParam(searchParams.get('hfMonth'));
  const yearFromUrl = searchParams.get('hfYear');

  useEffect(() => {
    let cancelled = false;
    setYearsLoading(true);
    void listHeadfiTrendYears()
      .then((years) => {
        if (cancelled) return;
        setYearOptions(years);
        setYearsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setYearOptions([]);
        setYearsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (yearsLoading) return;
    const allowed = yearOptions.length > 0 ? yearOptions : [nowYear];
    setSelectedYear(parseYearParam(yearFromUrl, nowYear, allowed));
  }, [yearFromUrl, yearOptions, yearsLoading, nowYear]);

  useEffect(() => {
    if (yearsLoading || detailMonth != null) return;
    let cancelled = false;
    setMonthsLoading(true);
    setMonthsError(null);
    void loadHeadfiTrendYearMonths(selectedYear)
      .then((rows) => {
        if (cancelled) return;
        setMonths(rows);
        setMonthsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMonths([]);
        setMonthsError(err instanceof Error ? err.message : '불러오지 못했습니다.');
        setMonthsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear, yearsLoading, detailMonth]);

  useEffect(() => {
    if (detailMonth != null || monthsLoading || restoredScrollRef.current) return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw == null) return;
    sessionStorage.removeItem(SCROLL_KEY);
    restoredScrollRef.current = true;
    const y = Number(raw);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [detailMonth, monthsLoading]);

  const selectYear = useCallback(
    (year: number) => {
      setSelectedYear(year);
      router.replace(`/insights?tab=trend&hfYear=${year}`, { scroll: false });
    },
    [router],
  );

  const openMonth = useCallback(
    (month: number) => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      restoredScrollRef.current = false;
      openedFromListRef.current = true;
      router.push(`/insights?tab=trend&hfYear=${selectedYear}&hfMonth=${month}`);
    },
    [router, selectedYear],
  );

  if (detailMonth != null) {
    const detailYear = parseYearParam(yearFromUrl, selectedYear, yearOptions.length > 0 ? yearOptions : [selectedYear]);
    return (
      <HeadfiMonthDetail year={detailYear} month={detailMonth} openedFromListRef={openedFromListRef} />
    );
  }

  return (
    <section
      className="rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--border)' }}
      >
        <Headphones className="size-4 shrink-0 opacity-70" strokeWidth={1.5} />
        헤드파이 추이
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="headfi-trend-year" className="shrink-0 text-xs font-semibold opacity-60">
            연도
          </label>
          {yearsLoading ? (
            <span className="text-xs opacity-50">불러오는 중…</span>
          ) : (
            <select
              id="headfi-trend-year"
              className="select-apple h-[38px] px-3 py-2 text-sm"
              value={selectedYear}
              onChange={(e) => selectYear(Number(e.target.value))}
              aria-label="헤드파이 추이 연도"
            >
              {(yearOptions.length > 0 ? yearOptions : [selectedYear]).map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          )}
        </div>

        {monthsLoading || yearsLoading ? <Spinner /> : null}

        {!monthsLoading && !yearsLoading && monthsError ? (
          <p className="text-center text-sm opacity-60">{monthsError}</p>
        ) : null}

        {!monthsLoading && !yearsLoading && !monthsError && months.length === 0 ? (
          <p className="text-center text-sm opacity-60">이 해에는 기록이 없습니다</p>
        ) : null}

        {!monthsLoading && !yearsLoading && !monthsError && months.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6">
            {months.map((row) => (
              <button
                key={row.month}
                type="button"
                onClick={() => openMonth(row.month)}
                className="group flex cursor-pointer flex-col rounded-xl p-4 text-left transition-all duration-300"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-white">
                  {row.thumbnailUrl ? (
                    <img
                      src={row.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: '#f3f4f6' }}
                      >
                        <Headphones className="size-7" strokeWidth={1.5} style={{ color: '#9ca3af' }} aria-hidden />
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="mb-1 truncate text-sm font-bold leading-tight">
                  {selectedYear}년 {row.month}월
                </h3>
                <p className="text-xs tabular-nums opacity-85">
                  지출 {formatOverlayWon(row.spendTotal)}
                </p>
                <p className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                  판매 {formatOverlayWon(row.salesTotal)}
                </p>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function isHeadfiTrendDetailOpen(searchParams: URLSearchParams): boolean {
  return parseMonthParam(searchParams.get('hfMonth')) != null;
}
