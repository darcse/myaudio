import { createClient } from '@/lib/supabase/client';
import { isHeadfiSaleAccessoryCategory } from '@/lib/headfiMatchScore';
import type {
  MonthlyHeadfiActivityData,
  MonthlyPurchasedAccessory,
  MonthlyPurchasedGear,
  MonthlySoldAccessory,
  MonthlySoldGear,
} from '@/app/archive/[year]/[month]/_components/MonthlyHeadfiActivity';

export type HeadfiTrendMonthCard = {
  month: number;
  spendTotal: number;
  salesTotal: number;
  thumbnailUrl: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function yearRange(year: number) {
  return {
    start: `${year}-01-01`,
    endExclusive: `${year + 1}-01-01`,
  };
}

function monthRange(year: number, month: number) {
  const start = `${year}-${pad(month)}-01`;
  const endExclusive = `${month === 12 ? year + 1 : year}-${pad(month === 12 ? 1 : month + 1)}-01`;
  return { start, endExclusive };
}

function toMoney(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function monthFromDate(value: string | null | undefined): number | null {
  const s = String(value ?? '').slice(0, 10);
  if (s.length < 10) return null;
  const m = parseInt(s.slice(5, 7), 10);
  return m >= 1 && m <= 12 ? m : null;
}

function yearFromDate(value: string | null | undefined): number | null {
  const s = String(value ?? '').slice(0, 10);
  if (s.length < 10) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return Number.isInteger(y) ? y : null;
}

export async function listHeadfiTrendYears(): Promise<number[]> {
  const supabase = createClient();
  const [gearRes, accessoryRes, salesRes] = await Promise.all([
    supabase.from('headfi').select('purchase_date').not('purchase_date', 'is', null),
    supabase.from('headfi_accessories').select('purchase_date').not('purchase_date', 'is', null),
    supabase.from('headfi_sales').select('sale_date').not('sale_date', 'is', null),
  ]);
  if (gearRes.error) throw new Error(gearRes.error.message);
  if (accessoryRes.error) throw new Error(accessoryRes.error.message);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const years = new Set<number>();
  for (const row of gearRes.data ?? []) {
    const y = yearFromDate(row.purchase_date);
    if (y != null) years.add(y);
  }
  for (const row of accessoryRes.data ?? []) {
    const y = yearFromDate(row.purchase_date);
    if (y != null) years.add(y);
  }
  for (const row of salesRes.data ?? []) {
    const y = yearFromDate(row.sale_date);
    if (y != null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

type MonthBucket = {
  spendTotal: number;
  salesTotal: number;
  hasPurchase: boolean;
  bestPurchase: { price: number; imageUrl: string | null } | null;
  bestSaleGearId: number | null;
  bestSalePrice: number;
};

function emptyBucket(): MonthBucket {
  return {
    spendTotal: 0,
    salesTotal: 0,
    hasPurchase: false,
    bestPurchase: null,
    bestSaleGearId: null,
    bestSalePrice: -1,
  };
}

export async function loadHeadfiTrendYearMonths(year: number): Promise<HeadfiTrendMonthCard[]> {
  const supabase = createClient();
  const { start, endExclusive } = yearRange(year);

  const [gearRes, accessoryRes, salesRes] = await Promise.all([
    supabase
      .from('headfi')
      .select('id, price, purchase_date, image_url')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', start)
      .lt('purchase_date', endExclusive),
    supabase
      .from('headfi_accessories')
      .select('price, purchase_date')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', start)
      .lt('purchase_date', endExclusive),
    supabase
      .from('headfi_sales')
      .select('category, headfi_gear_id, price, sale_date')
      .not('sale_date', 'is', null)
      .gte('sale_date', start)
      .lt('sale_date', endExclusive),
  ]);
  if (gearRes.error) throw new Error(gearRes.error.message);
  if (accessoryRes.error) throw new Error(accessoryRes.error.message);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const buckets: Record<number, MonthBucket> = {};
  for (let m = 1; m <= 12; m++) buckets[m] = emptyBucket();

  for (const row of gearRes.data ?? []) {
    const mo = monthFromDate(row.purchase_date);
    if (mo == null) continue;
    const price = toMoney(row.price);
    const b = buckets[mo];
    b.hasPurchase = true;
    b.spendTotal += price;
    const imageUrl = typeof row.image_url === 'string' && row.image_url.trim() ? row.image_url.trim() : null;
    if (!b.bestPurchase || price > b.bestPurchase.price) {
      b.bestPurchase = { price, imageUrl };
    } else if (price === b.bestPurchase.price && imageUrl && !b.bestPurchase.imageUrl) {
      b.bestPurchase = { price, imageUrl };
    }
  }

  for (const row of accessoryRes.data ?? []) {
    const mo = monthFromDate(row.purchase_date);
    if (mo == null) continue;
    buckets[mo].hasPurchase = true;
    buckets[mo].spendTotal += toMoney(row.price);
  }

  const saleGearIds = new Set<number>();
  for (const row of salesRes.data ?? []) {
    const mo = monthFromDate(row.sale_date);
    if (mo == null) continue;
    const price = toMoney(row.price);
    const b = buckets[mo];
    b.salesTotal += price;
    if (isHeadfiSaleAccessoryCategory(row.category)) continue;
    const gearId = row.headfi_gear_id;
    if (gearId == null) continue;
    if (price > b.bestSalePrice) {
      b.bestSalePrice = price;
      b.bestSaleGearId = gearId;
    }
    saleGearIds.add(gearId);
  }

  const imageByGearId = new Map<number, string>();
  const idsNeedingImage = [...saleGearIds];
  if (idsNeedingImage.length > 0) {
    const { data, error } = await supabase.from('headfi').select('id, image_url').in('id', idsNeedingImage);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const url = typeof row.image_url === 'string' && row.image_url.trim() ? row.image_url.trim() : '';
      if (url) imageByGearId.set(row.id, url);
    }
  }

  const out: HeadfiTrendMonthCard[] = [];
  for (let m = 12; m >= 1; m--) {
    const b = buckets[m];
    if (b.spendTotal === 0 && b.salesTotal === 0) continue;
    let thumbnailUrl: string | null = null;
    if (b.hasPurchase) {
      thumbnailUrl = b.bestPurchase?.imageUrl ?? null;
    } else if (b.bestSaleGearId != null) {
      thumbnailUrl = imageByGearId.get(b.bestSaleGearId) ?? null;
    }
    out.push({
      month: m,
      spendTotal: b.spendTotal,
      salesTotal: b.salesTotal,
      thumbnailUrl,
    });
  }
  return out;
}

export async function fetchMonthlyHeadfiActivity(
  year: number,
  month: number,
): Promise<MonthlyHeadfiActivityData> {
  const supabase = createClient();
  const { start, endExclusive } = monthRange(year, month);

  const [gearRes, accessoryRes, salesRes] = await Promise.all([
    supabase
      .from('headfi')
      .select('id, brand, model, category, image_url, price, purchase_date')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', start)
      .lt('purchase_date', endExclusive)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('headfi_accessories')
      .select('id, name, price, purchase_date')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', start)
      .lt('purchase_date', endExclusive)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('headfi_sales')
      .select('id, category, headfi_gear_id, accessory_id, price, sale_date')
      .not('sale_date', 'is', null)
      .gte('sale_date', start)
      .lt('sale_date', endExclusive)
      .order('sale_date', { ascending: false }),
  ]);

  if (gearRes.error) throw new Error(gearRes.error.message);
  if (accessoryRes.error) throw new Error(accessoryRes.error.message);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const purchasedGear: MonthlyPurchasedGear[] = (gearRes.data ?? []).map((row) => ({
    id: row.id,
    brand: row.brand || '',
    model: row.model || '',
    category: row.category ?? null,
    image_url: row.image_url ?? null,
    price: row.price == null ? null : toMoney(row.price),
    purchase_date: String(row.purchase_date),
  }));

  const purchasedAccessories: MonthlyPurchasedAccessory[] = (accessoryRes.data ?? []).map((row) => ({
    id: String(row.id),
    name: (row.name || '').trim() || '액세서리',
    price: row.price == null ? null : toMoney(row.price),
    purchase_date: String(row.purchase_date),
  }));

  const sales = salesRes.data ?? [];
  const gearSaleIds = [
    ...new Set(
      sales
        .filter((row) => !isHeadfiSaleAccessoryCategory(row.category) && row.headfi_gear_id != null)
        .map((row) => row.headfi_gear_id as number),
    ),
  ];
  const accessorySaleIds = [
    ...new Set(
      sales
        .filter((row) => isHeadfiSaleAccessoryCategory(row.category) && row.accessory_id)
        .map((row) => String(row.accessory_id)),
    ),
  ];

  const gearById = new Map<
    number,
    { brand: string; model: string; category: string | null; image_url: string | null }
  >();
  if (gearSaleIds.length > 0) {
    const { data: soldGearRows, error } = await supabase
      .from('headfi')
      .select('id, brand, model, category, image_url')
      .in('id', gearSaleIds);
    if (error) throw new Error(error.message);
    for (const row of soldGearRows ?? []) {
      gearById.set(row.id, {
        brand: row.brand || '',
        model: row.model || '',
        category: row.category ?? null,
        image_url: row.image_url ?? null,
      });
    }
  }

  const accessoryById = new Map<string, string>();
  if (accessorySaleIds.length > 0) {
    const { data: soldAccessoryRows, error } = await supabase
      .from('headfi_accessories')
      .select('id, name')
      .in('id', accessorySaleIds);
    if (error) throw new Error(error.message);
    for (const row of soldAccessoryRows ?? []) {
      accessoryById.set(String(row.id), (row.name || '').trim() || '액세서리');
    }
  }

  const soldGear: MonthlySoldGear[] = [];
  const soldAccessories: MonthlySoldAccessory[] = [];
  for (const row of sales) {
    const saleDate = String(row.sale_date ?? '');
    const salePrice = row.price == null ? null : toMoney(row.price);
    if (isHeadfiSaleAccessoryCategory(row.category)) {
      const accessoryId = row.accessory_id ? String(row.accessory_id) : '';
      soldAccessories.push({
        saleId: row.id,
        name: accessoryById.get(accessoryId) ?? '액세서리',
        salePrice,
        saleDate,
      });
      continue;
    }
    const headfiId = row.headfi_gear_id;
    const gear = headfiId != null ? gearById.get(headfiId) : undefined;
    soldGear.push({
      saleId: row.id,
      headfiId: headfiId ?? null,
      brand: gear?.brand ?? '—',
      model: gear?.model ?? '삭제된 기기',
      category: gear?.category ?? row.category ?? null,
      image_url: gear?.image_url ?? null,
      salePrice,
      saleDate,
    });
  }

  const spendTotal =
    purchasedGear.reduce((sum, row) => sum + toMoney(row.price), 0) +
    purchasedAccessories.reduce((sum, row) => sum + toMoney(row.price), 0);
  const salesTotal =
    soldGear.reduce((sum, row) => sum + toMoney(row.salePrice), 0) +
    soldAccessories.reduce((sum, row) => sum + toMoney(row.salePrice), 0);

  return {
    spendTotal,
    salesTotal,
    purchasedGear,
    purchasedAccessories,
    soldGear,
    soldAccessories,
  };
}
