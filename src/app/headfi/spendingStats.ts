import type { Headfi, HeadfiAccessory, HeadfiSale } from './types';

export type SpendingYearBucket = {
  label: string;
  amount: number;
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
  'DAC 액세서리',
  'AMP 액세서리',
  'DAC/AMP 액세서리',
  'DAP 액세서리',
  'Source 액세서리',
  '스피커 액세서리',
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

export function headfiItemSpending(
  item: Pick<Headfi, 'price' | 'cable_price' | 'eartip_price' | 'accessory_price'>,
): number {
  const price = item.price ?? 0;
  const cablePrice = item.cable_price ?? 0;
  const eartipPrice = item.eartip_price ?? 0;
  const accessoryPrice = item.accessory_price ?? 0;
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  const safeCable = Number.isFinite(Number(cablePrice)) ? Number(cablePrice) : 0;
  const safeEartip = Number.isFinite(Number(eartipPrice)) ? Number(eartipPrice) : 0;
  const safeAccessory = Number.isFinite(Number(accessoryPrice)) ? Number(accessoryPrice) : 0;
  return safePrice + safeCable + safeEartip + safeAccessory;
}

function parsePurchaseYear(purchaseDate: string | null | undefined): number | null {
  const trimmed = purchaseDate?.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
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

function getAccessoryContributions(item: Headfi): AccessoryContribution[] {
  const category = item.category?.trim();
  const cable = safeAmount(item.cable_price);
  const eartip = safeAmount(item.eartip_price);
  const accessory = safeAmount(item.accessory_price);
  const out: AccessoryContribution[] = [];
  const push = (label: string, amount: number, count = 1) => {
    if (amount > 0) out.push({ label, amount, count });
  };

  switch (category) {
    case '헤드폰':
      push('헤드폰 케이블', cable);
      push('헤드폰 이어패드', eartip);
      break;
    case '이어폰':
      push('이어폰 케이블', cable);
      push('이어폰 이어팁', eartip);
      break;
    case '무선 헤드폰':
      push('무선 헤드폰 이어패드', eartip);
      push('무선 헤드폰 액세서리', accessory);
      push('무선 헤드폰 부가비용', cable);
      break;
    case '무선 이어폰':
      push('무선 이어폰 이어팁', eartip);
      push('무선 이어폰 액세서리', accessory);
      push('무선 이어폰 부가비용', cable);
      break;
    case 'DAC':
      push('DAC 액세서리', accessory);
      break;
    case 'AMP':
      push('AMP 액세서리', accessory);
      break;
    case 'DAC/AMP':
      push('DAC/AMP 액세서리', accessory);
      break;
    case 'DAP':
      push('DAP 액세서리', accessory);
      break;
    case 'Source':
      push('Source 액세서리', accessory);
      break;
    case '기타':
      push('기타 액세서리', accessory);
      break;
    case '스피커':
      push('스피커 액세서리', accessory);
      push('스피커 부가비용', cable + eartip);
      break;
    default: {
      const lump = cable + eartip + accessory;
      if (lump > 0) {
        push(category ? `${category} 부가비용` : '기타 부가비용', lump);
      }
    }
  }

  return out;
}

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
  let unclassified = 0;
  let through2024 = 0;
  let year2025 = 0;
  let year2026 = 0;
  let after2026 = 0;
  const monthlyEntries: { purchase_date: string | null | undefined; amount: number }[] = [];

  for (const item of library) {
    const amount = headfiItemSpending(item);
    total += amount;
    monthlyEntries.push({ purchase_date: item.purchase_date, amount });
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

  for (const item of accessories) {
    const amount = headfiAccessorySpending(item);
    total += amount;
    monthlyEntries.push({ purchase_date: item.purchase_date, amount });
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

  const grossTotal = total;
  let totalSales = 0;

  for (const item of sales) {
    const amount = headfiSaleAmount(item);
    if (amount <= 0) continue;
    totalSales += amount;
    total -= amount;
    monthlyEntries.push({ purchase_date: item.sale_date, amount: -amount });
    const year = parsePurchaseYear(item.sale_date);
    if (year == null) {
      unclassified -= amount;
      continue;
    }
    if (year <= 2024) {
      through2024 -= amount;
    } else if (year === 2025) {
      year2025 -= amount;
    } else if (year === 2026) {
      year2026 -= amount;
    } else {
      after2026 -= amount;
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
    for (const contribution of getAccessoryContributions(item)) {
      const prev = accessoryTotals.get(contribution.label) ?? { amount: 0, count: 0 };
      accessoryTotals.set(contribution.label, {
        amount: prev.amount + contribution.amount,
        count: prev.count + contribution.count,
      });
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
