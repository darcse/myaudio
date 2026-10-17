'use client';

import { useEffect, useState } from 'react';
import { Activity, Cable, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { SavingLabel } from '@/components/AsyncMutationUi';
import { HEADFI_CATEGORY_OPTIONS } from '@/lib/headfiMatchScore';
import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { listHeadfiAccessoryLinkedGear, syncHeadfiAccessoryLinks } from '../actions';
import type { HeadfiAccessory, HeadfiAccessoryLinkedGear } from '../types';
import { HeadfiFormAccessoryLinks } from './HeadfiFormAccessoryLinks';
import { HeadfiFormDacAmpSection } from './HeadfiFormDacAmpSection';
import { HeadfiFormDapSection } from './HeadfiFormDapSection';
import { HeadfiFormFrGraphSection } from './HeadfiFormFrGraphSection';
import { HeadfiFormListeningEvaluation } from './HeadfiFormListeningEvaluation';
import { HeadfiFormTextInput } from './HeadfiFormSharedFields';
import { HeadfiFormSourceEtcSection } from './HeadfiFormSourceEtcSection';
import { HeadfiFormSpeakerSection } from './HeadfiFormSpeakerSection';
import { HeadfiFormWiredSection } from './HeadfiFormWiredSection';
import { HeadfiFormWirelessSection } from './HeadfiFormWirelessSection';
import type { HeadfiFormProps } from './headfiFormTypes';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { getHeadfiFormCategoryFlags, INPUT_BASE_CLASS } from './headfiFormUtils';

type HeadfiFormTab = 'basic' | 'analysis' | 'accessory';

const TAB_GRID_CLASS = 'grid grid-cols-2 gap-x-6 gap-y-4';
const LEFT_FIELDS_CLASS = 'grid grid-cols-2 gap-x-6 gap-y-4 md:flex md:flex-col md:gap-4';
const PANEL_HEIGHT_CLASS = 'h-[90vh] max-h-[90vh]';
const PANEL_WIDTH_CLASS = 'w-full max-w-4xl md:max-w-7xl';
const SAVE_BUTTON_CLASS =
  'btn-apple btn-apple-primary mt-4 w-full shrink-0 p-4 text-base disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60';

export function HeadfiForm({
  selectedItem,
  formData,
  setFormData,
  comboOptions,
  wirelessMatchingList,
  onClose,
  onSave,
  onSaved,
  onAccessoriesMutated,
  onImageUpload,
  onFrGraphFileChange,
  isSaving = false,
}: HeadfiFormProps) {
  const { hasCategory, isWired, isWireless, isSpeaker, isDap, isSourceOrEtc, isSource, showDacAmpSpecForm } =
    getHeadfiFormCategoryFlags(formData.category);
  const gearId = 'id' in selectedItem && selectedItem.id ? Number(selectedItem.id) : null;
  const [accessories, setAccessories] = useState<HeadfiAccessory[]>([]);
  const [linkedGear, setLinkedGear] = useState<HeadfiAccessoryLinkedGear[]>([]);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<HeadfiFormTab>('basic');

  useEffect(() => {
    const client = createClient();
    void client
      .from('headfi_accessories')
      .select('*')
      .then(({ data }) => setAccessories((data as HeadfiAccessory[]) || []));
    void listHeadfiAccessoryLinkedGear()
      .then((rows) => {
        setLinkedGear(rows);
        setSelectedAccessoryIds((prev) => {
          if (prev.length > 0) return prev;
          if (gearId == null) return [];
          return rows.filter((row) => row.headfi_id === gearId).map((row) => row.accessory_id);
        });
      })
      .catch(() => {
        setLinkedGear([]);
      });
  }, [gearId]);

  useEffect(() => {
    if (!hasCategory || (!isWired && activeTab === 'analysis')) {
      setActiveTab('basic');
    }
  }, [hasCategory, isWired, activeTab]);

  useLockBodyScroll();

  const handleSubmit = async () => {
    if (isSaving || linkSaving) return;
    setLinkSaving(true);
    try {
      const savedId = await onSave();
      if (savedId == null || !Number.isFinite(Number(savedId))) return;
      try {
        await syncHeadfiAccessoryLinks(Number(savedId), selectedAccessoryIds);
      } catch (error) {
        toast.error(getClientErrorMessage(error) || '액세서리 연결 저장에 실패했습니다.');
        return;
      }
      onSaved?.();
    } finally {
      setLinkSaving(false);
    }
  };

  const tabBtnClass =
    'inline-flex flex-1 items-center justify-center gap-1 border-b-2 px-2 py-1.5 text-xs font-medium';

  const saveButton = (visibilityClass: string) => (
    <button
      type="button"
      className={`${SAVE_BUTTON_CLASS} ${visibilityClass}`}
      onClick={() => void handleSubmit()}
      disabled={isSaving || linkSaving}
      aria-busy={isSaving || linkSaving}
    >
      {isSaving || linkSaving ? (
        <SavingLabel />
      ) : 'id' in selectedItem && selectedItem.id ? (
        '수정 내용 저장하기'
      ) : (
        '라이브러리에 최종 등록'
      )}
    </button>
  );

  return (
    <div className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`modal-panel-apple relative flex ${PANEL_HEIGHT_CLASS} ${PANEL_WIDTH_CLASS} flex-col overflow-hidden p-8`}>
        <div className="mb-4 flex shrink-0 items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-xl">{'id' in selectedItem && selectedItem.id ? '✏️ 기기 정보 수정' : '➕ 신규 기기 등록'}</h2>
          <button type="button" className="text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(16rem,3fr)_minmax(0,7fr)] md:gap-6">
          <div className="flex shrink-0 flex-col md:h-full md:min-h-0">
            <div className={`${LEFT_FIELDS_CLASS} pb-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-0`}>
              <HeadfiFormTextInput label="브랜드" field="brand" formData={formData} setFormData={setFormData} />
              <HeadfiFormTextInput label="모델명" field="model" formData={formData} setFormData={setFormData} />
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-semibold opacity-90">기기 이미지 (URL 또는 직접 업로드)</label>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <input type="text" placeholder="이미지 URL" className={`${INPUT_BASE_CLASS} flex-1`} value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onImageUpload} className="input-apple w-full p-2 file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-1 file:text-sm file:font-medium file:opacity-90 sm:w-64 md:w-full" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-semibold opacity-90">카테고리</label>
                <select className="select-apple h-[42px] w-full px-3 py-2" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">선택</option>
                  {HEADFI_CATEGORY_OPTIONS.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
                  ))}
                </select>
              </div>
            </div>
            {saveButton('hidden md:block')}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
        {hasCategory ? (
          <div
            className="mb-2 flex shrink-0 gap-1"
            style={{ borderBottom: '1px solid var(--border)' }}
            role="tablist"
            aria-label="기기 폼 탭"
          >
            <button
              type="button"
              role="tab"
              className={tabBtnClass}
              style={{
                borderColor: activeTab === 'basic' ? 'var(--foreground)' : 'transparent',
                opacity: activeTab === 'basic' ? 1 : 0.55,
              }}
              aria-selected={activeTab === 'basic'}
              onClick={() => setActiveTab('basic')}
            >
              <ClipboardList className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              기본 정보
            </button>
            {isWired ? (
              <button
                type="button"
                role="tab"
                className={tabBtnClass}
                style={{
                  borderColor: activeTab === 'analysis' ? 'var(--foreground)' : 'transparent',
                  opacity: activeTab === 'analysis' ? 1 : 0.55,
                }}
                aria-selected={activeTab === 'analysis'}
                onClick={() => setActiveTab('analysis')}
              >
                <Activity className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                분석
              </button>
            ) : null}
            <button
              type="button"
              role="tab"
              className={tabBtnClass}
              style={{
                borderColor: activeTab === 'accessory' ? 'var(--foreground)' : 'transparent',
                opacity: activeTab === 'accessory' ? 1 : 0.55,
              }}
              aria-selected={activeTab === 'accessory'}
              onClick={() => setActiveTab('accessory')}
            >
              <Cable className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              액세서리
            </button>
          </div>
        ) : null}
        <div className="min-h-[12rem] flex-1 overflow-y-auto pr-4">
          {hasCategory ? (
            <>
              <div
                className={`${TAB_GRID_CLASS} ${activeTab === 'basic' ? '' : 'hidden'}`}
                role="tabpanel"
                aria-hidden={activeTab !== 'basic'}
              >
                {isWired ? (
                  <HeadfiFormWiredSection
                    formData={formData}
                    setFormData={setFormData}
                    comboOptions={comboOptions}
                  />
                ) : null}
                {isWireless ? (
                  <HeadfiFormWirelessSection
                    formData={formData}
                    setFormData={setFormData}
                    wirelessMatchingList={wirelessMatchingList}
                  />
                ) : null}
                {isSpeaker ? (
                  <HeadfiFormSpeakerSection formData={formData} setFormData={setFormData} />
                ) : null}
                {showDacAmpSpecForm ? (
                  <HeadfiFormDacAmpSection formData={formData} setFormData={setFormData} />
                ) : null}
                {isDap ? (
                  <HeadfiFormDapSection formData={formData} setFormData={setFormData} />
                ) : null}
                {isSourceOrEtc && !isSource ? (
                  <HeadfiFormSourceEtcSection formData={formData} setFormData={setFormData} />
                ) : null}
              </div>
              {isWired ? (
                <div
                  className={`${TAB_GRID_CLASS} ${activeTab === 'analysis' ? '' : 'hidden'}`}
                  role="tabpanel"
                  aria-hidden={activeTab !== 'analysis'}
                >
                  <HeadfiFormListeningEvaluation formData={formData} setFormData={setFormData} />
                  <HeadfiFormFrGraphSection
                    formData={formData}
                    setFormData={setFormData}
                    onFrGraphFileChange={onFrGraphFileChange}
                  />
                </div>
              ) : null}
              <div
                className={`${TAB_GRID_CLASS} ${activeTab === 'accessory' ? '' : 'hidden'}`}
                role="tabpanel"
                aria-hidden={activeTab !== 'accessory'}
              >
                <HeadfiFormAccessoryLinks
                  selectedIds={selectedAccessoryIds}
                  onSelectedIdsChange={setSelectedAccessoryIds}
                  accessories={accessories}
                  linkedGear={linkedGear}
                  currentHeadfiId={gearId}
                  onAccessoryCreated={(item) => {
                    setAccessories((prev) => [item, ...prev.filter((row) => row.id !== item.id)]);
                    onAccessoriesMutated?.();
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
          </div>
          {saveButton('md:hidden')}
        </div>
      </div>
    </div>
  );
}
