'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { isComboEligibleCategory } from '@/lib/headfiMatchScore';
import { deleteHeadfiComboFromDB, saveHeadfiComboToDB } from '../actions';
import { buildGearByIdMap, formatComboLabel, formatGearShortLabel } from '../headfiComboUtils';
import type { Headfi, HeadfiCombo } from '../types';

type HeadfiComboManageSectionProps = {
  library: Headfi[];
  isAuthenticated: boolean | null;
  onCombosChange?: (combos: HeadfiCombo[]) => void;
  hideHeading?: boolean;
};

export function HeadfiComboManageSection({
  library,
  isAuthenticated,
  onCombosChange,
  hideHeading = false,
}: HeadfiComboManageSectionProps) {
  const [combos, setCombos] = useState<HeadfiCombo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [select1Id, setSelect1Id] = useState('');
  const [select2Id, setSelect2Id] = useState('');

  const gearById = useMemo(() => buildGearByIdMap(library), [library]);

  const comboOptions = useMemo(
    () =>
      library.filter(
        (item) => item.status2 === '보유중' && isComboEligibleCategory(item.category),
      ),
    [library],
  );

  const loadCombos = useCallback(async () => {
    if (isAuthenticated !== true) {
      setCombos([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from('headfi_combos')
        .select('id, select1_id, select2_id, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error(error.message || '조합 목록을 불러오지 못했습니다.');
        return;
      }
      setCombos((data ?? []) as HeadfiCombo[]);
      onCombosChange?.((data ?? []) as HeadfiCombo[]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, onCombosChange]);

  useEffect(() => {
    void loadCombos();
  }, [loadCombos]);

  const handleAdd = async () => {
    if (isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!select1Id) {
      toast.error('기기 1을 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await saveHeadfiComboToDB({ select1_id: select1Id, select2_id: select2Id });
      setSelect1Id('');
      setSelect2Id('');
      toast.success('조합을 저장했습니다.');
      await loadCombos();
    } catch (error) {
      toast.error(getClientErrorMessage(error) || '조합을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (comboId: string) => {
    setDeletingId(comboId);
    try {
      await deleteHeadfiComboFromDB(comboId);
      setCombos((prev) => {
        const next = prev.filter((combo) => combo.id !== comboId);
        onCombosChange?.(next);
        return next;
      });
      setDeleteConfirmId(null);
      toast.success('조합을 삭제했습니다.');
    } catch (error) {
      toast.error(getClientErrorMessage(error) || '조합을 삭제하지 못했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isAuthenticated === false) {
    return <p className="text-sm opacity-60">조합 관리는 로그인 후 이용할 수 있습니다.</p>;
  }

  return (
    <section>
      {hideHeading ? null : (
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 opacity-70" strokeWidth={1.75} />
          조합 관리
        </h3>
      )}

      {comboOptions.length === 0 ? (
        <p className="mb-4 text-sm opacity-60">
          보유중인 DAC/AMP/DAP/Source 기기가 없습니다. 먼저 기기를 등록해 주세요.
        </p>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold opacity-80">기기 1 (필수)</label>
            <select
              className="select-apple h-[42px] w-full px-3 py-2"
              value={select1Id}
              onChange={(e) => setSelect1Id(e.target.value)}
            >
              <option value="">선택하세요</option>
              {comboOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatGearShortLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold opacity-80">기기 2 (선택)</label>
            <select
              className="select-apple h-[42px] w-full px-3 py-2"
              value={select2Id}
              onChange={(e) => setSelect2Id(e.target.value)}
            >
              <option value="">비워두기</option>
              {comboOptions
                .filter((item) => String(item.id) !== select1Id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatGearShortLabel(item)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn-apple btn-apple-secondary mb-4 inline-flex h-[42px] items-center gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={saving || comboOptions.length === 0 || !select1Id}
        onClick={() => void handleAdd()}
      >
        <Plus className="size-4" strokeWidth={2} />
        조합 추가
      </button>

      {loading ? (
        <p className="text-sm opacity-60">조합 목록 불러오는 중…</p>
      ) : combos.length === 0 ? (
        <p className="text-sm opacity-60">등록된 조합이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {combos.map((combo) => {
            const isConfirming = deleteConfirmId === combo.id;
            const isDeleting = deletingId === combo.id;
            return (
            <li
              key={combo.id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {formatComboLabel(combo, gearById)}
              </span>
              {isConfirming ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn-apple btn-apple-danger rounded-lg px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(combo.id)}
                  >
                    {isDeleting ? '삭제 중…' : '삭제'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
                  aria-label="조합 삭제"
                  disabled={deletingId != null}
                  onClick={() => setDeleteConfirmId(combo.id)}
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
