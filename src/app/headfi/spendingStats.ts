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

export type SpendingCategoryBucket = {
  label: string;
  amount: number;
  count: number;
  countUnit: '개' | '대';
};

export type HeadfiSpendingStats = {
  total: number;
  unclassified: number;
  yearly: SpendingYearBucket[];
  monthlyByYear: Record<2025 | 2026, SpendingMonthBucket[]>;
  byCategory: SpendingCategoryBucket[];
  byAccessory: SpendingCategoryBucket[];
};

const SPENDING_CATEGORIES = [
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

type AccessoryContribution = {
  label: string;
  amount: number;
};

function getAccessoryContributions(item: Headfi): AccessoryContribution[] {
  const category = item.category?.trim();
  const cable = safeAmount(item.cable_price);
  const eartip = safeAmount(item.eartip_price);
  const accessory = safeAmount(item.accessory_price);
  const out: AccessoryContribution[] = [];
  const push = (label: string, amount: number) => {
    if (amount > 0) out.push({ label, amount });
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
      push('무선 헤드폰 부가비용', cable + accessory);
      break;
    case '무선 이어폰':
      push('무선 이어폰 이어팁', eartip);
      push('무선 이어폰 부가비용', cable + accessory);
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
      push('스피커 부가비용', cable + eartip + accessory);
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
        count: prev.count + 1,
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
    unclassified,
    yearly,
    monthlyByYear: {
      2025: buildMonthlyBuckets(library, 2025),
      2026: buildMonthlyBuckets(library, 2026),
    },
    byCategory,
    byAccessory,
  };
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
