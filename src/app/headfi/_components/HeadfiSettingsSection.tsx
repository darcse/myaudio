'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { DAC_AMP_DAP_CATEGORIES } from '@/lib/headfiMatchScore';
import {
  deleteHeadfiDeviceSettingFromDB,
  saveHeadfiDeviceSettingToDB,
  updateHeadfiDeviceSettingInDB,
} from '../actions';
import type { HeadfiDeviceSetting, HeadfiDeviceSettingFormData } from '../types';

type DacAmpOption = {
  id: number;
  brand: string;
  model: string;
  category: string;
  status2: string | null;
};

type SettingRow = {
  key: string;
  id: number | null;
  dac_amp_id: string;
  setting_text: string;
  isPersisted: boolean;
  originalDacAmpId: string;
  originalSettingText: string;
};

type HeadfiSettingsSectionProps = {
  headfiId: number;
  isAuthenticated: boolean | null;
};

function createDraftRow(): SettingRow {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    dac_amp_id: '',
    setting_text: '',
    isPersisted: false,
    originalDacAmpId: '',
    originalSettingText: '',
  };
}

function toPersistedRow(item: HeadfiDeviceSetting): SettingRow {
  return {
    key: `saved-${item.id}`,
    id: item.id,
    dac_amp_id: String(item.dac_amp_id),
    setting_text: item.setting_text ?? '',
    isPersisted: true,
    originalDacAmpId: String(item.dac_amp_id),
    originalSettingText: item.setting_text ?? '',
  };
}

function formatDacAmpLabel(option: DacAmpOption): string {
  const name = `${option.brand} ${option.model}`.trim();
  const status = option.status2?.trim();
  const statusSuffix = status ? ` · ${status}` : '';
  return `${name} (${option.category})${statusSuffix}`;
}

export function HeadfiSettingsSection({ headfiId, isAuthenticated }: HeadfiSettingsSectionProps) {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [dacAmpOptions, setDacAmpOptions] = useState<DacAmpOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (isAuthenticated !== true) {
      setRows([]);
      setDacAmpOptions([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const [settingsRes, dacAmpRes] = await Promise.all([
        supabase
          .from('headfi_device_settings')
          .select('id, headfi_id, dac_amp_id, setting_text, created_at')
          .eq('headfi_id', headfiId)
          .order('created_at', { ascending: false }),
        supabase
          .from('headfi')
          .select('id, brand, model, category, status2')
          .in('category', [...DAC_AMP_DAP_CATEGORIES])
          .order('brand')
          .order('model'),
      ]);

      if (settingsRes.error) {
        toast.error(settingsRes.error.message || '세팅 목록을 불러오지 못했습니다.');
        return;
      }
      if (dacAmpRes.error) {
        toast.error(dacAmpRes.error.message || 'DAC/AMP/DAP 목록을 불러오지 못했습니다.');
        return;
      }

      const settings = (settingsRes.data ?? []) as HeadfiDeviceSetting[];
      const options = (dacAmpRes.data ?? []).map((row) => ({
        id: row.id,
        brand: row.brand || '',
        model: row.model || '',
        category: row.category || '',
        status2: row.status2 ?? null,
      }));

      const optionIds = new Set(options.map((option) => option.id));
      const missingIds = settings
        .map((item) => item.dac_amp_id)
        .filter((id) => !optionIds.has(id));

      if (missingIds.length > 0) {
        const { data: missingGear } = await supabase
          .from('headfi')
          .select('id, brand, model, category, status2')
          .in('id', missingIds);
        for (const row of missingGear ?? []) {
          options.push({
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
            category: row.category || '',
            status2: row.status2 ?? null,
          });
        }
        options.sort((a, b) => {
          const brandCmp = a.brand.localeCompare(b.brand, 'ko');
          if (brandCmp !== 0) return brandCmp;
          return a.model.localeCompare(b.model, 'ko');
        });
      }

      setDacAmpOptions(options);
      setRows(settings.map(toPersistedRow));
    } finally {
      setLoading(false);
    }
  }, [headfiId, isAuthenticated]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canAddRow = savingKey == null && deletingKey == null;
  const draftRows = rows.filter((row) => !row.isPersisted);
  const persistedRows = rows.filter((row) => row.isPersisted);
  const hasRows = rows.length > 0;

  const optionLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of dacAmpOptions) {
      map.set(option.id, formatDacAmpLabel(option));
    }
    return map;
  }, [dacAmpOptions]);

  const handleRowChange = (key: string, patch: Partial<SettingRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => {
    setRows((prev) => [createDraftRow(), ...prev.filter((row) => !row.isPersisted), ...prev.filter((row) => row.isPersisted)]);
  };

  const handleSaveRow = async (row: SettingRow) => {
    const payload: HeadfiDeviceSettingFormData = {
      headfi_id: headfiId,
      dac_amp_id: row.dac_amp_id,
      setting_text: row.setting_text,
    };
    setSavingKey(row.key);
    try {
      if (row.id != null) {
        await updateHeadfiDeviceSettingInDB(row.id, payload);
        toast.success('세팅을 수정했습니다.');
        await loadData();
      } else {
        await saveHeadfiDeviceSettingToDB(payload);
        toast.success('세팅을 추가했습니다.');
        setRows((prev) => prev.filter((item) => item.key !== row.key));
        await loadData();
      }
    } catch (error) {
      toast.error(getClientErrorMessage(error));
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteRow = async (row: SettingRow) => {
    if (row.id == null) {
      setRows((prev) => prev.filter((item) => item.key !== row.key));
      return;
    }
    if (!confirm('이 세팅을 삭제하시겠습니까?')) return;
    setDeletingKey(row.key);
    try {
      await deleteHeadfiDeviceSettingFromDB(row.id);
      toast.success('세팅을 삭제했습니다.');
      await loadData();
    } catch (error) {
      toast.error(getClientErrorMessage(error));
    } finally {
      setDeletingKey(null);
    }
  };

  const renderRow = (row: SettingRow) => {
    const busy = savingKey === row.key || deletingKey === row.key;
    return (
      <div
        key={row.key}
        className="rounded-lg border p-2.5 sm:p-3"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      >
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.1fr_1.4fr_auto] lg:items-center">
          <select
            className="select-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.dac_amp_id}
            onChange={(e) => handleRowChange(row.key, { dac_amp_id: e.target.value })}
            disabled={busy}
          >
            <option value="">DAC/AMP/DAP 선택</option>
            {dacAmpOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {optionLabelById.get(option.id) ?? `${option.brand} ${option.model}`}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="input-apple h-[36px] w-full px-2.5 py-1.5 text-sm"
            value={row.setting_text}
            onChange={(e) => handleRowChange(row.key, { setting_text: e.target.value })}
            placeholder="게인 등 설정 정보"
            readOnly={busy}
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn-apple btn-apple-primary inline-flex h-[34px] w-[34px] items-center justify-center"
              onClick={() => void handleSaveRow(row)}
              disabled={busy}
              aria-label={row.id != null ? '세팅 수정 저장' : '세팅 추가'}
              title={row.id != null ? '세팅 수정 저장' : '세팅 추가'}
            >
              {savingKey === row.key ? (
                <Check className="size-3.5 animate-pulse" strokeWidth={1.75} />
              ) : (
                <Save className="size-3.5" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              className="btn-apple btn-apple-secondary inline-flex h-[34px] w-[34px] items-center justify-center"
              onClick={() => void handleDeleteRow(row)}
              disabled={busy}
              aria-label="세팅 삭제"
              title="세팅 삭제"
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isAuthenticated !== true) {
    return <p className="text-xs opacity-60">로그인 후 DAC/AMP/DAP 조합별 세팅을 기록할 수 있습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold opacity-90">DAC/AMP/DAP 조합별 세팅</p>
          <p className="mt-1 text-xs opacity-60">조합별 게인 등 설정을 행 단위로 기록합니다.</p>
        </div>
        <button
          type="button"
          className="btn-apple btn-apple-secondary inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center"
          onClick={handleAddRow}
          disabled={!canAddRow}
          aria-label="세팅 행 추가"
          title="세팅 행 추가"
        >
          <Plus className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {loading ? <p className="text-sm opacity-60">불러오는 중…</p> : null}

      {!loading && !hasRows ? (
        <div className="empty-state-apple py-10 text-center">
          <p className="text-sm opacity-70">
            {dacAmpOptions.length === 0
              ? '등록된 DAC/DAC·AMP/AMP/DAP 기기가 없습니다.'
              : '세팅 행이 없습니다. 우측 상단의 추가 버튼으로 시작하세요.'}
          </p>
        </div>
      ) : null}

      {!loading && hasRows ? (
        <div className="space-y-2">
          {draftRows.length > 0 ? (
            <div className="space-y-2 pb-1">{draftRows.map(renderRow)}</div>
          ) : null}
          {draftRows.length > 0 && persistedRows.length > 0 ? (
            <div className="border-t py-2" style={{ borderColor: 'var(--border)' }} />
          ) : null}
          {persistedRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold tabular-nums opacity-60">총 {persistedRows.length}건</p>
              {persistedRows.map(renderRow)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
