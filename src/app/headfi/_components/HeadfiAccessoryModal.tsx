'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import type { HeadfiAccessory, HeadfiAccessoryFormData } from '../types';

type AccessoryRow = {
  key: string;
  id: number | null;
  category: string;
  name: string;
  price: string;
  purchase_date: string;
  isPersisted: boolean;
  originalCategory: string;
  originalName: string;
  originalPrice: string;
  originalPurchaseDate: string;
};

type HeadfiAccessoryModalProps = {
  open: boolean;
  accessories: HeadfiAccessory[];
  categoryOptions: readonly string[];
  onClose: () => void;
  onCreate: (data: HeadfiAccessoryFormData) => Promise<void>;
  onUpdate: (id: number, data: HeadfiAccessoryFormData) => Promise<void>;
  onDelete: (item: HeadfiAccessory) => Promise<void>;
};

function createDraftRow(): AccessoryRow {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    category: '',
    name: '',
    price: '',
    purchase_date: '',
    isPersisted: false,
    originalCategory: '',
    originalName: '',
    originalPrice: '',
    originalPurchaseDate: '',
  };
}

function toPersistedRow(item: HeadfiAccessory): AccessoryRow {
  return {
    key: `saved-${item.id}`,
    id: item.id,
    category: item.category ?? '',
    name: item.name ?? '',
    price: item.price != null && Number(item.price) !== 0 ? String(item.price) : '',
    purchase_date: item.purchase_date ?? '',
    isPersisted: true,
    originalCategory: item.category ?? '',
    originalName: item.name ?? '',
    originalPrice: item.price != null && Number(item.price) !== 0 ? String(item.price) : '',
    originalPurchaseDate: item.purchase_date ?? '',
  };
}

export function HeadfiAccessoryModal({
  open,
  accessories,
  categoryOptions,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: HeadfiAccessoryModalProps) {
  const [rows, setRows] = useState<AccessoryRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows((prev) => {
      const drafts = prev.filter((row) => !row.isPersisted);
      return [...accessories.map(toPersistedRow), ...drafts];
    });
  }, [open, accessories]);

  const hasRows = rows.length > 0;
  const canAddRow = useMemo(() => savingKey == null && deletingKey == null, [savingKey, deletingKey]);
  const draftRows = rows.filter((row) => !row.isPersisted);
  const persistedRows = rows.filter((row) => row.isPersisted);

  const hasUnsavedChanges = useMemo(
    () =>
      rows.some((row) =>
        row.isPersisted
          ? row.category !== row.originalCategory ||
            row.name !== row.originalName ||
            row.price !== row.originalPrice ||
            row.purchase_date !== row.originalPurchaseDate
          : Boolean(row.category || row.name || row.price || row.purchase_date),
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

  const handleRowChange = (key: string, patch: Partial<AccessoryRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => {
    setRows((prev) => [createDraftRow(), ...prev.filter((row) => !row.isPersisted), ...prev.filter((row) => row.isPersisted)]);
  };

  const handleSaveRow = async (row: AccessoryRow) => {
    const payload: HeadfiAccessoryFormData = {
      category: row.category,
      name: row.name,
      price: row.price,
      purchase_date: row.purchase_date,
    };
    setSavingKey(row.key);
    try {
      if (row.id != null) {
        await onUpdate(row.id, payload);
      } else {
        await onCreate(payload);
        setRows((prev) =>
          prev.map((item) =>
            item.key === row.key
              ? {
                  ...item,
                  category: '',
                  name: '',
                  price: '',
                  purchase_date: '',
                  isPersisted: false,
                  originalCategory: '',
                  originalName: '',
                  originalPrice: '',
                  originalPurchaseDate: '',
                }
              : item,
          ),
        );
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteRow = async (row: AccessoryRow) => {
    if (row.id == null) {
      setRows((prev) => prev.filter((item) => item.key !== row.key));
      return;
    }
    setDeletingKey(row.key);
    try {
      await onDelete({
        id: row.id,
        category: row.category,
        name: row.name,
        price: row.price ? Number(row.price) : 0,
        purchase_date: row.purchase_date || null,
      });
    } finally {
      setDeletingKey(null);
    }
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

        <div className="mb-5 flex items-center justify-between gap-3 pr-8">
          <div>
            <h2 className="section-title text-xl">독립 액세서리 관리</h2>
            <p className="mt-1 text-sm opacity-70">행 단위로 바로 등록, 수정, 삭제할 수 있습니다.</p>
          </div>
          <button
            type="button"
            className="btn-apple btn-apple-secondary inline-flex h-[38px] w-[38px] items-center justify-center shrink-0"
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
            <p>액세서리 행이 없습니다. 우측 상단의 추가 버튼으로 시작하세요.</p>
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {draftRows.map((row) => {
              const busy = savingKey === row.key || deletingKey === row.key;
              return (
                <div
                  key={row.key}
                  className="rounded-xl border p-3 sm:p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                >
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.75fr_0.65fr_0.9fr_auto] lg:items-center">
                    <select
                      className="select-apple h-[42px] w-full px-3 py-2"
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

                    <input
                      type="text"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.name}
                      onChange={(e) => handleRowChange(row.key, { name: e.target.value })}
                      placeholder="이름"
                      readOnly={busy}
                    />

                    <input
                      type="number"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.price}
                      onChange={(e) => handleRowChange(row.key, { price: e.target.value })}
                      placeholder="가격"
                      readOnly={busy}
                    />

                    <input
                      type="date"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.purchase_date}
                      onChange={(e) => handleRowChange(row.key, { purchase_date: e.target.value })}
                      readOnly={busy}
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="btn-apple btn-apple-primary inline-flex h-[38px] w-[38px] items-center justify-center"
                        onClick={() => void handleSaveRow(row)}
                        disabled={busy}
                        aria-label="행 저장"
                        title="행 저장"
                      >
                        {savingKey === row.key ? (
                          <Check className="size-4 animate-pulse" strokeWidth={1.75} />
                        ) : (
                          <Save className="size-4" strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {draftRows.length > 0 ? (
              <div className="border-t pt-1" style={{ borderColor: 'var(--border)' }} />
            ) : null}

            {persistedRows.map((row) => {
              const busy = savingKey === row.key || deletingKey === row.key;
              return (
                <div
                  key={row.key}
                  className="rounded-xl border p-3 sm:p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                >
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.75fr_0.65fr_0.9fr_auto] lg:items-center">
                    <select
                      className="select-apple h-[42px] w-full px-3 py-2"
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

                    <input
                      type="text"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.name}
                      onChange={(e) => handleRowChange(row.key, { name: e.target.value })}
                      placeholder="이름"
                      readOnly={busy}
                    />

                    <input
                      type="number"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.price}
                      onChange={(e) => handleRowChange(row.key, { price: e.target.value })}
                      placeholder="가격"
                      readOnly={busy}
                    />

                    <input
                      type="date"
                      className="input-apple h-[42px] w-full px-3 py-2"
                      value={row.purchase_date}
                      onChange={(e) => handleRowChange(row.key, { purchase_date: e.target.value })}
                      readOnly={busy}
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="btn-apple btn-apple-primary inline-flex h-[38px] w-[38px] items-center justify-center"
                        onClick={() => void handleSaveRow(row)}
                        disabled={busy}
                        aria-label={row.id != null ? '행 수정 저장' : '행 저장'}
                        title={row.id != null ? '행 수정 저장' : '행 저장'}
                      >
                        {savingKey === row.key ? (
                          <Check className="size-4 animate-pulse" strokeWidth={1.75} />
                        ) : (
                          <Save className="size-4" strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-apple btn-apple-secondary inline-flex h-[38px] w-[38px] items-center justify-center"
                        onClick={() => void handleDeleteRow(row)}
                        disabled={busy}
                        aria-label="행 삭제"
                        title="행 삭제"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
