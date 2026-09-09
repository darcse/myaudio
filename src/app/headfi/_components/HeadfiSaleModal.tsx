'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import type { Headfi, HeadfiAccessory, HeadfiSale, HeadfiSaleFormData } from '../types';
import { formatKrw } from '../spendingStats';
import { HEADFI_SALE_ACCESSORY_CATEGORY, isHeadfiSaleAccessoryCategory } from '@/lib/headfiMatchScore';

type SaleOption = { id: string; label: string };

type SaleRow = {
  key: string;
  id: number | null;
  category: string;
  item_id: string;
  price: string;
  sale_date: string;
  isPersisted: boolean;
  originalCategory: string;
  originalItemId: string;
  originalPrice: string;
  originalSaleDate: string;
};

type HeadfiSaleModalProps = {
  open: boolean;
  sales: HeadfiSale[];
  library: Headfi[];
  accessories: HeadfiAccessory[];
  categoryOptions: readonly string[];
  onClose: () => void;
  onCreate: (data: HeadfiSaleFormData) => Promise<void>;
  onUpdate: (id: number, data: HeadfiSaleFormData) => Promise<void>;
  onDelete: (item: HeadfiSale) => Promise<void>;
};

function createDraftRow(): SaleRow {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    category: '',
    item_id: '',
    price: '',
    sale_date: '',
    isPersisted: false,
    originalCategory: '',
    originalItemId: '',
    originalPrice: '',
    originalSaleDate: '',
  };
}

function saleItemId(item: HeadfiSale): string {
  if (isHeadfiSaleAccessoryCategory(item.category)) {
    if (item.accessory_id) return String(item.accessory_id);
  }
  if (item.headfi_gear_id != null) return String(item.headfi_gear_id);
  if (item.accessory_id) return String(item.accessory_id);
  return '';
}

function normalizeSaleDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

function toPersistedRow(item: HeadfiSale): SaleRow {
  const itemId = saleItemId(item);
  const category = isHeadfiSaleAccessoryCategory(item.category)
    ? HEADFI_SALE_ACCESSORY_CATEGORY
    : (item.category ?? '');
  const saleDate = normalizeSaleDate(item.sale_date);
  const price = item.price != null ? String(item.price) : '';
  return {
    key: `saved-${item.id}`,
    id: item.id,
    category,
    item_id: itemId,
    price,
    sale_date: saleDate,
    isPersisted: true,
    originalCategory: category,
    originalItemId: itemId,
    originalPrice: price,
    originalSaleDate: saleDate,
  };
}

function gearLabel(item: Headfi): string {
  return `${item.brand || ''} ${item.model || ''}`.trim() || `#${item.id}`;
}

function accessoryLabel(item: HeadfiAccessory): string {
  const name = (item.name || '').trim();
  const category = (item.category || '').trim();
  if (name && category) return `${name} (${category})`;
  return name || category || `#${item.id}`;
}

function normalizeAccessoryStatus(status: string | null | undefined): 'owned' | 'released' {
  return status === 'released' ? 'released' : 'owned';
}

function addTakenId(taken: Set<string>, raw: string | number | null | undefined) {
  if (raw == null) return;
  const id = String(raw).trim();
  if (!id) return;
  taken.add(id);
}

function collectTakenItemIds(sales: HeadfiSale[], rows: SaleRow[], currentRowKey: string): Set<string> {
  const taken = new Set<string>();
  for (const sale of sales) {
    addTakenId(taken, sale.headfi_gear_id);
    addTakenId(taken, sale.accessory_id);
  }
  for (const row of rows) {
    if (row.key === currentRowKey) continue;
    addTakenId(taken, row.item_id);
  }
  return taken;
}

function getSaleOptions(
  library: Headfi[],
  accessories: HeadfiAccessory[],
  category: string,
  selectedItemId: string,
  takenItemIds: Set<string>,
): SaleOption[] {
  if (!category) return [];
  const selectedId = selectedItemId.trim();
  const isAvailable = (id: string) => id === selectedId || !takenItemIds.has(id);

  if (isHeadfiSaleAccessoryCategory(category)) {
    const released = accessories
      .filter((item) => normalizeAccessoryStatus(item.status) === 'released')
      .map((item) => ({ id: String(item.id), label: accessoryLabel(item) }))
      .filter((item) => isAvailable(item.id));
    if (selectedId && !released.some((item) => item.id === selectedId)) {
      const selected = accessories.find((item) => String(item.id) === selectedId);
      if (selected) {
        return [{ id: String(selected.id), label: accessoryLabel(selected) }, ...released];
      }
    }
    return released;
  }

  const released = library
    .filter((item) => item.category === category && item.status2 === '방출')
    .map((item) => ({ id: String(item.id), label: gearLabel(item) }))
    .filter((item) => isAvailable(item.id));
  if (selectedId && !released.some((item) => item.id === selectedId)) {
    const selected = library.find((item) => String(item.id) === selectedId);
    if (selected) {
      return [{ id: String(selected.id), label: gearLabel(selected) }, ...released];
    }
  }
  return released;
}

export function HeadfiSaleModal({
  open,
  sales,
  library,
  accessories,
  categoryOptions,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: HeadfiSaleModalProps) {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryFilter('전체');
    setDiscardConfirmOpen(false);
    setPendingDeleteKey(null);
    setRows((prev) => {
      const drafts = prev.filter((row) => !row.isPersisted);
      return [...drafts, ...sales.map(toPersistedRow)];
    });
  }, [open, sales]);

  const hasRows = rows.length > 0;
  const canAddRow = useMemo(
    () => savingKey == null && deletingKey == null && !rows.some((row) => !row.isPersisted),
    [savingKey, deletingKey, rows],
  );
  const draftRows = rows.filter((row) => !row.isPersisted);
  const persistedRows = rows.filter((row) => row.isPersisted);
  const filteredPersistedRows = useMemo(
    () =>
      categoryFilter === '전체'
        ? persistedRows
        : persistedRows.filter((row) => row.category === categoryFilter),
    [persistedRows, categoryFilter],
  );
  const filteredTotalAmount = useMemo(
    () =>
      filteredPersistedRows.reduce((sum, row) => {
        const price = Number(row.price);
        return sum + (Number.isFinite(price) && price > 0 ? price : 0);
      }, 0),
    [filteredPersistedRows],
  );
  const hasActiveCategoryFilter = categoryFilter !== '전체';

  const hasUnsavedChanges = useMemo(
    () =>
      rows.some((row) =>
        row.isPersisted
          ? row.category !== row.originalCategory ||
            row.item_id !== row.originalItemId ||
            row.price !== row.originalPrice ||
            row.sale_date !== row.originalSaleDate
          : Boolean(row.category || row.item_id || row.price || row.sale_date),
      ),
    [rows],
  );

  const categoryFilterBar = (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-sm font-medium tabular-nums opacity-70">
        총 {filteredPersistedRows.length}건 · {formatKrw(filteredTotalAmount)}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor="sale-category-filter" className="shrink-0 text-xs font-semibold opacity-60">
          카테고리
        </label>
        <select
          id="sale-category-filter"
          className="select-apple h-[34px] min-w-0 px-2.5 py-1.5 text-sm sm:max-w-xs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="전체">전체</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (!open) return null;

  const forceClose = () => {
    setDiscardConfirmOpen(false);
    setPendingDeleteKey(null);
    setCategoryFilter('전체');
    setRows([]);
    onClose();
  };

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    forceClose();
  };

  const handleRowChange = (key: string, patch: Partial<SaleRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.category != null && patch.category !== row.category) {
          const taken = collectTakenItemIds(sales, prev, row.key);
          const options = getSaleOptions(library, accessories, patch.category, row.item_id, taken);
          if (!options.some((item) => item.id === row.item_id)) {
            next.item_id = '';
          }
        }
        return next;
      }),
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [createDraftRow(), ...prev.filter((row) => row.isPersisted)]);
  };

  const handleSaveRow = async (row: SaleRow) => {
    const payload: HeadfiSaleFormData = {
      category: row.category,
      item_id: row.item_id,
      price: row.price,
      sale_date: row.sale_date,
    };
    setSavingKey(row.key);
    try {
      if (row.id != null) {
        await onUpdate(row.id, payload);
      } else {
        await onCreate(payload);
        setRows((prev) => prev.filter((item) => item.key !== row.key));
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteRow = async (row: SaleRow) => {
    if (row.id == null) return;
    setDeletingKey(row.key);
    try {
      const isAccessory = isHeadfiSaleAccessoryCategory(row.category);
      await onDelete({
        id: row.id,
        category: row.category,
        headfi_gear_id: isAccessory ? null : Number(row.item_id) || null,
        accessory_id: isAccessory ? row.item_id || null : null,
        price: row.price ? Number(row.price) : 0,
        sale_date: row.sale_date || null,
      });
      setPendingDeleteKey(null);
    } finally {
      setDeletingKey(null);
    }
  };

  const renderRow = (row: SaleRow, showDelete: boolean) => {
    const busy = savingKey === row.key || deletingKey === row.key;
    const taken = collectTakenItemIds(sales, rows, row.key);
    const gearOptions = getSaleOptions(library, accessories, row.category, row.item_id, taken);

    return (
      <div
        key={row.key}
        className="rounded-lg border p-2.5 sm:p-3"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      >
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_1.75fr_0.65fr_0.9fr_auto] lg:items-center">
          <select
            className="select-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.category}
            onChange={(e) => handleRowChange(row.key, { category: e.target.value })}
            disabled={busy}
          >
            <option value="">카테고리</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="select-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.item_id}
            onChange={(e) => handleRowChange(row.key, { item_id: e.target.value })}
            disabled={busy || !row.category}
          >
            <option value="">
              {row.category
                ? isHeadfiSaleAccessoryCategory(row.category)
                  ? '액세서리 선택'
                  : '기기 선택'
                : '카테고리 먼저 선택'}
            </option>
            {gearOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="input-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.price}
            onChange={(e) => handleRowChange(row.key, { price: e.target.value })}
            placeholder="가격"
            readOnly={busy}
          />

          <input
            type="date"
            className="input-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.sale_date}
            onChange={(e) => handleRowChange(row.key, { sale_date: e.target.value })}
            readOnly={busy}
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn-apple btn-apple-primary inline-flex h-[34px] w-[34px] items-center justify-center"
              onClick={() => void handleSaveRow(row)}
              disabled={busy}
              aria-label={row.id != null ? '행 수정 저장' : '행 저장'}
              title={row.id != null ? '행 수정 저장' : '행 저장'}
            >
              {savingKey === row.key ? (
                <Check className="size-3.5 animate-pulse" strokeWidth={1.75} />
              ) : (
                <Save className="size-3.5" strokeWidth={1.75} />
              )}
            </button>
            {showDelete ? (
              <button
                type="button"
                className="btn-apple btn-apple-secondary inline-flex h-[34px] w-[34px] items-center justify-center"
                onClick={() => setPendingDeleteKey(row.key)}
                disabled={busy}
                aria-label="행 삭제"
                title="행 삭제"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={requestClose}
    >
      <div
        className="modal-panel-apple relative w-full max-w-5xl p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-5 top-4 z-10 text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            requestClose();
          }}
          aria-label="닫기"
        >
          &times;
        </button>

        <div className="mb-3 pr-8">
          <h2 className="section-title text-xl">판매 관리</h2>
          <p className="mt-1 text-sm opacity-70">
            방출 기기·액세서리의 판매 기록을 행 단위로 등록·수정·삭제합니다.
          </p>
        </div>

        {discardConfirmOpen ? (
          <div
            className="mb-4 rounded-lg border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <p className="text-sm font-medium">저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="btn-apple btn-apple-secondary h-[34px] px-3 text-sm"
                onClick={() => setDiscardConfirmOpen(false)}
              >
                계속 편집
              </button>
              <button
                type="button"
                className="btn-apple btn-apple-primary h-[34px] px-3 text-sm"
                onClick={forceClose}
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}

        {pendingDeleteKey ? (
          <div
            className="mb-4 rounded-lg border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <p className="text-sm font-medium">이 판매 기록을 삭제하시겠습니까?</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="btn-apple btn-apple-secondary h-[34px] px-3 text-sm"
                onClick={() => setPendingDeleteKey(null)}
                disabled={deletingKey != null}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-apple btn-apple-danger h-[34px] px-3 text-sm"
                onClick={() => {
                  const target = rows.find((row) => row.key === pendingDeleteKey);
                  if (target) void handleDeleteRow(target);
                }}
                disabled={deletingKey != null}
              >
                {deletingKey === pendingDeleteKey ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-apple btn-apple-secondary inline-flex h-[34px] w-[34px] items-center justify-center shrink-0"
            onClick={handleAddRow}
            disabled={!canAddRow}
            aria-label="행 추가"
            title="행 추가"
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {!hasRows ? (
          <>
            <div className="mb-4">{categoryFilterBar}</div>
            <div className="empty-state-apple py-12 text-center">
              <p>판매 기록이 없습니다. 우측 상단의 추가 버튼으로 시작하세요.</p>
            </div>
          </>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {draftRows.length > 0 ? (
              <div className="space-y-2 pb-4">{draftRows.map((row) => renderRow(row, false))}</div>
            ) : null}

            {draftRows.length > 0 ? (
              <div className="border-t py-3" style={{ borderColor: 'var(--border)' }} />
            ) : null}

            <div className="space-y-2">
              {categoryFilterBar}

              {filteredPersistedRows.length === 0 && hasActiveCategoryFilter ? (
                <div className="empty-state-apple py-8 text-center">
                  <p className="text-sm opacity-70">해당 카테고리에 등록된 판매 기록이 없습니다.</p>
                </div>
              ) : null}

              {filteredPersistedRows.map((row) => renderRow(row, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
