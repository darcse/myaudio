import type { Headfi, HeadfiAccessory, HeadfiSale } from './types';

export type SpendingYearBucket = {
  label: string;
  amount: number;
  gross: number;
  sales: number;
};

export type SpendingMonthBucket = {
  month: number;
  label: string;
  amount: number;
};

export type SpendingCategoryBucket = {
  label: string;
  amount: number;
  count: number;
  countUnit: '개' | '대';
};

export type HeadfiSpendingStats = {
  total: number;
  grossTotal: number;
  totalSales: number;
  unclassified: number;
  yearly: SpendingYearBucket[];
  monthlyByYear: Record<2025 | 2026, SpendingMonthBucket[]>;
  byCategory: SpendingCategoryBucket[];
  byAccessory: SpendingCategoryBucket[];
};

export const SPENDING_CATEGORIES = [
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
  '스피커',
  'DAC',
  'AMP',
  'DAC/AMP',
  'DAP',
  'Source',
  '기타',
] as const;

export const HEADFI_ACCESSORY_CATEGORY_OPTIONS = [
  '헤드폰 케이블',
  '헤드폰 이어패드',
  '이어폰 케이블',
  '이어폰 이어팁',
  '무선 헤드폰 이어패드',
  '무선 헤드폰 액세서리',
  '무선 이어폰 이어팁',
  '무선 이어폰 액세서리',
  '기타 케이블',
  '기타 액세서리',
] as const;

const CATEGORY_COUNT_UNITS: Record<(typeof SPENDING_CATEGORIES)[number], '개' | '대'> = {
  헤드폰: '개',
  이어폰: '개',
  '무선 헤드폰': '개',
  '무선 이어폰': '개',
  스피커: '대',
  DAC: '대',
  AMP: '대',
  'DAC/AMP': '대',
  DAP: '대',
  Source: '대',
  기타: '개',
};

function safeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function sortCategoryRows(rows: SpendingCategoryBucket[]): SpendingCategoryBucket[] {
  return rows.filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount);
}

export function formatCategorySpendingLabel(row: SpendingCategoryBucket): string {
  return `${row.label} (${row.count}${row.countUnit})`;
}

export function headfiItemSpending(item: Pick<Headfi, 'price'>): number {
  return safeAmount(item.price);
}

function parsePurchaseYear(purchaseDate: string | null | undefined): number | null {
  const trimmed = purchaseDate?.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

type YearParts = {
  gross: number;
  sales: number;
};

type YearLedger = {
  through2024: YearParts;
  year2025: YearParts;
  year2026: YearParts;
  after2026: YearParts;
  unclassified: YearParts;
};

function emptyYearParts(): YearParts {
  return { gross: 0, sales: 0 };
}

function emptyYearLedger(): YearLedger {
  return {
    through2024: emptyYearParts(),
    year2025: emptyYearParts(),
    year2026: emptyYearParts(),
    after2026: emptyYearParts(),
    unclassified: emptyYearParts(),
  };
}

function yearPartsFor(ledger: YearLedger, year: number | null): YearParts {
  if (year == null) return ledger.unclassified;
  if (year <= 2024) return ledger.through2024;
  if (year === 2025) return ledger.year2025;
  if (year === 2026) return ledger.year2026;
  return ledger.after2026;
}

function toYearBucket(label: string, parts: YearParts): SpendingYearBucket {
  return {
    label,
    amount: parts.gross - parts.sales,
    gross: parts.gross,
    sales: parts.sales,
  };
}

function buildMonthlyBuckets(
  entries: { purchase_date: string | null | undefined; amount: number }[],
  year: 2025 | 2026,
): SpendingMonthBucket[] {
  const amounts = Array.from({ length: 12 }, () => 0);
  for (const entry of entries) {
    const trimmed = entry.purchase_date?.trim();
    if (!trimmed) continue;
    const itemYear = parsePurchaseYear(trimmed);
    if (itemYear !== year) continue;
    const month = Number.parseInt(trimmed.slice(5, 7), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    amounts[month - 1] += safeAmount(entry.amount);
  }
  return amounts.map((amount, index) => ({
    month: index + 1,
    label: `${index + 1}월`,
    amount,
  }));
}

type AccessoryContribution = {
  label: string;
  amount: number;
  count: number;
};

function headfiAccessorySpending(item: Pick<HeadfiAccessory, 'price'>): number {
  return safeAmount(item.price);
}

function getIndependentAccessoryContributions(item: HeadfiAccessory): AccessoryContribution[] {
  const category = item.category?.trim() || '기타 액세서리';
  const amount = safeAmount(item.price);
  return [{ label: category, amount, count: 1 }];
}

function headfiSaleAmount(item: Pick<HeadfiSale, 'price'>): number {
  return safeAmount(item.price);
}

export function buildHeadfiSpendingStats(
  library: Headfi[],
  accessories: HeadfiAccessory[] = [],
  sales: HeadfiSale[] = [],
): HeadfiSpendingStats {
  let total = 0;
  const ledger = emptyYearLedger();
  const monthlyEntries: { purchase_date: string | null | undefined; amount: number }[] = [];

  for (const item of library) {
    const amount = headfiItemSpending(item);
    total += amount;
    monthlyEntries.push({ purchase_date: item.purchase_date, amount });
    yearPartsFor(ledger, parsePurchaseYear(item.purchase_date)).gross += amount;
  }

  for (const item of accessories) {
    const amount = headfiAccessorySpending(item);
    total += amount;
    monthlyEntries.push({ purchase_date: item.purchase_date, amount });
    yearPartsFor(ledger, parsePurchaseYear(item.purchase_date)).gross += amount;
  }

  const grossTotal = total;
  let totalSales = 0;

  for (const item of sales) {
    const amount = headfiSaleAmount(item);
    if (amount <= 0) continue;
    totalSales += amount;
    total -= amount;
    yearPartsFor(ledger, parsePurchaseYear(item.sale_date)).sales += amount;
  }

  const unclassified = ledger.unclassified.gross - ledger.unclassified.sales;
  const yearly: SpendingYearBucket[] = [
    toYearBucket('~2024', ledger.through2024),
    toYearBucket('2025', ledger.year2025),
    toYearBucket('2026', ledger.year2026),
  ];
  if (ledger.after2026.gross > 0 || ledger.after2026.sales > 0) {
    yearly.push(toYearBucket('2027+', ledger.after2026));
  }
  if (ledger.unclassified.gross !== 0 || ledger.unclassified.sales !== 0) {
    yearly.push(toYearBucket('미분류', ledger.unclassified));
  }

  const categoryTotals = new Map<string, number>(
    SPENDING_CATEGORIES.map((category) => [category, 0]),
  );
  const categoryCounts = new Map<string, number>(
    SPENDING_CATEGORIES.map((category) => [category, 0]),
  );
  const accessoryTotals = new Map<string, { amount: number; count: number }>();

  for (const item of library) {
    const category = item.category?.trim();
    if (category && categoryTotals.has(category)) {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + safeAmount(item.price));
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  for (const item of accessories) {
    for (const contribution of getIndependentAccessoryContributions(item)) {
      const prev = accessoryTotals.get(contribution.label) ?? { amount: 0, count: 0 };
      accessoryTotals.set(contribution.label, {
        amount: prev.amount + contribution.amount,
        count: prev.count + contribution.count,
      });
    }
  }

  const byCategory = sortCategoryRows(
    SPENDING_CATEGORIES.map((category) => ({
      label: category,
      amount: categoryTotals.get(category) ?? 0,
      count: categoryCounts.get(category) ?? 0,
      countUnit: CATEGORY_COUNT_UNITS[category],
    })),
  );

  const byAccessory = sortCategoryRows(
    [...accessoryTotals.entries()].map(([label, row]) => ({
      label,
      amount: row.amount,
      count: row.count,
      countUnit: '개' as const,
    })),
  );

  return {
    total,
    grossTotal,
    totalSales,
    unclassified,
    yearly,
    monthlyByYear: {
      2025: buildMonthlyBuckets(monthlyEntries, 2025),
      2026: buildMonthlyBuckets(monthlyEntries, 2026),
    },
    byCategory,
    byAccessory,
  };
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
