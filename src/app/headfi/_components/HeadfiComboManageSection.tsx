'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import {
  deleteHeadfiComboFromDB,
  saveHeadfiComboToDB,
  updateHeadfiComboLinksInDB,
  updateHeadfiComboMatchingInDB,
} from '../actions';
import {
  buildGearByIdMap,
  COMBO_DEVICE_LINK_OPTIONS,
  COMBO_SOURCE_LINK_OPTIONS,
  COMBO_SOURCE_MEDIA_OPTIONS,
  formatGearShortLabel,
  HEADFI_COMBO_SELECT,
  isComboDeviceCategory,
  isComboSourceCategory,
  isOwnedHeadfi,
  isReleasedHeadfiCombo,
  notifyHeadfiCombosChanged,
} from '../headfiComboUtils';
import type { Headfi, HeadfiCombo } from '../types';

type HeadfiComboManageSectionProps = {
  library: Headfi[];
  isAuthenticated: boolean | null;
  hideHeading?: boolean;
};

type ComboLinkDraft = {
  source_media: string;
  source_link: string;
  device_link: string;
};

function comboLinkDraftFromCombo(combo: HeadfiCombo): ComboLinkDraft {
  return {
    source_media: combo.source_id != null ? (combo.source_media ?? '') : '',
    source_link: combo.source_id != null ? (combo.source_link ?? '') : '',
    device_link: combo.select2_id != null ? (combo.device_link ?? '') : '',
  };
}

function ComboOptionSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  compact,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className={`mb-1 block font-semibold opacity-80 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {label}
      </label>
      <select
        className={`select-apple w-full px-3 py-2 ${compact ? 'h-[36px] text-xs' : 'h-[42px]'}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">비워두기</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ComboChainLabel({
  combo,
  gearById,
}: {
  combo: HeadfiCombo;
  gearById: Map<number, Headfi>;
}) {
  const source = combo.source_id != null ? gearById.get(combo.source_id) : undefined;
  const device1 = combo.select1_id != null ? gearById.get(combo.select1_id) : undefined;
  const device2 = combo.select2_id != null ? gearById.get(combo.select2_id) : undefined;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
      {source ? (
        <>
          <span className="min-w-0 max-w-full truncate font-medium">{formatGearShortLabel(source)}</span>
          <span className="shrink-0 opacity-40">→</span>
        </>
      ) : null}
      <span className="min-w-0 max-w-full truncate font-medium">{formatGearShortLabel(device1)}</span>
      {device2 ? (
        <>
          <span className="shrink-0 opacity-40">→</span>
          <span className="min-w-0 max-w-full truncate font-medium">{formatGearShortLabel(device2)}</span>
        </>
      ) : null}
    </div>
  );
}

export function HeadfiComboManageSection({
  library,
  isAuthenticated,
  hideHeading = false,
}: HeadfiComboManageSectionProps) {
  const [combos, setCombos] = useState<HeadfiCombo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [savingLinksId, setSavingLinksId] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, ComboLinkDraft>>({});
  const [sourceId, setSourceId] = useState('');
  const [select1Id, setSelect1Id] = useState('');
  const [select2Id, setSelect2Id] = useState('');
  const [sourceMedia, setSourceMedia] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [deviceLink, setDeviceLink] = useState('');

  const gearById = useMemo(() => buildGearByIdMap(library), [library]);

  const sourceOptions = useMemo(
    () =>
      library.filter(
        (item) =>
          isOwnedHeadfi(item) &&
          isComboSourceCategory(item.category) &&
          String(item.id) !== select1Id &&
          String(item.id) !== select2Id,
      ),
    [library, select1Id, select2Id],
  );

  const deviceOptions = useMemo(
    () =>
      library.filter(
        (item) =>
          isOwnedHeadfi(item) &&
          isComboDeviceCategory(item.category) &&
          String(item.id) !== sourceId,
      ),
    [library, sourceId],
  );

  const loadCombos = useCallback(async () => {
    if (isAuthenticated !== true) {
      setCombos([]);
      setLinkDrafts({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from('headfi_combos')
        .select(HEADFI_COMBO_SELECT)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) {
        toast.error(error.message || '조합 목록을 불러오지 못했습니다.');
        return;
      }
      const next = (data ?? []) as HeadfiCombo[];
      setCombos(next);
      setLinkDrafts(
        Object.fromEntries(next.map((combo) => [combo.id, comboLinkDraftFromCombo(combo)])),
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadCombos();
  }, [loadCombos]);

  useEffect(() => {
    if (select2Id && select2Id === select1Id) setSelect2Id('');
  }, [select1Id, select2Id]);

  useEffect(() => {
    if (sourceId && (sourceId === select1Id || sourceId === select2Id)) setSourceId('');
  }, [select1Id, select2Id, sourceId]);

  useEffect(() => {
    if (!sourceId) {
      setSourceMedia('');
      setSourceLink('');
    }
  }, [sourceId]);

  useEffect(() => {
    if (!select1Id) setDeviceLink('');
  }, [select1Id]);

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
      await saveHeadfiComboToDB({
        source_id: sourceId,
        select1_id: select1Id,
        select2_id: select2Id,
        source_media: sourceId ? sourceMedia : '',
        source_link: sourceId ? sourceLink : '',
        device_link: select2Id ? deviceLink : '',
      });
      setSourceId('');
      setSelect1Id('');
      setSelect2Id('');
      setSourceMedia('');
      setSourceLink('');
      setDeviceLink('');
      toast.success('조합을 저장했습니다.');
      await loadCombos();
      notifyHeadfiCombosChanged();
    } catch (error) {
      toast.error(getClientErrorMessage(error) || '조합을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleMatchingChange = async (combo: HeadfiCombo, nextMatching: boolean) => {
    setMatchingId(combo.id);
    try {
      const updated = (await updateHeadfiComboMatchingInDB(combo.id, nextMatching)) as HeadfiCombo;
      const next = combos.map((item) => (item.id === combo.id ? { ...item, ...updated } : item));
      setCombos(next);
      notifyHeadfiCombosChanged();
    } catch (error) {
      toast.error(getClientErrorMessage(error) || '매칭 설정을 저장하지 못했습니다.');
    } finally {
      setMatchingId(null);
    }
  };

  const handleSaveLinks = async (combo: HeadfiCombo) => {
    const draft = linkDrafts[combo.id] ?? comboLinkDraftFromCombo(combo);
    setSavingLinksId(combo.id);
    try {
      const updated = (await updateHeadfiComboLinksInDB(combo.id, {
        source_media: combo.source_id != null ? draft.source_media : '',
        source_link: combo.source_id != null ? draft.source_link : '',
        device_link: combo.select2_id != null ? draft.device_link : '',
      })) as HeadfiCombo;
      const next = combos.map((item) => (item.id === combo.id ? { ...item, ...updated } : item));
      setCombos(next);
      setLinkDrafts((prev) => ({
        ...prev,
        [combo.id]: comboLinkDraftFromCombo({ ...combo, ...updated }),
      }));
      notifyHeadfiCombosChanged();
      toast.success('연결 정보를 저장했습니다.');
    } catch (error) {
      toast.error(getClientErrorMessage(error) || '연결 정보를 저장하지 못했습니다.');
    } finally {
      setSavingLinksId(null);
    }
  };

  const handleDelete = async (comboId: string) => {
    setDeletingId(comboId);
    try {
      await deleteHeadfiComboFromDB(comboId);
      const next = combos.filter((combo) => combo.id !== comboId);
      setCombos(next);
      setLinkDrafts((prev) => {
        const copy = { ...prev };
        delete copy[comboId];
        return copy;
      });
      setDeleteConfirmId(null);
      toast.success('조합을 삭제했습니다.');
      notifyHeadfiCombosChanged();
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

      {deviceOptions.length === 0 ? (
        <p className="mb-4 text-sm opacity-60">
          보유중인 DAC/AMP/DAP/기타 기기가 없습니다. 먼저 기기를 등록해 주세요.
        </p>
      ) : (
        <div
          className="mb-4 space-y-3 rounded-xl p-3 sm:p-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold opacity-80">소스 (선택)</label>
              <select
                className="select-apple h-[42px] w-full px-3 py-2"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">비워두기</option>
                {sourceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatGearShortLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <ComboOptionSelect
              label="매체 (선택)"
              value={sourceMedia}
              options={COMBO_SOURCE_MEDIA_OPTIONS}
              onChange={setSourceMedia}
              disabled={!sourceId}
            />
            <ComboOptionSelect
              label="소스 → 기기1 연결 (선택)"
              value={sourceLink}
              options={COMBO_SOURCE_LINK_OPTIONS}
              onChange={setSourceLink}
              disabled={!sourceId}
            />
            <div>
              <label className="mb-1 block text-xs font-semibold opacity-80">기기 1 (필수)</label>
              <select
                className="select-apple h-[42px] w-full px-3 py-2"
                value={select1Id}
                onChange={(e) => setSelect1Id(e.target.value)}
              >
                <option value="">선택하세요</option>
                {deviceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatGearShortLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <ComboOptionSelect
              label="기기1 → 기기2 연결 (선택)"
              value={deviceLink}
              options={COMBO_DEVICE_LINK_OPTIONS}
              onChange={setDeviceLink}
              disabled={!select1Id}
            />
            <div>
              <label className="mb-1 block text-xs font-semibold opacity-80">기기 2 (선택)</label>
              <select
                className="select-apple h-[42px] w-full px-3 py-2"
                value={select2Id}
                onChange={(e) => setSelect2Id(e.target.value)}
              >
                <option value="">비워두기</option>
                {deviceOptions
                  .filter((item) => String(item.id) !== select1Id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatGearShortLabel(item)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn-apple btn-apple-secondary mb-4 inline-flex h-[42px] items-center gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={saving || deviceOptions.length === 0 || !select1Id}
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
        <div className="space-y-2">
          <div
            className="hidden gap-3 px-3 text-[11px] font-semibold opacity-50 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_7.5rem_auto]"
          >
            <span>구성</span>
            <span>연결</span>
            <span>매칭</span>
            <span className="text-right">관리</span>
          </div>
          <ul className="space-y-2">
            {combos.map((combo) => {
              const isConfirming = deleteConfirmId === combo.id;
              const isDeleting = deletingId === combo.id;
              const isMatchingBusy = matchingId === combo.id;
              const isSavingLinks = savingLinksId === combo.id;
              const released = isReleasedHeadfiCombo(combo, gearById);
              const matching = combo.is_matching !== false;
              const draft = linkDrafts[combo.id] ?? comboLinkDraftFromCombo(combo);
              const baseline = comboLinkDraftFromCombo(combo);
              const linksDirty =
                draft.source_media !== baseline.source_media ||
                draft.source_link !== baseline.source_link ||
                draft.device_link !== baseline.device_link;
              const canEditLinks = combo.source_id != null || combo.select2_id != null;
              return (
                <li
                  key={combo.id}
                  className="rounded-xl px-3 py-3 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_7.5rem_auto] md:items-start md:gap-3"
                  style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                >
                  <div className="min-w-0 space-y-1.5">
                    <ComboChainLabel combo={combo} gearById={gearById} />
                    {released ? (
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'color-mix(in srgb, var(--foreground) 12%, var(--card-bg))',
                          border: '1px solid var(--border)',
                        }}
                      >
                        방출
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 min-w-0 space-y-2 md:mt-0">
                    {canEditLinks ? (
                      <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                          {combo.source_id != null ? (
                            <>
                              <ComboOptionSelect
                                label="매체"
                                value={draft.source_media}
                                options={COMBO_SOURCE_MEDIA_OPTIONS}
                                disabled={isSavingLinks || deletingId != null}
                                compact
                                onChange={(value) =>
                                  setLinkDrafts((prev) => ({
                                    ...prev,
                                    [combo.id]: { ...draft, source_media: value },
                                  }))
                                }
                              />
                              <ComboOptionSelect
                                label="소스 연결"
                                value={draft.source_link}
                                options={COMBO_SOURCE_LINK_OPTIONS}
                                disabled={isSavingLinks || deletingId != null}
                                compact
                                onChange={(value) =>
                                  setLinkDrafts((prev) => ({
                                    ...prev,
                                    [combo.id]: { ...draft, source_link: value },
                                  }))
                                }
                              />
                            </>
                          ) : null}
                          {combo.select2_id != null ? (
                            <ComboOptionSelect
                              label="기기 간 연결"
                              value={draft.device_link}
                              options={COMBO_DEVICE_LINK_OPTIONS}
                              disabled={isSavingLinks || deletingId != null}
                              compact
                              onChange={(value) =>
                                setLinkDrafts((prev) => ({
                                  ...prev,
                                  [combo.id]: { ...draft, device_link: value },
                                }))
                              }
                            />
                          ) : null}
                        </div>
                        {linksDirty ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                className="btn-apple btn-apple-secondary h-[32px] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSavingLinks || deletingId != null}
                                onClick={() => void handleSaveLinks(combo)}
                              >
                                {isSavingLinks ? '저장 중…' : '연결 저장'}
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
                                disabled={isSavingLinks || deletingId != null}
                                onClick={() =>
                                  setLinkDrafts((prev) => ({
                                    ...prev,
                                    [combo.id]: baseline,
                                  }))
                                }
                              >
                                취소
                              </button>
                            </div>
                            <p className="text-[11px] opacity-55">
                              저장하면 이 조합의 매칭 점수가 초기화됩니다
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs opacity-50">연결 정보 없음</p>
                    )}
                  </div>

                  <div className="mt-3 md:mt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs opacity-75">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-[var(--foreground)]"
                        checked={matching}
                        disabled={isMatchingBusy || deletingId != null}
                        onChange={(e) => void handleMatchingChange(combo, e.target.checked)}
                      />
                      매칭 조합
                    </label>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1.5 md:mt-0">
                    {isConfirming ? (
                      <>
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
                      </>
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
