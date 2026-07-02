'use client';

import {
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';

export function HeadfiFormSpeakerSection({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입1</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.speaker_type1} onChange={(e) => setFormData({ ...formData, speaker_type1: e.target.value })}>
          <option value="">선택</option>
          <option value="액티브">액티브</option>
          <option value="패시브">패시브</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입2</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.speaker_type2} onChange={(e) => setFormData({ ...formData, speaker_type2: e.target.value })}>
          <option value="">선택</option>
          <option value="북쉘프">북쉘프</option>
          <option value="스탠딩">스탠딩</option>
          <option value="사운드바">사운드바</option>
          <option value="블루투스">블루투스</option>
          <option value="스마트">스마트</option>
        </select>
      </div>
      <div className="col-span-2">
        <HeadfiFormTextInput label="기타" field="etc" formData={formData} setFormData={setFormData} />
      </div>
      <HeadfiFormPurchaseStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormPriceStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormMemoField formData={formData} setFormData={setFormData} />
    </>
  );
}
