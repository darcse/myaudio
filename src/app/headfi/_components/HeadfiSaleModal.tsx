'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import type { Headfi, HeadfiSale, HeadfiSaleFormData } from '../types';
import { formatKrw } from '../spendingStats';

type SaleRow = {
  key: string;
  id: number | null;
  category: string;
  gear_id: string;
  price: string;
  sale_date: string;
  isPersisted: boolean;
  originalCategory: string;
  originalGearId: string;
  originalPrice: string;
  originalSaleDate: string;
};

type HeadfiSaleModalProps = {
  open: boolean;
  sales: HeadfiSale[];
  library: Headfi[];
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
    gear_id: '',
    price: '',
    sale_date: '',
    isPersisted: false,
    originalCategory: '',
    originalGearId: '',
    originalPrice: '',
    originalSaleDate: '',
  };
}

function toPersistedRow(item: HeadfiSale): SaleRow {
  return {
    key: `saved-${item.id}`,
    id: item.id,
    category: item.category ?? '',
    gear_id: item.gear_id != null ? String(item.gear_id) : '',
    price: item.price != null ? String(item.price) : '',
    sale_date: item.sale_date ?? '',
    isPersisted: true,
    originalCategory: item.category ?? '',
    originalGearId: item.gear_id != null ? String(item.gear_id) : '',
    originalPrice: item.price != null ? String(item.price) : '',
    originalSaleDate: item.sale_date ?? '',
  };
}

function gearLabel(item: Headfi): string {
  return `${item.brand || ''} ${item.model || ''}`.trim() || `#${item.id}`;
}

function getGearOptions(library: Headfi[], category: string, selectedGearId: string): Headfi[] {
  if (!category) return [];
  const released = library.filter((item) => item.category === category && item.status2 === '방출');
  const selectedId = selectedGearId ? Number(selectedGearId) : null;
  if (selectedId != null && Number.isFinite(selectedId) && !released.some((item) => item.id === selectedId)) {
    const selected = library.find((item) => item.id === selectedId);
    if (selected) return [selected, ...released];
  }
  return released;
}

export function HeadfiSaleModal({
  open,
  sales,
  library,
  categoryOptions,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: HeadfiSaleModalProps) {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
  const persistedTotalAmount = useMemo(
    () =>
      persistedRows.reduce((sum, row) => {
        const price = Number(row.price);
        return sum + (Number.isFinite(price) && price > 0 ? price : 0);
      }, 0),
    [persistedRows],
  );

  const hasUnsavedChanges = useMemo(
    () =>
      rows.some((row) =>
        row.isPersisted
          ? row.category !== row.originalCategory ||
            row.gear_id !== row.originalGearId ||
            row.price !== row.originalPrice ||
            row.sale_date !== row.originalSaleDate
          : Boolean(row.category || row.gear_id || row.price || row.sale_date),
      ),
    [rows],
  );

  if (!open) return null;

  const requestClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleRowChange = (key: string, patch: Partial<SaleRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.category != null && patch.category !== row.category) {
          const options = getGearOptions(library, patch.category, row.gear_id);
          if (!options.some((item) => String(item.id) === row.gear_id)) {
            next.gear_id = '';
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
      gear_id: row.gear_id,
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
      await onDelete({
        id: row.id,
        category: row.category,
        gear_id: Number(row.gear_id),
        price: row.price ? Number(row.price) : 0,
        sale_date: row.sale_date || null,
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const renderRow = (row: SaleRow, showDelete: boolean) => {
    const busy = savingKey === row.key || deletingKey === row.key;
    const gearOptions = getGearOptions(library, row.category, row.gear_id);

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
            value={row.gear_id}
            onChange={(e) => handleRowChange(row.key, { gear_id: e.target.value })}
            disabled={busy || !row.category}
          >
            <option value="">{row.category ? '기기 선택' : '카테고리 먼저 선택'}</option>
            {gearOptions.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {gearLabel(item)}
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
                onClick={() => void handleDeleteRow(row)}
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
          className="absolute right-5 top-4 text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100"
          onClick={requestClose}
          aria-label="닫기"
        >
          &times;
        </button>

        <div className="mb-3 pr-8">
          <h2 className="section-title text-xl">판매 관리</h2>
          <p className="mt-1 text-sm opacity-70">방출 기기의 판매 기록을 행 단위로 등록·수정·삭제합니다.</p>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium tabular-nums opacity-70">
            총 {persistedRows.length}건 · {formatKrw(persistedTotalAmount)}
          </span>
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
          <div className="empty-state-apple py-12 text-center">
            <p>판매 기록이 없습니다. 우측 상단의 추가 버튼으로 시작하세요.</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {draftRows.length > 0 ? (
              <div className="space-y-2 pb-4">{draftRows.map((row) => renderRow(row, false))}</div>
            ) : null}

            {draftRows.length > 0 ? (
              <div className="border-t py-3" style={{ borderColor: 'var(--border)' }} />
            ) : null}

            <div className="space-y-2">{persistedRows.map((row) => renderRow(row, true))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
