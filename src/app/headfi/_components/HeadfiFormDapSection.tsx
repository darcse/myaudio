'use client';

import {
  HeadfiFormAccessoryFieldsRow,
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { INPUT_BASE_CLASS } from './headfiFormUtils';

export function HeadfiFormDapSection({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <div className="col-span-2">
        <HeadfiFormTextInput label="스펙" field="dap_spec" formData={formData} setFormData={setFormData} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">Chipset</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          value={formData.chipset}
          onChange={(e) => setFormData({ ...formData, chipset: e.target.value })}
        />
      </div>
      <HeadfiFormTextInput label="출력" field="dap_output" formData={formData} setFormData={setFormData} />
      <HeadfiFormAccessoryFieldsRow formData={formData} setFormData={setFormData} />
      <div className="col-span-2">
        <HeadfiFormTextInput label="기타" field="etc" formData={formData} setFormData={setFormData} />
      </div>
      <HeadfiFormPurchaseStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormPriceStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormMemoField formData={formData} setFormData={setFormData} />
    </>
  );
}
