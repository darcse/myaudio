'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatKrw, HEADFI_ACCESSORY_CATEGORY_OPTIONS } from '../spendingStats';
import { saveHeadfiAccessoryToDB } from '../actions';
import type { HeadfiAccessory, HeadfiAccessoryLinkedGear } from '../types';
import { INPUT_BASE_CLASS } from './headfiFormUtils';
import { getClientErrorMessage } from '@/lib/supabase-error';

type HeadfiFormAccessoryLinksProps = {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  accessories: HeadfiAccessory[];
  linkedGear: HeadfiAccessoryLinkedGear[];
  linksLoading?: boolean;
  currentHeadfiId: number | null;
  onAccessoryCreated: (item: HeadfiAccessory) => void;
};

function accessoryLabel(item: HeadfiAccessory): string {
  const price = item.price != null && Number.isFinite(Number(item.price)) ? formatKrw(Number(item.price)) : '0원';
  return `${item.name} | ${price}`;
}


function isReleased(item: HeadfiAccessory): boolean {
  return item.status === 'released';
}

function ReleasedBadge() {
  return <span className="shrink-0 text-[10px] font-semibold">방출</span>;
}

export function HeadfiFormAccessoryLinks({
  selectedIds,
  onSelectedIdsChange,
  accessories,
  linkedGear,
  linksLoading = false,
  currentHeadfiId,
  onAccessoryCreated,
}: HeadfiFormAccessoryLinksProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPrice, setRegisterPrice] = useState('');
  const [registerDate, setRegisterDate] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const accessoryById = useMemo(() => {
    const map = new Map<string, HeadfiAccessory>();
    for (const item of accessories) map.set(item.id, item);
    return map;
  }, [accessories]);

  const selectedItems = selectedIds
    .map((id) => accessoryById.get(id))
    .filter((item): item is HeadfiAccessory => Boolean(item));

  const linkedElsewhere = useMemo(() => {
    const ids = new Set<string>();
    for (const row of linkedGear) {
      if (currentHeadfiId != null && row.headfi_id === currentHeadfiId) continue;
      ids.add(row.accessory_id);
    }
    return ids;
  }, [linkedGear, currentHeadfiId]);

  const otherGearByAccessoryId = useMemo(() => {
    const map = new Map<string, HeadfiAccessoryLinkedGear[]>();
    for (const row of linkedGear) {
      if (currentHeadfiId != null && row.headfi_id === currentHeadfiId) continue;
      const next = map.get(row.accessory_id) ?? [];
      next.push(row);
      map.set(row.accessory_id, next);
    }
    return map;
  }, [linkedGear, currentHeadfiId]);

  const itemsInCategory = useMemo(
    () =>
      accessories
        .filter((item) => !pickerCategory || item.category === pickerCategory)
        .slice()
        .sort((a, b) => Number(isReleased(a)) - Number(isReleased(b))),
    [accessories, pickerCategory],
  );

  const selectable = itemsInCategory.filter((item) => !selectedIds.includes(item.id));

  const resetPicker = () => {
    setPickerOpen(false);
    setPickerCategory('');
    setRegisterOpen(false);
    setRegisterName('');
    setRegisterPrice('');
    setRegisterDate('');
    setRegisterError(null);
  };

  const addAccessory = (id: string) => {
    if (selectedIds.includes(id)) return;
    onSelectedIdsChange([...selectedIds, id]);
    resetPicker();
  };

  const handleRegister = async () => {
    const category = pickerCategory.trim();
    const name = registerName.trim();
    if (!category) {
      setRegisterError('카테고리를 선택해 주세요.');
      return;
    }
    if (!name) {
      setRegisterError('액세서리 이름을 입력해 주세요.');
      return;
    }
    setRegisterBusy(true);
    setRegisterError(null);
    try {
      const result = await saveHeadfiAccessoryToDB({
        category,
        name,
        price: registerPrice,
        purchase_date: registerDate,
        status: 'owned',
      });
      if (!result?.id) {
        setRegisterError('액세서리 등록에 실패했습니다.');
        return;
      }
      const created: HeadfiAccessory = {
        id: result.id,
        category,
        name,
        price: Number.parseInt(registerPrice, 10) || 0,
        purchase_date: registerDate.trim() || null,
        status: 'owned',
      };
      onAccessoryCreated(created);
      onSelectedIdsChange([...selectedIds, created.id]);
      resetPicker();
    } catch (error) {
      setRegisterError(getClientErrorMessage(error));
    } finally {
      setRegisterBusy(false);
    }
  };

  const emptyCategory = Boolean(pickerCategory) && itemsInCategory.length === 0;

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold opacity-90">액세서리</label>
        <button
          type="button"
          className="btn-apple btn-apple-secondary inline-flex h-[34px] items-center gap-1 px-3 text-xs"
          onClick={() => {
            setPickerOpen(true);
            setRegisterOpen(false);
            setRegisterError(null);
          }}
          disabled={linksLoading}
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
          액세서리 추가
        </button>
      </div>

      {linksLoading ? (
        <div className="flex items-center py-1" role="status" aria-label="액세서리 연결 불러오는 중">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : selectedItems.length === 0 ? (
        <p className="text-sm opacity-60">연결된 액세서리가 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {selectedItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate">{accessoryLabel(item)}</span>
                {isReleased(item) ? <ReleasedBadge /> : null}
              </span>
              <button
                type="button"
                className="btn-apple btn-apple-secondary inline-flex h-[30px] w-[30px] items-center justify-center"
                onClick={() => onSelectedIdsChange(selectedIds.filter((id) => id !== item.id))}
                aria-label="액세서리 연결 제거"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? (
        <div className="space-y-2 rounded-xl px-2 py-2" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-semibold opacity-90" htmlFor="headfi-accessory-category">
              카테고리
            </label>
            <select
              id="headfi-accessory-category"
              className="select-apple h-[42px] min-w-0 flex-1 px-3 py-2"
              value={pickerCategory}
              onChange={(e) => {
                setPickerCategory(e.target.value);
                setRegisterOpen(false);
                setRegisterError(null);
              }}
            >
              <option value="">선택</option>
              {HEADFI_ACCESSORY_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {pickerCategory ? (
            emptyCategory ? (
              <p className="text-sm opacity-70">등록된 제품이 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {selectable.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:opacity-90"
                      style={{ background: 'var(--badge-bg)' }}
                      onClick={() => addAccessory(item.id)}
                    >
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="min-w-0 truncate">{accessoryLabel(item)}</span>
                          {isReleased(item) ? <ReleasedBadge /> : null}
                        </span>
                        {(otherGearByAccessoryId.get(item.id) ?? []).map((gear) => {
                          const model = gear.model.trim();
                          if (!model) return null;
                          return (
                            <span key={gear.headfi_id} className="mt-0.5 flex min-w-0 items-center gap-1 text-xs opacity-60">
                              <span className="min-w-0 truncate">{model}</span>
                              {gear.status2 === '방출' || gear.status2 === '양도' ? (
                                <span className="shrink-0 text-[10px] font-semibold">{gear.status2}</span>
                              ) : null}
                            </span>
                          );
                        })}
                      </span>
                      {linkedElsewhere.has(item.id) ? (
                        <span className="shrink-0 text-xs opacity-60">연결 중</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {pickerCategory ? (
            registerOpen || emptyCategory ? (
              <div className="space-y-2">
                <input
                  className={INPUT_BASE_CLASS}
                  placeholder="이름"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
                <input
                  type="number"
                  className={INPUT_BASE_CLASS}
                  placeholder="가격"
                  value={registerPrice}
                  onChange={(e) => setRegisterPrice(e.target.value)}
                />
                <input
                  type="date"
                  className={INPUT_BASE_CLASS}
                  value={registerDate}
                  onChange={(e) => setRegisterDate(e.target.value)}
                />
                {registerError ? <p className="text-xs text-red-500">{registerError}</p> : null}
                <button
                  type="button"
                  className="btn-apple btn-apple-primary h-[36px] px-3 text-sm"
                  onClick={() => void handleRegister()}
                  disabled={registerBusy}
                >
                  {registerBusy ? '등록 중...' : '액세서리 등록'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-medium opacity-70 underline-offset-2 hover:underline"
                onClick={() => setRegisterOpen(true)}
              >
                새 액세서리 등록
              </button>
            )
          ) : null}

          <button type="button" className="text-xs opacity-60 hover:opacity-100" onClick={resetPicker}>
            닫기
          </button>
        </div>
      ) : null}
    </div>
  );
}
