'use client';

import {
  HeadfiFormAccessoryFieldsRow,
  HeadfiFormAmpTypeSelect,
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
  HeadfiFormVrmsField,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { HEADFI_DAC_AMP_LABELS } from '../dacAmpSpec';
import { INPUT_BASE_CLASS } from './headfiFormUtils';

export function HeadfiFormDacAmpSection({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <HeadfiFormAmpTypeSelect formData={formData} setFormData={setFormData} />
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">Chipset</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          value={formData.chipset}
          onChange={(e) => setFormData({ ...formData, chipset: e.target.value })}
        />
      </div>
      <div className="col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
        <HeadfiFormTextInput label={HEADFI_DAC_AMP_LABELS.rk} field="output_impedance" type="number" formData={formData} setFormData={setFormData} />
        <div className="grid grid-cols-2 gap-x-6">
          <HeadfiFormVrmsField label={HEADFI_DAC_AMP_LABELS.vrms32} field="vrms_bal" formData={formData} setFormData={setFormData} />
          <HeadfiFormVrmsField label={HEADFI_DAC_AMP_LABELS.vrms300} field="vrms_single" formData={formData} setFormData={setFormData} />
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
