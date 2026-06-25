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
  'DAC/AMP',
  'DAP',
  '스피커',
  'Source',
  '기타',
] as const;

const CATEGORY_COUNT_UNITS: Record<(typeof SPENDING_CATEGORIES)[number], '개' | '대'> = {
  헤드폰: '개',
  이어폰: '개',
  '무선 헤드폰': '개',
  '무선 이어폰': '개',
  'DAC/AMP': '대',
  DAP: '대',
  스피커: '대',
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
  let headphoneCable = 0;
  let headphoneEartip = 0;
  let earphoneCable = 0;
  let earphoneEartip = 0;
  let headphoneCableCount = 0;
  let headphoneEartipCount = 0;
  let earphoneCableCount = 0;
  let earphoneEartipCount = 0;
  let wirelessHeadphoneEartip = 0;
  let wirelessEarphoneEartip = 0;
  let wirelessHeadphoneEartipCount = 0;
  let wirelessEarphoneEartipCount = 0;
  let dacAmpAccessory = 0;
  let dapAccessory = 0;
  let sourceAccessory = 0;
  let etcAccessory = 0;
  let dacAmpAccessoryCount = 0;
  let dapAccessoryCount = 0;
  let sourceAccessoryCount = 0;
  let etcAccessoryCount = 0;

  for (const item of library) {
    const category = item.category?.trim();
    if (category && categoryTotals.has(category)) {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + safeAmount(item.price));
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    if (category === '헤드폰') {
      const cablePrice = safeAmount(item.cable_price);
      const eartipPrice = safeAmount(item.eartip_price);
      headphoneCable += cablePrice;
      headphoneEartip += eartipPrice;
      if (cablePrice > 0) headphoneCableCount += 1;
      if (eartipPrice > 0) headphoneEartipCount += 1;
    } else if (category === '이어폰') {
      const cablePrice = safeAmount(item.cable_price);
      const eartipPrice = safeAmount(item.eartip_price);
      earphoneCable += cablePrice;
      earphoneEartip += eartipPrice;
      if (cablePrice > 0) earphoneCableCount += 1;
      if (eartipPrice > 0) earphoneEartipCount += 1;
    } else if (category === '무선 헤드폰') {
      const eartipPrice = safeAmount(item.eartip_price);
      wirelessHeadphoneEartip += eartipPrice;
      if (eartipPrice > 0) wirelessHeadphoneEartipCount += 1;
    } else if (category === '무선 이어폰') {
      const eartipPrice = safeAmount(item.eartip_price);
      wirelessEarphoneEartip += eartipPrice;
      if (eartipPrice > 0) wirelessEarphoneEartipCount += 1;
    } else if (category === 'DAC/AMP') {
      const accessoryPrice = safeAmount(item.accessory_price);
      dacAmpAccessory += accessoryPrice;
      if (accessoryPrice > 0) dacAmpAccessoryCount += 1;
    } else if (category === 'DAP') {
      const accessoryPrice = safeAmount(item.accessory_price);
      dapAccessory += accessoryPrice;
      if (accessoryPrice > 0) dapAccessoryCount += 1;
    } else if (category === 'Source') {
      const accessoryPrice = safeAmount(item.accessory_price);
      sourceAccessory += accessoryPrice;
      if (accessoryPrice > 0) sourceAccessoryCount += 1;
    } else if (category === '기타') {
      const accessoryPrice = safeAmount(item.accessory_price);
      etcAccessory += accessoryPrice;
      if (accessoryPrice > 0) etcAccessoryCount += 1;
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

  const byAccessory = sortCategoryRows([
    { label: '헤드폰 케이블', amount: headphoneCable, count: headphoneCableCount, countUnit: '개' },
    { label: '헤드폰 이어패드', amount: headphoneEartip, count: headphoneEartipCount, countUnit: '개' },
    { label: '이어폰 케이블', amount: earphoneCable, count: earphoneCableCount, countUnit: '개' },
    { label: '이어폰 이어팁', amount: earphoneEartip, count: earphoneEartipCount, countUnit: '개' },
    { label: '무선 헤드폰 이어패드', amount: wirelessHeadphoneEartip, count: wirelessHeadphoneEartipCount, countUnit: '개' },
    { label: '무선 이어폰 이어팁', amount: wirelessEarphoneEartip, count: wirelessEarphoneEartipCount, countUnit: '개' },
    { label: 'DAC/AMP 액세서리', amount: dacAmpAccessory, count: dacAmpAccessoryCount, countUnit: '개' },
    { label: 'DAP 액세서리', amount: dapAccessory, count: dapAccessoryCount, countUnit: '개' },
    { label: 'Source 액세서리', amount: sourceAccessory, count: sourceAccessoryCount, countUnit: '개' },
    { label: '기타 액세서리', amount: etcAccessory, count: etcAccessoryCount, countUnit: '개' },
  ]);

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
