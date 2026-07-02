'use client';

import { SavingLabel } from '@/components/AsyncMutationUi';
import { HEADFI_CATEGORY_OPTIONS } from '@/lib/headfiMatchScore';
import { HeadfiFormDacAmpSection } from './HeadfiFormDacAmpSection';
import { HeadfiFormDapSection } from './HeadfiFormDapSection';
import { HeadfiFormTextInput } from './HeadfiFormSharedFields';
import { HeadfiFormSourceEtcSection } from './HeadfiFormSourceEtcSection';
import { HeadfiFormSpeakerSection } from './HeadfiFormSpeakerSection';
import { HeadfiFormWiredSection } from './HeadfiFormWiredSection';
import { HeadfiFormWirelessSection } from './HeadfiFormWirelessSection';
import type { HeadfiFormProps } from './headfiFormTypes';
import { getHeadfiFormCategoryFlags, INPUT_BASE_CLASS } from './headfiFormUtils';

export function HeadfiForm({
  selectedItem,
  formData,
  setFormData,
  dacAmpList,
  wirelessMatchingList,
  onClose,
  onSave,
  onImageUpload,
  onFrGraphFileChange,
  isSaving = false,
}: HeadfiFormProps) {
  const { hasCategory, isWired, isWireless, isSpeaker, isDacAmp, isDap, isSourceOrEtc } =
    getHeadfiFormCategoryFlags(formData.category);

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-xl">{'id' in selectedItem && selectedItem.id ? '✏️ 기기 정보 수정' : '➕ 신규 기기 등록'}</h2>
          <button type="button" className="text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <HeadfiFormTextInput label="브랜드" field="brand" formData={formData} setFormData={setFormData} />
          <HeadfiFormTextInput label="모델명" field="model" formData={formData} setFormData={setFormData} />
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">기기 이미지 (URL 또는 직접 업로드)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" placeholder="이미지 URL" className={`${INPUT_BASE_CLASS} flex-1`} value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
              <input type="file" accept="image/*" onChange={onImageUpload} className="input-apple p-2 w-full sm:w-64 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">카테고리</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="">선택</option>
              {HEADFI_CATEGORY_OPTIONS.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
              ))}
            </select>
          </div>
          {hasCategory && isWired ? (
            <HeadfiFormWiredSection
              formData={formData}
              setFormData={setFormData}
              dacAmpList={dacAmpList}
              onFrGraphFileChange={onFrGraphFileChange}
            />
          ) : null}
          {hasCategory && isWireless ? (
            <HeadfiFormWirelessSection
              formData={formData}
              setFormData={setFormData}
              wirelessMatchingList={wirelessMatchingList}
            />
          ) : null}
          {hasCategory && isSpeaker ? (
            <HeadfiFormSpeakerSection formData={formData} setFormData={setFormData} />
          ) : null}
          {hasCategory && isDacAmp ? (
            <HeadfiFormDacAmpSection formData={formData} setFormData={setFormData} />
          ) : null}
          {hasCategory && isDap ? (
            <HeadfiFormDapSection formData={formData} setFormData={setFormData} />
          ) : null}
          {hasCategory && isSourceOrEtc ? (
            <HeadfiFormSourceEtcSection formData={formData} setFormData={setFormData} />
          ) : null}
        </div>
        <button
          type="button"
          className="btn-apple btn-apple-primary p-4 mt-8 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
          onClick={onSave}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? (
            <SavingLabel />
          ) : 'id' in selectedItem && selectedItem.id ? (
            '수정 내용 저장하기'
          ) : (
            '라이브러리에 최종 등록'
          )}
        </button>
      </div>
    </div>
  );
}
