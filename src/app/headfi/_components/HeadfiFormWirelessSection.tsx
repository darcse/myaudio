'use client';

import {
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { getHeadfiFormCategoryFlags, getWirelessMatchingSelectValue, INPUT_BASE_CLASS } from './headfiFormUtils';

type HeadfiFormWirelessSectionProps = HeadfiFormSectionProps & {
  wirelessMatchingList: { id: number; brand: string; model: string }[];
};

export function HeadfiFormWirelessSection({
  formData,
  setFormData,
  wirelessMatchingList,
}: HeadfiFormWirelessSectionProps) {
  const { cat, isEarphoneType } = getHeadfiFormCategoryFlags(formData.category);
  const wirelessMatchingIds = wirelessMatchingList.map((d) => String(d.id));
  const wirelessMatchingSelectVal = getWirelessMatchingSelectValue(formData, wirelessMatchingIds);

  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입1</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.type1} onChange={(e) => setFormData({ ...formData, type1: e.target.value })}>
          <option value="">선택</option>
          {isEarphoneType ? (
            <>
              <option value="오픈형">오픈형</option>
              <option value="세미 오픈">세미 오픈</option>
              <option value="커널형">커널형</option>
            </>
          ) : (
            <>
              <option value="오픈형">오픈형</option>
              <option value="밀폐형">밀폐형</option>
            </>
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입2</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.type2} onChange={(e) => setFormData({ ...formData, type2: e.target.value })}>
          <option value="">선택</option>
          {cat === '무선 이어폰' ? (
            <>
              <option value="Over-ear">Over-ear</option>
              <option value="Under-ear">Under-ear</option>
            </>
          ) : (
            <>
              <option value="다이내믹">다이내믹</option>
              <option value="평판형">평판형</option>
              <option value="정전형">정전형</option>
              <option value="기타">기타</option>
            </>
          )}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-semibold mb-1 opacity-90">매칭</label>
        <select
          className="select-apple px-3 py-2 w-full h-[42px]"
          value={wirelessMatchingSelectVal}
          onChange={(e) => setFormData({ ...formData, matching: e.target.value })}
        >
          <option value="">선택 안 함</option>
          {wirelessMatchingList.map((d) => (
            <option key={d.id} value={String(d.id)}>{d.brand} {d.model}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">
          {cat === '무선 헤드폰' ? '이어패드' : '이어팁'}
        </label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          placeholder={cat === '무선 헤드폰' ? '이어패드 (예: Dekoni Choice Suede)' : '이어팁 (예: SpinFit CP145)'}
          value={formData.eartip}
          onChange={(e) => setFormData({ ...formData, eartip: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">
          {cat === '무선 헤드폰' ? '이어패드 가격' : '이어팁 가격'}
        </label>
        <input
          type="number"
          className={INPUT_BASE_CLASS}
          placeholder="가격"
          value={formData.eartip_price}
          onChange={(e) => setFormData({ ...formData, eartip_price: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">유닛</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          placeholder="유닛 (예: 1DD, 2BA+1DD)"
        />
      </div>
      <HeadfiFormTextInput label="기타" field="etc" formData={formData} setFormData={setFormData} />
      <HeadfiFormPurchaseStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormPriceStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormMemoField formData={formData} setFormData={setFormData} />
    </>
  );
}
