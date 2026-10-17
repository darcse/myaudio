'use client';

import {
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';

export function HeadfiFormSourceEtcSection({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
    <>
      <div className="col-span-2">
        <HeadfiFormTextInput label="기타" field="etc" formData={formData} setFormData={setFormData} />
      </div>
      <HeadfiFormPurchaseStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormPriceStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormMemoField formData={formData} setFormData={setFormData} />
    </>
  );
}
