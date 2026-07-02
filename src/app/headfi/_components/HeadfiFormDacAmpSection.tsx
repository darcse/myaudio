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

export function HeadfiFormDacAmpSection({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <HeadfiFormTextInput label="앰프 타입" field="amp_type" formData={formData} setFormData={setFormData} />
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">Chipset</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          value={formData.chipset}
          onChange={(e) => setFormData({ ...formData, chipset: e.target.value })}
        />
      </div>
      <HeadfiFormTextInput label="출력 임피던스 (Rk Ω)" field="output_impedance" type="number" formData={formData} setFormData={setFormData} />
      <div className="grid grid-cols-2 gap-x-6">
        <div>
          <label className="block text-sm font-semibold mb-1 opacity-90">Vrms (BAL)</label>
          <input
            type="number"
            step="any"
            className={INPUT_BASE_CLASS}
            placeholder="32Ω 기준 (예: 15.5)"
            value={formData.vrms_bal}
            onChange={(e) => setFormData({ ...formData, vrms_bal: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 opacity-90">Vrms (Single)</label>
          <input
            type="number"
            step="any"
            className={INPUT_BASE_CLASS}
            placeholder="32Ω 기준 (예: 12)"
            value={formData.vrms_single}
            onChange={(e) => setFormData({ ...formData, vrms_single: e.target.value })}
          />
        </div>
      </div>
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
