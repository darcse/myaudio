import type { PostgrestError } from '@supabase/supabase-js';

export const SUPABASE_PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
  count?: number | null;
};

export type FetchAllRowsQuery<T> = {
  range: (from: number, to: number) => PromiseLike<PageResult<T>>;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string },
  ) => FetchAllRowsQuery<T>;
};

export type FetchAllRowsOptions = {
  /** 기본 true. 페이지 간 안정성을 위해 id 오름차순을 마지막 정렬로 붙인다. */
  orderById?: boolean;
};

/**
 * PostgREST 기본 1,000행 제한을 넘어 전체 행을 가져온다.
 * 첫 페이지에 count: 'exact'를 쓰고, 나머지는 Promise.all로 병렬 요청한다.
 */
export async function fetchAllRows<T>(
  buildQuery: (args: { countExact: boolean }) => FetchAllRowsQuery<T>,
  options?: FetchAllRowsOptions,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const orderById = options?.orderById !== false;

  const prepare = (countExact: boolean): FetchAllRowsQuery<T> => {
    const query = buildQuery({ countExact });
    return orderById ? query.order('id', { ascending: true }) : query;
  };

  const first = await prepare(true).range(0, SUPABASE_PAGE_SIZE - 1);
  if (first.error) {
    return { data: [], error: first.error };
  }

  const rows = [...(first.data ?? [])];
  const total = first.count ?? rows.length;
  if (total <= SUPABASE_PAGE_SIZE) {
    return { data: rows, error: null };
  }

  const pageStarts: number[] = [];
  for (let from = SUPABASE_PAGE_SIZE; from < total; from += SUPABASE_PAGE_SIZE) {
    pageStarts.push(from);
  }

  const pages = await Promise.all(
    pageStarts.map((from) => {
      const to = Math.min(from + SUPABASE_PAGE_SIZE - 1, total - 1);
      return prepare(false).range(from, to);
    }),
  );

  for (const page of pages) {
    if (page.error) {
      return { data: [], error: page.error };
    }
    rows.push(...(page.data ?? []));
  }

  return { data: rows, error: null };
}

export function selectCountOptions(countExact: boolean): { count: 'exact' } | Record<string, never> {
  return countExact ? { count: 'exact' } : {};
}
