'use client';

import { HEADFI_DAC_AMP_LABELS } from '../dacAmpSpec';
import type { HeadfiFormData } from '../types';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { AMP_TYPE_OPTIONS, DISABLED_CLASS, INPUT_BASE_CLASS } from './headfiFormUtils';

type HeadfiFormTextInputProps = HeadfiFormSectionProps & {
  label: string;
  field: keyof HeadfiFormData;
  type?: string;
  isActive?: boolean;
};

export function HeadfiFormTextInput({
  label,
  field,
  type = 'text',
  isActive = true,
  formData,
  setFormData,
}: HeadfiFormTextInputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1 opacity-90">{label}</label>
      <input
        type={type}
        className={`${INPUT_BASE_CLASS} ${!isActive ? DISABLED_CLASS : ''}`}
        value={formData[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        disabled={!isActive}
        placeholder={!isActive ? '해당 없음' : ''}
      />
    </div>
  );
}

type HeadfiFormVrmsFieldProps = HeadfiFormSectionProps & {
  label: string;
  field: 'vrms_bal' | 'vrms_single';
};

export function HeadfiFormVrmsField({ label, field, formData, setFormData }: HeadfiFormVrmsFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1 opacity-90">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="any"
          className={`${INPUT_BASE_CLASS} pr-8`}
          placeholder="예: 1.5"
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60">V</span>
      </div>
    </div>
  );
}

export function HeadfiFormAmpTypeSelect({ formData, setFormData }: HeadfiFormSectionProps) {
  const legacyValue =
    formData.amp_type && !(AMP_TYPE_OPTIONS as readonly string[]).includes(formData.amp_type)
      ? formData.amp_type
      : null;

  return (
    <div>
      <label className="block text-sm font-semibold mb-1 opacity-90">{HEADFI_DAC_AMP_LABELS.ampType}</label>
      <select
        className="select-apple px-3 py-2 w-full h-[42px]"
        value={formData.amp_type}
        onChange={(e) => setFormData({ ...formData, amp_type: e.target.value })}
      >
        <option value="">선택</option>
        {legacyValue ? (
          <option value={legacyValue}>기존: {legacyValue}</option>
        ) : null}
        {AMP_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HeadfiFormPurchaseStatusRow({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <HeadfiFormTextInput label="구입일" field="purchase_date" type="date" formData={formData} setFormData={setFormData} />
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">보유 상태</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.status2} onChange={(e) => setFormData({ ...formData, status2: e.target.value })}>
          <option value="">선택</option>
          <option value="보유중">보유중</option>
          <option value="방출">방출</option>
        </select>
      </div>
    </>
  );
}

export function HeadfiFormPriceStatusRow({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <HeadfiFormTextInput label="구매가" field="price" type="number" formData={formData} setFormData={setFormData} />
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">구매 형태</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.status1} onChange={(e) => setFormData({ ...formData, status1: e.target.value })}>
          <option value="">선택</option>
          <option value="신품">신품</option>
          <option value="미개봉">미개봉</option>
          <option value="중고">중고</option>
          <option value="중고2차">중고2차</option>
          <option value="중고3차">중고3차</option>
          <option value="반품 최상">반품 최상</option>
          <option value="반품 상">반품 상</option>
        </select>
      </div>
    </>
  );
}

export function HeadfiFormMemoField({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <div className="col-span-2">
      <label className="block text-sm font-semibold mb-1 opacity-90">특징</label>
      <textarea className="input-apple px-3 py-2 w-full rounded-xl min-h-[80px]" rows={3} value={formData.memo} onChange={(e) => setFormData({ ...formData, memo: e.target.value })} />
    </div>
  );
}

export function HeadfiFormAccessoryFieldsRow({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">액세서리</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          placeholder="액세서리 (예: 전원케이블, USB케이블)"
          value={formData.accessory}
          onChange={(e) => setFormData({ ...formData, accessory: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">액세서리 가격</label>
        <input
          type="number"
          className={INPUT_BASE_CLASS}
          placeholder="가격"
          value={formData.accessory_price}
          onChange={(e) => setFormData({ ...formData, accessory_price: e.target.value })}
        />
      </div>
    </>
  );
}
