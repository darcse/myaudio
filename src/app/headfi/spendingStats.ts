import type { Headfi } from './types';

export type SpendingYearBucket = {
  label: string;
  amount: number;
};

export type SpendingMonthBucket = {
  month: number;
  label: string;
  amount: number;
};

export type HeadfiSpendingStats = {
  total: number;
  unclassified: number;
  yearly: SpendingYearBucket[];
  monthlyByYear: Record<2025 | 2026, SpendingMonthBucket[]>;
};

export function headfiItemSpending(
  item: Pick<Headfi, 'price' | 'cable_price' | 'eartip_price'>,
): number {
  const price = item.price ?? 0;
  const cablePrice = item.cable_price ?? 0;
  const eartipPrice = item.eartip_price ?? 0;
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  const safeCable = Number.isFinite(Number(cablePrice)) ? Number(cablePrice) : 0;
  const safeEartip = Number.isFinite(Number(eartipPrice)) ? Number(eartipPrice) : 0;
  return safePrice + safeCable + safeEartip;
}

function parsePurchaseYear(purchaseDate: string | null | undefined): number | null {
  const trimmed = purchaseDate?.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function buildMonthlyBuckets(items: Headfi[], year: 2025 | 2026): SpendingMonthBucket[] {
  const amounts = Array.from({ length: 12 }, () => 0);
  for (const item of items) {
    const trimmed = item.purchase_date?.trim();
    if (!trimmed) continue;
    const itemYear = parsePurchaseYear(trimmed);
    if (itemYear !== year) continue;
    const month = Number.parseInt(trimmed.slice(5, 7), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    amounts[month - 1] += headfiItemSpending(item);
  }
  return amounts.map((amount, index) => ({
    month: index + 1,
    label: `${index + 1}월`,
    amount,
  }));
}

export function buildHeadfiSpendingStats(library: Headfi[]): HeadfiSpendingStats {
  let total = 0;
  let unclassified = 0;
  let through2024 = 0;
  let year2025 = 0;
  let year2026 = 0;
  let after2026 = 0;

  for (const item of library) {
    const amount = headfiItemSpending(item);
    total += amount;
    const year = parsePurchaseYear(item.purchase_date);
    if (year == null) {
      unclassified += amount;
      continue;
    }
    if (year <= 2024) {
      through2024 += amount;
    } else if (year === 2025) {
      year2025 += amount;
    } else if (year === 2026) {
      year2026 += amount;
    } else {
      after2026 += amount;
    }
  }

  const yearly: SpendingYearBucket[] = [
    { label: '~2024', amount: through2024 },
    { label: '2025', amount: year2025 },
    { label: '2026', amount: year2026 },
  ];
  if (after2026 > 0) {
    yearly.push({ label: '2027+', amount: after2026 });
  }

  return {
    total,
    unclassified,
    yearly,
    monthlyByYear: {
      2025: buildMonthlyBuckets(library, 2025),
      2026: buildMonthlyBuckets(library, 2026),
    },
  };
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
