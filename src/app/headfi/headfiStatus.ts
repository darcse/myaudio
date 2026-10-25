import type { HeadfiSale } from './types';

export const HEADFI_STATUS2_OWNED = '보유중';
export const HEADFI_STATUS2_RELEASED = '방출';
export const HEADFI_STATUS2_TRANSFERRED = '양도';

export function isHeadfiOutOfCollectionStatus(status: string | null | undefined): boolean {
  return status === HEADFI_STATUS2_RELEASED || status === HEADFI_STATUS2_TRANSFERRED;
}

export function latestHeadfiGearSalePrice(
  sales: Pick<HeadfiSale, 'headfi_gear_id' | 'price' | 'sale_date' | 'created_at'>[],
  headfiId: number,
): number | null {
  const rows = sales.filter((sale) => sale.headfi_gear_id === headfiId);
  if (rows.length === 0) return null;
  const latest = [...rows].sort((a, b) => {
    const dateCmp = (b.sale_date?.trim() ?? '').localeCompare(a.sale_date?.trim() ?? '');
    if (dateCmp !== 0) return dateCmp;
    return (b.created_at?.trim() ?? '').localeCompare(a.created_at?.trim() ?? '');
  })[0];
  const price = Number(latest.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

export function formatHeadfiStatus2Display(
  status2: string | null | undefined,
  salePrice: number | null,
): string {
  const status = status2?.trim() || '';
  if (status === HEADFI_STATUS2_RELEASED) {
    if (salePrice == null) return HEADFI_STATUS2_RELEASED;
    return `${HEADFI_STATUS2_RELEASED}(${salePrice.toLocaleString()}원)`;
  }
  return status || '-';
}
